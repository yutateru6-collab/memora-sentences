import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseUrl = process.env.APP_URL || 'http://127.0.0.1:3000';
const outDir = process.env.SCREENSHOT_DIR || 'qa-artifacts/screenshots';
const reportPath = 'qa-artifacts/report.json';

const qaMeta = {
  repository: process.env.QA_REPOSITORY || null,
  commitSha: process.env.QA_COMMIT_SHA || null,
  workflowRunId: process.env.QA_RUN_ID || null,
  workflowRunNumber: process.env.QA_RUN_NUMBER || null,
  eventName: process.env.QA_EVENT_NAME || null,
};

await fs.mkdir(outDir, { recursive: true });
await fs.mkdir('qa-artifacts', { recursive: true });

const results = [];
let fatalError = null;
let browser = null;

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

const normalizeText = value => (value || '').replace(/\s+/g, '');
const errorText = error => error instanceof Error ? `${error.name}: ${error.message}` : String(error);

function addAction(result, name, status, details = {}) {
  result.actions.push({
    name,
    status,
    at: new Date().toISOString(),
    ...details,
  });
}

async function getDocumentState(page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    clientWidth: document.documentElement.clientWidth,
    clientHeight: document.documentElement.clientHeight,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
}

async function getVisibleViewportOutliers(page) {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    return [...document.querySelectorAll('body *')]
      .map(el => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return { el, style, rect };
      })
      .filter(({ style, rect }) => {
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
        if (rect.width <= 1 || rect.height <= 1) return false;
        return rect.left < -2 || rect.right > viewportWidth + 2;
      })
      .slice(0, 20)
      .map(({ el, rect }) => ({
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        className: typeof el.className === 'string' ? el.className.slice(0, 180) : null,
        text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      }));
  });
}

