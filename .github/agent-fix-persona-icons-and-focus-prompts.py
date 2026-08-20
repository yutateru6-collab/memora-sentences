from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    text = file_path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected exactly one anchor, found {count}')
    file_path.write_text(text.replace(old, new, 1), encoding='utf-8')


def replace_exact_count(path: str, old: str, new: str, expected_count: int) -> None:
    file_path = Path(path)
    text = file_path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != expected_count:
        raise RuntimeError(f'{path}: expected {expected_count} anchors, found {count}')
    file_path.write_text(text.replace(old, new), encoding='utf-8')


# ---------------------------------------------------------------------------
# Prompt Library: show only the two core creation modes and make persona output
# self-describing so the Reader can recover the correct avatar reliably.
# ---------------------------------------------------------------------------
replace_once(
    'components/PromptLibraryScreen.tsx',
    '''const DiceIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 8h.01"></path>
    <path d="M8 8h.01"></path>
    <path d="M8 16h.01"></path>
    <path d="M16 16h.01"></path>
    <path d="M12 12h.01"></path>
  </svg>
);

// --- Accordion Wrapper Component ---''',
    '''const DiceIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 8h.01"></path>
    <path d="M8 8h.01"></path>
    <path d="M8 16h.01"></path>
    <path d="M16 16h.01"></path>
    <path d="M12 12h.01"></path>
  </svg>
);

const OFFICIAL_PERSONA_OPTIONS = [
    'ギャル',
    '大学生',
    '高校教師',
    '司書',
    '主婦',
    '経営者',
    'おじいちゃん',
    'ゲーム実況者',
    'ミステリー小説の探偵',
    '異世界から来た騎士',
];

// --- Accordion Wrapper Component ---'''
)

persona_options = '''    const personaOptions = [
        'ギャル', '大学生', '小学生', '部長', '主婦', '浪人生', '政治家', 'インフルエンサー', 'バンドマン', 'サッカー選手', 
        'ミステリー小説の探偵', 'おじいちゃん', 'おばあちゃん', '中学生', '司書', '経営者', 'オカルト好き', 
        '異世界から来た騎士', '歴史上の人物', '就活中の大学生', 'アイドルオタク', 'スピリチュアルカウンセラー', 
        'ゲーム実況者', '漫画家', '高校教師', '美容師', '新米ママ', '花屋の店主', '帰国子女', 'トラック運転手'
    ];'''
replace_exact_count(
    'components/PromptLibraryScreen.tsx',
    persona_options,
    '''    const personaOptions = OFFICIAL_PERSONA_OPTIONS;''',
    2
)

replace_once(
    'components/PromptLibraryScreen.tsx',
    '''        const outputFormatExample = personas.map(p => 
            `[解説] ${p.name || '（AIが決めた名前）'}: [${p.trait}な${p.role}としてのコメント]`
        ).join('\\n');''',
    '''        const outputFormatExample = personas.map(p => 
            `[解説] ${p.name || '（AIが決めた名前）'}（${p.role}）: [${p.trait}な${p.role}としてのコメント]`
        ).join('\\n');'''
)

replace_once(
    'components/PromptLibraryScreen.tsx',
    '''・各解説コメントは必ず「[解説] 名前: コメント」の1行形式で開始してください。
・複数の解説担当がいる場合、同じ英文の日本語訳の直後に担当者ごとの[解説]行を連続して置いてください。''',
    '''・各解説コメントは必ず「[解説] 名前（役割）: コメント」の1行形式で開始してください。
・各[解説]行の「名前」と「役割」は、【解説担当】プロフィール内の同じ人物の表記と一字一句同じにしてください。
・複数の解説担当がいる場合、同じ英文の日本語訳の直後に担当者ごとの[解説]行を連続して置いてください。'''
)

replace_once(
    'components/PromptLibraryScreen.tsx',
    '''            description="JSONマジック：記事の内容に合わせてサイトのデザインごと生成します。"''',
    '''            description="好きなテーマを匿名掲示板風の英語教材にします。"'''
)

replace_once(
    'components/PromptLibraryScreen.tsx',
    '''        <h1 className={`text-xl font-bold ${T.textPrimary}`}>プロンプト ライブラリ</h1>''',
    '''        <h1 className={`text-xl font-bold ${T.textPrimary}`}>教材をつくる</h1>'''
)

