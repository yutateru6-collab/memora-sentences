import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';

const baseUrl = process.env.APP_URL || 'http://127.0.0.1:3000';
const outDir = process.env.SCREENSHOT_DIR || 'qa-artifacts/screenshots';

await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

const targets = [
  {
    name: 'desktop-1440x900',
    context: {
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    },
    aiPreviewWidth: 640,
  },
  {
    name: 'iphone-15',
    context: {
      ...devices['iPhone 15'],
      deviceScaleFactor: 1,
    },
    aiPreviewWidth: 320,
  },
];

try {
  for (const target of targets) {
    const context = await browser.newContext(target.context);
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    const startedAt = new Date().toISOString();
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(2000);

    const title = await page.title();
    const viewport = page.viewportSize();
    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      clientWidth: document.documentElement.clientWidth,
      clientHeight: document.documentElement.clientHeight,
    }));

    const viewportPath = `${outDir}/${target.name}-viewport.png`;
    const fullPath = `${outDir}/${target.name}-full.png`;
    const previewPath = `${outDir}/${target.name}-preview.jpg`;
    const aiPreviewPath = `${outDir}/${target.name}-ai-preview.jpg`;

    await page.screenshot({ path: viewportPath, fullPage: false });
    await page.screenshot({ path: fullPath, fullPage: true });

    const previewBuffer = await page.screenshot({
      path: previewPath,
      fullPage: false,
      type: 'jpeg',
      quality: 50,
    });

    const previewPage = await context.newPage();
    const dataUrl = `data:image/jpeg;base64,${previewBuffer.toString('base64')}`;
    await previewPage.setContent(`
      <!doctype html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            html, body { margin: 0; padding: 0; background: #fff; }
            img { display: block; width: ${target.aiPreviewWidth}px; height: auto; }
          </style>
        </head>
        <body><img src="${dataUrl}" /></body>
      </html>
    `);
    await previewPage.locator('img').screenshot({
      path: aiPreviewPath,
      type: 'jpeg',
      quality: 50,
    });
    await previewPage.close();

    results.push({
      target: target.name,
      url: page.url(),
      title,
      startedAt,
      viewport,
      dimensions,
      horizontalOverflow: dimensions.scrollWidth > dimensions.clientWidth,
      consoleErrors,
      pageErrors,
      screenshots: {
        viewport: viewportPath,
        fullPage: fullPath,
        preview: previewPath,
        aiPreview: aiPreviewPath,
      },
    });

    await context.close();
  }
} finally {
  await browser.close();
}

await fs.mkdir('qa-artifacts', { recursive: true });
await fs.writeFile(
  'qa-artifacts/report.json',
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      baseUrl,
      results,
    },
    null,
    2,
  ),
  'utf8',
);

console.log(`Saved screenshots and report under qa-artifacts/`);
