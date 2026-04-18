#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const chalk = require('chalk');
const ora = require('ora');
const { scrape, formats } = require('../src/index');

const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 <url> [options]')
  .command('$0 <url>', 'Scrape a URL', (yargs) => {
    return yargs
      .positional('url', {
        describe: 'URL to scrape',
        type: 'string',
      })
      .option('format', {
        alias: 'f',
        describe: 'Output format',
        choices: ['json', 'csv', 'markdown', 'text'],
        default: 'json',
      })
      .option('output', {
        alias: 'o',
        describe: 'Output file path (stdout if omitted)',
        type: 'string',
      })
      .option('selector', {
        alias: 's',
        describe: 'CSS selector to extract',
        type: 'string',
      })
      .option('extract', {
        alias: 'e',
        describe: 'What to extract',
        choices: ['all', 'text', 'links', 'images', 'meta', 'headings', 'tables', 'forms'],
        default: 'all',
      })
      .option('viewport', {
        describe: 'Viewport width x height (e.g. 1920x1080)',
        default: '1280x720',
        type: 'string',
      })
      .option('wait', {
        alias: 'w',
        describe: 'Wait time in ms for JS rendering',
        default: 2000,
        type: 'number',
      })
      .option('screenshot', {
        describe: 'Save screenshot to file',
        type: 'string',
      })
      .option('pdf', {
        describe: 'Save page as PDF to file',
        type: 'string',
      })
      .option('scroll', {
        describe: 'Scroll the page before extracting (for infinite scroll pages)',
        default: false,
        type: 'boolean',
      })
      .option('user-agent', {
        describe: 'Custom User-Agent string',
        type: 'string',
      })
      .option('headers', {
        describe: 'Custom headers as JSON string',
        type: 'string',
      })
      .option('cookie', {
        describe: 'Cookies as "name=value" (repeatable)',
        type: 'array',
      })
      .option('proxy', {
        describe: 'Proxy server URL',
        type: 'string',
      })
      .option('stealth', {
        describe: 'Use stealth mode to avoid detection',
        default: true,
        type: 'boolean',
      })
      .option('timeout', {
        describe: 'Navigation timeout in ms',
        default: 30000,
        type: 'number',
      })
      .option('no-headless', {
        describe: 'Show browser window (for debugging)',
        default: false,
        type: 'boolean',
      });
  })
  .example('$0 https://example.com', 'Scrape all data from a page')
  .example('$0 https://example.com -f csv -o data.csv', 'Export links as CSV')
  .example('$0 https://example.com -s "h2 a" -e text', 'Extract text from matching selectors')
  .example('$0 https://example.com --screenshot page.png', 'Take a screenshot')
  .example('$0 https://example.com --pdf page.pdf', 'Save as PDF')
  .help()
  .alias('help', 'h')
  .version()
  .argv;

async function main() {
  const spinner = ora(chalk.cyan('Launching browser...')).start();
  
  try {
    const options = {
      format: argv.format,
      selector: argv.selector,
      extract: argv.extract,
      viewport: argv.viewport,
      wait: argv.wait,
      screenshot: argv.screenshot,
      pdf: argv.pdf,
      scroll: argv.scroll,
      userAgent: argv.userAgent,
      headers: argv.headers ? JSON.parse(argv.headers) : undefined,
      cookies: argv.cookie,
      proxy: argv.proxy,
      stealth: argv.stealth,
      timeout: argv.timeout,
      headless: !argv.noHeadless,
    };

    spinner.text = chalk.cyan('Scraping ' + argv.url + '...');
    
    const result = await scrape(argv.url, options);
    
    spinner.succeed(chalk.green('Scrape complete!'));
    
    const output = formats[argv.format](result, argv.selector);
    
    if (argv.output) {
      const fs = require('fs');
      fs.writeFileSync(argv.output, output);
      console.log(chalk.green('Written to ' + argv.output));
    } else {
      console.log(output);
    }
    
    if (argv.screenshot) {
      console.log(chalk.green('Screenshot saved to ' + argv.screenshot));
    }
    if (argv.pdf) {
      console.log(chalk.green('PDF saved to ' + argv.pdf));
    }
    
    process.exit(0);
  } catch (err) {
    spinner.fail(chalk.red('Scrape failed'));
    console.error(chalk.red('Error: ' + err.message));
    process.exit(1);
  }
}

main();
