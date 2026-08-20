from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    text = file_path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected exactly one anchor, found {count}')
    file_path.write_text(text.replace(old, new, 1), encoding='utf-8')


# 1) Empty home: reading triceratops as the primary welcome mascot.
replace_once(
    'components/UploadScreen.tsx',
    '''              <p className="mb-2 text-[10px] sm:text-xs font-bold tracking-[0.22em] text-sky-400">WELCOME TO MEMORA</p>''',
    '''              <img
                src="/mascots/02_緑_本を読むトリケラトプス.png"
                alt=""
                aria-hidden="true"
                loading="eager"
                decoding="async"
                draggable={false}
                className="mx-auto mb-3 w-28 sm:w-36 max-h-36 object-contain drop-shadow-xl select-none pointer-events-none"
              />
              <p className="mb-2 text-[10px] sm:text-xs font-bold tracking-[0.22em] text-sky-400">WELCOME TO MEMORA</p>'''
)

# 2) Flashcards: blue mascot stays outside the card text area so it never blocks learning content.
replace_once(
    'components/FlashcardScreen.tsx',
    '''        <div className="w-full max-w-3xl flex flex-col items-center justify-center relative flex-grow">
            <div className={`absolute top-0 left-0 text-sm ${T.textMuted} font-mono`}>''',
    '''        <div className="w-full max-w-3xl flex flex-col items-center justify-center relative flex-grow">
            <img
                src="/mascots/01_青_VOCADONフラッシュカード.png"
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                draggable={false}
                className="absolute top-0 right-0 w-14 sm:w-20 max-h-20 object-contain drop-shadow-lg select-none pointer-events-none z-[1]"
            />
            <div className={`absolute top-0 left-0 text-sm ${T.textMuted} font-mono`}>'''
)

# 3) Word game: jump mascot sits beside score; no game logic changes.
replace_once(
    'components/GameScreen.tsx',
    '''        <div className={`font-bold ${T.textPrimary}`}>Score: {score}</div>''',
    '''        <div className="flex items-center gap-2 flex-shrink-0">
          <img
            src="/mascots/03_オレンジ_ジャンプ恐竜.png"
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            draggable={false}
            className="w-9 h-9 sm:w-11 sm:h-11 object-contain drop-shadow-md select-none pointer-events-none"
          />
          <div className={`font-bold ${T.textPrimary}`}>Score: {score}</div>
        </div>'''
)

# 4) RSVP: winged mascot is visible only while paused so speed-reading focus is untouched.
replace_once(
    'components/RsvpScreen.tsx',
    '''      <div className="relative flex-grow flex flex-col items-center justify-center w-full max-w-7xl px-4">
        
        {/* The Word(s) */}''',
    '''      <div className="relative flex-grow flex flex-col items-center justify-center w-full max-w-7xl px-4">
        {!isPlaying && (
          <img
            src="/mascots/04_ピンク_空飛ぶ翼竜.png"
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            draggable={false}
            className="absolute left-3 bottom-3 w-14 sm:w-20 max-h-20 object-contain opacity-75 drop-shadow-lg select-none pointer-events-none"
          />
        )}
        
        {/* The Word(s) */}'''
)

# 5) Card list: note mascot is a compact header marker, not an overlay on cards.
replace_once(
    'components/CardListScreen.tsx',
    '''            <h1 className={`text-xl font-bold ${T.textPrimary}`}>{deckName} <span className="text-sm font-normal opacity-70">({cards.length}枚)</span></h1>''',
    '''            <img
                src="/mascots/05_ティール_Vノート恐竜.png"
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                draggable={false}
                className="w-7 h-7 sm:w-9 sm:h-9 object-contain flex-shrink-0 drop-shadow-md select-none pointer-events-none"
            />
            <h1 className={`text-base sm:text-xl font-bold ${T.textPrimary} truncate`}>{deckName} <span className="text-xs sm:text-sm font-normal opacity-70">({cards.length}枚)</span></h1>'''
)
replace_once(
    'components/CardListScreen.tsx',
    '''        <div className="flex items-center gap-4">
             <button onClick={onBack}''',
    '''        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
             <button onClick={onBack}'''
)
replace_once(
    'components/CardListScreen.tsx',
    '''        <div className="flex gap-2">
            <button onClick={handleResetAll}''',
    '''        <div className="flex gap-2 flex-shrink-0">
            <button onClick={handleResetAll}'''
)

