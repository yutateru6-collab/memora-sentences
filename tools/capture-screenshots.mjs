import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseUrl = process.env.APP_URL || 'http://127.0.0.1:3000';
const outDir = process.env.SCREENSHOT_DIR || 'qa-artifacts/screenshots';
const reportPath = 'qa-artifacts/report.json';
const sampleTitle = 'QA Ramen Culture';
const sampleMaterial = `Ramen, a beloved culinary phenomenon, originates from Chinese wheat noodles transformed through Japanese innovation.
ラーメンは、中国の小麦麺が日本独自の工夫で発展した、愛される食文化です。
[解説] ゆきぽよ（ギャル）: a beloved culinary phenomenon は Ramen と同格だよ。主語は Ramen、動詞は originates！
----------
[
  {
    "front": "originate",
    "back": "由来する、始まる",
    "pronunciation": "オ[リ]ジネイト",
    "memo": "【語源・雑学】origin と同じ語源。\\n【覚え方】オリジンから始まる、と覚える。\\n【例文】Great ramen ideas originate after midnight."
  }
]
----------
ラーメンは中国由来の麺文化を、日本で独自に発展させた料理です。`;

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
    dialogs: [],
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
  page.on('dialog', async dialog => {
    result.dialogs.push({ type: dialog.type(), message: dialog.message() });
    await dialog.dismiss();
  });

  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.getByRole('heading', { name: '教材をつくる', exact: true }).waitFor({ state: 'visible', timeout: 30_000 });
    await page.waitForTimeout(400);
    result.actions.push('open-create-home');

    await page.getByTestId('create-topic').fill('らーめん');
    await page.getByTestId('create-keyword').fill('チャーシューと地域文化');
    await page.getByTestId('create-keyword').blur();
    const createFlow = await page.evaluate(() => {
      const rect = selector => {
        const value = document.querySelector(selector)?.getBoundingClientRect();
        return value ? { top: value.top, bottom: value.bottom, height: value.height } : null;
      };
      const topic = rect('.create-home__topic-card');
      const choices = rect('.create-home__choice-grid');
      const persona = rect('.create-home__persona-card');
      const actions = rect('.create-home__actions');
      const keyword = document.querySelector('[data-testid="create-keyword"]');
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
        keywordFontSize: keyword ? Number.parseFloat(getComputedStyle(keyword).fontSize) : null,
      };
    });
    for (const [name, gap] of Object.entries(createFlow.gaps)) {
      if (gap === null || gap < -1 || gap > 40) throw new Error(`Create mobile flow gap is invalid (${name}=${gap}): ${JSON.stringify(createFlow)}`);
    }
    if (target.name === 'iphone-16' && createFlow.keywordFontSize < 16) {
      throw new Error(`Keyword input must use at least 16px on iPhone: ${JSON.stringify(createFlow)}`);
    }

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
      flow: createFlow,
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

    await page.getByText('教材を読む', { exact: true }).waitFor({ state: 'visible', timeout: 15_000 });
    const word = page.locator('[data-word-card]').first();
    await word.waitFor({ state: 'visible', timeout: 10_000 });
    const highlightedWordClass = await word.getAttribute('class');
    if (!highlightedWordClass?.includes('bg-yellow-300/25')) {
      throw new Error(`Registered word is not highlighted in yellow: ${highlightedWordClass}`);
    }
    result.actions.push('verify-yellow-word-highlight');
    result.states.readerWordHighlight = { document: await assertNoOverflow(page, 'Reader word highlight') };
    result.screenshots.readerWordHighlight = await saveScreenshots(page, target, 'reader-word-highlight');

    if (target.name === 'iphone-16') {
      await page.getByRole('button', { name: 'その他の機能を開く' }).click();
      await page.getByRole('button', { name: /単語・メモ/ }).click();
    } else {
      await page.getByRole('button', { name: '単語の黄色表示とメモを切り替える' }).click();
    }
    const hiddenWordClass = await word.getAttribute('class');
    if (hiddenWordClass?.includes('bg-yellow-300/25')) {
      throw new Error(`Registered word remains yellow after the display toggle: ${hiddenWordClass}`);
    }
    result.actions.push('hide-yellow-word-highlight');
    result.states.readerWordHighlightHidden = { document: await assertNoOverflow(page, 'Reader hidden word highlight') };
    result.screenshots.readerWordHighlightHidden = await saveScreenshots(page, target, 'reader-word-highlight-hidden');

    await word.click();
    const wordDialog = page.getByRole('dialog', { name: /originate の単語情報/ });
    await wordDialog.waitFor({ state: 'visible', timeout: 10_000 });
    if (!(await wordDialog.getByText('単語メモ', { exact: true }).isVisible())) throw new Error('Word memo heading is missing.');
    if (!(await wordDialog.getByText(/origin と同じ語源/).isVisible())) throw new Error('Word memo content is missing.');
    result.actions.push('open-word-memo');
    result.states.readerWordMemo = { document: await assertNoOverflow(page, 'Reader word memo') };
    result.screenshots.readerWordMemo = await saveScreenshots(page, target, 'reader-word-memo');
    await page.locator('div.fixed.inset-0.z-40').last().click({ position: { x: 2, y: 2 } });

    await page.locator('button[title="解説を表示"]:visible').first().click();
    const personaAvatar = page.locator('img[data-persona-avatar="/personas/01_ギャル.png"]').first();
    await personaAvatar.waitFor({ state: 'visible', timeout: 10_000 });
    const personaImageState = await personaAvatar.evaluate(image => ({
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    }));
    if (!personaImageState.complete || personaImageState.naturalWidth <= 0 || personaImageState.naturalHeight <= 0) {
      throw new Error(`Explanation persona avatar did not load: ${JSON.stringify(personaImageState)}`);
    }
    result.actions.push('verify-explanation-persona-avatar');
    const grammarTerm = page.getByRole('button', { name: '同格', exact: true }).first();
    await grammarTerm.waitFor({ state: 'visible', timeout: 10_000 });
    await grammarTerm.click();
    const grammarDialog = page.getByRole('dialog', { name: '同格 の文法メモ' });
    await grammarDialog.waitFor({ state: 'visible', timeout: 10_000 });
    const grammarBounds = await grammarDialog.boundingBox();
    if (!grammarBounds || grammarBounds.x < 0 || grammarBounds.y < 0 || grammarBounds.x + grammarBounds.width > target.context.viewport.width + 0.5 || grammarBounds.y + grammarBounds.height > target.context.viewport.height + 0.5) {
      throw new Error(`Grammar memo is clipped: ${JSON.stringify(grammarBounds)}`);
    }
    result.actions.push('open-grammar-memo');
    result.states.readerGrammarMemo = {
      document: await assertNoOverflow(page, 'Reader grammar memo'),
      bounds: grammarBounds,
    };
    result.screenshots.readerGrammarMemo = await saveScreenshots(page, target, 'reader-grammar-memo');
    await page.locator('div.fixed.inset-0.z-40').last().click({ position: { x: 2, y: 2 } });

    await page.getByRole('button').first().click();
    await page.getByRole('heading', { name: '教材ライブラリ', exact: true }).waitFor({ state: 'visible', timeout: 15_000 });
    const card = page.getByRole('article').filter({ hasText: sampleTitle }).first();
    await card.waitFor({ state: 'visible', timeout: 15_000 });
    await card.getByText(/読む・約\d+語/).waitFor({ state: 'visible', timeout: 10_000 });
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

    await page.getByText('単語デッキ', { exact: true }).click();
    await page.getByRole('heading', { name: '単語デッキ', exact: true }).waitFor({ state: 'visible', timeout: 15_000 });
    const deckCard = page.getByRole('article').filter({ hasText: sampleTitle }).first();
    await deckCard.waitFor({ state: 'visible', timeout: 15_000 });
    for (const actionName of ['カード一覧', '4択ゲーム', '単語を覚える', '本文を読む']) {
      await deckCard.getByRole('button', { name: actionName, exact: true }).waitFor({ state: 'visible', timeout: 10_000 });
    }
    result.actions.push('open-vocabulary-decks');
    result.states.deckList = {
      document: await assertNoOverflow(page, 'Vocabulary decks'),
      mascot: await assertMascot(page, '/memora-world/memorize-v1.webp', 'Vocabulary decks'),
    };
    result.screenshots.deckList = await saveScreenshots(page, target, 'deck-list');

    await deckCard.getByRole('button', { name: 'カード一覧', exact: true }).click();
    await page.getByRole('heading', { name: '単語カード一覧', exact: true }).waitFor({ state: 'visible', timeout: 15_000 });
    const cardListText = await page.locator('body').innerText();
    if (/\bID\s+\d+/i.test(cardListText) || cardListText.includes('(No Content)')) {
      throw new Error(`Card list contains developer-facing copy: ${cardListText}`);
    }
    result.actions.push('open-card-list');
    result.states.cardListFront = {
      document: await assertNoOverflow(page, 'Card list front'),
      mascot: await assertMascot(page, '/memora-world/organize-v1.webp', 'Card list front'),
    };
    result.screenshots.cardListFront = await saveScreenshots(page, target, 'card-list-front');

    await page.getByRole('button', { name: /originate：タップして次の面へ/ }).click();
    await page.locator('img[src="/memora-world/organize-v2.webp"]').waitFor({ state: 'visible', timeout: 10_000 });
    result.actions.push('flip-card-list-item');
    result.states.cardListBack = {
      document: await assertNoOverflow(page, 'Card list back'),
      mascot: await assertMascot(page, '/memora-world/organize-v2.webp', 'Card list back'),
    };
    result.screenshots.cardListBack = await saveScreenshots(page, target, 'card-list-back');

    await page.getByRole('button', { name: '戻る', exact: true }).click();
    await page.getByRole('button', { name: '答えを表示', exact: true }).waitFor({ state: 'visible', timeout: 15_000 });
    const flashcardText = await page.locator('body').innerText();
    if (/\bID\s+\d+/i.test(flashcardText) || flashcardText.includes('Next:')) {
      throw new Error(`Flashcard contains developer-facing copy: ${flashcardText}`);
    }
    result.actions.push('open-flashcard');
    result.states.flashcardFront = {
      document: await assertNoOverflow(page, 'Flashcard front'),
      mascot: await assertMascot(page, '/memora-world/memorize-v1.webp', 'Flashcard front'),
    };
    result.screenshots.flashcardFront = await saveScreenshots(page, target, 'flashcard-front');

    await page.getByRole('button', { name: '答えを表示', exact: true }).click();
    for (const gradeName of ['もう一度', 'むずかしい', 'できた', 'かんたん']) {
      await page.getByRole('button', { name: new RegExp(`^${gradeName}`) }).waitFor({ state: 'visible', timeout: 10_000 });
    }
    await page.getByRole('button', { name: /^できた/ }).click();
    const completion = page.getByRole('dialog', { name: '今日の復習、おわり！' });
    await completion.waitFor({ state: 'visible', timeout: 15_000 });
    await completion.getByText('1枚クリアしました', { exact: true }).waitFor({ state: 'visible', timeout: 10_000 });
    if (result.dialogs.length > 0) throw new Error(`Unexpected browser dialog: ${JSON.stringify(result.dialogs)}`);
    result.actions.push('complete-flashcard-session');
    result.states.flashcardComplete = {
      document: await assertNoOverflow(page, 'Flashcard complete'),
      mascot: await assertMascot(page, '/memora-world/memorize-v1.webp', 'Flashcard complete'),
    };
    result.screenshots.flashcardComplete = await saveScreenshots(page, target, 'flashcard-complete');

    await completion.getByRole('button', { name: 'もう一度', exact: true }).click();
    await page.getByRole('button', { name: '答えを表示', exact: true }).waitFor({ state: 'visible', timeout: 10_000 });
    result.actions.push('restart-flashcard-session');

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
