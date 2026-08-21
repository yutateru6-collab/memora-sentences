from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected one match, found {count}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

# PromptLibraryScreen: pass selected personas to App when opening the paste flow.
replace_once(
    'components/PromptLibraryScreen.tsx',
    """interface PromptLibraryScreenProps {\n  onBack: () => void;\n  T: Theme;\n  onNavigateToPasteJSON?: () => void;\n}\n""",
    """export interface PromptPersonaSelection {\n  name: string;\n  role: string;\n  trait: string;\n}\n\ninterface PromptLibraryScreenProps {\n  onBack: () => void;\n  T: Theme;\n  onNavigateToPasteJSON?: (personas: PromptPersonaSelection[]) => void;\n}\n""",
)
replace_once(
    'components/PromptLibraryScreen.tsx',
    "const CustomPromptCard: React.FC<{ T: Theme; onNavigateToPasteJSON?: () => void }> = ({ T, onNavigateToPasteJSON }) => {",
    "const CustomPromptCard: React.FC<{ T: Theme; onNavigateToPasteJSON?: (personas: PromptPersonaSelection[]) => void }> = ({ T, onNavigateToPasteJSON }) => {",
)
replace_once(
    'components/PromptLibraryScreen.tsx',
    """                    <button onClick={onNavigateToPasteJSON} className={`flex-1 px-3 py-2 text-sm bg-green-600 hover:bg-green-500 text-white text-center rounded-md font-semibold transition-colors`} title=\"作成したJSONデータを貼り付けます\">\n                        JSONを貼る\n                    </button>""",
    """                    <button\n                        onClick={() => onNavigateToPasteJSON(personas.map(({ name, role, trait }) => ({ name, role, trait })))}\n                        className={`flex-1 px-3 py-2 text-sm bg-green-600 hover:bg-green-500 text-white text-center rounded-md font-semibold transition-colors`}\n                        title=\"選択した解説キャラ情報と一緒に生成データを貼り付けます\"\n                    >\n                        JSONを貼る\n                    </button>""",
)

