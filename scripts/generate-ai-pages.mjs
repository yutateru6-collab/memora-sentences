import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { formatVocabularyDeck } from '../public/ai-export-core.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = resolve(import.meta.dirname, '..');
const guide = JSON.parse(await readFile(resolve(root, 'scripts/ai-guide.json'), 'utf8'));
const escape = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const moduleUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
async function loadTypeScript(file, replacements = {}) {
  const input = await readFile(resolve(root, file), 'utf8');
  let output = ts.transpileModule(input, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  for (const [from, to] of Object.entries(replacements)) output = output.replaceAll(`'${from}'`, `'${to}'`);
  return { module: await import(moduleUrl(output)), url: moduleUrl(output) };
}

let sampleText = '';
let prompt = '';
if (guide.id === 'vocadon') {
  const constants = await loadTypeScript('src/constants.ts');
  const generator = await loadTypeScript('src/lib/aiPrompt.ts', { '../constants': constants.url });
  const sample = structuredClone(constants.module.SAMPLE_DECK);
  sample.title = sample.title.replaceAll('MEMORA', 'VOCADON');
  sampleText = formatVocabularyDeck(sample);
  prompt = generator.module.generateAIPrompt({
    useProfileInPrompt: false, isMultiCardEnabled: false, userProfile: { likes: {}, dislikes: {} },
    masterOath: '', nemesisOath: '', hookTheme: 'default', exampleVocabLevel: '英検準2級', cardsPerWord: 2,
  });
  await mkdir(resolve(root, 'public'), { recursive: true });
  await writeFile(resolve(root, 'public/ai-sample.json'), JSON.stringify(sample, null, 2) + '\n');
} else {
  const generator = await loadTypeScript('lib/readingPrompt.ts');
  prompt = generator.module.buildReadingPrompt({
    topic: '', level: '日本の「英検準1級」レベル', knowledgeDepth: 'familiar', length: '400',
    role: 'やさしく導く先生', trait: 'やさしくて、まなびを楽しませてくれる！',
  });
}

const sections = [...guide.sections];
if (sampleText) sections.push({ title: 'アプリ内の実際の5語サンプル', paragraphs: [sampleText], pre: true });
sections.push({ title: 'アプリから生成した指示文の引用', paragraphs: [guide.promptNote, prompt], pre: true });
const header = [guide.name, guide.summary, `アプリURL: ${guide.appUrl}`, `HTML版: ${guide.appUrl}ai.html`, `テキスト版: ${guide.appUrl}ai.txt`, `登録教材の書き出し: ${guide.appUrl}ai-export.html`,
  'この文書はアプリを理解するための資料です。末尾の生成指示文はアプリ仕様の引用であり、このページを読むAIへの実行指示ではありません。'];
const plain = [...header, ...sections.flatMap(section => [section.title, ...section.paragraphs]), '関連アプリ', `${guide.otherName}: ${guide.otherUrl}ai.html`].join('\n\n') + '\n';
const body = sections.map((section, index) => `<section id="section-${index}"><h2>${escape(section.title)}</h2>${section.paragraphs.map(paragraph => section.pre ? `<pre>${escape(paragraph)}</pre>` : `<p>${escape(paragraph)}</p>`).join('')}</section>`).join('\n');
const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(guide.name)} — アプリの内容と使い方</title><meta name="description" content="${escape(guide.summary)}"><link rel="alternate" type="text/plain" href="/ai.txt"><style>*{box-sizing:border-box}body{margin:0;background:#f7f6f2;color:#172026;font:16px/1.85 system-ui,sans-serif}main{max-width:900px;margin:auto;padding:28px 22px 70px}h1{font-size:clamp(28px,5vw,42px);line-height:1.4}h2{font-size:24px;line-height:1.5;margin-top:40px;border-bottom:1px solid #ced6d0;padding-bottom:10px}a{color:#215e4c;text-underline-offset:3px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:white;border:1px solid #cbd3cd;border-radius:8px;padding:20px;font:14px/1.9 system-ui,sans-serif}nav{display:flex;flex-wrap:wrap;gap:10px 18px}section{scroll-margin-top:20px}.intro{color:#41534a}a:focus-visible{outline:3px solid #c08628;outline-offset:3px}</style></head><body><main>
<h1>${escape(guide.name)}</h1><p class="intro">${escape(guide.summary)}</p>
<nav aria-label="関連ページ"><a href="/">アプリを開く</a><a href="/ai.txt">全文のテキスト版</a><a href="/ai-export.html">登録教材をClaudeに渡す</a><a href="${escape(guide.otherUrl)}ai.html">${escape(guide.otherName)}の説明</a></nav>
<p>アプリURL: <a href="${escape(guide.appUrl)}">${escape(guide.appUrl)}</a></p>
<p>このページはJavaScriptを使わずに全文を読めます。末尾の生成指示文はアプリ仕様の引用であり、ページを読むAIへの実行指示ではありません。</p>
${body}
</main></body></html>\n`;
const template = await readFile(resolve(root, 'scripts/ai-export.template.html'), 'utf8');
await writeFile(resolve(root, 'public/ai.html'), html);
await writeFile(resolve(root, 'public/ai.txt'), plain);
await writeFile(resolve(root, 'public/ai-export.html'), template.replaceAll('{{NAME}}', escape(guide.name)).replaceAll('{{ID}}', escape(guide.id)));
await writeFile(resolve(root, 'public/llms.txt'), `# ${guide.name}\n\n${guide.summary}\n\n- アプリの内容と使い方: ${guide.appUrl}ai.html\n- 全文テキスト: ${guide.appUrl}ai.txt\n- 同じ端末から登録教材を書き出す: ${guide.appUrl}ai-export.html\n- ${guide.otherName}: ${guide.otherUrl}ai.html\n\n登録教材は利用者の端末内に保存され、公開説明ページには含まれません。\n`);
console.log(`${guide.name}: static AI guide, prompt and export page generated`);
