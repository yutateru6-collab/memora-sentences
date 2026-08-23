import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseUrl = process.env.APP_URL || 'http://127.0.0.1:3000';
const outDir = process.env.SCREENSHOT_DIR || 'qa-artifacts/screenshots';

await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

const sampleTitle = 'QA Long Reading Sample';
const firstSentence = 'Every morning, a small bakery near the station opens before sunrise.';
const samplePassage = `${firstSentence}
毎朝、駅の近くにある小さなパン屋は日の出前に開店します。
The owner, Maya, started the shop after working for a large company for more than ten years.
店主のマヤは、大企業で10年以上働いた後にその店を始めました。
At first, she worried that people would choose cheaper bread from supermarkets instead of visiting her store.
最初、彼女は人々が店を訪れる代わりにスーパーの安いパンを選ぶのではないかと心配していました。
However, she decided to bake only a small number of loaves each day and to speak with every customer who came in.
しかし彼女は、毎日少量のパンだけを焼き、来店する一人ひとりの客と話すことにしました。
Over time, customers began to tell her about their families, their work, and even the problems they were facing.
やがて客たちは、家族や仕事、さらには自分たちが抱えている悩みまで彼女に話すようになりました。
Maya realized that many people were not simply buying bread; they were also looking for a familiar place where someone would remember them.
マヤは、多くの人が単にパンを買っているのではなく、自分のことを覚えてくれる人がいる居場所も求めているのだと気づきました。
She therefore placed a long wooden table near the window and invited customers to sit there whenever they had time.
そこで彼女は窓の近くに長い木のテーブルを置き、時間があるときはいつでも座っていくよう客に勧めました。
The table gradually became a meeting place for students, office workers, parents, and elderly neighbors.
そのテーブルは次第に、学生、会社員、親、高齢の近所の人々が集まる場所になりました。
Although the bakery never became a large business, Maya says its success should not be measured only by money.
そのパン屋は大きな事業にはなりませんでしたが、マヤは成功をお金だけで測るべきではないと言います。
For her, the most important achievement is that people who once entered as strangers now greet one another by name.
彼女にとって最も大切な成果は、かつて見知らぬ人として店に入ってきた人々が、今では互いを名前で呼んで挨拶することです。`;

