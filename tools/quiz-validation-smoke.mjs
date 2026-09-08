import assert from 'node:assert/strict';
import { parseQuizContent } from '/tmp/readon-quiz-validation.mjs';

const question = { question: 'Question?', choices: ['A', 'B', 'C', 'D'], correctAnswerIndex: 0, explanation: 'Reason' };
assert.equal(parseQuizContent(JSON.stringify([question])).length, 1);
for (const key of ['explanation', 'explanationCorrect', 'explanationIncorrect']) {
  for (const value of [{ text: 'bad' }, [], null, 7]) {
    assert.throws(() => parseQuizContent(JSON.stringify([{ ...question, [key]: value }])));
  }
}
for (const value of [null, [], 7]) assert.throws(() => parseQuizContent(JSON.stringify([value])));
console.log('Quiz validation: valid input accepted; 15 malformed cases rejected.');