async function captureScreenshots(page, target, prefix) {
  const viewportPath = `${outDir}/${target.name}-${prefix}-viewport.png`;
  const fullPath = `${outDir}/${target.name}-${prefix}-full.png`;
  const previewPath = `${outDir}/${target.name}-${prefix}-ai-preview.jpg`;
  const cropPath = `${outDir}/${target.name}-${prefix}-top-crop.jpg`;

  await page.screenshot({ path: viewportPath, fullPage: false, scale: 'device' });
  await page.screenshot({ path: fullPath, fullPage: true, scale: 'device' });
  await page.screenshot({ path: previewPath, fullPage: false, type: 'jpeg', quality: 55, scale: 'css' });

  const viewport = page.viewportSize();
  if (viewport) {
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

  return { viewport: viewportPath, fullPage: fullPath, aiPreview: previewPath, topCrop: cropPath };
}

async function captureFailureEvidence(page, target, stage) {
  const safeStage = String(stage || 'unknown').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
  const png = `${outDir}/${target.name}-failure-${safeStage}-viewport.png`;
  const preview = `${outDir}/${target.name}-failure-${safeStage}-ai-preview.jpg`;
  try {
    await page.screenshot({ path: png, fullPage: false, scale: 'device' });
    await page.screenshot({ path: preview, fullPage: false, type: 'jpeg', quality: 55, scale: 'css' });
    return { viewport: png, aiPreview: preview };
  } catch (error) {
    return { captureError: errorText(error) };
  }
}

async function openAddMaterialModal(page) {
  await page.getByRole('heading', { name: 'Library' }).waitFor({ state: 'visible', timeout: 30_000 });

  const allButtons = (await page.locator('button').allTextContents())
    .map(text => text.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const visibleButtons = (await page.locator('button:visible').allTextContents())
    .map(text => text.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const firstRunButton = page.locator('button').filter({ hasText: '手持ちの教材を追加' }).first();
  if (await firstRunButton.count()) {
    if (await firstRunButton.isVisible()) await firstRunButton.click();
    else await firstRunButton.evaluate(el => el.click());
    await page.getByRole('heading', { name: '新しいデータを追加' }).waitFor({ state: 'visible', timeout: 10_000 });
    return { allButtons, visibleButtons, selector: 'text:手持ちの教材を追加' };
  }

  const floatingAdd = page.locator('button[title="新規追加"]').first();
  if (await floatingAdd.count()) {
    if (await floatingAdd.isVisible()) await floatingAdd.click();
    else await floatingAdd.evaluate(el => el.click());
    await page.getByRole('heading', { name: '新しいデータを追加' }).waitFor({ state: 'visible', timeout: 10_000 });
    return { allButtons, visibleButtons, selector: 'title:新規追加' };
  }

  throw new Error(`Add-material button was not found. Visible buttons: ${visibleButtons.join(' | ')}. All buttons: ${allButtons.join(' | ')}`);
}

async function waitForBodyIncludes(page, text, timeout = 15_000) {
  const needle = normalizeText(text);
  await page.waitForFunction(
    expected => (document.body?.innerText || '').replace(/\s+/g, '').includes(expected),
    needle,
    { timeout },
  );
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
  await locator.screenshot({ path: sentencePath, type: 'jpeg', quality: 70, scale: 'device' });
  return sentencePath;
}

try {
  browser = await chromium.launch({ headless: true });

  for (const target of targets) {
    const result = {
      target: target.name,
      status: 'failure',
      startedAt: new Date().toISOString(),
      viewport: target.context.viewport,
      deviceScaleFactor: target.context.deviceScaleFactor,
      url: null,
      pageTitle: null,
      actions: [],
      consoleErrors: [],
      pageErrors: [],
      failure: null,
      warnings: [],
    };

    let context = null;
    let page = null;
    let currentStage = 'create-context';

    try {
      context = await browser.newContext(target.context);
      page = await context.newPage();

      page.on('console', msg => {
        if (msg.type() === 'error') result.consoleErrors.push(msg.text());
      });
      page.on('pageerror', err => result.pageErrors.push(String(err)));

      currentStage = 'open-library';
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.getByRole('heading', { name: 'Library' }).waitFor({ state: 'visible', timeout: 30_000 });
      await page.waitForTimeout(500);
      result.url = page.url();
      result.pageTitle = await page.title();
      addAction(result, 'open-library', 'passed', { url: result.url, pageTitle: result.pageTitle });

      currentStage = 'capture-library';
      result.library = {
        dimensions: await getDocumentState(page),
        viewportOutliers: await getVisibleViewportOutliers(page),
        screenshots: await captureScreenshots(page, target, 'library'),
      };
      addAction(result, 'capture-library', 'passed', { horizontalOverflow: result.library.dimensions.horizontalOverflow });

      currentStage = 'open-add-material';
      const addModalEvidence = await openAddMaterialModal(page);
      addAction(result, 'open-add-material', 'passed', addModalEvidence);

      currentStage = 'fill-material';
      await page.getByPlaceholder('教材名 (任意)').fill(sampleTitle);
      await page.getByPlaceholder(/テキスト、または匿名掲示板/).fill(samplePassage);
      addAction(result, 'fill-material', 'passed', { sampleTitle, passageCharacters: samplePassage.length });

      currentStage = 'create-reader';
      await page.getByRole('button', { name: 'データを読み込んで作成' }).click();
      await waitForBodyIncludes(page, firstSentence, 20_000);
      await page.waitForTimeout(500);
      const bodyText = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
      const readerDetected = normalizeText(bodyText).includes(normalizeText(firstSentence));
      if (!readerDetected) throw new Error('Reader was not detected after creating the QA material.');
      addAction(result, 'create-reader', 'passed', { readerDetected });

      currentStage = 'capture-reader';
      result.reader = {
        sampleTitle,
        readerDetected,
        bodyExcerpt: bodyText.slice(0, 1200),
        dimensions: await getDocumentState(page),
        viewportOutliers: await getVisibleViewportOutliers(page),
        screenshots: await captureScreenshots(page, target, 'reader'),
      };
      result.reader.screenshots.firstSentence = await captureFirstSentence(page, target, normalizeText(firstSentence));
      addAction(result, 'capture-reader', 'passed', { horizontalOverflow: result.reader.dimensions.horizontalOverflow });

      currentStage = 'verify-persistence';
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.getByRole('heading', { name: 'Library' }).waitFor({ state: 'visible', timeout: 30_000 });
      await page.waitForTimeout(500);

      const persistedTitle = page.getByText(sampleTitle, { exact: true }).first();
      const persistedMaterialVisible = await persistedTitle.isVisible().catch(() => false);
      if (!persistedMaterialVisible) throw new Error('QA material was not present after reload; IndexedDB persistence check failed.');

      const continueButton = page.getByRole('button', { name: '続きから学習' }).first();
      const learningStartButton = page.getByRole('button', { name: '学習スタート' }).first();
      if (await continueButton.count() && await continueButton.isVisible()) {
        await continueButton.click();
      } else if (await learningStartButton.count() && await learningStartButton.isVisible()) {
        await learningStartButton.click();
      } else {
        throw new Error('Persisted material was visible, but no button to reopen it was available.');
      }

      await waitForBodyIncludes(page, firstSentence, 20_000);
      const reloadedBody = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
      const reopenedReaderDetected = normalizeText(reloadedBody).includes(normalizeText(firstSentence));
      if (!reopenedReaderDetected) throw new Error('Persisted QA material did not reopen in Reader.');

      result.persistence = {
        persistedMaterialVisible,
        reopenedReaderDetected,
        dimensions: await getDocumentState(page),
      };
      addAction(result, 'verify-persistence', 'passed', result.persistence);

      if (result.library.dimensions.horizontalOverflow) throw new Error('Library has horizontal document overflow.');
      if (result.reader.dimensions.horizontalOverflow) throw new Error('Reader has horizontal document overflow.');
      if (result.persistence.dimensions.horizontalOverflow) throw new Error('Reopened Reader has horizontal document overflow.');
      if (result.consoleErrors.length > 0) throw new Error(`Console errors detected: ${result.consoleErrors.join(' | ')}`);
      if (result.pageErrors.length > 0) throw new Error(`Page errors detected: ${result.pageErrors.join(' | ')}`);

      if (result.library.viewportOutliers.length > 0) result.warnings.push({ type: 'library-viewport-outliers', elements: result.library.viewportOutliers });
      if (result.reader.viewportOutliers.length > 0) result.warnings.push({ type: 'reader-viewport-outliers', elements: result.reader.viewportOutliers });

      result.status = 'success';
      addAction(result, 'final-assertions', 'passed', {
        consoleErrors: result.consoleErrors.length,
        pageErrors: result.pageErrors.length,
        warnings: result.warnings.length,
      });
    } catch (error) {
      const message = errorText(error);
      result.failure = { stage: currentStage, message };
      addAction(result, currentStage, 'failed', { error: message });
      if (page) {
        result.failure.screenshots = await captureFailureEvidence(page, target, currentStage);
        result.url = page.url();
        result.pageTitle = await page.title().catch(() => result.pageTitle);
        result.failure.visibleButtons = await page.locator('button:visible').allTextContents().catch(() => []);
        result.failure.bodyExcerpt = await page.locator('body').innerText().then(text => text.replace(/\s+/g, ' ').trim().slice(0, 1600)).catch(() => null);
      }
    } finally {
      result.finishedAt = new Date().toISOString();
      results.push(result);
      if (context) await context.close().catch(() => {});
    }
  }
} catch (error) {
  fatalError = errorText(error);
} finally {
  if (browser) await browser.close().catch(() => {});
}

const status = fatalError || results.length !== targets.length || results.some(result => result.status !== 'success')
  ? 'failure'
  : 'success';

const report = {
  generatedAt: new Date().toISOString(),
  status,
  baseUrl,
  sampleTitle,
  qaMeta,
  expectedTargets: targets.map(target => ({
    target: target.name,
    viewport: target.context.viewport,
    deviceScaleFactor: target.context.deviceScaleFactor,
  })),
  fatalError,
  results,
};

await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
console.log(`Saved QA report to ${reportPath} with status=${status}`);

if (status !== 'success') process.exitCode = 1;
