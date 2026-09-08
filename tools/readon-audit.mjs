import { chromium, webkit } from 'playwright';
import fs from 'node:fs/promises';
import { buildValidQaMaterial } from './qa-material-fixture.mjs';

// Run only in isolated QA browser contexts. No production accounts or user data.
const baseUrl = process.env.APP_URL || 'http://127.0.0.1:3000';
const out = 'qa-artifacts/screenshots';
await fs.mkdir(out, { recursive: true });
const cards = ['cat', 'dog', 'bird', 'fish'].map((front, i) => ({ front, back: ['猫', '犬', '鳥', '魚'][i], memo: 'QA example' }));
const shortText = 'Cats sleep at night.\n猫は夜に眠ります。\n[解説] 主語は Cats、動詞は sleep です。';
const question = { question: 'When do cats sleep?', choices: ['At night', 'In class', 'Never', 'Not stated'], correctAnswerIndex: 0, explanation: '本文に at night とあります。' };
const configs = [
  { name: 'desktop', engine: chromium, options: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } },
  { name: 'iphone-chromium', engine: chromium, options: { viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } },
  { name: 'iphone-webkit', engine: webkit, options: { viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } },
];
const results = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
async function stored(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => { const r = indexedDB.open('AudioSyncReaderDB', 2); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const rows = await new Promise((resolve, reject) => { const r = db.transaction('materials', 'readonly').objectStore('materials').getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const text = async f => f ? (typeof f.text === 'function' ? f.text() : f.text) : null;
    const values = await Promise.all(rows.map(async m => ({ id: m.id, name: m.name, memo: m.globalMemo, stats: m.cardStats, bookmarks: m.quizBookmarks, transcript: await text(m.textFile), cards: await text(m.wordFile), quiz: await text(m.quizFile) })));
    db.close(); return values;
  });
}
async function importer(page) {
  await page.getByRole('button', { name: '教材一覧', exact: true }).click();
  await page.getByRole('button', { name: '教材を追加', exact: true }).click();
  await page.getByRole('dialog', { name: '新しい教材を追加' }).waitFor();
}
async function paste(page, text) {
  const input = page.getByPlaceholder('AI Studioで作った教材データをここに貼り付けてください');
  await input.fill(text);
  await input.evaluate(el => el.blur());
}
async function importText(page, text = buildValidQaMaterial(), title = 'QA audit material') {
  await importer(page);
  await page.getByPlaceholder('例：Japan’s Ramen Culture').fill(title);
  await paste(page, text);
  await page.getByRole('button', { name: '教材として取り込む', exact: true }).click();
  await page.getByRole('dialog', { name: '新しい教材を追加' }).waitFor({ state: 'hidden' });
}
async function feature(page, mobile, title, mobileName) {
  if (mobile) {
    await page.getByRole('button', { name: 'その他の機能を開く' }).click();
    await page.getByRole('dialog', { name: 'その他の機能', exact: true }).getByRole('button', { name: mobileName }).click();
  } else {
    await page.locator(`button[title="${title}"]:visible`).click();
  }
}
async function createQuiz(page, mobile, data) {
  await feature(page, mobile, 'クイズを作成', 'クイズ作成');
  await page.getByPlaceholder('ここにJSONデータを貼り付け...').fill(JSON.stringify(data));
  await page.getByRole('button', { name: '保存してクイズを開始', exact: true }).click();
  await page.getByRole('heading', { name: /文法クイズ/ }).waitFor();
}
async function wordDeck(page, values = cards) {
  await importer(page);
  await page.getByPlaceholder('例：Japan’s Ramen Culture').fill('QA words');
  await page.getByRole('textbox', { name: '単語カードのデータ', exact: true }).fill(JSON.stringify(values));
  await page.getByRole('button', { name: '教材として取り込む', exact: true }).click();
  await page.getByRole('dialog', { name: '新しい教材を追加' }).waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'ライブラリメニュー' }).click();
  await page.getByRole('button', { name: '単語デッキ', exact: true }).click();
}
const modeFixtures = {
  board: { title: 'QA board', posts: [{ id: 1, name: 'QA', date: '2026-09-08', uid: 'qa', jp: '猫は眠ります。', en: 'Cats sleep.', explanation: 'Cats が主語。', keywords: [{ word: 'Cats', meaning: '猫' }] }] },
  amazon: { mode: 'amazon', product: { title: 'QA product', title_jp: 'QA商品', price: '100', rating: 4, rating_count: 1, features: ['Easy to use'], features_jp: ['使いやすい'], description: 'A test product.', description_jp: '確認用商品です。' }, reviews: [{ id: 1, author: 'QA', rating: 4, title: 'QA review', date: '2026-09-08', en: 'It works well.', jp: 'よく動きます。', explanation: 'It は商品。' }] },
  legend: { mode: 'legend', title: 'QA legend', content: [{ jp_mixed: '猫は sleep します。', en_mixed: 'Cats は眠ります。', en_full: 'Cats sleep.', character_name: 'QA', comment_1: '猫は眠ります。', comment_2: '主語に注目。', comment_3: '読めました。' }] },
  sns: { mode: 'x_thread', main_post: { author_name: 'QA author', handle: '@qa', is_verified: false, avatar_emoji: '🐈', timestamp: '2026-09-08', jp_content: 'QA 猫は眠ります。', en_content: 'Cats sleep.', explanation: 'Cats は主語。', stats: { replies: '0', reposts: '0', likes: '0', views: '1' } }, replies: [] },
};
const cases = [
  ['reader-orientation', async ({ page, mobile, snap }) => {
    await importText(page);
    if (!mobile) return;
    await page.setViewportSize({ width: 852, height: 393 });
    await page.waitForTimeout(400);
    await snap('reader-landscape');
    const sizes = await page.evaluate(() => ({ viewport: innerHeight, reader: document.querySelector('.memora-reader-screen').getBoundingClientRect().height }));
    assert(sizes.reader <= sizes.viewport + 1, `Reader retains portrait height after rotation: ${JSON.stringify(sizes)}`);
  }],
  ['word-prefix-false-match', async ({ page, snap }) => {
    const material = `Progress takes time.\n進歩には時間がかかります。\n----------\n${JSON.stringify([{ front: 'program', back: 'プログラム', memo: 'QA distinct word' }])}\n----------\n確認用。`;
    await importText(page, material);
    const progress = page.locator('.memora-reader-sentence span').filter({ hasText: /^Progress$/ }).last();
    await progress.click();
    await snap('word-prefix-match');
    assert(!(await page.getByRole('dialog', { name: 'program の単語情報' }).isVisible()), 'Progress incorrectly opens the program card because only the first five letters match');
  }],
  ['personal-settings', async ({ page, snap }) => {
    await page.getByRole('button', { name: '教材一覧', exact: true }).click();
    await page.getByRole('button', { name: 'ライブラリメニュー' }).click();
    await page.getByRole('button', { name: 'パーソナル設定', exact: true }).click();
    await page.getByPlaceholder('好きなもの、近況、趣味など...AIが生成する例文の「隠し味」になります。').fill('QA synthetic preference');
    await snap('personal-settings');
    await page.getByRole('button', { name: '登録完了！', exact: true }).click();
    await page.reload();
    await page.getByRole('button', { name: '教材一覧', exact: true }).click();
    await page.getByRole('button', { name: 'ライブラリメニュー' }).click();
    await page.getByRole('button', { name: 'パーソナル設定', exact: true }).click();
    assert(await page.getByPlaceholder('好きなもの、近況、趣味など...AIが生成する例文の「隠し味」になります。').inputValue() === 'QA synthetic preference', 'Personal settings were not retained');
  }],
  ['speed-reading-immediate-stop', async ({ page, mobile, snap }) => {
    await importText(page, shortText);
    await feature(page, mobile, 'WPM測定 (スピードリーディング)', /WPM測定/);
    await page.getByRole('button', { name: 'START', exact: true }).click();
    await page.getByRole('button', { name: 'STOP', exact: true }).click();
    await page.getByRole('heading', { name: 'Finish!', exact: true }).waitFor();
    await snap('speed-immediate-stop');
    assert(!(await page.locator('body').innerText()).includes('Infinity'), 'Immediate stop renders Infinity WPM');
  }],
  ['speed-reading-and-rsvp', async ({ page, mobile, snap }) => {
    await importText(page);
    await feature(page, mobile, 'WPM測定 (スピードリーディング)', /WPM測定/);
    await snap('speed-settings');
    await page.getByRole('button', { name: 'START', exact: true }).click();
    await page.waitForTimeout(1300);
    await page.getByRole('button', { name: 'STOP', exact: true }).click();
    await page.getByRole('heading', { name: 'Finish!', exact: true }).waitFor();
    await snap('speed-result');
    await page.getByRole('button', { name: '閉じる', exact: true }).click();
    await feature(page, mobile, '速読トレーニング (Spartan Reader)', /速読トレーニング/);
    await page.getByText('SPARTAN READER', { exact: true }).waitFor();
    await snap('rsvp');
    await page.keyboard.press('Space');
    await page.waitForTimeout(1400);
    await page.keyboard.press('Space');
    const counter = await page.getByText(/\d+ \/ \d+ WORDS/).innerText();
    assert(!counter.startsWith('0 /'), 'RSVP did not advance');
    await snap('rsvp-advanced');
    await page.locator('button[title="横画面にする"]').locator('..').getByRole('button').last().click();
    await page.locator('.memora-reader-sentence').first().waitFor();
  }],
  ['pdf-long-document', async ({ page, mobile, snap }) => {
    await importText(page, buildValidQaMaterial({ paragraphCount: 12 }));
    await feature(page, mobile, '教材PDF印刷・B5対訳出力', 'PDF');
    await page.getByRole('button', { name: 'B5横・PDF印刷 / 保存', exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelector('#textbook-print-area')?.innerText.includes('12文目'));
    await snap('pdf-long-document');
    if (!mobile) await page.pdf({ path: 'qa-artifacts/audit-print.pdf', preferCSSPageSize: true, printBackground: true });
  }],
  ['library-folder-and-other-prompts', async ({ page, snap }) => {
    await page.getByRole('button', { name: '教材一覧', exact: true }).click();
    await page.getByRole('button', { name: 'ライブラリメニュー' }).click();
    await page.getByRole('button', { name: '新しいフォルダ', exact: true }).click();
    await page.getByPlaceholder('新しいフォルダ名').fill('QA folder');
    await page.getByRole('button', { name: '作成', exact: true }).click();
    await page.getByText('QA folder', { exact: true }).waitFor();
    await snap('folder');
    await page.reload();
    await page.getByRole('button', { name: '教材一覧', exact: true }).click();
    await page.getByText('QA folder', { exact: true }).waitFor();
    await page.getByRole('button', { name: '教材作成画面に戻る' }).click();
    await page.getByRole('button', { name: '匿名掲示板など、その他の教材をつくる' }).click();
    await snap('other-prompts');
  }],
  ['reader-memo-pdf', async ({ page, mobile, snap }) => {
    await importText(page);
    await page.locator('.memora-reader-sentence').first().waitFor();
    await snap('reader');
    await feature(page, mobile, '全体メモ', /全体メモ/);
    await page.getByPlaceholder('全体的な感想、目標、To-Doなどを自由に書いてください。').fill('QA memo persisted');
    await page.waitForFunction(async () => {
      const db = await new Promise(r => { const q = indexedDB.open('AudioSyncReaderDB', 2); q.onsuccess = () => r(q.result); });
      const rows = await new Promise(r => { const q = db.transaction('materials').objectStore('materials').getAll(); q.onsuccess = () => r(q.result); });
      db.close(); return rows.some(m => m.globalMemo === 'QA memo persisted');
    });
    await snap('memo');
    await page.reload();
    await page.getByRole('button', { name: '教材一覧', exact: true }).click();
    await page.getByRole('button', { name: '読む', exact: true }).first().click();
    assert((await stored(page))[0].memo === 'QA memo persisted', 'Memo was not persisted');
    await feature(page, mobile, '教材PDF印刷・B5対訳出力', 'PDF');
    await page.getByRole('button', { name: 'B5横・PDF印刷 / 保存', exact: true }).waitFor();
    await snap('pdf-preview');
    assert(await page.getByRole('button', { name: 'B5横・PDF印刷 / 保存', exact: true }).isEnabled(), 'PDF action disabled');
  }],
  ['quiz-answer-review-persistence', async ({ page, mobile, snap }) => {
    await importText(page, shortText, 'QA quiz with a deliberately long material title for mobile header checks');
    await createQuiz(page, mobile, [question]);
    await snap('quiz-before-answer');
    await page.getByRole('button', { name: 'B.In class', exact: true }).click();
    await page.getByText('残念！', { exact: true }).waitFor();
    await page.getByRole('button', { name: /復習モード/ }).waitFor();
    await snap('quiz-wrong-answer');
    await page.getByRole('button', { name: /復習モード/ }).click();
    await page.getByRole('button', { name: 'A.At night', exact: true }).click();
    await page.getByText('正解！', { exact: true }).waitFor();
    assert((await stored(page))[0].bookmarks?.includes(0), 'Incorrect answer bookmark was not saved');
    await snap('quiz-review');
  }],
  ['quiz-invalid-explanation', async ({ page, mobile, snap }) => {
    await importText(page, shortText);
    await createQuiz(page, mobile, [{ ...question, explanation: { text: 'Malformed explanation' } }]);
    await page.getByRole('button', { name: 'A.At night', exact: true }).click();
    await snap('malformed-quiz-answer');
    assert(await page.getByRole('heading', { name: /文法クイズ/ }).isVisible(), 'Malformed explanation was accepted and crashed the quiz after answering');
  }],
  ['flashcards-complete', async ({ page, snap }) => {
    await wordDeck(page);
    await page.getByRole('button', { name: '単語を覚える', exact: true }).click();
    await snap('flashcard');
    for (let i = 0; i < cards.length; i++) {
      await page.getByRole('button', { name: '答えを表示', exact: true }).click();
      await page.getByRole('button', { name: /^できた/ }).click();
    }
    await page.getByRole('dialog').waitFor();
    await snap('flashcard-complete');
    assert(Object.keys((await stored(page))[0].stats || {}).length === 4, 'Not all card grades were saved');
  }],
  ['game-answer', async ({ page, snap }) => {
    await wordDeck(page);
    await page.getByRole('button', { name: '4択ゲーム', exact: true }).click();
    await page.getByRole('button', { name: '猫', exact: true }).waitFor();
    await snap('game');
    await page.getByRole('button', { name: '猫', exact: true }).click();
    await page.getByText('Score: 1', { exact: true }).waitFor();
    await page.getByRole('heading', { name: /dog/ }).waitFor();
    await snap('game-next');
  }],
  ['game-duplicate-meanings', async ({ page, snap }) => {
    await wordDeck(page, cards.map(c => ({ ...c, back: '同じ意味' })));
    await page.getByRole('button', { name: '4択ゲーム', exact: true }).click();
    await page.getByRole('button', { name: '同じ意味', exact: true }).first().waitFor();
    await snap('duplicate-choices');
    const choices = await page.locator('main button').allTextContents();
    assert(new Set(choices).size === choices.length, `Duplicate answer choices: ${JSON.stringify(choices)}`);
  }],
  ['combined-text-and-separate-cards', async ({ page, snap }) => {
    await importer(page);
    await paste(page, shortText);
    await page.getByRole('textbox', { name: '単語カードのデータ', exact: true }).fill(JSON.stringify(cards));
    const remaining = await page.getByPlaceholder('AI Studioで作った教材データをここに貼り付けてください').inputValue();
    await snap('combined-import-after-cards');
    assert(remaining.includes('Cats sleep at night.'), 'Typing separate word cards silently erased the previously pasted reading material');
  }],
  ['damaged-media', async ({ page, snap }) => {
    await importer(page);
    await page.locator('input[type="file"][accept="audio/*,video/*,.mp3,.m4a,.mp4,.mov,.wav,.ogg,.flac"]').setInputFiles({ name: 'qa-damaged.mp3', mimeType: 'audio/mpeg', buffer: Buffer.from('This is not an audio file.') });
    await page.getByRole('button', { name: '教材として取り込む', exact: true }).click();
    await page.waitForTimeout(5000); // Bounded observation of missing media error handling.
    await snap('damaged-media-after-5s');
    assert(!(await page.getByRole('button', { name: '取り込み中…' }).isVisible()), 'Damaged audio leaves import pending without an error after 5 seconds');
  }],
  ...Object.entries(modeFixtures).map(([mode, fixture]) => [`mode-${mode}`, async ({ page, snap }) => {
    await importText(page, JSON.stringify(fixture, null, 2), `QA ${mode}`);
    const expectedHeading = { board: 'QA board', amazon: 'QA商品', legend: 'QA legend', sns: 'Post' }[mode];
    await page.getByRole('heading', { name: expectedHeading, exact: true }).waitFor();
    await snap(`mode-${mode}`);
    assert((await stored(page)).length === 1, `${mode} not saved`);
    if (mode === 'board' || mode === 'amazon') {
      await page.getByRole('button', { name: '解説を見る', exact: true }).first().click();
      await page.getByRole('button', { name: '解説を閉じる', exact: true }).first().waitFor();
      await snap(`mode-${mode}-explanation`);
    }
    if (mode === 'sns') {
      await page.locator('button[title="解説を表示"]').first().click();
      await snap('mode-sns-explanation');
    }
    if (mode === 'legend') {
      await page.getByRole('button', { name: 'Lv.3 英語', exact: true }).click();
      await page.getByRole('button', { name: '伝説達成！ (Finish)', exact: true }).click();
      await snap('legend-complete');
    }
  }]),
  ['malformed-transcript-words', async ({ page, snap }) => {
    await importText(page, JSON.stringify([{ start: 0, end: 5, english: 'Cats sleep.', japanese: '猫は眠ります。', words: [{ word: null, start: 0, end: 1 }] }]));
    await snap('malformed-words');
    assert(await page.locator('.memora-reader-sentence').isVisible(), 'Invalid words array passed import validation and crashed Reader');
  }],
];

for (const cfg of configs) {
  const browser = await cfg.engine.launch();
  for (const [name, run] of cases) {
    if (process.env.QA_CASES && !process.env.QA_CASES.split(',').includes(name)) continue;
    const context = await browser.newContext({
      ...cfg.options,
      screen: cfg.options.viewport,
      ...(cfg.name !== 'desktop' ? { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' } : {}),
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const result = { target: cfg.name, case: name, status: 'failure', consoleErrors: [], pageErrors: [], states: [], screenshots: [] };
    page.on('console', m => { if (m.type() === 'error') result.consoleErrors.push(m.text()); });
    page.on('pageerror', e => result.pageErrors.push(String(e)));
    page.on('dialog', d => d.dismiss());
    const snap = async label => {
      const prefix = `${out}/audit-${cfg.name}-${label}`;
      await page.screenshot({ path: `${prefix}.png`, scale: 'device' });
      await page.screenshot({ path: `${prefix}.jpg`, scale: 'css', type: 'jpeg', quality: 55 });
      result.screenshots.push(`${prefix}.png`, `${prefix}.jpg`);
      result.states.push(await page.evaluate(label => ({ label, url: location.href, title: document.title, viewport: { width: innerWidth, height: innerHeight }, deviceScaleFactor: devicePixelRatio, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, clientWidth: document.documentElement.clientWidth, clientHeight: document.documentElement.clientHeight, horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, visibleButtons: [...document.querySelectorAll('button')].filter(b => b.getBoundingClientRect().width && b.getBoundingClientRect().height).map(b => ({ text: b.innerText || b.getAttribute('aria-label') || b.title, top: b.getBoundingClientRect().top, bottom: b.getBoundingClientRect().bottom, right: b.getBoundingClientRect().right, left: b.getBoundingClientRect().left })), bodyExcerpt: document.body.innerText.slice(0, 5000) }), label));
    };
    try {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: 'リードン READON', exact: true }).waitFor();
      await run({ page, mobile: cfg.name !== 'desktop', snap });
      assert(result.pageErrors.length === 0, `Page errors: ${result.pageErrors.join('; ')}`);
      assert(!result.states.some(s => s.horizontalOverflow), 'Horizontal document overflow');
      result.status = 'success';
    } catch (error) {
      result.failure = String(error);
      try { await snap(`${name}-failure`); result.stored = await stored(page); } catch {}
    } finally { await context.close(); }
    results.push(result);
    console.log(`AUDIT ${cfg.name} ${name}: ${result.status}${result.failure ? ` — ${result.failure}` : ''}`);
    await fs.writeFile('qa-artifacts/audit-report.json', JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, commitSha: process.env.QA_COMMIT_SHA, applicationCommit: '8e24420ae9582143c4d21240aa4e3067261684d7', runId: process.env.GITHUB_RUN_ID, results }, null, 2));
  }
  await browser.close();
}
if (results.some(r => r.status !== 'success')) process.exitCode = 1;
