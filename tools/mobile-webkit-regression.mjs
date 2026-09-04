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
  const htmlStyle = getComputedStyle(document.documentElement);
  const bodyStyle = getComputedStyle(document.body);
  const shellBeforeStyle = shellNode instanceof HTMLElement ? getComputedStyle(shellNode, '::before') : null;

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
      htmlCreateClass: document.documentElement.classList.contains('is-create-home'),
      bodyCreateClass: document.body.classList.contains('is-create-home'),
      htmlOverflowX: htmlStyle.overflowX,
      htmlOverflowY: htmlStyle.overflowY,
      bodyOverflowX: bodyStyle.overflowX,
      bodyOverflowY: bodyStyle.overflowY,
      bodyOverscrollY: bodyStyle.overscrollBehaviorY,
      bodyBackgroundColor: bodyStyle.backgroundColor,
      scrollingElement: document.scrollingElement?.tagName || '',
    },
    scrollStructure: {
      create: {
        overflowX: createStyle?.overflowX || '',
        overflowY: createStyle?.overflowY || '',
        minHeight: createStyle?.minHeight || '',
        isolation: createStyle?.isolation || '',
      },
      shell: {
        overflowX: shellStyle?.overflowX || '',
        overflowY: shellStyle?.overflowY || '',
        minHeight: shellStyle?.minHeight || '',
        isolation: shellStyle?.isolation || '',
        beforeDisplay: shellBeforeStyle?.display || '',
        beforeContent: shellBeforeStyle?.content || '',
      },
    },
    recovery: {
      count: Number(createNode?.dataset.keyboardRecoveryCount || 0),
      scheduled: createNode?.dataset.keyboardRecoveryScheduled || '',
      reason: createNode?.dataset.keyboardRecoveryReason || '',
      complete: createNode?.dataset.keyboardRecoveryComplete || '',
      keyboardState: createNode?.dataset.keyboardState || '',
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
    if (structure.overflowX !== 'visible' || structure.overflowY !== 'visible') {
      throw new Error(`${label}: ${name} must not be a nested scroll container: ${JSON.stringify(snapshot.scrollStructure)}`);
    }
    if (structure.isolation !== 'auto') {
      throw new Error(`${label}: ${name} must not create an isolated compositor group: ${JSON.stringify(snapshot.scrollStructure)}`);
    }
  }

  if (!snapshot.document.htmlCreateClass || !snapshot.document.bodyCreateClass) {
    throw new Error(`${label}: create document mode class is missing: ${JSON.stringify(snapshot.document)}`);
  }
  if (snapshot.document.bodyOverscrollY !== 'auto') {
    throw new Error(`${label}: create root overscroll must be restored to auto: ${JSON.stringify(snapshot.document)}`);
  }
  if (!['clip', 'hidden'].includes(snapshot.document.htmlOverflowX)) {
    throw new Error(`${label}: document root must own horizontal clipping: ${JSON.stringify(snapshot.document)}`);
  }
  if (!['auto', 'scroll'].includes(snapshot.document.htmlOverflowY)) {
    throw new Error(`${label}: document root must own vertical scrolling: ${JSON.stringify(snapshot.document)}`);
  }
  if (snapshot.document.bodyOverflowX !== 'visible' || snapshot.document.bodyOverflowY !== 'visible') {
    throw new Error(`${label}: body must not become a nested scroll container: ${JSON.stringify(snapshot.document)}`);
  }
  if (snapshot.document.scrollingElement !== 'HTML') {
    throw new Error(`${label}: scrolling element must remain the document root: ${JSON.stringify(snapshot.document)}`);
  }

  if (snapshot.scrollStructure.shell.beforeDisplay !== 'none' && snapshot.scrollStructure.shell.beforeContent !== 'none') {
    throw new Error(`${label}: create shell fixed flower layer must be disabled: ${JSON.stringify(snapshot.scrollStructure.shell)}`);
  }

  if (snapshot.glassBackdropFilter !== 'none' || snapshot.glassWebkitBackdropFilter !== 'none') {
    throw new Error(`${label}: mobile glass blur must be disabled for WebKit stability: ${JSON.stringify(snapshot)}`);
  }
};

