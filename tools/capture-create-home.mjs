import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseUrl = process.env.APP_URL || 'http://127.0.0.1:3000';
const outDir = 'qa-create-home-artifacts/screenshots';
const reportPath = 'qa-create-home-artifacts/report.json';

await fs.mkdir(outDir, { recursive: true });
await fs.mkdir('qa-create-home-artifacts', { recursive: true });

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

async function runHomeFlow(page, result) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByRole('heading', { name: '教材をつくる', exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
  result.actions.push('open-create-home');

  await page.getByTestId('create-topic').fill('星と恐竜の英語学習');
  await page.getByTestId('create-keyword').fill('星空、恐竜、英語学習');
  await page.getByTestId('create-level').selectOption({ label: '英検2級' });
  await page.getByTestId('create-length').selectOption('600');
  await page.getByTestId('create-role').selectOption({ label: '高校教師' });
  await page.getByTestId('create-trait').selectOption({ label: '完全なるポジティブ' });
  result.actions.push('fill-generation-settings');

  await page.getByTestId('create-copy').click();
  await page.getByText('コピーしました！', { exact: true }).waitFor({ state: 'visible', timeout: 5_000 });
  result.actions.push('copy-prompt');

  const heroDino = page.locator('.create-home__hero-dino');
  result.checks.heroDinoLoaded = await heroDino.evaluate(img => img.complete && img.naturalWidth > 0);
  result.checks.primaryActionVisible = await page.getByTestId('create-open-ai-studio').isVisible();
  result.checks.importActionVisible = await page.getByTestId('create-import').isVisible();
  result.checks.copyActionVisible = await page.getByTestId('create-copy').isVisible();
  result.checks.libraryActionVisible = await page.getByRole('button', { name: '教材一覧', exact: true }).isVisible();
  result.checks.levelSelected = (await page.getByTestId('create-level').inputValue()).includes('英検2級');
  result.checks.lengthSelected = (await page.getByTestId('create-length').inputValue()) === '600';

  const beforeImport = await documentState(page);
  result.checks.noHorizontalOverflowBeforeImport = !beforeImport.horizontalOverflow;

  const prefix = `${outDir}/${result.target}-create-home`;
  await page.screenshot({ path: `${prefix}-viewport.png`, fullPage: false, scale: 'device' });
  await page.screenshot({ path: `${prefix}-full.png`, fullPage: true, scale: 'device' });
  await page.screenshot({ path: `${prefix}-ai-preview.jpg`, fullPage: false, type: 'jpeg', quality: 58, scale: 'css' });
  await page.locator('.create-home__persona-card').screenshot({ path: `${prefix}-persona.png`, scale: 'device' });
  result.screenshots.viewport = `${prefix}-viewport.png`;
  result.screenshots.full = `${prefix}-full.png`;
  result.screenshots.aiPreview = `${prefix}-ai-preview.jpg`;
  result.screenshots.persona = `${prefix}-persona.png`;

  await page.getByTestId('create-import').click();
  await page.getByRole('heading', { name: '新しいデータを追加', exact: true }).waitFor({ state: 'visible', timeout: 10_000 });
  result.actions.push('open-generated-result-import');
  result.checks.importModalOpened = true;
  result.checks.importTextareaFocused = await page.locator('textarea').first().evaluate(el => document.activeElement === el).catch(() => false);

  await page.screenshot({ path: `${prefix}-import-modal.png`, fullPage: false, scale: 'device' });
  result.screenshots.importModal = `${prefix}-import-modal.png`;

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByRole('heading', { name: '教材をつくる', exact: true }).waitFor({ state: 'visible', timeout: 15_000 });
  await page.getByRole('button', { name: '教材一覧', exact: true }).click();
  await page.getByRole('heading', { name: 'Library', exact: true }).waitFor({ state: 'visible', timeout: 10_000 });
  result.actions.push('open-library');
  result.checks.libraryNavigationWorks = true;

  result.document = await documentState(page);
  result.url = page.url();
  result.pageTitle = await page.title();
}

const browser = await chromium.launch({ headless: true });
const results = [];

for (const target of targets) {
  const result = {
    target: target.name,
    viewport: target.context.viewport,
    deviceScaleFactor: target.context.deviceScaleFactor,
    status: 'failure',
    consoleErrors: [],
    pageErrors: [],
    actions: [],
    checks: {},
    screenshots: {},
    failure: null,
  };

  const context = await browser.newContext(target.context);
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseUrl });
  const page = await context.newPage();
  page.on('console', msg => { if (msg.type() === 'error') result.consoleErrors.push(msg.text()); });
  page.on('pageerror', err => result.pageErrors.push(String(err)));

  try {
    await runHomeFlow(page, result);
    const allChecksPassed = Object.values(result.checks).every(Boolean);
    if (!allChecksPassed) throw new Error(`Create-home checks failed: ${JSON.stringify(result.checks)}`);
    if (result.consoleErrors.length) throw new Error(`Console errors: ${result.consoleErrors.join(' | ')}`);
    if (result.pageErrors.length) throw new Error(`Page errors: ${result.pageErrors.join(' | ')}`);
    result.status = 'success';
  } catch (error) {
    result.failure = errorText(error);
    try {
      const prefix = `${outDir}/${target.name}-failure`;
      await page.screenshot({ path: `${prefix}.png`, fullPage: false, scale: 'device' });
      await page.screenshot({ path: `${prefix}.jpg`, fullPage: false, type: 'jpeg', quality: 58, scale: 'css' });
      result.screenshots.failure = `${prefix}.png`;
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
  baseUrl,
  status,
  results,
};

await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
console.log(`Saved ${reportPath} with status=${status}`);
console.log(`QA_CREATE_HOME_REPORT=${JSON.stringify(report)}`);
if (status !== 'success') process.exitCode = 1;
