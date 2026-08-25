import { webkit } from 'playwright';
import fs from 'node:fs/promises';

const baseUrl = process.env.APP_URL || 'http://127.0.0.1:3000';
const reportPath = 'qa-artifacts/report.json';
const screenshotDir = 'qa-artifacts/screenshots';
const sampleTitle = 'QA WebKit Word Tap';
const sampleMaterial = `Ramen, a beloved culinary phenomenon, originates from Chinese wheat noodles transformed through Japanese innovation.\nラーメンは、中国の小麦麺が日本独自の工夫で発展した、愛される食文化です。\n[解説] ゆきぽよ（ギャル）: a beloved culinary phenomenon は Ramen と同格だよ。主語は Ramen、動詞は originates！\n----------\n[\n  {\n    "front": "originate",\n    "back": "由来する、始まる",\n    "pronunciation": "オ[リ]ジネイト",\n    "memo": "【語源・雑学】origin と同じ語源。\\n【覚え方】オリジンから始まる、と覚える。\\n【例文】Great ramen ideas originate after midnight."\n  }\n]\n----------\nラーメンは中国由来の麺文化を、日本で独自に発展させた料理です。`;

await fs.mkdir(screenshotDir, { recursive: true });

const result = {
  engine: 'webkit',
  target: 'iphone-16-webkit',
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 3,
  status: 'failure',
  actions: [],
  consoleErrors: [],
  pageErrors: [],
  states: {},
  screenshots: {},
  failure: null,
};

const errorText = error => error instanceof Error ? `${error.name}: ${error.message}` : String(error);

const layoutSnapshot = async page => page.evaluate(() => {
  const rect = selector => {
    const node = document.querySelector(selector);
    if (!(node instanceof HTMLElement)) return null;
    const value = node.getBoundingClientRect();
    return {
      top: value.top + window.scrollY,
      bottom: value.bottom + window.scrollY,
      height: value.height,
      width: value.width,
    };
  };

  const topic = rect('.create-home__topic-card');
  const choices = rect('.create-home__choice-grid');
  const persona = rect('.create-home__persona-card');
  const actions = rect('.create-home__actions');
  const glass = document.querySelector('.create-home__glass-card');
  const glassStyle = glass instanceof HTMLElement ? getComputedStyle(glass) : null;

  return {
    topic,
    choices,
    persona,
    actions,
    gaps: {
      topicToChoices: topic && choices ? choices.top - topic.bottom : null,
      choicesToPersona: choices && persona ? persona.top - choices.bottom : null,
      personaToActions: persona && actions ? actions.top - persona.bottom : null,
    },
    document: {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    },
    glassBackdropFilter: glassStyle?.backdropFilter || '',
    glassWebkitBackdropFilter: glassStyle?.webkitBackdropFilter || '',
  };
});

const assertCreateLayout = (snapshot, label) => {
  const ordered = [snapshot.topic, snapshot.choices, snapshot.persona, snapshot.actions];
  if (ordered.some(value => !value)) throw new Error(`${label}: create sections are missing: ${JSON.stringify(snapshot)}`);
  if (snapshot.document.horizontalOverflow) throw new Error(`${label}: horizontal overflow: ${JSON.stringify(snapshot.document)}`);

  for (const [name, gap] of Object.entries(snapshot.gaps)) {
    if (gap === null || gap < -1 || gap > 48) {
      throw new Error(`${label}: invalid vertical gap ${name}=${gap}: ${JSON.stringify(snapshot)}`);
    }
  }

  const heightLimits = [280, 260, 360, 320];
  ordered.forEach((rect, index) => {
    if (rect.height <= 0 || rect.height > heightLimits[index]) {
      throw new Error(`${label}: implausible section height at index ${index}: ${JSON.stringify(snapshot)}`);
    }
  });

  if (snapshot.glassBackdropFilter !== 'none' || snapshot.glassWebkitBackdropFilter !== 'none') {
    throw new Error(`${label}: mobile glass blur must be disabled for WebKit stability: ${JSON.stringify(snapshot)}`);
  }
};

let browser;
let context;
let page;