replace_once(
    'components/PromptLibraryScreen.tsx',
    '''            {/* Section: Reading */}
            <div>
                <div className="mb-4 border-b border-gray-700 pb-2 flex items-end justify-between gap-3">
                    <h2 className={`text-xl font-bold ${T.textPrimary}`}>
                        長文読解
                    </h2>
                    <img
                        src="/mascots/06_紫_ノートを書くステゴサウルス.png"
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                        className="w-14 h-14 sm:w-16 sm:h-16 object-contain drop-shadow-lg select-none pointer-events-none"
                    />
                </div>
                <div className="grid gap-4">
                    {/* 1. 伝説の始まり */}
                    <LegendPromptCard T={T} />
                    
                    {/* 2. 好きな内容の長文 */}
                    <CustomPromptCard T={T} onNavigateToPasteJSON={onNavigateToPasteJSON} />
                    
                    {/* 3. 英文解説 */}
                    <EnglishExplanationCard T={T} />
                    
                    {/* 4. SNSスレッドメーカー */}
                    <SnsThreadPromptCard T={T} />
                    
                    {/* 5. 匿名掲示板メーカー */}
                    <BoardPromptCard T={T} />
                    
                    {/* 6. Amazon商品レビュー メーカー */}
                    <AmazonPromptCard T={T} />
                </div>
            </div>''',
    '''            <div>
                <div className="mb-4 border-b border-gray-700 pb-3 flex items-end justify-between gap-3">
                    <div>
                        <h2 className={`text-xl font-bold ${T.textPrimary}`}>
                            作成モードを選ぶ
                        </h2>
                        <p className={`mt-1 text-sm ${T.textMuted}`}>
                            長文教材か、匿名掲示板風教材のどちらかを選んでください。
                        </p>
                    </div>
                    <img
                        src="/mascots/06_紫_ノートを書くステゴサウルス.png"
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                        className="w-14 h-14 sm:w-16 sm:h-16 object-contain drop-shadow-lg select-none pointer-events-none"
                    />
                </div>
                <div className="grid gap-4">
                    <CustomPromptCard T={T} onNavigateToPasteJSON={onNavigateToPasteJSON} />
                    <BoardPromptCard T={T} />
                </div>
            </div>'''
)


# ---------------------------------------------------------------------------
# App parser: tolerate Markdown wrappers and profile blocks without an exact
# header so persona metadata survives AI formatting variations.
# ---------------------------------------------------------------------------
replace_once(
    'App.tsx',
    '''  const stripStandaloneCodeFences = (str: string) => str
    .split('\\n')
    .filter(line => !/^\\s*```(?:markdown|text|json)?\\s*$/i.test(line))
    .join('\\n')
    .trim();

  const cleanJsonString = (str: string) => {''',
    '''  const stripStandaloneCodeFences = (str: string) => str
    .split('\\n')
    .filter(line => !/^\\s*```(?:markdown|text|json)?\\s*$/i.test(line))
    .join('\\n')
    .trim();

  const stripStructuralMarkdown = (line: string) => line
    .trim()
    .replace(/^#{1,6}\\s*/, '')
    .replace(/^[-*+]\\s+/, '')
    .replace(/\\*\\*/g, '')
    .replace(/__/g, '')
    .replace(/^`+|`+$/g, '')
    .trim();

  const cleanJsonString = (str: string) => {'''
)

