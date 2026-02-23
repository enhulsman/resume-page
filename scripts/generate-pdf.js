// scripts/generate-pdf.js
// Node 18+; uses Playwright to print pages to PDF in ./dist

const { chromium } = require('playwright'); // playwright must be installed
const fs = require('fs');
const path = require('path');

(async () => {
  const outDir = path.resolve(process.cwd(), 'dist');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const baseUrl = 'http://localhost:8180'; // server started by the workflow

  const pagesToPrint = [
    { url: `${baseUrl}/`, out: path.join(outDir, 'resume-home.pdf') },
    { url: `${baseUrl}/resume`, out: path.join(outDir, 'resume.pdf') },
    { url: `${baseUrl}/projects/project-foo`, out: path.join(outDir, 'project-foo.pdf') },
  ];

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 1200, height: 800 },
    });

    for (const p of pagesToPrint) {
      const page = await context.newPage();
      console.log('Navigating to', p.url);
      await page.goto(p.url, { waitUntil: 'networkidle' , timeout: 60000 });
      // wait small extra time in case client islands need to hydrate
      await page.waitForTimeout(500);
      console.log('Printing to PDF ->', p.out);
      await page.pdf({
        path: p.out,
        format: 'A4',
        printBackground: true,
        margin: { top: '16mm', bottom: '16mm', left: '12mm', right: '12mm' },
      });
      await page.close();
    }
  } catch (err) {
    console.error('Error generating PDFs:', err);
    process.exitCode = 2;
  } finally {
    await browser.close();
  }
  console.log('Done.');
})();
