from pathlib import Path

path = Path('components/ReaderScreen.tsx')
text = path.read_text()

component_anchor = "const ReaderScreen: React.FC<ReaderScreenProps> = ({ mediaUrl, transcript, onBack, title, thumbnailUrl, duration: totalDuration, bgmFile, annotationFile, materialId, hasWordFile, registeredWords = [], onStartStudy, T, personaProfile, backgroundInfo, hasQuizFile, onStartQuiz, onUpdateMaterial, globalMemo: initialGlobalMemo, inlineNotes: initialInlineNotes }) => {\n"
helpers = r'''interface PersonaAvatarProfile {
    name: string;
    role: string;
    avatar: string;
}

const PERSONA_AVATAR_BY_ROLE: Record<string, string> = {
    'ギャル': '/personas/01_ギャル.png',
    '大学生': '/personas/02_大学生.png',
    '高校教師': '/personas/03_高校教師.png',
    '司書': '/personas/04_司書.png',
    '主婦': '/personas/05_主婦.png',
    '経営者': '/personas/06_経営者.png',
    'おじいちゃん': '/personas/07_おじいちゃん.png',
    'ゲーム実況者': '/personas/08_ゲーム実況者.png',
    'ミステリー小説の探偵': '/personas/09_ミステリー小説の探偵.png',
    '異世界から来た騎士': '/personas/10_異世界から来た騎士.png',
};

const normalizePersonaName = (value: string) => value
    .trim()
    .replace(/^[・\-\s]+/, '')
    .replace(/^(?:命名した|名前)\s*[:：]?\s*/, '')
    .replace(/^[（(【\[]+/, '')
    .replace(/[）)】\]]+$/, '')
    .trim();

const parsePersonaAvatarProfiles = (profile: string | null): PersonaAvatarProfile[] => {
    if (!profile) return [];

    const parsed: PersonaAvatarProfile[] = [];
    let current: { name?: string; role?: string } = {};

    const flush = () => {
        if (current.name && current.role) {
            const avatar = PERSONA_AVATAR_BY_ROLE[current.role];
            if (avatar) {
                parsed.push({ name: current.name, role: current.role, avatar });
            }
        }
        current = {};
    };

    profile.split(/\r?\n/).forEach(rawLine => {
        const line = rawLine.trim();
        if (!line) return;

        const nameMatch = line.match(/^(?:\d+\.\s*)?名前\s*[:：]\s*(.+)$/);
        if (nameMatch) {
            flush();
            current.name = normalizePersonaName(nameMatch[1]);
            return;
        }

        const roleMatch = line.match(/^役割\s*[:：]\s*(.+)$/);
        if (roleMatch && current.name) {
            current.role = roleMatch[1].trim();
        }
    });

    flush();
    return parsed;
};

'''
assert text.count(component_anchor) == 1, text.count(component_anchor)
text = text.replace(component_anchor, helpers + component_anchor, 1)

visibility_anchor = "  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);\n\n  \n  const sortedGrammarTerms = useMemo(() => {\n"
visibility_replacement = r'''  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const personaAvatarByName = useMemo(() => {
      const avatars = new Map<string, PersonaAvatarProfile>();
      parsePersonaAvatarProfiles(personaProfile).forEach(persona => {
          avatars.set(normalizePersonaName(persona.name), persona);
      });
      return avatars;
  }, [personaProfile]);

  const getPersonaForExplanationLine = (line: string) => {
      const speakerMatch = line.match(/^\s*(?:\[解説\]\s*)?([^:：\n]{1,50})\s*[:：]/);
      if (!speakerMatch) return undefined;
      return personaAvatarByName.get(normalizePersonaName(speakerMatch[1]));
  };

  
  const sortedGrammarTerms = useMemo(() => {
'''
assert text.count(visibility_anchor) == 1, text.count(visibility_anchor)
text = text.replace(visibility_anchor, visibility_replacement, 1)

