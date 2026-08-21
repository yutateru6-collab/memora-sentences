from pathlib import Path

path = Path('components/ReaderScreen.tsx')
text = path.read_text(encoding='utf-8')


def replace_once(old: str, new: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'expected exactly one anchor, found {count}: {old[:120]!r}')
    text = text.replace(old, new, 1)


replace_once(
'''  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const personaProfiles = useMemo(''',
'''  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Old materials may contain a speaker name but no role metadata. Keep a
  // per-material, per-device override so the user can assign the correct
  // official avatar once and have it restored on later visits.
  const personaRoleStorageKey = `memora-persona-role-overrides:${materialId}`;
  const [personaRoleOverrides, setPersonaRoleOverrides] = useState<Record<string, string>>(() => {
      if (typeof window === 'undefined') return {};
      try {
          const raw = window.localStorage.getItem(`memora-persona-role-overrides:${materialId}`);
          const parsed = raw ? JSON.parse(raw) : {};
          return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
      } catch {
          return {};
      }
  });
  const [personaRolePicker, setPersonaRolePicker] = useState<{ name: string } | null>(null);

  useEffect(() => {
      if (typeof window === 'undefined') return;
      try {
          const raw = window.localStorage.getItem(personaRoleStorageKey);
          const parsed = raw ? JSON.parse(raw) : {};
          setPersonaRoleOverrides(parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {});
      } catch {
          setPersonaRoleOverrides({});
      }
      setPersonaRolePicker(null);
  }, [personaRoleStorageKey]);

  const savePersonaRoleOverride = (speakerName: string, role: string) => {
      const normalizedName = normalizePersonaName(speakerName);
      if (!normalizedName || !PERSONA_AVATAR_BY_ROLE[role]) return;

      setPersonaRoleOverrides(previous => {
          const next = { ...previous, [normalizedName]: role };
          if (typeof window !== 'undefined') {
              try {
                  window.localStorage.setItem(personaRoleStorageKey, JSON.stringify(next));
              } catch {
                  // The avatar still updates for the current session even if storage is unavailable.
              }
          }
          return next;
      });
      setPersonaRolePicker(null);
  };

  const personaProfiles = useMemo('''
)

replace_once(
'''      const normalizedSpeaker = normalizePersonaName(speakerName);
      if (!normalizedSpeaker) return undefined;

      let persona = personaAvatarByName.get(normalizedSpeaker);''',
'''      const normalizedSpeaker = normalizePersonaName(speakerName);
      if (!normalizedSpeaker) return undefined;
      const overrideRole = personaRoleOverrides[normalizedSpeaker];

      let persona = personaAvatarByName.get(normalizedSpeaker);'''
)

replace_once(
'''      const blockedLabels = new Set(['例', '例文', '意味', '文法', 'ポイント', '注意', '補足', '主語', '動詞', '目的語', 's', 'v', 'o', 'c']);
      if (!persona && !roleFromLine && blockedLabels.has(normalizedSpeaker)) return undefined;

      const role = roleFromLine || (persona ? resolvePersonaRole(persona.role) || persona.role : undefined);''',
'''      const blockedLabels = new Set(['例', '例文', '意味', '文法', 'ポイント', '注意', '補足', '主語', '動詞', '目的語', 's', 'v', 'o', 'c']);
      if (!persona && !roleFromLine && !overrideRole && blockedLabels.has(normalizedSpeaker)) return undefined;

      const role = roleFromLine || overrideRole || (persona ? resolvePersonaRole(persona.role) || persona.role : undefined);'''
)

replace_once(
'''                          <div
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
                          </div>''',
'''                          <button
                              type="button"
                              onClick={(event) => {
                                  event.stopPropagation();
                                  setPersonaRolePicker({ name: speaker.name });
                              }}
                              className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full flex-shrink-0 border border-white/15 shadow-md bg-gradient-to-br from-sky-500/70 to-violet-500/70 flex items-center justify-center active:scale-95 transition-transform"
                              title={speaker.avatar ? `${avatarTitle}（タップでキャラ変更）` : `${speaker.name}のキャラを選ぶ`}
                              aria-label={speaker.avatar ? `${speaker.name}のキャラを変更` : `${speaker.name}のキャラを選ぶ`}
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
                                      className="absolute inset-0 w-full h-full rounded-full object-cover"
                                  />
                              )}
                              {!speaker.avatar && (
                                  <span className="absolute -right-1 -bottom-1 w-4 h-4 rounded-full bg-sky-500 text-white border border-white/70 text-[11px] font-black leading-[14px] shadow" aria-hidden="true">+</span>
                              )}
                          </button>'''
)

replace_once(
'''      {isGlobalMemoOpen && (''',
'''      {personaRolePicker && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setPersonaRolePicker(null)}>
              <div
                  role="dialog"
                  aria-modal="true"
                  aria-label={`${personaRolePicker.name}のキャラを選ぶ`}
                  className={`${T.containerBg} w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border ${T.border} shadow-2xl p-5 sm:p-6 animate-fade-in`}
                  style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
                  onClick={(event) => event.stopPropagation()}
              >
                  <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                          <h3 className={`text-lg font-bold ${T.textPrimary}`}>{personaRolePicker.name} のキャラを選ぶ</h3>
                          <p className={`text-xs mt-1 leading-5 ${T.textMuted}`}>役割情報がない旧教材用です。一度選ぶと、この教材では次回から人物画像を表示します。</p>
                      </div>
                      <button type="button" onClick={() => setPersonaRolePicker(null)} className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${T.button}`} aria-label="閉じる">×</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                      {PERSONA_ROLE_KEYS.map(role => (
                          <button
                              key={role}
                              type="button"
                              onClick={() => savePersonaRoleOverride(personaRolePicker.name, role)}
                              className={`min-h-12 px-3 py-2.5 rounded-xl border ${T.border} ${T.button} text-sm font-bold text-left transition-transform active:scale-[0.98]`}
                          >
                              {role}
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {isGlobalMemoOpen && ('''
)

path.write_text(text, encoding='utf-8')

final = path.read_text(encoding='utf-8')
for token in [
    'personaRoleStorageKey',
    'savePersonaRoleOverride',
    'personaRoleOverrides[normalizedSpeaker]',
    'setPersonaRolePicker({ name: speaker.name })',
    'PERSONA_ROLE_KEYS.map(role =>',
]:
    if token not in final:
        raise RuntimeError(f'missing expected fix token: {token}')

for asset in [
    '/personas/01_ギャル.png', '/personas/02_大学生.png', '/personas/03_高校教師.png',
    '/personas/04_司書.png', '/personas/05_主婦.png', '/personas/06_経営者.png',
    '/personas/07_おじいちゃん.png', '/personas/08_ゲーム実況者.png',
    '/personas/09_ミステリー小説の探偵.png', '/personas/10_異世界から来た騎士.png',
]:
    if asset not in final:
        raise RuntimeError(f'missing avatar mapping: {asset}')

print('Legacy persona avatar assignment patch applied.')
