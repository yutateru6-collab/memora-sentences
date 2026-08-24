import fs from 'node:fs/promises';

const appPath = 'App.tsx';
let source = await fs.readFile(appPath, 'utf8');

function replaceOnce(label, before, after) {
  const first = source.indexOf(before);
  if (first === -1) {
    throw new Error(`[${label}] expected source anchor was not found`);
  }
  const second = source.indexOf(before, first + before.length);
  if (second !== -1) {
    throw new Error(`[${label}] source anchor matched more than once`);
  }
  source = source.slice(0, first) + after + source.slice(first + before.length);
}

replaceOnce(
  'import CreateHomeScreen',
  "import { PromptLibraryScreen, PromptPersonaSelection } from './components/PromptLibraryScreen';\nimport { LegendScreen } from './components/LegendScreen';",
  "import { PromptLibraryScreen, PromptPersonaSelection } from './components/PromptLibraryScreen';\nimport CreateHomeScreen from './components/CreateHomeScreen';\nimport { LegendScreen } from './components/LegendScreen';",
);

replaceOnce(
  'extend View union',
  "type View = 'upload' | 'reader' | 'deckList' | 'flashcard' | 'cardList' | 'editDeck' | 'game' | 'promptLibrary' | 'quiz' | 'board' | 'amazon' | 'legend' | 'sns';",
  "type View = 'create' | 'upload' | 'reader' | 'deckList' | 'flashcard' | 'cardList' | 'editDeck' | 'game' | 'promptLibrary' | 'quiz' | 'board' | 'amazon' | 'legend' | 'sns';",
);

replaceOnce(
  'make create screen initial view',
  "const [view, setView] = useState<View>('upload');",
  "const [view, setView] = useState<View>('create');",
);

replaceOnce(
  'render create home',
  "      {view === 'upload' && (\n        <UploadScreen ",
  "      {view === 'create' && (\n        <CreateHomeScreen\n          onOpenLibrary={() => setView('upload')}\n          onOpenOtherModes={() => setView('promptLibrary')}\n          onNavigateToPasteJSON={(personas) => {\n            setPendingPromptPersonas(personas);\n            setOpenPasteJsonMode(true);\n            setView('upload');\n          }}\n        />\n      )}\n      {view === 'upload' && (\n        <UploadScreen ",
);

replaceOnce(
  'prompt library back target',
  "      {view === 'promptLibrary' && (\n          <PromptLibraryScreen \n            onBack={() => setView('upload')}",
  "      {view === 'promptLibrary' && (\n          <PromptLibraryScreen \n            onBack={() => setView('create')}",
);

await fs.writeFile(appPath, source);
console.log('Applied guarded create-home changes to App.tsx');
