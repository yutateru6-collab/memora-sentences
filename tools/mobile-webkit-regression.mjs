import { webkit } from 'playwright';
import fs from 'node:fs/promises';

const baseUrl = process.env.APP_URL || 'http://127.0.0.1:3000';
const reportPath = 'qa-artifacts/report.json';
const screenshotDir = 'qa-artifacts/screenshots';

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
  const footer = rect('.create-home__footer');
  const createRoot = rect('.create-home');
  const shell = rect('.memora-world--create');
  const glass = document.querySelector('.create-home__glass-card');
  const createNode = document.querySelector('.create-home');
  const shellNode = document.querySelector('.memora-world--create');
  const glassStyle = glass instanceof HTMLElement ? getComputedStyle(glass) : null;
  const createStyle = createNode instanceof HTMLElement ? getComputedStyle(createNode) : null;
  const shellStyle = shellNode instanceof HTMLElement ? getComputedStyle(shellNode) : null;

  return {
    topic,
    choices,
    persona,
    actions,
    footer,
    createRoot,
    shell,
    gaps: {
      topicToChoices: topic && choices ? choices.top - topic.bottom : null,
      choicesToPersona: choices && persona ? persona.top - choices.bottom : null,
      personaToActions: persona && actions ? actions.top - persona.bottom : null,
      actionsToFooter: actions && footer ? footer.top - actions.bottom : null,
    },
    document: {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    },
    scrollStructure: {
      create: {
        overflowX: createStyle?.overflowX || '',
        overflowY: createStyle?.overflowY || '',
        minHeight: createStyle?.minHeight || '',
      },
      shell: {
        overflowX: shellStyle?.overflowX || '',
        overflowY: shellStyle?.overflowY || '',
        minHeight: shellStyle?.minHeight || '',
      },
    },
    glassBackdropFilter: glassStyle?.backdropFilter || '',
    glassWebkitBackdropFilter: glassStyle?.webkitBackdropFilter || '',
  };
});

