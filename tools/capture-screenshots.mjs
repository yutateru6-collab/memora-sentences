import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';

const baseUrl = process.env.APP_URL || 'http://127.0.0.1:3000';
const outDir = process.env.SCREENSHOT_DIR || 'qa-artifacts/screenshots';

await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

const sampleTitle = 'QA Long Reading Sample';
const samplePassage = `Every morning, a small bakery near the station opens before sunrise.
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

async function captureAiPreview(page, context, target, prefix, { fullPage = false } = {}) {
  const viewportPath = `${outDir}/${target.name}-${prefix}-viewport.png`;
  const fullPath = `${outDir}/${target.name}-${prefix}-full.png`;
  const previewPath = `${outDir}/${target.name}-${prefix}-preview.jpg`;
  const aiPreviewPath = `${outDir}/${target.name}-${prefix}-ai-preview.jpg`;

  await page.screenshot({ path: viewportPath, fullPage: false });
  await page.screenshot({ path: fullPath, fullPage: true });

  const previewBuffer = await page.screenshot({
    path: previewPath,
    fullPage,
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

  return {
    viewport: viewportPath,
    fullPage: fullPath,
    preview: previewPath,
    aiPreview: aiPreviewPath,
  };
}

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
    const libraryDimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      clientWidth: document.documentElement.clientWidth,
      clientHeight: document.documentElement.clientHeight,
    }));

    const libraryScreenshots = await captureAiPreview(page, context, target, 'library');

    // Real user flow: open the add-material modal, enter a long passage, create it,
    // wait for ReaderScreen, then capture the actual reading view.
    await page.getByRole('button', { name: /手持ちの教材を追加/ }).click();
    await page.getByPlaceholder('教材名 (任意)').fill(sampleTitle);
    await page.getByPlaceholder(/テキスト、または匿名掲示板/).fill(samplePassage);
    await page.getByRole('button', { name: 'データを読み込んで作成' }).click();

    await page.getByText('Every morning, a small bakery near the station opens before sunrise.', { exact: false }).first().waitFor({
      state: 'visible',
      timeout: 60_000,
    });
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);

    const readerDimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      clientWidth: document.documentElement.clientWidth,
      clientHeight: document.documentElement.clientHeight,
    }));

    const readerScreenshots = await captureAiPreview(page, context, target, 'reader', { fullPage: false });

    results.push({
      target: target.name,
      url: page.url(),
      title,
      startedAt,
      viewport,
      library: {
        dimensions: libraryDimensions,
        horizontalOverflow: libraryDimensions.scrollWidth > libraryDimensions.clientWidth,
        screenshots: libraryScreenshots,
      },
      reader: {
        sampleTitle,
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
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      baseUrl,
      sampleTitle,
      results,
    },
    null,
    2,
  ),
  'utf8',
);

console.log(`Saved screenshots and report under qa-artifacts/`);