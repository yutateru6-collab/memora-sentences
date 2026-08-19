from pathlib import Path

# ReaderScreen: preserve main verbatim and change only the requested UI/viewport pieces.
path = Path('components/ReaderScreen.tsx')
text = path.read_text()
old = "    <div className={`flex flex-col h-screen max-h-screen overflow-hidden ${T.bg} ${T.textPrimary}`}>\n"
new = "    <div className={`flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden ${T.bg} ${T.textPrimary}`}>\n"
assert old in text
text = text.replace(old, new, 1)

clean_anchor = "  const normalizeForMatch = (str: string) => str.toLowerCase().replace(/[^a-z0-9']/g, '');\n"
format_helper = """  const formatPronunciation = (value?: string) => {
      if (!value) return '';
      const normalized = value.replace(/［/g, '[').replace(/］/g, ']');
      return normalized.includes('[') || normalized.includes(']') ? normalized : `[${normalized}]`;
  };

"""
assert clean_anchor in text
text = text.replace(clean_anchor, format_helper + clean_anchor, 1)

title_anchor = """                    <h1 className=\"font-bold text-lg truncate\">{title}</h1>
                </div>
"""
title_replacement = """                    <h1 className=\"font-bold text-lg truncate\">{title}</h1>
                    {hasExplanation && (
                        <button
                            onClick={() => setShowExplanation(prev => !prev)}
                            aria-pressed={showExplanation}
                            className={`sm:hidden flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold border ${showExplanation ? 'text-yellow-300 border-yellow-400/40 bg-yellow-400/10' : `${T.textMuted} ${T.border} bg-white/5`}`}
                            title=\"解説を表示\"
                        >
                            <LightBulbIcon className=\"w-4 h-4\" />
                            <span>解説</span>
                        </button>
                    )}
                </div>
"""
assert title_anchor in text
text = text.replace(title_anchor, title_replacement, 1)

start = text.index('      {activeWordPopup && (')
end = text.index('      {activeGrammarTerm && (', start)
popup = r'''      {activeWordPopup && (
        <>
          <div 
              className="fixed inset-0 z-40 bg-black/30 sm:bg-transparent" 
              onClick={(e) => {
                  e.stopPropagation();
                  setActiveWordPopup(null);
              }}
          />
          <div 
              className="hidden sm:block fixed z-50 bg-slate-800 text-white text-sm p-3 rounded-lg shadow-2xl border border-slate-600 animate-fade-in"
              style={{ 
                  top: Math.round(activeWordPopup.position.top < 300 ? activeWordPopup.position.top + 30 : activeWordPopup.position.top - 10), 
                  left: Math.min(
                      Math.max(Math.round(activeWordPopup.position.left + (activeWordPopup.position.width / 2)), 176),
                      (typeof window !== 'undefined' ? window.innerWidth : 1024) - 176
                  ),
                  transform: activeWordPopup.position.top < 300 ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
                  minWidth: '220px',
                  maxWidth: '320px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                  textAlign: 'left',
                  zIndex: 60
              }}
              onClick={(e) => e.stopPropagation()}
          >
              <div className="border-b border-slate-600/50 pb-2 mb-2">
                  <div className="font-bold text-lg text-sky-300 leading-tight">{activeWordPopup.card.front}</div>
                  {activeWordPopup.card.pronunciation && (
                      <div className="text-xs text-slate-400 mt-0.5 font-mono">{formatPronunciation(activeWordPopup.card.pronunciation)}</div>
                  )}
              </div>
              
              <div className="font-bold text-base text-amber-400 mb-2 leading-snug">{activeWordPopup.card.back}</div>
              
              {activeWordPopup.card.memo && (
                  <div className="text-xs text-slate-300 whitespace-pre-wrap border-t border-slate-600/50 pt-2 mt-2 leading-relaxed opacity-90">
                      {activeWordPopup.card.memo}
                  </div>
              )}

              <span 
                  className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 border-r border-b border-slate-600 transform rotate-45 ${activeWordPopup.position.top < 300 ? '-top-1.5 border-t border-l border-r-0 border-b-0' : '-bottom-1.5'}`}
              ></span>
          </div>

          <div
              role="dialog"
              aria-modal="true"
              aria-label={`${activeWordPopup.card.front} の単語情報`}
              className="sm:hidden fixed z-50 left-3 right-3 bottom-3 max-h-[72dvh] overflow-hidden rounded-2xl bg-slate-800 text-white border border-slate-600 shadow-2xl animate-fade-in"
              style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
              onClick={(e) => e.stopPropagation()}
          >
              <div className="max-h-[72dvh] overflow-y-auto p-4 pb-2">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-600/50 pb-3 mb-3">
                      <div className="min-w-0">
                          <div className="font-bold text-xl text-sky-300 leading-tight break-words">{activeWordPopup.card.front}</div>
                          {activeWordPopup.card.pronunciation && (
                              <div className="text-sm text-slate-400 mt-1 font-mono">{formatPronunciation(activeWordPopup.card.pronunciation)}</div>
                          )}
                      </div>
                      <button
                          type="button"
                          onClick={() => setActiveWordPopup(null)}
                          className="flex-shrink-0 w-9 h-9 rounded-full bg-white/10 text-slate-200 flex items-center justify-center"
                          aria-label="単語情報を閉じる"
                      >
                          <span className="text-xl leading-none" aria-hidden="true">×</span>
                      </button>
                  </div>
                  <div className="font-bold text-base text-amber-400 mb-3 leading-snug whitespace-pre-wrap">{activeWordPopup.card.back}</div>
                  {activeWordPopup.card.memo && (
                      <div className="text-sm text-slate-300 whitespace-pre-wrap border-t border-slate-600/50 pt-3 mt-3 leading-relaxed">
                          {activeWordPopup.card.memo}
                      </div>
                  )}
              </div>
          </div>
        </>
      )}

'''
text = text[:start] + popup + text[end:]
path.write_text(text)

