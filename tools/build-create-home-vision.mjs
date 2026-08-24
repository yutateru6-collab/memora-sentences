import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const screenshotsDir = process.env.SCREENSHOT_DIR || 'qa-create-home-artifacts/screenshots';
const visionDir = process.env.VISION_DIR || 'qa-create-home-artifacts/vision';
const WRAP = 4096;

const miniSources = [
  {
    source: 'desktop-1440x900-create-home-full.png',
    output: 'desktop-create-home-full-mini.jpg',
    width: 260,
    quality: 20,
  },
  {
    source: 'iphone-16-create-home-full.png',
    output: 'iphone-create-home-full-mini.jpg',
    width: 180,
    quality: 20,
  },
  {
    source: 'iphone-16-create-home-persona.png',
    output: 'iphone-create-home-persona-mini.jpg',
    width: 320,
    quality: 36,
  },
];

await fs.mkdir(visionDir, { recursive: true });
const manifest = { generatedAt: new Date().toISOString(), files: [] };

const browser = await chromium.launch({ headless: true });
try {
  for (const item of miniSources) {
    const inputPath = `${screenshotsDir}/${item.source}`;
    try {
      const bytes = await fs.readFile(inputPath);
      const dataUrl = `data:image/png;base64,${bytes.toString('base64')}`;
      const page = await browser.newPage({ viewport: { width: item.width, height: 300 }, deviceScaleFactor: 1 });
      await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0;background:#070d25;width:100%;}img{display:block;width:${item.width}px;height:auto}</style></head><body><img id="shot" src="${dataUrl}" alt=""></body></html>`, { waitUntil: 'load' });
      const height = await page.$eval('#shot', img => Math.max(1, Math.round(img.getBoundingClientRect().height)));
      await page.setViewportSize({ width: item.width, height });
      const miniPath = `${visionDir}/${item.output}`;
      await page.screenshot({ path: miniPath, type: 'jpeg', quality: item.quality, fullPage: true, scale: 'css' });
      await page.close();

      const miniBytes = await fs.readFile(miniPath);
      const encoded = miniBytes.toString('base64');
      const lines = encoded.match(new RegExp(`.{1,${WRAP}}`, 'g')) || [];
      const base64Output = `${miniPath}.b64`;
      await fs.writeFile(base64Output, `${lines.join('\n')}\n`, 'utf8');
      manifest.files.push({
        source: item.source,
        image: `vision/${item.output}`,
        base64: `vision/${item.output}.b64`,
        width: item.width,
        height,
        byteLength: miniBytes.length,
        sha256: crypto.createHash('sha256').update(miniBytes).digest('hex'),
        base64LineLength: WRAP,
        base64LineCount: lines.length,
      });
    } catch (error) {
      manifest.files.push({ source: item.source, missing: true, error: String(error) });
    }
  }
} finally {
  await browser.close();
}

await fs.writeFile(`${visionDir}/manifest.json`, JSON.stringify(manifest, null, 2), 'utf8');
console.log(JSON.stringify(manifest, null, 2));