# 6) Prompt library: writing stegosaurus introduces the reading-generation section.
replace_once(
    'components/PromptLibraryScreen.tsx',
    '''                <h2 className={`text-xl font-bold ${T.textPrimary} mb-4 border-b border-gray-700 pb-2`}>
                    長文読解
                </h2>''',
    '''                <div className="mb-4 border-b border-gray-700 pb-2 flex items-end justify-between gap-3">
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
                </div>'''
)

# 7) Quiz: checklist raptor appears in answer feedback, where its role has meaning.
replace_once(
    'components/QuizScreen.tsx',
    '''                    <h4 className="font-bold mb-2">{selectedChoice === question.correctAnswerIndex ? '正解！' : '残念！'}</h4>
                    <p className="whitespace-pre-wrap font-sans text-sm">
                        {selectedChoice === question.correctAnswerIndex
                            ? (question.explanationCorrect || question.explanation)
                            : (question.explanationIncorrect || question.explanation)
                        }
                    </p>''',
    '''                    <div className="flex items-start gap-3">
                        <img
                            src="/mascots/07_黄_チェックリストラプター.png"
                            alt=""
                            aria-hidden="true"
                            loading="lazy"
                            decoding="async"
                            draggable={false}
                            className="w-12 h-12 sm:w-14 sm:h-14 object-contain flex-shrink-0 drop-shadow-md select-none pointer-events-none"
                        />
                        <div className="min-w-0">
                            <h4 className="font-bold mb-2">{selectedChoice === question.correctAnswerIndex ? '正解！' : '残念！'}</h4>
                            <p className="whitespace-pre-wrap font-sans text-sm">
                                {selectedChoice === question.correctAnswerIndex
                                    ? (question.explanationCorrect || question.explanation)
                                    : (question.explanationIncorrect || question.explanation)
                                }
                            </p>
                        </div>
                    </div>'''
)

# Guardrails: every mascot path is present exactly once in UI code and Reader remains untouched.
expected = {
    'components/UploadScreen.tsx': '/mascots/02_緑_本を読むトリケラトプス.png',
    'components/FlashcardScreen.tsx': '/mascots/01_青_VOCADONフラッシュカード.png',
    'components/GameScreen.tsx': '/mascots/03_オレンジ_ジャンプ恐竜.png',
    'components/RsvpScreen.tsx': '/mascots/04_ピンク_空飛ぶ翼竜.png',
    'components/CardListScreen.tsx': '/mascots/05_ティール_Vノート恐竜.png',
    'components/PromptLibraryScreen.tsx': '/mascots/06_紫_ノートを書くステゴサウルス.png',
    'components/QuizScreen.tsx': '/mascots/07_黄_チェックリストラプター.png',
}
for file_name, asset in expected.items():
    text = Path(file_name).read_text(encoding='utf-8')
    if text.count(asset) != 1:
        raise RuntimeError(f'{file_name}: mascot path count is not 1: {asset}')

reader = Path('components/ReaderScreen.tsx').read_text(encoding='utf-8')
if '/mascots/' in reader:
    raise RuntimeError('ReaderScreen.tsx must not gain a dinosaur mascot; keep the reading surface focused.')

for asset in expected.values():
    public_file = Path('public') / asset.lstrip('/')
    if not public_file.exists():
        raise RuntimeError(f'missing public mascot asset: {public_file}')

print('Dinosaur mascot UI patch applied and guardrails passed.')
