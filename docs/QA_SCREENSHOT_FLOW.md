# GitHub Screenshot QA Flow

このリポジトリでは、GitHub Actions + Playwright を使ってアプリ画面を自動撮影し、ChatGPT が後から取得・目視分析できる形で保存する。

## 標準フロー

1. `main` 更新時、または毎日 03:00 JST に `.github/workflows/qa-screenshots.yml` を実行する。
2. Actions 内で Vite アプリをローカル起動する。
3. Playwright が PC（1440x900）と iPhone 15 相当で画面を開く。
4. 各表示で以下を保存する。
   - viewport PNG
   - full-page PNG
   - JPEG preview
   - ChatGPT 解析用 AI preview
5. `report.json` に viewport、scrollWidth、横はみ出し、console/page error を保存する。
6. GitHub Actions の Artifact 容量に依存しないよう、最新結果を専用 `qa-latest` ブランチへ上書き保存する。
7. ChatGPT が確認するときは、まず `qa-latest/latest.json` と `report.json` を取得し、その後 `screenshots/*-ai-preview.jpg` を取得して実画像として分析する。
8. 必要に応じて元の `*-viewport.png` / `*-full.png` を追加確認する。

## ChatGPT側の確認手順

- 対象: `YutaTeru/memora-sentences`
- 最新ブランチ: `qa-latest`
- 優先ファイル:
  - `latest.json`
  - `report.json`
  - `screenshots/iphone-15-ai-preview.jpg`
  - `screenshots/desktop-1440x900-ai-preview.jpg`

### 画像で見る項目

- 文字切れ・見切れ
- ボタンやカードの画面外へのはみ出し
- 要素の重なり
- 不自然な余白
- レイアウト崩れ
- PC / スマホ差
- 重要UIの視認性

### report.json で見る項目

- `horizontalOverflow`
- `consoleErrors`
- `pageErrors`
- viewport / document dimensions

## 現在のAI解析用解像度

- PC: 幅 640px
- iPhone: 幅 320px
- JPEG quality: 50

通常は AI preview で高速確認し、細部が疑わしい場合だけ元PNGを取得する。

## 運用方針

この手順を、今後このリポジトリの「スクショを撮って確認」「最新画面を見て」「UIを目視チェック」の標準手順として扱う。