const assertCreateLayout = (snapshot, label) => {
  const ordered = [snapshot.topic, snapshot.choices, snapshot.persona, snapshot.actions, snapshot.footer];
  if (ordered.some(value => !value)) throw new Error(`${label}: create sections are missing: ${JSON.stringify(snapshot)}`);
  if (!snapshot.createRoot || !snapshot.shell) throw new Error(`${label}: create roots are missing: ${JSON.stringify(snapshot)}`);
  if (snapshot.document.horizontalOverflow) throw new Error(`${label}: horizontal overflow: ${JSON.stringify(snapshot.document)}`);

  for (const [name, gap] of Object.entries(snapshot.gaps)) {
    if (gap === null || gap < -1 || gap > 48) {
      throw new Error(`${label}: invalid vertical gap ${name}=${gap}: ${JSON.stringify(snapshot)}`);
    }
  }

  const heightLimits = [280, 160, 360, 320, 180];
  ordered.forEach((rectValue, index) => {
    if (rectValue.height <= 0 || rectValue.height > heightLimits[index]) {
      throw new Error(`${label}: implausible section height at index ${index}: ${JSON.stringify(snapshot)}`);
    }
  });

  // The footer intentionally uses an 18px negative bottom margin, so its paint
  // box may extend slightly beyond the create root. Anything materially larger
  // points to the blank-space regression seen after iOS keyboard dismissal.
  if (snapshot.footer.bottom > snapshot.createRoot.bottom + 24) {
    throw new Error(`${label}: footer escaped create root: ${JSON.stringify(snapshot)}`);
  }
  if (snapshot.createRoot.bottom > snapshot.shell.bottom + 2) {
    throw new Error(`${label}: create root escaped app shell: ${JSON.stringify(snapshot)}`);
  }

  for (const [name, structure] of Object.entries(snapshot.scrollStructure)) {
    if (structure.overflowX !== 'clip' || structure.overflowY !== 'visible') {
      throw new Error(`${label}: ${name} must not be a nested scroll container: ${JSON.stringify(snapshot.scrollStructure)}`);
    }
  }

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

  await page.setViewportSize({ width: 393, height: 520 });
  await page.waitForTimeout(250);
  const keyboardSized = await layoutSnapshot(page);
  assertCreateLayout(keyboardSized, 'keyboard-sized-viewport');
  result.actions.push('shrink-viewport-like-ios-keyboard');

  await topic.evaluate(element => element.blur());
  await page.waitForTimeout(100);
  await page.setViewportSize({ width: 393, height: 852 });
  await page.waitForTimeout(300);
  const restored = await layoutSnapshot(page);
  assertCreateLayout(restored, 'restored-after-keyboard');
  result.actions.push('restore-viewport-after-keyboard');

  const restoredDocumentDelta = Math.abs(restored.document.scrollHeight - before.document.scrollHeight);
  if (restoredDocumentDelta > 80) {
    throw new Error(`restored-after-keyboard: document height drifted by ${restoredDocumentDelta}px: ${JSON.stringify({ before: before.document, restored: restored.document })}`);
  }

  result.states.create = { before, focused, keyboardSized, restored };
  result.screenshots.create = `${screenshotDir}/iphone-16-webkit-create-after-keyboard-cycle.png`;
  await page.screenshot({ path: result.screenshots.create, fullPage: false, scale: 'device' });

  await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.className = 'memora-reader-sentence';
    probe.dataset.testid = 'webkit-reader-probe';
    probe.style.cssText = 'position:fixed;left:16px;top:120px;z-index:99999;padding:16px;background:#0f1f45;border-radius:12px;';

    const inlinePlay = document.createElement('button');
    inlinePlay.type = 'button';
    inlinePlay.dataset.testid = 'webkit-inline-play-probe';
    inlinePlay.textContent = '▶';

    const word = document.createElement('span');
    word.dataset.wordCard = 'originate';
    word.dataset.testid = 'webkit-word-probe';
    word.textContent = 'originate';
    word.style.cssText = 'display:inline-block;padding:12px;font-size:24px;background:#8a6f16;color:white;';
    word.addEventListener('click', () => {
      word.dataset.tapActivated = 'true';
      word.textContent = 'originate ✓';
    });

    probe.append(inlinePlay, word);
    document.body.appendChild(probe);
  });

  const inlineSentencePlay = page.locator('[data-testid="webkit-inline-play-probe"]');
  if (await inlineSentencePlay.isVisible()) {
    throw new Error('Per-sentence play triangle CSS is not hiding the inline button.');
  }
  result.actions.push('verify-inline-play-hidden-webkit');

  const word = page.locator('[data-testid="webkit-word-probe"]');
  await word.waitFor({ state: 'visible', timeout: 10_000 });
  const wordStyle = await word.evaluate(element => {
    const style = getComputedStyle(element);
    return {
      userSelect: style.userSelect,
      webkitUserSelect: style.webkitUserSelect,
      touchAction: style.touchAction,
    };
  });
  const effectiveUserSelect = wordStyle.webkitUserSelect || wordStyle.userSelect;
  if (effectiveUserSelect !== 'none' || wordStyle.touchAction !== 'manipulation') {
    throw new Error(`Registered word touch style is not effective on WebKit: ${JSON.stringify(wordStyle)}`);
  }

  await word.tap();
  await page.waitForFunction(() => document.querySelector('[data-testid="webkit-word-probe"]')?.getAttribute('data-tap-activated') === 'true', null, { timeout: 10_000 });
  result.actions.push('verify-touch-tap-bridge-webkit');
  result.states.readerTouchProbe = { wordStyle, effectiveUserSelect, activated: true };
  result.screenshots.readerTouchProbe = `${screenshotDir}/iphone-16-webkit-word-tap-probe.png`;
  await page.screenshot({ path: result.screenshots.readerTouchProbe, fullPage: false, scale: 'device' });

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
