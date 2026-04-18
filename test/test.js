const { scrape, formats } = require('../src/index');

async function runTests() {
  console.log('Running scrape-fast tests...\n');
  let passed = 0;
  let failed = 0;

  // Test 1: Basic scrape
  try {
    console.log('Test 1: Basic scrape of example.com...');
    const data = await scrape('https://example.com', { wait: 1000, headless: true });
    if (data.title && data.url) {
      console.log('  ✓ Got title: ' + data.title);
      console.log('  ✓ Got URL: ' + data.url);
      passed++;
    } else {
      console.log('  ✗ Missing title or URL');
      failed++;
    }
    if (data.links && data.links.length > 0) {
      console.log('  ✓ Found ' + data.links.length + ' links');
      passed++;
    } else {
      console.log('  ✗ No links found');
      failed++;
    }
  } catch (err) {
    console.log('  ✗ Error: ' + err.message);
    failed += 2;
  }

  // Test 2: Format outputs
  console.log('\nTest 2: Format outputs...');
  const mockData = {
    title: 'Test Page',
    url: 'https://example.com',
    timestamp: '2026-01-01T00:00:00.000Z',
    text: 'Hello world',
    links: [{ text: 'Link', href: 'https://example.com/link' }],
    meta: { description: 'Test page' },
  };

  const jsonOut = formats.json(mockData);
  if (jsonOut.includes('"title": "Test Page"')) {
    console.log('  ✓ JSON format works');
    passed++;
  } else {
    console.log('  ✗ JSON format failed');
    failed++;
  }

  const mdOut = formats.markdown(mockData);
  if (mdOut.includes('# Test Page')) {
    console.log('  ✓ Markdown format works');
    passed++;
  } else {
    console.log('  ✗ Markdown format failed');
    failed++;
  }

  const csvOut = formats.csv(mockData);
  if (csvOut.includes('Link') || csvOut.includes('title')) {
    console.log('  ✓ CSV format works');
    passed++;
  } else {
    console.log('  ✗ CSV format failed');
    failed++;
  }

  console.log('\n--- Results ---');
  console.log('Passed: ' + passed);
  console.log('Failed: ' + failed);
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