# PromptLibrary: change only CustomPromptCard's app-output format.
path = Path('components/PromptLibraryScreen.tsx')
text = path.read_text()
custom_start = text.index('const CustomPromptCard:')
old_example = """        const outputFormatExample = personas.map(p => 
            `${p.name || '（AIが決めた名前）'}: [${p.trait}な${p.role}としてのコメント]`
        ).join('\\n');
"""
new_example = """        const outputFormatExample = personas.map(p => 
            `[解説] ${p.name || '（AIが決めた名前）'}: [${p.trait}な${p.role}としてのコメント]`
        ).join('\\n');
"""
example_pos = text.index(old_example, custom_start)
text = text[:example_pos] + text[example_pos:].replace(old_example, new_example, 1)
prompt_start = text.index('        const prompt = `命令書', custom_start)
prompt_end = text.index('        return prompt;', prompt_start)
new_prompt = r'''        const prompt = `命令書${personalInstructions ? '\nまた、以下のパーソナライズ指示に絶対に従ってください：' + personalInstructions : ''}
あなたは、英語文章を作成する際は「${topic || '日本のラーメン文化'}」についてユーザーの理解に合わせたレベルでその内容について書いてください。一方で、文章の解説を行う際は、後述するキャラクターたちになりきって、掛け合い形式で解説を行ってください。

以下の形式はMEMORA Sentencesへそのまま貼り付けて解析するためのアプリ用データです。
完成した英文全文を別の場所へ先に出力したり、同じ英文を二重に出力したりしないでください。
Markdownのコードフェンス（\`\`\`markdown、\`\`\`text、\`\`\`json等）も付けないでください。
最終回答は、以下に指定する1つのデータブロックだけを出力してください。

【出力形式】

【解説担当】
${examplePersonaProfile}

[英語の原文一文]
[その日本語訳一文]
${outputFormatExample}

[次の英語の原文一文]
[その日本語訳一文]
${outputFormatExample}

（同じセットを全文の文数だけ繰り返す）

----------
[
  {
    "front": "ramen",
    "back": "ラーメン、中華麺",
    "pronunciation": "[ラ]ーメン",
    "memo": "【語源・雑学】語源・関連語・雑学をここに記述。\\n【覚え方】覚えやすい語呂やイメージをここに記述。\\n【例文】英単語を使った面白い英語例文をここに記述。"
  }
]
----------
[背景知識を日本語で約400文字]

【最重要：対訳・解説のルール】
・英語は必ず一文ずつ出力し、その直後にその一文だけの自然な日本語訳を置いてください。
・各解説コメントは必ず「[解説] 名前: コメント」の1行形式で開始してください。
・複数の解説担当がいる場合、同じ英文の日本語訳の直後に担当者ごとの[解説]行を連続して置いてください。
・コメントには文法構造（主語S・動詞Vなどを実際の英単語と共に示す）、重要語句、内容の要約、関連雑学を、設定された解説量に応じて入れてください。
・キャラクターの口調と個性を反映しつつ、解説として意味が通る内容にしてください。
・「命名した」「名前:」など、人物名そのものではない余計な接頭辞を人物名に付けないでください。

【最重要：単語JSONのルール】
・単語リスト部分だけを、有効なJSON配列として30語出力してください。長文全体をJSONにしないでください。
・各要素で使用できるキーは "front", "back", "pronunciation", "memo" の4つだけです。
・front: 英単語のみ。絵文字、発音、品詞記号などを混ぜないでください。
・back: 日本語の主な意味を2〜3個。
・pronunciation: 一般的なカタカナ発音。最も強く読む部分を半角の[ ]で囲んでください（例: ネ[ゴ]シエイト）。
・memo: 「【語源・雑学】」「【覚え方】」「【例文】」の3見出しをこの順で1つの文字列に入れてください。改行はJSON文字列内の \\n で表現してください。
・JSON内ではダブルクォートを使用し、末尾カンマ、コメント、Markdown、JSON前後の説明文を入れないでください。
・【語源・雑学】では語源、同語源の関連語、文化・歴史・科学などの面白い雑学を含めてください。
・【覚え方】は以下のルールに従って、音と意味が結びつく印象的な覚え方を作ってください。
${mnemonicRules}
・【例文】では対象単語を必ず使い、ユニークで少し笑える自然な英語例文を作ってください。ユーザー情報「${exampleKeyword || '指定なし'}」がある場合は、3回に1回程度の自然な頻度でパーソナライズしてください。

【背景知識】
単語JSONの後に「----------」だけの行を1行置き、この英語長文の内容に関する背景知識・関連情報・うんちく・雑学を日本語で約400文字記述してください。Markdownの強調記法は使わずプレーンテキストにしてください。

絶対的制約条件
読者層と前提
読者: そのトピックに興味を持つ人。
前提知識: ${premiseDescriptions[depth as keyof typeof premiseDescriptions]}
内容と分析の方向性
内容の深さ: ${depthDescriptions[depth]}
構成と文章量
段落数: ${paragraphs}段落
文章の長さ: 約${length}語
言語と表現
言語: 英語。
英語レベル: ${level}※必ずその英検レベルの難易度を守ること。特に単語を難しくしすぎないこと。

解説キャラクター設定:
${personaDescriptions}

解説の指示:
${personaInstructions}

解説の英語量指示:
${levelInstruction}

思考プロセスと禁止事項
思考法: 常に水平思考（Lateral Thinking）を意識し、既成概念にとらわれない独創的で多角的な視点からアプローチしてください。
ハルシネーションの禁止: 生成する内容は、広く認められている解釈を元に構築してください。
以上の全ての条件を満たし、MEMORA Sentencesへそのまま貼り付けられるデータだけを出力してください。
※Always think harder, deeper, longer and more careful for the best quality!`;
'''
text = text[:prompt_start] + new_prompt + text[prompt_end:]
path.write_text(text)