# App: remember the selection until the generated material is pasted and saved.
replace_once(
    'App.tsx',
    "import { PromptLibraryScreen } from './components/PromptLibraryScreen';",
    "import { PromptLibraryScreen, PromptPersonaSelection } from './components/PromptLibraryScreen';",
)
replace_once(
    'App.tsx',
    """  const [view, setView] = useState<View>('upload');\n  const [openPasteJsonMode, setOpenPasteJsonMode] = useState(false);\n""",
    """  const [view, setView] = useState<View>('upload');\n  const [openPasteJsonMode, setOpenPasteJsonMode] = useState(false);\n  const [pendingPromptPersonas, setPendingPromptPersonas] = useState<PromptPersonaSelection[] | null>(null);\n""",
)
replace_once(
    'App.tsx',
    """  const stripStructuralMarkdown = (line: string) => line\n    .trim()\n    .replace(/^#{1,6}\\s*/, '')\n    .replace(/^[-*+]\\s+/, '')\n    .replace(/\\*\\*/g, '')\n    .replace(/__/g, '')\n    .replace(/^`+|`+$/g, '')\n    .trim();\n\n""",
    """  const stripStructuralMarkdown = (line: string) => line\n    .trim()\n    .replace(/^#{1,6}\\s*/, '')\n    .replace(/^[-*+]\\s+/, '')\n    .replace(/\\*\\*/g, '')\n    .replace(/__/g, '')\n    .replace(/^`+|`+$/g, '')\n    .trim();\n\n  const applySelectedPersonaMetadata = (\n      entries: TranscriptEntry[],\n      selections: PromptPersonaSelection[] | null\n  ): TranscriptEntry[] => {\n      if (!selections || selections.length === 0 || entries.length === 0) return entries;\n\n      const nextEntries = entries.map(entry => ({ ...entry }));\n      const firstExplanation = nextEntries[0].explanation || '';\n      const existingProfileMatch = firstExplanation.match(/__PERSONA_PROFILE__([\\s\\S]*?)__END_PERSONA__/);\n      const existingProfile = existingProfileMatch ? existingProfileMatch[1] : '';\n\n      const profileNames = existingProfile\n          .split(/\\r?\\n/)\n          .map(line => stripStructuralMarkdown(line).match(/^(?:\\d+[.)]\\s*)?(?:名前|name)\\s*[:：]\\s*(.+)$/i)?.[1]?.trim())\n          .filter((name): name is string => !!name);\n\n      const speakerNames: string[] = [];\n      for (const entry of nextEntries) {\n          const explanation = (entry.explanation || '')\n              .replace(/__PERSONA_PROFILE__[\\s\\S]*?__END_PERSONA__/, '')\n              .replace(/__BACKGROUND_INFO__[\\s\\S]*?__END_BACKGROUND__/, '');\n          for (const rawLine of explanation.split(/\\r?\\n/)) {\n              const line = stripStructuralMarkdown(rawLine);\n              const match = line.match(/^\\s*(?:\\[解説\\]\\s*)?([^:：\\n]{1,60})\\s*[:：]/);\n              if (!match) continue;\n              const name = match[1].replace(/[（(][^）)]*[）)]\\s*$/, '').trim();\n              if (name && !speakerNames.includes(name)) speakerNames.push(name);\n              if (speakerNames.length >= selections.length) break;\n          }\n          if (speakerNames.length >= selections.length) break;\n      }\n\n      const canonicalProfile = selections.map((selection, index) => {\n          const name = speakerNames[index] || profileNames[index] || selection.name.trim() || `解説者${index + 1}`;\n          return `名前: ${name}\\n役割: ${selection.role}\\n性格: ${selection.trait}`;\n      }).join('\\n\\n');\n\n      const withoutOldProfile = firstExplanation.replace(/__PERSONA_PROFILE__[\\s\\S]*?__END_PERSONA__/, '');\n      nextEntries[0].explanation = `__PERSONA_PROFILE__【解説担当】\\n${canonicalProfile}\\n__END_PERSONA__${withoutOldProfile}`;\n      return nextEntries;\n  };\n\n""",
)
replace_once(
    'App.tsx',
    """  }) => {\n    setError(null);\n    try {\n""",
    """  }) => {\n    setError(null);\n    const selectedPromptPersonas = data.plainTextContent ? pendingPromptPersonas : null;\n    if (data.plainTextContent && pendingPromptPersonas) {\n        setPendingPromptPersonas(null);\n    }\n    try {\n""",
)
replace_once(
    'App.tsx',
    """             } else {\n                 textContent = parsePlainTextToTranscript(stripStandaloneCodeFences(data.plainTextContent));\n             }\n\n             if (backgroundText && textContent.length > 0) {\n""",
    """             } else {\n                 textContent = parsePlainTextToTranscript(stripStandaloneCodeFences(data.plainTextContent));\n             }\n\n             textContent = applySelectedPersonaMetadata(textContent, selectedPromptPersonas);\n\n             if (backgroundText && textContent.length > 0) {\n""",
)
replace_once(
    'App.tsx',
    """            onNavigateToPasteJSON={() => {\n                setOpenPasteJsonMode(true);\n                setView('upload');\n            }}\n""",
    """            onNavigateToPasteJSON={(personas) => {\n                setPendingPromptPersonas(personas);\n                setOpenPasteJsonMode(true);\n                setView('upload');\n            }}\n""",
)

# Reader: explicit manual override remains highest priority, then the canonical saved profile,
# and only then an AI-written role label on the explanation line.
replace_once(
    'components/ReaderScreen.tsx',
    """      const role = roleFromLine || overrideRole || (persona ? resolvePersonaRole(persona.role) || persona.role : undefined);\n""",
    """      const profileRole = persona ? resolvePersonaRole(persona.role) || persona.role : undefined;\n      const role = overrideRole || profileRole || roleFromLine;\n""",
)

# Guardrails
prompt = Path('components/PromptLibraryScreen.tsx').read_text(encoding='utf-8')
app = Path('App.tsx').read_text(encoding='utf-8')
reader = Path('components/ReaderScreen.tsx').read_text(encoding='utf-8')
assert 'onNavigateToPasteJSON?: (personas: PromptPersonaSelection[]) => void;' in prompt
assert 'onNavigateToPasteJSON(personas.map' in prompt
assert 'pendingPromptPersonas' in app
assert 'applySelectedPersonaMetadata' in app
assert 'textContent = applySelectedPersonaMetadata(textContent, selectedPromptPersonas);' in app
assert 'const role = overrideRole || profileRole || roleFromLine;' in reader
