const puppeteer = require('puppeteer');
const { execSync } = require('child_process');
const path = require('path');

// Find Chrome executable
function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ];
  for (const candidate of candidates) {
    if (candidate) {
      try {
        execSync(candidate + ' --version 2>/dev/null', { stdio: 'ignore' });
        return candidate;
      } catch (e) {
        // try next
      }
    }
  }
  // Fallback: let Puppeteer use its bundled Chromium
  return null;
}

async function scrape(url, options = {}) {
  const {
    format = 'json',
    selector = null,
    extract = 'all',
    viewport = '1280x720',
    wait = 2000,
    screenshot = null,
    pdf = null,
    scroll = false,
    userAgent = null,
    headers = null,
    cookies = null,
    proxy = null,
    stealth = true,
    timeout = 30000,
    headless = true,
  } = options;

  const [vpWidth, vpHeight] = viewport.split('x').map(Number);

  const launchOptions = {
    headless: headless ? 'new' : false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--single-process',
    ],
  };

  // Use system Chrome if available, otherwise Puppeteer's bundled version
  const chromePath = findChrome();
  if (chromePath) {
    launchOptions.executablePath = chromePath;
  }

  if (proxy) {
    launchOptions.args.push('--proxy-server=' + proxy);
  }

  const browser = await puppeteer.launch(launchOptions);
  
  try {
    const page = await browser.newPage();

    if (userAgent) {
      await page.setUserAgent(userAgent);
    } else if (stealth) {
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      );
    }

    await page.setViewport({ width: vpWidth || 1280, height: vpHeight || 720 });

    if (headers) {
      await page.setExtraHTTPHeaders(headers);
    }

    if (cookies && cookies.length > 0) {
      const cookieObjects = cookies.map(c => {
        const [name, ...valueParts] = c.split('=');
        return {
          name,
          value: valueParts.join('='),
          domain: new URL(url).hostname,
          path: '/',
        };
      });
      await page.setCookie(...cookieObjects);
    }

    // Stealth: Override webdriver detection
    if (stealth) {
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        window.chrome = { runtime: {} };
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) =>
          parameters.name === 'notifications'
            ? Promise.resolve({ state: Notification.permission })
            : originalQuery(parameters);
      });
    }

    await page.goto(url, { waitUntil: 'networkidle2', timeout });

    if (wait > 0) {
      await new Promise(r => setTimeout(r, wait));
    }

    if (scroll) {
      await autoScroll(page);
    }

    const result = await page.evaluate((extractMode, cssSelector) => {
      const data = {
        url: window.location.href,
        title: document.title,
        timestamp: new Date().toISOString(),
      };

      // Extract metadata
      const getMeta = () => {
        const meta = {};
        document.querySelectorAll('meta').forEach(el => {
          const name = el.getAttribute('name') || el.getAttribute('property') || el.getAttribute('http-equiv');
          const content = el.getAttribute('content');
          if (name && content) meta[name] = content;
        });
        return meta;
      };

      // Extract links
      const getLinks = () => {
        const links = [];
        const seen = new Set();
        document.querySelectorAll('a[href]').forEach(el => {
          const href = el.href;
          if (href && !seen.has(href) && !href.startsWith('javascript:')) {
            seen.add(href);
            links.push({
              text: el.textContent.trim().slice(0, 200),
              href: href,
            });
          }
        });
        return links;
      };

      // Extract images
      const getImages = () => {
        const images = [];
        document.querySelectorAll('img[src]').forEach(el => {
          images.push({
            src: el.src,
            alt: el.alt || '',
            width: el.naturalWidth || el.width,
            height: el.naturalHeight || el.height,
          });
        });
        return images;
      };

      // Extract headings
      const getHeadings = () => {
        const headings = [];
        document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(el => {
          headings.push({
            level: parseInt(el.tagName[1]),
            text: el.textContent.trim(),
            id: el.id || null,
          });
        });
        return headings;
      };

      // Extract tables
      const getTables = () => {
        const tables = [];
        document.querySelectorAll('table').forEach((table, idx) => {
          const rows = [];
          table.querySelectorAll('tr').forEach(tr => {
            const cells = [];
            tr.querySelectorAll('th, td').forEach(cell => {
              cells.push(cell.textContent.trim());
            });
            if (cells.length > 0) rows.push(cells);
          });
          if (rows.length > 0) {
            tables.push({ index: idx, rows });
          }
        });
        return tables;
      };

      // Extract forms
      const getForms = () => {
        const forms = [];
        document.querySelectorAll('form').forEach((form, idx) => {
          const fields = [];
          form.querySelectorAll('input, select, textarea').forEach(el => {
            fields.push({
              tag: el.tagName.toLowerCase(),
              type: el.type || el.tagName.toLowerCase(),
              name: el.name || '',
              id: el.id || '',
              placeholder: el.placeholder || '',
              required: el.required || false,
            });
          });
          forms.push({
            index: idx,
            action: form.action || '',
            method: form.method || 'GET',
            fields,
          });
        });
        return forms;
      };

      // Extract text content
      const getText = (sel) => {
        if (sel) {
          const els = document.querySelectorAll(sel);
          return Array.from(els).map(el => el.textContent.trim()).filter(Boolean);
        }
        const clone = document.body.cloneNode(true);
        clone.querySelectorAll('script, style, noscript').forEach(el => el.remove());
        return clone.textContent.trim();
      };

      // Build result based on extract mode
      switch (extractMode) {
        case 'text':
          data.text = getText(cssSelector);
          break;
        case 'links':
          data.links = getLinks();
          break;
        case 'images':
          data.images = getImages();
          break;
        case 'meta':
          data.meta = getMeta();
          break;
        case 'headings':
          data.headings = getHeadings();
          break;
        case 'tables':
          data.tables = getTables();
          break;
        case 'forms':
          data.forms = getForms();
          break;
        case 'all':
        default:
          data.meta = getMeta();
          data.text = getText(cssSelector);
          data.links = getLinks();
          data.images = getImages();
          data.headings = getHeadings();
          data.tables = getTables();
          data.forms = getForms();
          break;
      }

      return data;
    }, extract, selector);

    // Take screenshot if requested
    if (screenshot) {
      await page.screenshot({ path: screenshot, fullPage: true });
    }

    // Save as PDF if requested
    if (pdf) {
      await page.pdf({ path: pdf, format: 'A4' });
    }

    return result;
  } finally {
    await browser.close();
  }
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