old_exp_selection = r'''      const expContainer = anchorEl.closest('[id^="sentence-exp-"]');
      if (expContainer && expContainer.contains(focusEl)) {
           const idParts = expContainer.id.split('-');
           const sentenceIndex = parseInt(idParts[2], 10);
           const range = selection.getRangeAt(0);
           const preCaretRange = range.cloneRange();
           preCaretRange.selectNodeContents(expContainer);
           preCaretRange.setEnd(range.startContainer, range.startOffset);
           const startOffset = preCaretRange.toString().length;
           const endOffset = startOffset + range.toString().length;
           const rect = range.getBoundingClientRect();
           setSelectionMenu({
               top: rect.top + window.scrollY - 40,
               left: rect.left + (rect.width / 2) - 60,
               type: 'explanation',
               sentenceIndex,
               characterRange: { start: startOffset, end: endOffset }
           });
           return;
      }
'''
new_exp_selection = r'''      const expContainer = anchorEl.closest('[id^="sentence-exp-"]');
      if (expContainer && expContainer.contains(focusEl)) {
           const idParts = expContainer.id.split('-');
           const sentenceIndex = parseInt(idParts[2], 10);
           const range = selection.getRangeAt(0);

           const getAbsoluteExplanationOffset = (node: Node, nodeOffset: number) => {
               const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as HTMLElement;
               const lineContainer = element?.closest('[data-exp-base]') as HTMLElement | null;
               if (!lineContainer) return null;

               const baseOffset = Number(lineContainer.dataset.expBase || '0');
               const localRange = document.createRange();
               localRange.selectNodeContents(lineContainer);
               localRange.setEnd(node, nodeOffset);
               return baseOffset + localRange.toString().length;
           };

           let startOffset = getAbsoluteExplanationOffset(range.startContainer, range.startOffset);
           let endOffset = getAbsoluteExplanationOffset(range.endContainer, range.endOffset);

           // Fallback for old/unstructured explanation DOM.
           if (startOffset === null || endOffset === null) {
               const preCaretRange = range.cloneRange();
               preCaretRange.selectNodeContents(expContainer);
               preCaretRange.setEnd(range.startContainer, range.startOffset);
               startOffset = preCaretRange.toString().length;
               endOffset = startOffset + range.toString().length;
           }

           const rect = range.getBoundingClientRect();
           setSelectionMenu({
               top: rect.top + window.scrollY - 40,
               left: rect.left + (rect.width / 2) - 60,
               type: 'explanation',
               sentenceIndex,
               characterRange: {
                   start: Math.min(startOffset, endOffset),
                   end: Math.max(startOffset, endOffset)
               }
           });
           return;
      }
'''
assert text.count(old_exp_selection) == 1, text.count(old_exp_selection)
text = text.replace(old_exp_selection, new_exp_selection, 1)