replace_once(
    'App.tsx',
    '''      const lines = text.split('\\n').map(l => l.trim()).filter(l => l && !/^```(?:markdown|text|json)?$/i.test(l));
      const entries: TranscriptEntry[] = [];
      
      let metadataBuffer = '';
      let isReadingProfile = false;
      
      const contentLines: string[] = [];
      
      for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // Detect profile start
          if (line.startsWith('【解説担当') || line.startsWith('【解説者プロフィール') || (i === 0 && line.startsWith('【'))) {
              isReadingProfile = true;
              metadataBuffer += line + '\\n';
              continue;
          }
          
          if (isReadingProfile) {
               const hasJapanese = /[ぁ-んァ-ン一-龯]/.test(line);
               if (!hasJapanese && line.length > 0 && !line.startsWith('【')) {
                   isReadingProfile = false;
                   contentLines.push(line);
               } else if (line.includes('----------')) {
                   isReadingProfile = false;
               } else {
                   metadataBuffer += line + '\\n';
               }
          } else {
              contentLines.push(line);
          }
      }
      
      for (let i = 0; i < contentLines.length; i++) {
          const line = contentLines[i];''',
    '''      const lines = text.split('\\n').map(l => l.trim()).filter(l => l && !/^```(?:markdown|text|json)?$/i.test(l));
      const entries: TranscriptEntry[] = [];
      
      let metadataBuffer = '';
      let isReadingProfile = false;
      
      const contentLines: string[] = [];
      
      for (let i = 0; i < lines.length; i++) {
          const structuralLine = stripStructuralMarkdown(lines[i]);
          const isProfileHeader = /^【(?:解説担当|解説者プロフィール)[^】]*】/.test(structuralLine);
          const isProfileField = /^(?:\\d+[.)]\\s*)?(?:名前|役割|性格|職業|キャラ(?:クター)?)\\s*[:：]/.test(structuralLine);

          if (isProfileHeader || (!isReadingProfile && contentLines.length === 0 && isProfileField)) {
              isReadingProfile = true;
              metadataBuffer += structuralLine + '\\n';
              continue;
          }
          
          if (isReadingProfile) {
               if (structuralLine.includes('----------')) {
                   isReadingProfile = false;
                   continue;
               }

               const hasJapanese = /[ぁ-んァ-ン一-龯]/.test(structuralLine);
               const looksLikeEnglishSentence = /[A-Za-z]/.test(structuralLine)
                   && !hasJapanese
                   && !/^(?:Name|Role|Trait)\\s*[:：]/i.test(structuralLine)
                   && !structuralLine.startsWith('【');

               if (looksLikeEnglishSentence) {
                   isReadingProfile = false;
                   contentLines.push(structuralLine);
               } else {
                   metadataBuffer += structuralLine + '\\n';
               }
          } else {
              contentLines.push(structuralLine);
          }
      }
      
      for (let i = 0; i < contentLines.length; i++) {
          const line = stripStructuralMarkdown(contentLines[i]);'''
)


# ---------------------------------------------------------------------------
# Reader: resilient persona parsing, role-in-line recovery, kana/honorific
# normalization, a single-person fallback, and an initial avatar fallback.
# ---------------------------------------------------------------------------
replace_once(
    'components/ReaderScreen.tsx',
    '''interface PersonaAvatarProfile {
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
    .replace(/^[・\\-\\s]+/, '')
    .replace(/^(?:命名した|名前)\\s*[:：]?\\s*/, '')
    .replace(/^[（(【\\[]+/, '')
    .replace(/[）)】\\]]+$/, '')
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

    profile.split(/\\r?\\n/).forEach(rawLine => {
        const line = rawLine.trim();
        if (!line) return;

        const nameMatch = line.match(/^(?:\\d+\\.\\s*)?名前\\s*[:：]\\s*(.+)$/);
        if (nameMatch) {
            flush();
            current.name = normalizePersonaName(nameMatch[1]);
            return;
        }

        const roleMatch = line.match(/^役割\\s*[:：]\\s*(.+)$/);
        if (roleMatch && current.name) {
            current.role = roleMatch[1].trim();
        }
    });

    flush();
    return parsed;
};''',
    '''interface PersonaAvatarProfile {
    name: string;
    role: string;
    avatar?: string;
}

interface ExplanationSpeaker {
    name: string;
    role?: string;
    avatar?: string;
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

const PERSONA_ROLE_KEYS = Object.keys(PERSONA_AVATAR_BY_ROLE);

const stripPersonaFormatting = (value: string) => value
    .trim()
    .replace(/^#{1,6}\\s*/, '')
    .replace(/^[-*+]\\s+/, '')
    .replace(/\\*\\*/g, '')
    .replace(/__/g, '')
    .replace(/`/g, '')
    .trim();

const cleanPersonaDisplayName = (value: string) => stripPersonaFormatting(value)
    .replace(/^\\[解説\\]\\s*/, '')
    .replace(/^(?:命名した|名前)\\s*[:：]?\\s*/, '')
    .replace(/[（(][^）)]*[）)]\\s*$/, '')
    .replace(/^[（(【\\[]+/, '')
    .replace(/[）)】\\]]+$/, '')
    .trim();

const normalizePersonaName = (value: string) => cleanPersonaDisplayName(value)
    .replace(/[\\u200B-\\u200D\\uFEFF]/g, '')
    .replace(/(?:さん|先生|先輩|くん|君|ちゃん|氏|様)$/u, '')
    .replace(/[\\s・･._-]/g, '')
    .replace(/[ァ-ヶ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0x60))
    .toLowerCase();

const resolvePersonaRole = (value: string): string | undefined => {
    const cleaned = stripPersonaFormatting(value)
        .replace(/^(?:役割|職業|キャラ(?:クター)?|role)\\s*[:：]\\s*/i, '')
        .trim();
    return PERSONA_ROLE_KEYS.find(role => cleaned === role || cleaned.includes(role));
};

const parsePersonaAvatarProfiles = (profile: string | null): PersonaAvatarProfile[] => {
    if (!profile) return [];

    const parsed: PersonaAvatarProfile[] = [];
    let current: { name?: string; role?: string } = {};

    const flush = () => {
        if (current.name) {
            const role = current.role || '';
            parsed.push({
                name: cleanPersonaDisplayName(current.name),
                role,
                avatar: role ? PERSONA_AVATAR_BY_ROLE[role] : undefined,
            });
        }
        current = {};
    };

    profile.split(/\\r?\\n/).forEach(rawLine => {
        const line = stripPersonaFormatting(rawLine);
        if (!line || /^【(?:解説担当|解説者プロフィール)/.test(line)) return;

        const nameMatch = line.match(/^(?:\\d+[.)]\\s*)?(?:名前|name)\\s*[:：]\\s*(.+)$/i);
        if (nameMatch) {
            flush();
            current.name = cleanPersonaDisplayName(nameMatch[1]);
            return;
        }

        const roleMatch = line.match(/^(?:役割|職業|キャラ(?:クター)?|role)\\s*[:：]\\s*(.+)$/i);
        if (roleMatch) {
            current.role = resolvePersonaRole(roleMatch[1]) || stripPersonaFormatting(roleMatch[1]);
            return;
        }

        const combinedMatch = line.match(/^(.{1,40}?)[（(]([^）)]+)[）)](?:\\s*[:：].*)?$/);
        if (combinedMatch) {
            const role = resolvePersonaRole(combinedMatch[2]);
            if (role) {
                flush();
                parsed.push({
                    name: cleanPersonaDisplayName(combinedMatch[1]),
                    role,
                    avatar: PERSONA_AVATAR_BY_ROLE[role],
                });
                return;
            }
        }

        if (current.name && !current.role) {
            const role = resolvePersonaRole(line);
            if (role) current.role = role;
        }
    });

    flush();
    return parsed.filter(persona => persona.name);
};'''
)