const targets = [
  {
    name: 'desktop-1440x900',
    context: {
      viewport: { width: 1440, height: 900 },
      screen: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    },
    cropHeight: 500,
  },
  {
    // iPhone 16 (standard model) QA profile.
    // CSS viewport is kept at 393px wide for responsive-layout testing,
    // while @3x produces 1179px-wide source screenshots for visual inspection.
    name: 'iphone-16',
    context: {
      viewport: { width: 393, height: 852 },
      screen: { width: 393, height: 852 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    },
    cropHeight: 420,
  },
];

async function captureScreenshots(page, target, prefix, { fullPage = false } = {}) {
  const viewportPath = `${outDir}/${target.name}-${prefix}-viewport.png`;
  const fullPath = `${outDir}/${target.name}-${prefix}-full.png`;
  const previewPath = `${outDir}/${target.name}-${prefix}-ai-preview.jpg`;
  const cropPath = `${outDir}/${target.name}-${prefix}-top-crop.jpg`;

  // High-resolution source images. On iPhone 16 these use @3x device pixels.
  await page.screenshot({ path: viewportPath, fullPage: false, scale: 'device' });
  await page.screenshot({ path: fullPath, fullPage: true, scale: 'device' });

  // Lightweight ChatGPT preview: one pixel per CSS pixel, even when source is @3x.
  await page.screenshot({
    path: previewPath,
    fullPage,
    type: 'jpeg',
    quality: 55,
    scale: 'css',
  });

  const viewport = page.viewportSize();
  if (viewport) {
    // Focused crop remains high-resolution so small text and overlaps can be inspected.
    await page.screenshot({
      path: cropPath,
      type: 'jpeg',
      quality: 65,
      scale: 'device',
      clip: {
        x: 0,
        y: 0,
        width: viewport.width,
        height: Math.min(target.cropHeight, viewport.height),
      },
    });
  }

  return {
    viewport: viewportPath,
    fullPage: fullPath,
    aiPreview: previewPath,
    topCrop: cropPath,
  };
}

async function openAddMaterialModal(page) {
  await page.getByRole('heading', { name: 'Library' }).waitFor({ state: 'visible', timeout: 30_000 });
  const allButtons = (await page.locator('button').allTextContents())
    .map(text => text.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const visibleButtons = (await page.locator('button:visible').allTextContents())
    .map(text => text.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  console.log('All buttons on Library:', JSON.stringify(allButtons));
  console.log('Visible buttons on Library:', JSON.stringify(visibleButtons));

  const firstRunButton = page.locator('button').filter({ hasText: '手持ちの教材を追加' }).first();
  if (await firstRunButton.count()) {
    if (await firstRunButton.isVisible()) await firstRunButton.click();
    else await firstRunButton.evaluate(el => el.click());
    await page.getByRole('heading', { name: '新しいデータを追加' }).waitFor({ state: 'visible', timeout: 10_000 });
    return;
  }

  const floatingAdd = page.locator('button[title="新規追加"]').first();
  if (await floatingAdd.count()) {
    if (await floatingAdd.isVisible()) await floatingAdd.click();
    else await floatingAdd.evaluate(el => el.click());
    await page.getByRole('heading', { name: '新しいデータを追加' }).waitFor({ state: 'visible', timeout: 10_000 });
    return;
  }

  throw new Error(`Add-material button was not found. All buttons: ${allButtons.join(' | ')}`);
}

async function captureFirstSentence(page, target, normalizedFirstSentence) {
  const selector = 'data-qa-first-sentence-crop';
  const found = await page.evaluate(({ selector, needle }) => {
    const normalize = value => (value || '').replace(/\s+/g, '');
    const candidates = [...document.querySelectorAll('body *')]
      .filter(el => normalize(el.textContent).includes(needle))
      .map(el => ({ el, rect: el.getBoundingClientRect() }))
      .filter(item => item.rect.width > 20 && item.rect.height > 10)
      .sort((a, b) => (a.rect.width * a.rect.height) - (b.rect.width * b.rect.height));
    const best = candidates[0]?.el;
    if (!best) return false;
    best.setAttribute(selector, 'true');
    return true;
  }, { selector, needle: normalizedFirstSentence });

  if (!found) return null;
  const locator = page.locator(`[${selector}="true"]`).first();
  await locator.scrollIntoViewIfNeeded();
  const sentencePath = `${outDir}/${target.name}-reader-first-sentence.jpg`;
  await locator.screenshot({
    path: sentencePath,
    type: 'jpeg',
    quality: 70,
    scale: 'device',
  });
  return sentencePath;
}

try {
  for (const target of targets) {
    const context = await browser.newContext(target.context);
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => pageErrors.push(String(err)));

    const startedAt = new Date().toISOString();
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(2000);

    const title = await page.title();
    const viewport = page.viewportSize();
    const libraryDimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      clientWidth: document.documentElement.clientWidth,
      clientHeight: document.documentElement.clientHeight,
    }));
    const libraryScreenshots = await captureScreenshots(page, target, 'library');

    await openAddMaterialModal(page);
    await page.getByPlaceholder('教材名 (任意)').fill(sampleTitle);
    await page.getByPlaceholder(/テキスト、または匿名掲示板/).fill(samplePassage);
    await page.getByRole('button', { name: 'データを読み込んで作成' }).click();
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);

    const bodyText = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
    const normalizedBody = bodyText.replace(/\s+/g, '');
    const normalizedFirstSentence = firstSentence.replace(/\s+/g, '');
    const readerDetected = normalizedBody.includes(normalizedFirstSentence);
    console.log(`${target.name} post-submit readerDetected=${readerDetected}`);
    console.log(`${target.name} post-submit body excerpt: ${bodyText.slice(0, 1200)}`);

    const readerDimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      clientWidth: document.documentElement.clientWidth,
      clientHeight: document.documentElement.clientHeight,
    }));
    const readerScreenshots = await captureScreenshots(page, target, 'reader', { fullPage: false });
    readerScreenshots.firstSentence = await captureFirstSentence(page, target, normalizedFirstSentence);

    results.push({
      target: target.name,
      url: page.url(),
      title,
      startedAt,
      viewport,
      deviceScaleFactor: target.context.deviceScaleFactor,
      library: {
        dimensions: libraryDimensions,
        horizontalOverflow: libraryDimensions.scrollWidth > libraryDimensions.clientWidth,
        screenshots: libraryScreenshots,
      },
      reader: {
        sampleTitle,
        readerDetected,
        bodyExcerpt: bodyText.slice(0, 1200),
        dimensions: readerDimensions,
        horizontalOverflow: readerDimensions.scrollWidth > readerDimensions.clientWidth,
        screenshots: readerScreenshots,
      },
      consoleErrors,
      pageErrors,
    });

    await context.close();
  }
} finally {
  await browser.close();
}

await fs.mkdir('qa-artifacts', { recursive: true });
await fs.writeFile(
  'qa-artifacts/report.json',
  JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, sampleTitle, results }, null, 2),
  'utf8',
);
console.log('Saved screenshots and report under qa-artifacts/');