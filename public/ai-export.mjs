import { parseDecks, formatVocabularyDeck, formatReadingMaterial, formatExport } from './ai-export-core.mjs';

const app = document.body.dataset.app;
const appName = document.body.dataset.appName;
const status = document.getElementById('status');
const loadButton = document.getElementById('load');
const downloadButton = document.getElementById('download');
const selection = document.getElementById('selection');
const preview = document.getElementById('preview');
let items = [];

// Opening a missing database is aborted before creation. Existing stores are
// accessed only through readonly transactions; no application data is modified.
async function openExistingDatabase(name) {
  if (!globalThis.indexedDB) return null;
  if (typeof indexedDB.databases === 'function') {
    const databases = await indexedDB.databases();
    if (!databases.some(database => database.name === name)) return null;
  }
  return await new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    let missing = false;
    request.onupgradeneeded = () => {
      missing = true;
      request.transaction.abort();
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => missing ? resolve(null) : reject(request.error);
    request.onblocked = () => reject(new Error('教材の保存領域を開けません。アプリのほかのタブを閉じてから再度お試しください。'));
  });
}

async function readStore(databaseName, storeName, key) {
  const database = await openExistingDatabase(databaseName);
  if (!database) return key === undefined ? [] : null;
  try {
    if (!database.objectStoreNames.contains(storeName)) throw new Error('教材の保存場所を読み取れません。');
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = key === undefined ? store.getAll() : store.get(key);
      transaction.oncomplete = () => resolve(request.result ?? null);
      transaction.onabort = transaction.onerror = () => reject(transaction.error || new Error('教材の読み取りに失敗しました。'));
    });
  } finally {
    database.close();
  }
}

async function loadItems() {
  if (app === 'vocadon') {
    let saved = await readStore('localforage', 'keyvaluepairs', 'storyvocab_decks_v2');
    if (saved == null) saved = localStorage.getItem('storyvocab_decks_v2');
    if (saved == null) saved = localStorage.getItem('localforage/keyvaluepairs/storyvocab_decks_v2');
    return parseDecks(saved).map(deck => ({ title: deck.title, content: formatVocabularyDeck(deck) }));
  }
  const materials = await readStore('AudioSyncReaderDB', 'materials');
  return await Promise.all(materials.map(async material => ({
    title: material.name || '名称未設定', content: await formatReadingMaterial(material),
  })));
}

function updatePreview() {
  const selected = [...selection.querySelectorAll('input:checked')].map(input => items[Number(input.value)]);
  preview.value = selected.length ? formatExport(appName, selected) : '';
  downloadButton.disabled = selected.length === 0;
}

loadButton.addEventListener('click', async () => {
  loadButton.disabled = true;
  downloadButton.disabled = true;
  status.textContent = 'このブラウザに保存された教材を確認しています。';
  preview.value = '';
  selection.replaceChildren();
  try {
    items = await loadItems();
    for (const [index, item] of items.entries()) {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = String(index);
      input.checked = true;
      input.addEventListener('change', updatePreview);
      label.append(input, document.createTextNode(item.title));
      selection.append(label);
    }
    status.textContent = items.length
      ? `${items.length}件の教材を読み取りました。渡したい教材を選び、テキストをダウンロードしてください。`
      : 'このブラウザには教材が見つかりませんでした。普段アプリを使っている端末・ブラウザで、このページを開いてください。';
    updatePreview();
  } catch (error) {
    status.textContent = `書き出せませんでした。${error instanceof Error ? error.message : '保存領域へのアクセスを確認してください。'}`;
  } finally {
    loadButton.disabled = false;
  }
});

downloadButton.addEventListener('click', () => {
  if (!preview.value) return;
  const blob = new Blob([preview.value], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${app}_for_claude_${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
});