replace_once(
    'components/ReaderScreen.tsx',
    '''  const personaAvatarByName = useMemo(() => {
      const avatars = new Map<string, PersonaAvatarProfile>();
      parsePersonaAvatarProfiles(personaProfile).forEach(persona => {
          avatars.set(normalizePersonaName(persona.name), persona);
      });
      return avatars;
  }, [personaProfile]);

  const getPersonaForExplanationLine = (line: string) => {
      const speakerMatch = line.match(/^\\s*(?:\\[解説\\]\\s*)?([^:：\\n]{1,50})\\s*[:：]/);
      if (!speakerMatch) return undefined;
      return personaAvatarByName.get(normalizePersonaName(speakerMatch[1]));
  };''',
    '''  const personaProfiles = useMemo(
      () => parsePersonaAvatarProfiles(personaProfile),
      [personaProfile]
  );

  const personaAvatarByName = useMemo(() => {
      const avatars = new Map<string, PersonaAvatarProfile>();
      personaProfiles.forEach(persona => {
          const key = normalizePersonaName(persona.name);
          if (key) avatars.set(key, persona);
      });
      return avatars;
  }, [personaProfiles]);

  const getPersonaForExplanationLine = (line: string): ExplanationSpeaker | undefined => {
      const speakerMatch = line.match(/^\\s*(?:\\[解説\\]\\s*)?([^:：\\n]{1,60})\\s*[:：]/);
      if (!speakerMatch) return undefined;

      const descriptor = stripPersonaFormatting(speakerMatch[1]);
      const roleFromLine = resolvePersonaRole(descriptor);
      const speakerName = cleanPersonaDisplayName(descriptor.replace(/[（(][^）)]*[）)]/g, ''));
      const normalizedSpeaker = normalizePersonaName(speakerName);
      if (!normalizedSpeaker) return undefined;

      let persona = personaAvatarByName.get(normalizedSpeaker);
      if (!persona) {
          persona = personaProfiles.find(candidate => {
              const normalizedCandidate = normalizePersonaName(candidate.name);
              return normalizedCandidate.length >= 2
                  && normalizedSpeaker.length >= 2
                  && (normalizedCandidate.includes(normalizedSpeaker) || normalizedSpeaker.includes(normalizedCandidate));
          });
      }
      if (!persona && roleFromLine) {
          persona = personaProfiles.find(candidate => resolvePersonaRole(candidate.role) === roleFromLine);
      }
      if (!persona && personaProfiles.length === 1) {
          persona = personaProfiles[0];
      }

      const blockedLabels = new Set(['例', '例文', '意味', '文法', 'ポイント', '注意', '補足', '主語', '動詞', '目的語', 's', 'v', 'o', 'c']);
      if (!persona && !roleFromLine && blockedLabels.has(normalizedSpeaker)) return undefined;

      const role = roleFromLine || (persona ? resolvePersonaRole(persona.role) || persona.role : undefined);
      return {
          name: speakerName || persona?.name || descriptor,
          role,
          avatar: (role ? PERSONA_AVATAR_BY_ROLE[role] : undefined) || persona?.avatar,
      };
  };'''
)

