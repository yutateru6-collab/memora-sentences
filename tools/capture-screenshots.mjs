import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseUrl = process.env.APP_URL || 'http://127.0.0.1:3000';
const outDir = process.env.SCREENSHOT_DIR || 'qa-artifacts/screenshots';
const reportPath = 'qa-artifacts/report.json';
const sampleTitle = 'QA Ramen Culture';
const sampleMaterial = JSON.stringify([
  {
    start: 0,
    end: 0,
    english: 'Ramen is one of Japan’s most popular foods.',
    japanese: 'ラーメンは日本で最も人気のある食べ物の一つです。',
    explanation: '',
    words: [],
  },
]);

const targets = [
  {
    name: 'desktop-1440x900',
    context: {
      viewport: { width: 1440, height: 900 },
      screen: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    },
  },
  {
    name: 'iphone-16',
    context: {
      viewport: { width: 393, height: 852 },
      screen: { width: 393, height: 852 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    },
  },
];

await fs.mkdir(outDir, { recursive: true });
await fs.mkdir('qa-artifacts', { recursive: true });

const errorText = error => error instanceof Error ? `${error.name}: ${error.message}` : String(error);

async function documentState(page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    clientWidth: document.documentElement.clientWidth,
    clientHeight: document.documentElement.clientHeight,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
}

async function mascotState(page) {
  return page.evaluate(() => {
    const images = [...document.images]
      .filter(image => image.src.includes('/memora-world/'))
      .map(image => ({
        src: new URL(image.src).pathname,
        loaded: image.complete && image.naturalWidth > 0,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
      }));
    return { count: images.length, images };
  });
}

async function saveScreenshots(page, target, state) {
  const prefix = `${outDir}/${target.name}-${state}`;
  const viewport = `${prefix}-viewport.png`;
  const full = `${prefix}-full.png`;
  const preview = `${prefix}-ai-preview.jpg`;
  await page.screenshot({ path: viewport, fullPage: false, scale: 'device' });
  await page.screenshot({ path: full, fullPage: true, scale: 'device' });
  await page.screenshot({ path: preview, fullPage: false, type: 'jpeg', quality: 60, scale: 'css' });
  return { viewport, full, preview };
}

async function assertNoOverflow(page, label) {
  const state = await documentState(page);
  if (state.horizontalOverflow) throw new Error(`${label} has horizontal overflow: ${JSON.stringify(state)}`);
  return state;
}

async function assertMascot(page, expectedPath, label) {
  const state = await mascotState(page);
  if (state.count !== 1) throw new Error(`${label} must show exactly one MEMORA mascot: ${JSON.stringify(state)}`);
  if (state.images[0]?.src !== expectedPath || !state.images[0]?.loaded) {
    throw new Error(`${label} mascot did not load from ${expectedPath}: ${JSON.stringify(state)}`);
  }
  return state;
}

const results = [];
const browser = await chromium.launch({ headless: true });

for (const target of targets) {
  const result = {
    target: target.name,
    viewport: target.context.viewport,
    deviceScaleFactor: target.context.deviceScaleFactor,
    status: 'failure',
    actions: [],
    consoleErrors: [],
    pageErrors: [],
    states: {},
    screenshots: {},
    failure: null,
  };
  const context = await browser.newContext(target.context);
  const page = await context.newPage();
  page.on('console', message => {
    if (message.type() === 'error') result.consoleErrors.push(message.text());
  });
  page.on('pageerror', error => result.pageErrors.push(String(error)));

  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.getByRole('heading', { name: '教材をつくる', exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
    await page.waitForTimeout(400);
    result.actions.push('open-create-home');

    const createBodyText = (await page.locator('body').innerText()).replace(/\s+/g, '');
    for (const text of [
      '好きなテーマを、自分だけの英語教材に。',
      '英語レベルや長さ、解説キャラも自由に選べます。',
      '入れたいこと',
      '長文の長さ',
      '性格',
      'AI Studioで教材をつくる',
      'できた教材を取り込む',
      '作成用の指示だけコピー',
    ]) {
      if (!createBodyText.includes(text.replace(/\s+/g, ''))) {
        throw new Error(`Create copy is missing: ${text}`);
      }
    }
    result.states.create = {
      document: await assertNoOverflow(page, 'Create'),
      mascot: await assertMascot(page, '/memora-world/create-v1.webp', 'Create'),
    };
    result.screenshots.create = await saveScreenshots(page, target, 'create');

    await page.getByRole('button', { name: '教材一覧' }).click();
    await page.getByRole('heading', { name: '教材ライブラリ', exact: true }).waitFor({ state: 'visible', timeout: 15_000 });
    await page.getByRole('heading', { name: 'まだ教材がありません', exact: true }).waitFor({ state: 'visible', timeout: 15_000 });
    result.actions.push('open-empty-library');
    result.states.libraryEmpty = {
      document: await assertNoOverflow(page, 'Empty library'),
      mascot: await assertMascot(page, '/memora-world/read-v1.webp', 'Empty library'),
    };
    result.screenshots.libraryEmpty = await saveScreenshots(page, target, 'library-empty');

    await page.getByRole('button', { name: '教材を追加' }).click();
    await page.getByRole('heading', { name: '新しい教材を追加', exact: true }).waitFor({ state: 'visible', timeout: 10_000 });
    result.actions.push('open-importer');
    for (const text of [
      '教材名',
      '1. 教材データ',
      'AI Studioで作った結果を貼り付けます。',
      '2. 音声',
      '3. タイムスタンプ',
      '4. 単語カード',
      '5. 表紙画像',
      '教材として取り込む',
    ]) {
      if (!(await page.getByText(text, { exact: false }).first().isVisible())) {
        throw new Error(`Importer copy is missing: ${text}`);
      }
    }
    result.states.importer = { document: await assertNoOverflow(page, 'Importer') };
    result.screenshots.importer = await saveScreenshots(page, target, 'importer');

    await page.getByPlaceholder('例：Japan’s Ramen Culture').fill(sampleTitle);
    await page.getByPlaceholder('AI Studioで作った教材データをここに貼り付けてください').fill(sampleMaterial);
    await page.getByRole('button', { name: '教材として取り込む' }).click();
    await page.getByRole('heading', { name: sampleTitle, exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
    result.actions.push('import-material-and-open-reader');

    await page.getByRole('button').first().click();
    await page.getByRole('heading', { name: '教材ライブラリ', exact: true }).waitFor({ state: 'visible', timeout: 15_000 });
    const card = page.getByRole('article').filter({ hasText: sampleTitle }).first();
    await card.waitFor({ state: 'visible', timeout: 15_000 });
    if (!(await card.getByText(/読む・約\d+語/).isVisible())) throw new Error('Reading word-count badge is missing.');
    if (!(await card.getByRole('button', { name: '読む', exact: true }).isVisible())) throw new Error('Read action is missing.');
    result.actions.push('return-to-library-and-verify-card');
    result.states.libraryCard = {
      document: await assertNoOverflow(page, 'Library card'),
      mascot: await assertMascot(page, '/memora-world/read-v1.webp', 'Library card'),
    };
    result.screenshots.libraryCard = await saveScreenshots(page, target, 'library-card');

    await page.getByRole('button', { name: 'ライブラリメニュー' }).click();
    for (const menuItem of ['教材をつくる', '単語デッキ', '新しいフォルダ', 'パーソナル設定', '表示テーマ', '整理・削除']) {
      if (!(await page.getByText(menuItem, { exact: true }).isVisible())) throw new Error(`Library menu item is missing: ${menuItem}`);
    }
    result.actions.push('verify-library-menu');

    if (result.consoleErrors.length) throw new Error(`Console errors: ${result.consoleErrors.join(' | ')}`);
    if (result.pageErrors.length) throw new Error(`Page errors: ${result.pageErrors.join(' | ')}`);
    result.status = 'success';
  } catch (error) {
    result.failure = errorText(error);
    try {
      const path = `${outDir}/${target.name}-failure.png`;
      await page.screenshot({ path, fullPage: false, scale: 'device' });
      result.screenshots.failure = path;
    } catch {}
  } finally {
    results.push(result);
    await context.close();
  }
}

await browser.close();

const status = results.every(result => result.status === 'success') ? 'success' : 'failure';
const report = {
  generatedAt: new Date().toISOString(),
  repository: process.env.QA_REPOSITORY || null,
  commitSha: process.env.QA_COMMIT_SHA || null,
  workflowRunId: process.env.QA_RUN_ID || null,
  workflowRunNumber: process.env.QA_RUN_NUMBER || null,
  eventName: process.env.QA_EVENT_NAME || null,
  baseUrl,
  sampleTitle,
  status,
  results,
};
await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
console.log(`Saved ${reportPath} with status=${status}`);
if (status !== 'success') process.exitCode = 1;