render_start = text.index("  const renderTextWithNotes = (text: string, sentenceIndex: number, type: 'japanese' | 'explanation') => {")
render_end = text.index("\n\n  const hasMedia =", render_start)
new_render = r'''  const renderTextWithNotes = (
      text: string,
      sentenceIndex: number,
      type: 'japanese' | 'explanation',
      baseOffset = 0
  ) => {
      const segmentStart = baseOffset;
      const segmentEnd = baseOffset + text.length;
      const notes = inlineNotes.filter(n => {
          if (n.target !== type || n.sentenceIndex !== sentenceIndex || !n.characterRange) return false;
          if (type !== 'explanation') return true;
          return n.characterRange.end > segmentStart && n.characterRange.start < segmentEnd;
      });

      if (notes.length === 0 || !showInlineNotes) {
          return renderGrammarTerms(text);
      }

      const sortedNotes = [...notes].sort((a, b) =>
          Math.max(0, (a.characterRange?.start || 0) - baseOffset) -
          Math.max(0, (b.characterRange?.start || 0) - baseOffset)
      );
      const segments: React.ReactNode[] = [];
      let currentIndex = 0;

      sortedNotes.forEach((note) => {
          const absoluteStart = note.characterRange!.start;
          const absoluteEnd = note.characterRange!.end;
          const start = type === 'explanation' ? Math.max(0, absoluteStart - baseOffset) : absoluteStart;
          const end = type === 'explanation' ? Math.min(text.length, absoluteEnd - baseOffset) : absoluteEnd;
          const effectiveStart = Math.max(currentIndex, start);

          if (end <= effectiveStart) return;
          if (effectiveStart > currentIndex) {
              segments.push(renderGrammarTerms(text.substring(currentIndex, effectiveStart)));
          }
          segments.push(
              <span
                  key={`${note.id}-${baseOffset}`}
                  onClick={(e) => { e.stopPropagation(); setActiveNote(note); }}
                  className="border-b-2 border-dotted border-yellow-400 bg-yellow-400/20 cursor-pointer"
              >
                  {text.substring(effectiveStart, end)}
              </span>
          );
          currentIndex = end;
      });

      if (currentIndex < text.length) {
          segments.push(renderGrammarTerms(text.substring(currentIndex)));
      }
      return segments;
  };

  const renderExplanationWithPersonas = (text: string, sentenceIndex: number) => {
      const lines = text.split('\n');
      let baseOffset = 0;

      return (
          <div className="space-y-1.5">
              {lines.map((line, lineIndex) => {
                  const lineBaseOffset = baseOffset;
                  baseOffset += line.length + (lineIndex < lines.length - 1 ? 1 : 0);
                  const persona = getPersonaForExplanationLine(line);
                  const lineContent = (
                      <div
                          data-exp-base={lineBaseOffset}
                          className="min-w-0 flex-1 leading-relaxed"
                      >
                          {line
                              ? renderTextWithNotes(line, sentenceIndex, 'explanation', lineBaseOffset)
                              : <span aria-hidden="true">&nbsp;</span>
                          }
                      </div>
                  );

                  if (!persona) {
                      return <div key={`exp-line-${lineIndex}`}>{lineContent}</div>;
                  }

                  return (
                      <div key={`exp-line-${lineIndex}`} className="flex items-start gap-2.5">
                          <img
                              src={persona.avatar}
                              alt=""
                              aria-hidden="true"
                              title={persona.role}
                              loading="lazy"
                              decoding="async"
                              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0 border border-white/10 shadow-md bg-white/10"
                          />
                          {lineContent}
                      </div>
                  );
              })}
          </div>
      );
  };'''
text = text[:render_start] + new_render + text[render_end:]

old_explanation_render = r'''                                           {renderTextWithNotes(
                                               entry.explanation
                                                .replace(/__PERSONA_PROFILE__[\s\S]*?__END_PERSONA__/, '')
                                                .replace(/__BACKGROUND_INFO__[\s\S]*?__END_BACKGROUND__/, '')
                                                .replace(/(?:命名した|名前)[:：]\s*/g, '')
                                                .replace(/命名した/g, '')
                                                .replace(/\[(?:その日本語訳|英文の第[0-9一二三四五六七八九十]+文)\]/g, '')
                                                .trim(),
                                               index, 
                                               'explanation'
                                           )}
'''
new_explanation_render = r'''                                           {renderExplanationWithPersonas(
                                               entry.explanation
                                                .replace(/__PERSONA_PROFILE__[\s\S]*?__END_PERSONA__/, '')
                                                .replace(/__BACKGROUND_INFO__[\s\S]*?__END_BACKGROUND__/, '')
                                                .replace(/(?:命名した|名前)[:：]\s*/g, '')
                                                .replace(/命名した/g, '')
                                                .replace(/\[(?:その日本語訳|英文の第[0-9一二三四五六七八九十]+文)\]/g, '')
                                                .trim(),
                                               index
                                           )}
'''
assert text.count(old_explanation_render) == 1, text.count(old_explanation_render)
text = text.replace(old_explanation_render, new_explanation_render, 1)

path.write_text(text)