const importerSnapshot = async page => page.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"][aria-labelledby="add-material-title"]');
  const body = document.querySelector('.memora-modal__body');
  const textarea = document.querySelector('.memora-import-textarea');
  const submit = [...document.querySelectorAll('button')].find(button => button.textContent?.includes('教材として取り込む'));
  const coverLabel = [...document.querySelectorAll('.memora-field-label')].find(label => label.textContent?.includes('5. 表紙画像'));
  if (!(dialog instanceof HTMLElement) || !(body instanceof HTMLElement) || !(textarea instanceof HTMLTextAreaElement) || !(submit instanceof HTMLElement)) return null;
  const dialogRect = dialog.getBoundingClientRect();
  const bodyRect = body.getBoundingClientRect();
  const submitRect = submit.getBoundingClientRect();
  const coverRect = coverLabel?.getBoundingClientRect();
  const textareaStyle = getComputedStyle(textarea);
  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  return {
    viewportHeight,
    dialog: { top: dialogRect.top, bottom: dialogRect.bottom, height: dialogRect.height },
    body: {
      top: bodyRect.top,
      bottom: bodyRect.bottom,
      clientHeight: body.clientHeight,
      scrollHeight: body.scrollHeight,
      scrollTop: body.scrollTop,
      overflowY: getComputedStyle(body).overflowY,
      touchAction: getComputedStyle(body).touchAction,
    },
    textarea: {
      clientHeight: textarea.clientHeight,
      scrollHeight: textarea.scrollHeight,
      overflowY: textareaStyle.overflowY,
      fontSize: Number.parseFloat(textareaStyle.fontSize),
    },
    submit: {
      top: submitRect.top,
      bottom: submitRect.bottom,
      fullyVisible: submitRect.top >= -0.5 && submitRect.bottom <= viewportHeight + 0.5,
    },
    cover: coverRect ? {
      top: coverRect.top,
      bottom: coverRect.bottom,
      insideBody: coverRect.top >= bodyRect.top - 0.5 && coverRect.bottom <= bodyRect.bottom + 0.5,
    } : null,
  };
});

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
  await page.waitForFunction(() => document.documentElement.classList.contains('is-create-home'), null, { timeout: 10_000 });
  result.actions.push('open-create-home-webkit');

  const before = await layoutSnapshot(page);
  assertCreateLayout(before, 'before-input');
  const recoveryCountBeforeInput = before.recovery.count;

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

  await page.waitForFunction(
    expected => Number(document.querySelector('.create-home')?.getAttribute('data-keyboard-recovery-count') || 0) > expected,
    recoveryCountBeforeInput,
    { timeout: 8_000 },
  );
  await page.waitForFunction(
    () => document.querySelector('.create-home')?.getAttribute('data-keyboard-recovery-complete') === 'true',
    null,
    { timeout: 8_000 },
  );
  await page.waitForTimeout(900);

  const restored = await layoutSnapshot(page);
  assertCreateLayout(restored, 'restored-after-keyboard');
  if (restored.recovery.count <= recoveryCountBeforeInput) {
    throw new Error(`restored-after-keyboard: repaint recovery did not run: ${JSON.stringify(restored.recovery)}`);
  }
  if (restored.recovery.complete !== 'true') {
    throw new Error(`restored-after-keyboard: repaint recovery did not complete: ${JSON.stringify(restored.recovery)}`);
  }
  result.actions.push('restore-viewport-and-verify-repaint-recovery');

  const restoredDocumentDelta = Math.abs(restored.document.scrollHeight - before.document.scrollHeight);
  if (restoredDocumentDelta > 80) {
    throw new Error(`restored-after-keyboard: document height drifted by ${restoredDocumentDelta}px: ${JSON.stringify({ before: before.document, restored: restored.document })}`);
  }

  result.states.create = { before, focused, keyboardSized, restored };
  const actions = page.locator('.create-home__actions');
  await actions.scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
  result.screenshots.create = `${screenshotDir}/iphone-16-webkit-create-lower-form-after-keyboard-cycle.png`;
  await page.screenshot({ path: result.screenshots.create, fullPage: false, scale: 'device' });

  await page.getByRole('button', { name: '教材一覧' }).click();
  await page.getByRole('heading', { name: '教材ライブラリ', exact: true }).waitFor({ state: 'visible', timeout: 15_000 });
  await page.getByRole('button', { name: '教材を追加' }).click();
  const importerDialog = page.getByRole('dialog', { name: '新しい教材を追加' });
  await importerDialog.waitFor({ state: 'visible', timeout: 10_000 });
  result.actions.push('open-importer-webkit');

  const importerTextarea = page.locator('.memora-import-textarea');
  const longMaterial = Array.from({ length: 10 }, (_, index) => `Section ${index + 1}: A deliberately long reading passage keeps the import form taller than the phone viewport.\nセクション${index + 1}：長い教材を貼り付けても、一番下まで移動できることを確認します。`).join('\n');
  await page.getByLabel('教材名').fill('WebKit importer regression');
  await importerTextarea.fill(longMaterial);
  await importerTextarea.focus();
  await page.setViewportSize({ width: 393, height: 520 });
  await page.waitForTimeout(220);
  const importerKeyboardSized = await importerSnapshot(page);
  if (!importerKeyboardSized?.submit.fullyVisible) {
    throw new Error(`importer-keyboard-sized: submit is clipped: ${JSON.stringify(importerKeyboardSized)}`);
  }

  await importerTextarea.blur();
  await page.setViewportSize({ width: 393, height: 852 });
  await page.waitForTimeout(260);
  const importerBeforeScroll = await importerSnapshot(page);
  if (!importerBeforeScroll) throw new Error('importer-restored: layout snapshot is unavailable.');
  if (importerBeforeScroll.textarea.fontSize < 16) {
    throw new Error(`importer-restored: textarea font size can trigger iOS zoom: ${JSON.stringify(importerBeforeScroll)}`);
  }
  if (importerBeforeScroll.textarea.scrollHeight > importerBeforeScroll.textarea.clientHeight + 2) {
    throw new Error(`importer-restored: textarea is still an inner scroll trap: ${JSON.stringify(importerBeforeScroll)}`);
  }
  if (importerBeforeScroll.body.scrollHeight <= importerBeforeScroll.body.clientHeight || importerBeforeScroll.body.overflowY !== 'auto') {
    throw new Error(`importer-restored: modal body is not the scroll owner: ${JSON.stringify(importerBeforeScroll)}`);
  }
  if (!importerBeforeScroll.submit.fullyVisible) {
    throw new Error(`importer-restored: submit is outside the visual viewport: ${JSON.stringify(importerBeforeScroll)}`);
  }

  const importerBody = page.locator('.memora-modal__body');
  await importerBody.hover();
  await page.mouse.wheel(0, 1800);
  await page.waitForTimeout(240);
  const importerAfterGesture = await importerSnapshot(page);
  if (!importerAfterGesture || importerAfterGesture.body.scrollTop <= importerBeforeScroll.body.scrollTop) {
    throw new Error(`importer-gesture: modal body did not scroll: ${JSON.stringify({ importerBeforeScroll, importerAfterGesture })}`);
  }

  await importerBody.evaluate(element => { element.scrollTop = element.scrollHeight; });
  await page.waitForTimeout(120);
  const importerAtBottom = await importerSnapshot(page);
  if (!importerAtBottom?.cover?.insideBody || !importerAtBottom.submit.fullyVisible) {
    throw new Error(`importer-bottom: bottom controls are unreachable: ${JSON.stringify(importerAtBottom)}`);
  }

  result.states.importer = { importerKeyboardSized, importerBeforeScroll, importerAfterGesture, importerAtBottom };
  result.actions.push('scroll-importer-to-bottom-webkit');
  result.screenshots.importer = `${screenshotDir}/iphone-16-webkit-importer-bottom-reachable.png`;
  await page.screenshot({ path: result.screenshots.importer, fullPage: false, scale: 'device' });
  await page.keyboard.press('Escape');
  await importerDialog.waitFor({ state: 'hidden', timeout: 5_000 });
  result.actions.push('close-importer-with-escape-webkit');

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
