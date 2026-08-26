import { chromium, webkit } from 'playwright';

const baseUrl = process.env.APP_URL || 'http://127.0.0.1:3000';

const depthCases = [
  {
    value: 'beginner',
    label: '初心者｜全体像から',
    marker: '読者はテーマについてほとんど知らない想定にする。',
  },
  {
    value: 'familiar',
    label: 'ある程度｜もう一歩深く',
    marker: '読者は基本的な用語や代表例をある程度知っている想定にする。',
  },
  {
    value: 'advanced',
    label: 'かなり詳しい｜細部まで',
    marker: '読者は一般向けの概要や定番の説明をかなり知っている想定にする。',
  },
  {
    value: 'expert',
    label: 'マニア・専門家級｜とことん',
    marker: '一般的な入門説明や有名な基本事項の再説明は原則として避ける。',
  },
];

const targets = [
  {
    name: 'chromium-desktop',
    browserType: chromium,
    context: {
      viewport: { width: 1440, height: 900 },
      screen: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    },
    verifyPrompt: true,
  },
  {
    name: 'webkit-iphone',
    browserType: webkit,
    context: {
      viewport: { width: 393, height: 852 },
      screen: { width: 393, height: 852 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    },
    verifyPrompt: false,
  },
];

const rect = async locator => {
  const bounds = await locator.boundingBox();
  if (!bounds) throw new Error('Expected visible control but no bounding box was available.');
  return bounds;
};

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

  if (target.verifyPrompt) {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async value => {
            window.__readonCopiedPrompt = value;
          },
        },
      });
    });
  }

  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.getByRole('heading', { name: 'リードン READON', exact: true }).waitFor({ state: 'visible', timeout: 30_000 });

    const level = page.getByTestId('create-level');
    const depth = page.getByTestId('create-depth');
    const length = page.getByTestId('create-length');

    await level.waitFor({ state: 'visible', timeout: 10_000 });
    await depth.waitFor({ state: 'visible', timeout: 10_000 });
    await length.waitFor({ state: 'visible', timeout: 10_000 });

    const depthOptions = await depth.locator('option').evaluateAll(options =>
      options.map(option => ({ value: option.value, label: option.textContent?.trim() || '' })),
    );
    const expectedOptions = depthCases.map(item => ({ value: item.value, label: item.label }));
    if (JSON.stringify(depthOptions) !== JSON.stringify(expectedOptions)) {
      throw new Error(`${target.name}: depth options differ: ${JSON.stringify(depthOptions)}`);
    }
    if (await depth.inputValue() !== 'familiar') {
      throw new Error(`${target.name}: default depth must be familiar.`);
    }

    const levelRect = await rect(level);
    const depthRect = await rect(depth);
    const lengthRect = await rect(length);

    if (target.name === 'webkit-iphone') {
      if (!(levelRect.y < depthRect.y && depthRect.y < lengthRect.y)) {
        throw new Error(`${target.name}: mobile order must be level -> depth -> length: ${JSON.stringify({ levelRect, depthRect, lengthRect })}`);
      }
      for (const candidate of [levelRect, depthRect, lengthRect]) {
        if (candidate.width < 300) {
          throw new Error(`${target.name}: stacked select is unexpectedly narrow: ${JSON.stringify(candidate)}`);
        }
      }
    } else {
      const tops = [levelRect.y, depthRect.y, lengthRect.y];
      if (Math.max(...tops) - Math.min(...tops) > 4) {
        throw new Error(`${target.name}: desktop controls must share a row: ${JSON.stringify({ levelRect, depthRect, lengthRect })}`);
      }
      if (!(levelRect.x < depthRect.x && depthRect.x < lengthRect.x)) {
        throw new Error(`${target.name}: desktop order must be level -> depth -> length: ${JSON.stringify({ levelRect, depthRect, lengthRect })}`);
      }
    }

    const doc = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    if (doc.scrollWidth > doc.clientWidth) {
      throw new Error(`${target.name}: horizontal overflow: ${JSON.stringify(doc)}`);
    }

    for (const item of depthCases) {
      await depth.selectOption(item.value);
      if (await depth.inputValue() !== item.value) {
        throw new Error(`${target.name}: could not select ${item.value}.`);
      }

      if (target.verifyPrompt) {
        await page.getByTestId('create-copy').click();
        const prompt = await page.evaluate(() => window.__readonCopiedPrompt || '');
        const required = [
          `・テーマへの詳しさ: ${item.label}。`,
          item.marker,
          '英語レベルとテーマへの詳しさは別軸である。',
          '15. 選択された「テーマへの詳しさ」に内容が合っているか。',
        ];
        for (const text of required) {
          if (!prompt.includes(text)) {
            throw new Error(`${target.name}/${item.value}: prompt is missing: ${text}`);
          }
        }
        if (prompt.includes('読者はそのテーマに関心があり、基本的な背景知識をある程度持っている想定にする。')) {
          throw new Error(`${target.name}/${item.value}: old fixed background-knowledge assumption remains in prompt.`);
        }
      }
    }

    if (consoleErrors.length) throw new Error(`${target.name}: console errors: ${consoleErrors.join(' | ')}`);
    if (pageErrors.length) throw new Error(`${target.name}: page errors: ${pageErrors.join(' | ')}`);

    console.log(`${target.name}: knowledge-depth QA passed`);
  } finally {
    await context.close();
    await browser.close();
  }
}
