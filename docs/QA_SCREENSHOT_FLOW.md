# GitHub Screenshot QA Flow

このリポジトリでは、GitHub Actions + Playwright を使ってアプリ画面を自動撮影し、ChatGPT が後から取得・目視分析できる形で保存する。

## 標準フロー

1. `main` 更新時、または毎日 03:00 JST に `.github/workflows/qa-screenshots.yml` を実行する。
2. Actions 内で Vite アプリをローカル起動する。
3. Playwright が PC（1440x900）と iPhone 16 相当で画面を開く。
4. iPhone 16 は 393x852 CSS px / deviceScaleFactor 3 で撮影する。
5. 各表示で以下を保存する。
   - 高解像度 viewport PNG
   - 高解像度 full-page PNG
   - ChatGPT通常確認用の軽量 JPEG preview
   - 上部UIの高解像度 crop
   - Readerの最初の英文の高解像度 crop
6. `report.json` に viewport、deviceScaleFactor、scrollWidth、横はみ出し、console/page error を保存する。
7. GitHub Actions の Artifact 容量に依存しないよう、最新結果を専用 `qa-latest` ブランチへ保存する。
8. `qa-latest` は毎回 orphan commit を作って force push するため、ブランチ上には常に最新1回分だけを残す。
9. ChatGPT が確認するときは、まず `qa-latest/latest.json` と `report.json` を取得し、その後軽量 preview を確認する。
10. 文字切れ・重なりなど細部が疑わしい場合だけ、@3x PNG または高解像度 crop を追加確認する。

## ChatGPT側の確認手順

- 対象: `YutaTeru/memora-sentences`
- 最新ブランチ: `qa-latest`
- 優先ファイル:
  - `latest.json`
  - `report.json`
  - `screenshots/iphone-16-*-ai-preview.jpg`
  - `screenshots/iphone-16-*-top-crop.jpg`
  - `screenshots/iphone-16-reader-first-sentence.jpg`
  - `screenshots/desktop-1440x900-*-ai-preview.jpg`

### 画像で見る項目

- 文字切れ・見切れ
- ボタンやカードの画面外へのはみ出し
- 要素の重なり
- 不自然な余白
- レイアウト崩れ
- PC / iPhone 16 の差
- 重要UIの視認性

### report.json で見る項目

- `horizontalOverflow`
- `consoleErrors`
- `pageErrors`
- `viewport`
- `deviceScaleFactor`
- document dimensions

## 解像度の方針

### iPhone 16

- CSS viewport: 393x852
- deviceScaleFactor: 3
- viewport PNG: 最大 1179x2556 px 相当
- 通常のChatGPT確認用JPEGは `scale: css` で軽量化
- 細部確認用 crop は `scale: device` で @3x を維持

### PC

- 1440x900
- deviceScaleFactor: 1

通常は軽量 preview で高速確認し、細部が疑わしい場合だけ元PNGまたは高解像度cropを取得する。

## 保存量・削除方針

スクリーンショット履歴は日付ごとに蓄積しない。

`qa-latest` は毎回 force push で最新結果だけに置き換えるため、通常運用では「7日後に削除」などの定期削除処理は不要。

つまり保存方針は以下。

- 最新QA: 残す
- 1つ前以前のQAスクショ: ブランチ上では残さない
- 長期保存したい基準画像だけ: 必要になった時に別途 `qa-baseline/` 等で管理する

これにより、高解像度化してもGitHub上でスクショ履歴が増え続けるのを防ぐ。

## 運用方針

この手順を、今後このリポジトリの「スクショを撮って確認」「最新画面を見て」「UIを目視チェック」の標準手順として扱う。
