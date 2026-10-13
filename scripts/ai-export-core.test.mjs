import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDecks, formatVocabularyDeck, formatReadingMaterial, formatExport } from '../public/ai-export-core.mjs';

test('vocabulary export retains every teaching field and leaves the saved deck intact', () => {
  const deck = { title: '試験用', description: '説明', userProfile: 'PRIVATE_PROFILE', words: [{
    word: 'brief', pronunciation: 'ブリーフ', meaning: '短い', scene: '一行メモ',
    exampleEn: 'Keep it brief.', exampleJa: '短くして。', trivia: '雑学', mnemonic: '語呂',
    hook: 'フック', fanComment: 'コメント', poisonNote: { title: '見出し', text: '本文', collocations: ['a brief note'] },
    wordParts: { parts: [{ text: 'brief', meaning: '短い' }], summary: 'まとめ', related: [{ word: 'briefly', meaning: '簡潔に' }] },
  }] };
  const before = structuredClone(deck);
  const output = formatVocabularyDeck(deck);
  for (const expected of ['Keep it brief.', '短くして。', '雑学', '語呂', 'フック', 'コメント', '見出し', 'a brief note', 'briefly']) assert.ok(output.includes(expected));
  assert.ok(!output.includes('PRIVATE_PROFILE'));
  assert.deepEqual(deck, before);
});

test('stored vocabulary JSON is parsed; malformed data does not silently become an empty export', () => {
  assert.deepEqual(parseDecks(null), []);
  assert.deepEqual(parseDecks('[]'), []);
  assert.throws(() => parseDecks('{broken'));
  assert.throws(() => parseDecks({ decks: [] }));
  assert.throws(() => parseDecks([{ title: 'broken' }]));
});

test('reading export handles current serialized files and legacy Blob files with all annotations', async () => {
  const material = {
    name: '原文', textFile: { __memoraTextFile: 1, text: 'English\n和訳\n[解説] 先生\n背景知識' },
    wordFile: new Blob(['[{"front":"word","back":"単語"}]']),
    quizFile: { __memoraTextFile: 1, text: '{"question":"問題","answer":"解答"}' },
    annotationFile: new Blob(['注釈']), globalMemo: '教材メモ', inlineNotes: [{ text: '書き込み' }],
    cardStats: { privateHistory: 'PRIVATE_HISTORY' }, mediaFile: new Blob(['PRIVATE_AUDIO']),
  };
  const output = await formatReadingMaterial(material);
  for (const expected of ['English', '和訳', '先生', '背景知識', '単語', '問題', '解答', '注釈', '教材メモ', '書き込み']) assert.ok(output.includes(expected));
  assert.ok(!output.includes('PRIVATE_HISTORY'));
  assert.ok(!output.includes('PRIVATE_AUDIO'));
});

test('unreadable reading files fail clearly instead of silently dropping a section', async () => {
  await assert.rejects(formatReadingMaterial({ name: 'broken', textFile: { unknown: true } }));
});

test('combined export contains only selected teaching materials', () => {
  const output = formatExport('READON', [{ content: 'SELECTED_TEXT' }], new Date('2026-10-13T00:00:00Z'));
  assert.ok(output.includes('選択した教材数: 1'));
  assert.ok(output.includes('SELECTED_TEXT'));
});
