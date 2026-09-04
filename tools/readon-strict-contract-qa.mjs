import { chromium, webkit } from 'playwright';

const baseUrl = process.env.APP_URL || 'http://127.0.0.1:3000';
const strictTitle = 'QA READON Strict Contract';
const frontWords = [
  'students', 'analyze', 'ramen', 'culture', 'region', 'links', 'broth', 'noodles', 'flavor', 'tradition',
  'recipe', 'shop', 'chef', 'customer', 'community', 'history', 'ingredient', 'texture', 'aroma', 'style',
  'innovation', 'local', 'pride', 'popular', 'appeal', 'meal', 'customs', 'bowl', 'design', 'identity',
];

const sentence = 'Students analyze ramen culture by asking how each region links broth, noodles, flavor, tradition, recipe, shop, chef, customer, community, history, ingredient, texture, aroma, style, innovation, local pride, popular appeal, meal customs, bowl design, and identity.';
const translation = '学生は、各地域がスープ、麺、風味、伝統などをどのように結びつけ、ラーメン文化のアイデンティティを形作るのかを分析します。';
const explanation = '[解説] ひなた（やさしく導く高校教師）: 主語SはStudents、動詞Vはanalyzeだよ。by asking how以下が分析の方法を示し、地域ごとの要素がidentityへつながる構造をやさしく押さえよう。';
const background = 'ラーメンは、麺・スープ・具材の組み合わせによって地域差が生まれやすい料理です。同じ名称でも、地域の食材、気候、流通、店の歴史などによって味や提供方法が変わります。英語で文化を読むときは、単に「有名な料理」として覚えるのではなく、どの要素が地域性を作っているのかを見ると理解が深まります。今回のQA教材では、本文・対訳・解説・単語カードの対応関係と、READONの取り込み契約が正しく機能するかを確認します。';

const cards = frontWords.map((front, index) => ({
  front,
  back: `QA確認語${index + 1}`,
  pronunciation: 'テ[ス]ト',
  memo: `【語源・雑学】READONのQAで使う確認用データ。\n【覚え方】${front}を本文の語と結びつけて覚える。\n【例文】The word ${front} appears in this QA example.`,
}));

const buildMaterial = selectedCards => `【解説担当】
名前: ひなた
役割: やさしく導く高校教師
性格: やさしくて、まなびを楽しませてくれる！

${sentence}
${translation}
${explanation}
----------
${JSON.stringify(selectedCards, null, 2)}
----------
${background}`;

const pasteMaterial = async (page, textarea, content) => {
  await textarea.focus();
  await textarea.evaluate((element, pastedText) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', pastedText);
    element.dispatchEvent(new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData,
    }));
  }, content);
  await page.getByTestId('material-paste-preview').waitFor({ state: 'visible', timeout: 10_000 });
};

const targets = [
  { name: 'chromium-desktop', browserType: chromium, context: { viewport: { width: 1440, height: 900 } } },
  {
    name: 'webkit-iphone',
    browserType: webkit,
    context: {
      viewport: { width: 393, height: 852 },
      screen: { width: 393, height: 852 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    },
  },
];

for (const target of targets) {
  const browser = await target.browserType.launch({ headless: true });
  const context = await browser.newContext(target.context);
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => pageErrors.push(String(error)));

  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.getByRole('heading', { name: 'リードン READON', exact: true }).waitFor({ state: 'visible', timeout: 30_000 });

    await page.getByTestId('create-import').click();
    await page.getByRole('heading', { name: '新しい教材を追加', exact: true }).waitFor({ state: 'visible', timeout: 15_000 });
    await page.getByPlaceholder('例：Japan’s Ramen Culture').fill(strictTitle);

    const materialInput = page.getByPlaceholder('AI Studioで作った教材データをここに貼り付けてください');
    const rejectedMaterial = buildMaterial(cards.slice(0, 1));
    await pasteMaterial(page, materialInput, rejectedMaterial);
    await page.getByRole('button', { name: '教材として取り込む' }).click();
    await page.getByText('READON教材データを取り込めません。', { exact: false }).waitFor({ state: 'visible', timeout: 15_000 });
    await page.getByText('単語カードは厳密に30件必要です（現在 1 件）。', { exact: false }).waitFor({ state: 'visible', timeout: 15_000 });
    if (await page.getByPlaceholder('例：Japan’s Ramen Culture').inputValue() !== strictTitle) {
      throw new Error(`${target.name}: material title was cleared after a rejected import.`);
    }
    const retainedPreview = page.getByTestId('material-paste-preview').locator('pre');
    if (await retainedPreview.textContent() !== rejectedMaterial) {
      throw new Error(`${target.name}: pasted material was cleared after a rejected import.`);
    }

    // The expected rejection is logged by App.tsx. Clear it so any later console error is unexpected.
    consoleErrors.length = 0;

    if (target.name === 'webkit-iphone') {
      // This repository intentionally keeps WebKit regression QA independent from IndexedDB because
      // headless WebKit persistence has been flaky in CI. The strict validator itself is exercised
      // above in a real WebKit page; the full save/open/avatar E2E continues below in Chromium.
      const doc = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      if (doc.scrollWidth > doc.clientWidth) {
        throw new Error(`${target.name}: horizontal overflow after strict validation rejection: ${JSON.stringify(doc)}`);
      }
      if (consoleErrors.length) throw new Error(`${target.name}: unexpected console errors: ${consoleErrors.join(' | ')}`);
      if (pageErrors.length) throw new Error(`${target.name}: page errors: ${pageErrors.join(' | ')}`);
      console.log(`${target.name}: READON strict validation rejection QA passed`);
      continue;
    }

    // Correct the rejected data in place. The importer must stay open and preserve the user's draft.
    await page.getByRole('button', { name: '内容を編集' }).click();
    const correctedInput = page.getByPlaceholder('AI Studioで作った教材データをここに貼り付けてください');
    await correctedInput.fill(buildMaterial(cards));
    await page.getByRole('button', { name: '教材として取り込む' }).click();
    await page.getByRole('heading', { name: strictTitle, exact: true }).waitFor({ state: 'visible', timeout: 20_000 });
    await page.locator('button[title="解説を表示"]:visible').first().click();

    const teacherAvatar = page.locator('img[data-persona-avatar="/personas/03_高校教師.png"]').first();
    await teacherAvatar.waitFor({ state: 'visible', timeout: 15_000 });
    await teacherAvatar.evaluate(image => image.decode().catch(() => {}));
    const imageState = await teacherAvatar.evaluate(image => ({
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    }));
    if (!imageState.complete || imageState.naturalWidth <= 0 || imageState.naturalHeight <= 0) {
      throw new Error(`${target.name}: default teacher avatar did not load: ${JSON.stringify(imageState)}`);
    }

    const doc = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    if (doc.scrollWidth > doc.clientWidth) {
      throw new Error(`${target.name}: horizontal overflow after strict READON import: ${JSON.stringify(doc)}`);
    }
    if (consoleErrors.length) throw new Error(`${target.name}: unexpected console errors: ${consoleErrors.join(' | ')}`);
    if (pageErrors.length) throw new Error(`${target.name}: page errors: ${pageErrors.join(' | ')}`);

    console.log(`${target.name}: READON strict contract QA passed`);
  } finally {
    await context.close();
    await browser.close();
  }
}
