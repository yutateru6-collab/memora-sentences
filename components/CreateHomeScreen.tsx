import React, { useCallback, useMemo, useState } from 'react';
import type { PromptPersonaSelection } from './PromptLibraryScreen';
import '../create-home.css';

interface CreateHomeScreenProps {
  onOpenLibrary: () => void;
  onOpenOtherModes: () => void;
  onNavigateToPasteJSON: (personas: PromptPersonaSelection[]) => void;
}

const AI_STUDIO_URL = 'https://aistudio.google.com/app/u/0/prompts/new_chat?model=gemini-3-pro-preview';

const levelOptions = {
  '日本の「英検1級」レベル': '英検1級',
  '日本の「英検準1級」レベル': '英検準1級',
  '日本の「英検2級」レベル': '英検2級',
  '日本の「英検準2級」レベル': '英検準2級',
  '日本の「英検3級」レベル': '英検3級',
  '日本の「大学入学共通テスト英語」で高得点を狙えるレベル': '共通テスト',
};

const lengthOptions = {
  '200': '約200語',
  '400': '約400語',
  '600': '約600語',
};

const roleOptions = [
  'やさしく導く先生',
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

const traitOptions = [
  'やさしくて、まなびを楽しませてくれる！',
  'とにかく褒めてくれる',
  'ものすごく真面目',
  '完全なるポジティブ',
  '徹底的に論理的',
  '異常なまでに好奇心旺盛',
  'お節介すぎるほど世話好き',
  'ひねくれすぎな皮肉屋',
  '口がものすごく悪い',
  '過剰に詩的',
  '無理やりすぎる例え話が好き',
  '空気も凍るダジャレを挟む',
];

const mnemonicRules = `【覚え方】
[語源と雑学]の文章の最後に、必ず【覚え方】という見出しを付け、以下の「絶対的生成ルール」に従って、面白くて覚えやすい語呂合わせを作成してください。

絶対的生成ルール（Think Harder & Create Impact）

1. 音の解体と再構築（空耳化）
* 英単語の発音を忠実なカタカナにするのではなく、「日本語の何に聞こえるか（空耳）」で分解してください。
* 例: Universe → ユニ・バース → 「ウニ」＋「バス」

2. 異常な映像の喚起（シュールレアリスム）
* 平凡な文章は禁止です。「ありえない状況」「感情的な場面（怒り・悲しみ・恐怖）」「シュールな絵」が脳裏に浮かぶようなストーリーにしてください。
* インパクト重視で、多少強引でも構いません。

3. 文末着地（意味の固定）
* 語呂合わせの文章の最後（または文中の重要なオチ部分）に、必ずその英単語の「日本語訳」を配置してください。
* 「音（A）といえば、意味（B）」という回路を脳に焼き付けるためです。

4. 形式の統一（シンプル・イズ・ベスト）
* 出力は以下の1行形式のみとしてください。余計な記号やカッコは排除し、リズムを重視してください。
* 形式: [空耳を使った文章] + [日本語訳]
* 日本語訳の部分は【 】で囲んで強調してください。

悪い例（禁止）
* × Specific → スペース引くほど広いね（意味が含まれていない）
* × Struggle → ストライキでラグビー部がもがく（映像が弱く、リズムが悪い）

良い例（合格ライン）
* ○ Specific → スペース引くほど【具体的】に
* ○ Struggle → 素手で虎来る、必死に【もがく】
* ○ Ambiguous → 案、微妙で具体性なく【曖昧】っす`;

const BookIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" />
  </svg>
);

const FeatherIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.5 3.5c-5.8-.4-10.8 1.7-13.7 5.8-1.7 2.4-2.2 5.1-1.8 7.9 2.7.4 5.5-.1 7.9-1.8 4.1-2.9 6.2-7.9 5.8-13.7l1.8 1.8Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 20c4.4-4.5 8.5-8.1 12.6-11.1" />
  </svg>
);

const ClipboardIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5.5h6M9.5 3h5a1 1 0 0 1 1 1v3h-7V4a1 1 0 0 1 1-1Z" />
    <rect x="5" y="5.5" width="14" height="15.5" rx="2.5" />
    <path strokeLinecap="round" d="M8.5 11h7M8.5 14.5h7M8.5 18h4.5" />
  </svg>
);

const ImportIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v11m0 0 4-4m-4 4-4-4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 14v4.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V14" />
  </svg>
);

const WandIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="m4 20 10.5-10.5M13 5l1-2 1 2 2 1-2 1-1 2-1-2-2-1 2-1ZM18 12l.8-1.6.8 1.6 1.6.8-1.6.8-.8 1.6-.8-1.6-1.6-.8 1.6-.8Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m3.5 17.5 3 3" />
  </svg>
);

const CreateHomeScreen: React.FC<CreateHomeScreenProps> = ({
  onOpenLibrary,
  onOpenOtherModes,
  onNavigateToPasteJSON,
}) => {
  const [topic, setTopic] = useState('');
  const [exampleKeyword, setExampleKeyword] = useState('');
  const [level, setLevel] = useState('日本の「英検準1級」レベル');
  const [length, setLength] = useState('400');
  const [role, setRole] = useState('やさしく導く先生');
  const [trait, setTrait] = useState('やさしくて、まなびを楽しませてくれる！');
  const [copied, setCopied] = useState(false);

  const personalSettingsEnabled = useMemo(
    () => typeof window === 'undefined' || localStorage.getItem('use_personal_settings') !== 'false',
    [],
  );

  const generatePrompt = useCallback(() => {
    const usePersonalSettings = localStorage.getItem('use_personal_settings') !== 'false';
    const inspirationSeed = localStorage.getItem('inspiration_seed') || '';
    const angerSeed = localStorage.getItem('anger_seed') || '';

    let personalInstructions = '';
    if (usePersonalSettings) {
      if (inspirationSeed.trim()) {
        personalInstructions += `\n【重要：ひらめきの種（パーソナライズ指示）】\nユーザーの好きなことや近況として以下の情報があります。作成する英語長文の内容や、キャラクターの解説、例文の中に、これらの要素を自然に散りばめてください：\n${inspirationSeed}\n`;
      }
      if (angerSeed.trim()) {
        personalInstructions += `\n【重要：怒りの種（毒舌・皮肉指示）】\nユーザーの嫌いなことや絶対に許せないこととして以下の情報があります。キャラクターが英文の解説やツッコミを行う際、以下の内容についてユーモアを交えた皮肉や憤りとして自然に散りばめてください：\n${angerSeed}\n`;
      }
    }

    const personaName = '（この役割と性格にふさわしい日本の名前（下の名前やあだ名）をランダムに命名してください）';
    const topicText = topic.trim() || '日本のラーメン文化';
    const keywordText = exampleKeyword.trim() || '指定なし';

    return `命令書${personalInstructions ? '\nまた、以下のパーソナライズ指示に絶対に従ってください：' + personalInstructions : ''}
あなたは、英語文章を作成する際は「${topicText}」についてユーザーの理解に合わせたレベルでその内容について書いてください。一方で、文章の解説を行う際は、後述するキャラクターになりきって解説を行ってください。

以下の形式はMEMORA Sentencesへそのまま貼り付けて解析するためのアプリ用データです。
完成した英文全文を別の場所へ先に出力したり、同じ英文を二重に出力したりしないでください。
Markdownのコードフェンス（\`\`\`markdown、\`\`\`text、\`\`\`json等）も付けないでください。
最終回答は、以下に指定する1つのデータブロックだけを出力してください。

【出力形式】

【解説担当】
名前: ${personaName}
役割: ${role}
性格: ${trait}
（ここからキャラの自己紹介と意気込みを一言）

[英語の原文一文]
[その日本語訳一文]
[解説] （AIが決めた名前）（${role}）: [${trait}という特徴を反映したコメント]

[次の英語の原文一文]
[その日本語訳一文]
[解説] （AIが決めた名前）（${role}）: [${trait}という特徴を反映したコメント]

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
・各解説コメントは必ず「[解説] 名前（役割）: コメント」の1行形式で開始してください。
・各[解説]行の「名前」と「役割」は、【解説担当】プロフィール内の同じ人物の表記と一字一句同じにしてください。
・コメントには文法構造（主語S・動詞Vなどを実際の英単語と共に示す）、重要語句、内容の要約、関連雑学を入れてください。
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
・【例文】では対象単語を必ず使い、ユニークで少し笑える自然な英語例文を作ってください。ユーザー情報「${keywordText}」がある場合は、3回に1回程度の自然な頻度でパーソナライズしてください。

【背景知識】
単語JSONの後に「----------」だけの行を1行置き、この英語長文の内容に関する背景知識・関連情報・うんちく・雑学を日本語で約400文字記述してください。Markdownの強調記法は使わずプレーンテキストにしてください。

絶対的制約条件
読者層と前提
読者: そのトピックに興味を持つ人。
前提知識: 読者はトピックについてある程度の知識を持っています。
内容と分析の方向性
内容の深さ: 具体的な例を交えながら、バランスの取れた分析を行ってください。
構成と文章量
段落数: 4段落
文章の長さ: 約${length}語
言語と表現
言語: 英語。
英語レベル: ${level}※必ずその英検レベルの難易度を守ること。特に単語を難しくしすぎないこと。

解説キャラクター設定:
1. 名前: ${personaName}
   役割: ${role}
   性格: ${trait}

解説の指示:
・${role} の発言: ${trait}という特徴を色濃く反映させた口調で、学習者が理解しやすい鋭い指摘やユニークな感想を述べること。

解説の英語量指示:
【レベル3：解説量 50%】（標準的な構造説明）
標準的な文法構造（S+VOCなど）の解説と、キャラクターの会話・リアクションを半々のバランスで行ってください。

思考プロセスと禁止事項
思考法: 常に水平思考（Lateral Thinking）を意識し、既成概念にとらわれない独創的で多角的な視点からアプローチしてください。
ハルシネーションの禁止: 生成する内容は、広く認められている解釈を元に構築してください。
以上の全ての条件を満たし、MEMORA Sentencesへそのまま貼り付けられるデータだけを出力してください。
※Always think harder, deeper, longer and more careful for the best quality!`;
  }, [topic, exampleKeyword, level, length, role, trait]);

  const copyPrompt = useCallback(async () => {
    const text = generatePrompt();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }, [generatePrompt]);

  const handleOpenAiStudio = useCallback(async () => {
    await copyPrompt();
    window.open(AI_STUDIO_URL, '_blank', 'noopener,noreferrer');
  }, [copyPrompt]);

  const selectedPersona: PromptPersonaSelection = useMemo(
    () => ({ name: '', role, trait }),
    [role, trait],
  );

  return (
    <main className="create-home" data-testid="create-home">
      <div className="create-home__ambient create-home__ambient--one" aria-hidden="true" />
      <div className="create-home__ambient create-home__ambient--two" aria-hidden="true" />
      <div className="create-home__content">
        <section className="create-home__hero" aria-labelledby="create-home-title">
          <img
            className="create-home__hero-art"
            src="/create-home/hero-garden.webp"
            alt=""
            aria-hidden="true"
            draggable={false}
            loading="eager"
            decoding="async"
          />

          <button type="button" className="create-home__library-button" onClick={onOpenLibrary}>
            <BookIcon />
            <span>教材一覧</span>
          </button>

          <div className="create-home__hero-copy">
            <h1 id="create-home-title">教材をつくる</h1>
            <p className="create-home__hero-description">
              好きなテーマの英語長文をつくって、<br />
              ペルソナがやさしく解説してくれるよ！
            </p>
          </div>

        </section>

        <section className="create-home__glass-card create-home__topic-card" aria-label="長文の内容">
          <label className="create-home__field">
            <span className="create-home__field-label"><span aria-hidden="true">★</span> テーマ</span>
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="例：日本のラーメン文化"
              data-testid="create-topic"
            />
          </label>

          <label className="create-home__field create-home__field--keyword">
            <span className="create-home__field-label"><FeatherIcon /> 例文に入れたい情報 <small>（任意）</small></span>
            <input
              value={exampleKeyword}
              onChange={(event) => setExampleKeyword(event.target.value)}
              placeholder="内容・使いたい単語・伝えたいポイントなど"
              data-testid="create-keyword"
            />
          </label>
        </section>

        <section className="create-home__choice-grid" aria-label="長文のレベルと文量">
          <label className="create-home__glass-card create-home__choice-card create-home__choice-card--level">
            <span className="create-home__choice-title"><span aria-hidden="true">✦</span> 英語レベル</span>
            <div className="create-home__select-wrap">
              <BookIcon />
              <select value={level} onChange={(event) => setLevel(event.target.value)} data-testid="create-level">
                {Object.entries(levelOptions).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <small>長文の難易度を選びます</small>
          </label>

          <label className="create-home__glass-card create-home__choice-card create-home__choice-card--length">
            <span className="create-home__choice-title"><span aria-hidden="true">★</span> 文量</span>
            <div className="create-home__select-wrap">
              <FeatherIcon />
              <select value={length} onChange={(event) => setLength(event.target.value)} data-testid="create-length">
                {Object.entries(lengthOptions).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <small>おおよその単語数を選びます</small>
          </label>
        </section>

        <section className="create-home__glass-card create-home__persona-card" aria-labelledby="persona-heading">
          <div className="create-home__persona-heading-row">
            <h2 id="persona-heading"><span aria-hidden="true">✦</span> 解説キャラ</h2>
            <span className="create-home__persona-sparkles" aria-hidden="true">★ · ✧ · ★</span>
          </div>

          <div className="create-home__persona-summary">
            <div className="create-home__persona-avatar">
              <img src="/create-home/persona-wink.webp" alt="" aria-hidden="true" draggable={false} />
            </div>
            <div className="create-home__persona-copy">
              <p><span className="create-home__pill">役割</span> {role}</p>
              <p><span className="create-home__pill create-home__pill--star">★ 特徴</span> {trait}</p>
            </div>
            <img
              className="create-home__persona-sleep"
              src="/create-home/persona-sleep.webp"
              alt=""
              aria-hidden="true"
              draggable={false}
              loading="lazy"
              decoding="async"
            />
          </div>

          <div className="create-home__persona-controls">
            <label>
              <span>役割</span>
              <select value={role} onChange={(event) => setRole(event.target.value)} data-testid="create-role">
                {roleOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label>
              <span>★ 特徴</span>
              <select value={trait} onChange={(event) => setTrait(event.target.value)} data-testid="create-trait">
                {traitOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section className="create-home__actions" aria-label="教材作成アクション">
          <button type="button" className="create-home__action create-home__action--primary" onClick={handleOpenAiStudio} data-testid="create-open-ai-studio">
            <span className="create-home__action-icon"><WandIcon /></span>
            <span className="create-home__action-copy"><strong>AI Studioで長文を作る</strong><small>プロンプトをコピーしてAI Studioを開きます</small></span>
            <span className="create-home__chevron" aria-hidden="true">›</span>
          </button>

          <button
            type="button"
            className="create-home__action create-home__action--import"
            onClick={() => onNavigateToPasteJSON([selectedPersona])}
            data-testid="create-import"
          >
            <span className="create-home__action-icon"><ImportIcon /></span>
            <span className="create-home__action-copy"><strong>生成結果を取り込む</strong><small>AI Studioで生成した長文を貼り付けます</small></span>
            <span className="create-home__chevron" aria-hidden="true">›</span>
          </button>

          <button type="button" className="create-home__action create-home__action--copy" onClick={copyPrompt} data-testid="create-copy">
            <span className="create-home__action-icon"><ClipboardIcon /></span>
            <span className="create-home__action-copy"><strong>{copied ? 'コピーしました！' : 'プロンプトだけコピー'}</strong><small>プロンプトをクリップボードにコピーします</small></span>
            <span className="create-home__chevron" aria-hidden="true">›</span>
          </button>
        </section>

        <footer className="create-home__footer">
          <img className="create-home__footer-flowers" src="/create-home/footer-flowers.webp" alt="" aria-hidden="true" draggable={false} loading="lazy" decoding="async" />
          <div className="create-home__footer-note">
            <span aria-hidden="true">♢</span>
            <span>{personalSettingsEnabled ? 'あなたのパーソナル設定は長文に反映されます' : 'パーソナル設定は現在オフです'}</span>
          </div>

          <button
            type="button"
            className="create-home__other-modes"
            onClick={onOpenOtherModes}
            aria-label="匿名掲示板など、その他の教材をつくる"
          >
            その他の教材
          </button>
        </footer>
      </div>
    </main>
  );
};

export default CreateHomeScreen;