replace_once(
    'components/ReaderScreen.tsx',
    '''                  const persona = getPersonaForExplanationLine(line);
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
                  );''',
    '''                  const speaker = getPersonaForExplanationLine(line);
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

                  if (!speaker) {
                      return <div key={`exp-line-${lineIndex}`}>{lineContent}</div>;
                  }

                  const initial = Array.from(speaker.name.trim())[0] || '？';
                  const avatarTitle = speaker.role ? `${speaker.name}・${speaker.role}` : speaker.name;

                  return (
                      <div key={`exp-line-${lineIndex}`} className="flex items-start gap-2.5">
                          <div
                              className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden flex-shrink-0 border border-white/15 shadow-md bg-gradient-to-br from-sky-500/70 to-violet-500/70 flex items-center justify-center"
                              title={avatarTitle}
                              aria-label={`${speaker.name}のアイコン`}
                          >
                              <span className="text-sm font-black text-white" aria-hidden="true">{initial}</span>
                              {speaker.avatar && (
                                  <img
                                      src={speaker.avatar}
                                      alt=""
                                      aria-hidden="true"
                                      loading="lazy"
                                      decoding="async"
                                      onError={(event) => { event.currentTarget.style.display = 'none'; }}
                                      className="absolute inset-0 w-full h-full object-cover"
                                  />
                              )}
                          </div>
                          {lineContent}
                      </div>
                  );'''
)


# Guardrails
prompt_text = Path('components/PromptLibraryScreen.tsx').read_text(encoding='utf-8')
for hidden_render in [
    '<LegendPromptCard T={T} />',
    '<EnglishExplanationCard T={T} />',
    '<SnsThreadPromptCard T={T} />',
    '<AmazonPromptCard T={T} />',
]:
    if hidden_render in prompt_text:
        raise RuntimeError(f'hidden prompt still rendered: {hidden_render}')
if prompt_text.count('<CustomPromptCard T={T} onNavigateToPasteJSON={onNavigateToPasteJSON} />') != 1:
    raise RuntimeError('custom prompt render count is not 1')
if prompt_text.count('<BoardPromptCard T={T} />') != 1:
    raise RuntimeError('board prompt render count is not 1')
if 'const personaOptions = OFFICIAL_PERSONA_OPTIONS;' not in prompt_text:
    raise RuntimeError('official persona options were not applied')

reader_text = Path('components/ReaderScreen.tsx').read_text(encoding='utf-8')
for asset in PERSONA_ASSETS := [
    '/personas/01_ギャル.png',
    '/personas/02_大学生.png',
    '/personas/03_高校教師.png',
    '/personas/04_司書.png',
    '/personas/05_主婦.png',
    '/personas/06_経営者.png',
    '/personas/07_おじいちゃん.png',
    '/personas/08_ゲーム実況者.png',
    '/personas/09_ミステリー小説の探偵.png',
    '/personas/10_異世界から来た騎士.png',
]:
    if asset not in reader_text:
        raise RuntimeError(f'missing Reader avatar asset mapping: {asset}')
    if not (Path('public') / asset.lstrip('/')).exists():
        raise RuntimeError(f'missing public avatar file: {asset}')

app_text = Path('App.tsx').read_text(encoding='utf-8')
if 'stripStructuralMarkdown' not in app_text:
    raise RuntimeError('structural Markdown cleanup was not added')

print('Persona icon and focused prompt library patch applied successfully.')