// Format functions
const formats = {
  json: (data) => JSON.stringify(data, null, 2),
  
  csv: (data, selector) => {
    if (data.links && data.links.length > 0) {
      return 'text,href\n' + data.links.map(l => 
        '"' + (l.text || '').replace(/"/g, '""') + '","' + l.href + '"'
      ).join('\n');
    }
    if (data.images && data.images.length > 0) {
      return 'src,alt,width,height\n' + data.images.map(i => 
        '"' + i.src + '","' + (i.alt || '').replace(/"/g, '""') + '",' + i.width + ',' + i.height
      ).join('\n');
    }
    if (data.tables && data.tables.length > 0) {
      const table = data.tables[0];
      return table.rows.map(row => 
        row.map(cell => '"' + cell.replace(/"/g, '""') + '"').join(',')
      ).join('\n');
    }
    return Object.entries(data).map(([k, v]) => 
      '"' + k + '","' + (typeof v === 'string' ? v.replace(/"/g, '""').slice(0, 500) : JSON.stringify(v).slice(0, 500)) + '"'
    ).join('\n');
  },

  markdown: (data) => {
    let md = '# ' + (data.title || 'Scraped Page') + '\n\n';
    md += '> URL: ' + data.url + '\n> Scraped: ' + data.timestamp + '\n\n';
    
    if (data.meta) {
      if (data.meta.description) md += '**Description:** ' + data.meta.description + '\n\n';
      if (data.meta.keywords) md += '**Keywords:** ' + data.meta.keywords + '\n\n';
    }

    if (data.headings && data.headings.length > 0) {
      md += '## Table of Contents\n\n';
      data.headings.forEach(h => {
        const indent = '  '.repeat(h.level - 1);
        md += indent + '- ' + h.text + (h.id ? ' [#' + h.id + ']' : '') + '\n';
      });
      md += '\n';
    }

    if (data.text) {
      const text = typeof data.text === 'string' ? data.text : data.text.join('\n');
      md += '## Content\n\n' + text.slice(0, 10000) + '\n\n';
    }

    if (data.links && data.links.length > 0) {
      md += '## Links\n\n';
      data.links.slice(0, 50).forEach(l => {
        md += '- [' + (l.text || 'untitled') + '](' + l.href + ')\n';
      });
      if (data.links.length > 50) md += '\n_...and ' + (data.links.length - 50) + ' more links_\n';
      md += '\n';
    }

    if (data.images && data.images.length > 0) {
      md += '## Images\n\n';
      data.images.slice(0, 20).forEach(i => {
        md += '- ![' + i.alt + '](' + i.src + ')\n';
      });
      md += '\n';
    }

    return md;
  },

  text: (data) => {
    if (typeof data.text === 'string') return data.text;
    if (Array.isArray(data.text)) return data.text.join('\n');
    return JSON.stringify(data, null, 2);
  },
};

module.exports = { scrape, formats, findChrome };