try {
  browser = await webkit.launch({ headless: true });
  context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    screen: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  });
  page = await context.newPage();
  page.on('console', message => {
    if (message.type() === 'error') result.consoleErrors.push(message.text());
  });
  page.on('pageerror', error => result.pageErrors.push(String(error)));

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByRole('heading', { name: 'リードン READON', exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
  result.actions.push('open-create-home-webkit');

  const before = await layoutSnapshot(page);
  assertCreateLayout(before, 'before-input');

  const topic = page.getByTestId('create-topic');
  await topic.tap();
  await topic.fill('小池栄子 根本はるみ');
  await page.waitForTimeout(250);
  const focused = await layoutSnapshot(page);
  assertCreateLayout(focused, 'topic-focused');
  result.actions.push('tap-and-fill-topic');

  await topic.evaluate(element => element.blur());
  await page.waitForTimeout(250);
  const blurred = await layoutSnapshot(page);
  assertCreateLayout(blurred, 'topic-blurred');
  result.actions.push('blur-topic-and-verify-flow');

  result.states.create = { before, focused, blurred };
  result.screenshots.create = `${screenshotDir}/iphone-16-webkit-create-after-topic.png`;
  await page.screenshot({ path: result.screenshots.create, fullPage: false, scale: 'device' });

  await page.getByRole('button', { name: '教材一覧' }).tap();
  await page.getByRole('heading', { name: '教材ライブラリ', exact: true }).waitFor({ state: 'visible', timeout: 15_000 });
  await page.getByRole('button', { name: '教材を追加' }).tap();
  await page.getByRole('heading', { name: '新しい教材を追加', exact: true }).waitFor({ state: 'visible', timeout: 10_000 });
  await page.getByPlaceholder('例：Japan’s Ramen Culture').fill(sampleTitle);
  await page.getByPlaceholder('AI Studioで作った教材データをここに貼り付けてください').fill(sampleMaterial);
  await page.getByRole('button', { name: '教材として取り込む' }).tap();
  await page.getByRole('heading', { name: sampleTitle, exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
  result.actions.push('import-material-and-open-reader-webkit');

  const inlineSentencePlay = page.locator('.memora-reader-sentence > button').first();
  if (await inlineSentencePlay.count() && await inlineSentencePlay.isVisible()) {
    throw new Error('Per-sentence play triangle is still visible.');
  }
  result.actions.push('verify-inline-play-hidden');

  const word = page.locator('[data-word-card]').first();
  await word.waitFor({ state: 'visible', timeout: 10_000 });
  const wordStyle = await word.evaluate(element => {
    const style = getComputedStyle(element);
    return {
      userSelect: style.userSelect,
      webkitUserSelect: style.webkitUserSelect,
      touchAction: style.touchAction,
    };
  });
  if (wordStyle.userSelect !== 'none' || wordStyle.webkitUserSelect !== 'none') {
    throw new Error(`Registered word remains selectable on touch WebKit: ${JSON.stringify(wordStyle)}`);
  }

  await word.tap();
  const wordDialog = page.getByRole('dialog', { name: /originate の単語情報/ }).last();
  await wordDialog.waitFor({ state: 'visible', timeout: 10_000 });
  if (!(await wordDialog.getByText('由来する、始まる', { exact: true }).isVisible())) {
    throw new Error('Word meaning is missing from the mobile dialog.');
  }
  result.actions.push('tap-yellow-word-and-open-meaning');
  result.states.reader = { wordStyle };
  result.screenshots.readerWordDialog = `${screenshotDir}/iphone-16-webkit-reader-word-dialog.png`;
  await page.screenshot({ path: result.screenshots.readerWordDialog, fullPage: false, scale: 'device' });

  if (result.consoleErrors.length) throw new Error(`Console errors: ${result.consoleErrors.join(' | ')}`);
  if (result.pageErrors.length) throw new Error(`Page errors: ${result.pageErrors.join(' | ')}`);

  result.status = 'success';
} catch (error) {
  result.failure = errorText(error);
  if (page) {
    try {
      result.screenshots.failure = `${screenshotDir}/iphone-16-webkit-regression-failure.png`;
      await page.screenshot({ path: result.screenshots.failure, fullPage: false, scale: 'device' });
    } catch {}
  }
} finally {
  await context?.close().catch(() => {});
  await browser?.close().catch(() => {});
}

let report = {};
try {
  report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
} catch {}

report.mobileWebKit = result;
if (result.status !== 'success') report.status = 'failure';
await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

console.log(`MOBILE_WEBKIT_REPORT=${JSON.stringify(result)}`);
if (result.status !== 'success') process.exitCode = 1;
