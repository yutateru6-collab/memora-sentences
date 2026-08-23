# GitHub Screenshot QA Flow

このリポジトリでは、GitHub Actions + Playwright を使ってアプリを実際に起動・操作し、PC / iPhone 16 のスクリーンショット、機械チェック、失敗証拠を `qa-latest` ブランチへ保存する。

## 標準フロー

1. `main` 更新時、手動実行時、または毎日 03:00 JST に `.github/workflows/qa-screenshots.yml` を実行する。
2. Node.js 22 で依存関係をインストールする。
3. `npm run build` を先に実行し、production build が成立することを確認する。
4. Vite を `127.0.0.1:3000` で起動し、HTTP応答を待つ。
5. Playwright が PC（1440x900）と iPhone 16（393x852 CSS px / DPR 3）で実際に画面を開く。
6. Library を表示し、初期UIを撮影・計測する。
7. QA専用教材 `QA Long Reading Sample` を追加し、長文を入力して Reader まで進む。
8. Reader に最初の英文が実際に表示されたことを確認する。
9. ページをリロードし、IndexedDB にQA教材が残っていることを確認する。
10. 保存済み教材を再度 Reader で開けることを確認する。
11. Console Error / Page Error / document horizontal overflow を確認する。
12. 成功・失敗にかかわらず `report.json` を可能な限り生成する。
13. 途中失敗時は、その時点の画面を `failure-*-viewport.png` と軽量JPEGで保存する。
14. 最新結果だけを `qa-latest` ブランチへ orphan commit + force push で置き換える。`main` は force push しない。

## 現在の基本ユーザーフロー

通常QAでは各端末で以下を通す。

- Libraryを開く
- 教材追加UIを開く
- 教材名を入力
- 英日長文を入力
- 「データを読み込んで作成」を実行
- Readerへの遷移を確認
- Reader本文の表示を確認
- リロード
- QA教材の永続化を確認
- 保存済み教材を再びReaderで開く

これにより「トップ画面が表示された」だけではなく、アプリの主要導線とIndexedDB保存まで確認する。

## スクリーンショット

### PC

- CSS viewport: 1440x900
- deviceScaleFactor: 1

### iPhone 16

- CSS viewport: 393x852
- deviceScaleFactor: 3
- 高解像度 viewport PNG: 1179x2556 px 相当
- `isMobile: true`
- `hasTouch: true`

各主要画面では以下を保存する。

- `*-viewport.png`: 高解像度の現在画面
- `*-full.png`: full-page PNG
- `*-ai-preview.jpg`: `scale: css`, quality 55 の軽量確認用
- `*-top-crop.jpg`: `scale: device`, quality 65 の上部高解像度crop
- `*-reader-first-sentence.jpg`: Reader本文の高解像度部分crop

失敗時は追加で以下を保存する。

- `*-failure-<stage>-viewport.png`
- `*-failure-<stage>-ai-preview.jpg`

## report.json

`qa-artifacts/report.json` / `qa-latest/report.json` には少なくとも以下を保存する。

- `generatedAt`
- `status` (`success` / `failure`)
- repository
- commit SHA
- workflow run ID / run number
- event name
- target device
- viewport
- deviceScaleFactor
- URL
- page title
- 実行した操作 (`actions`)
- Library / Reader の document dimensions
- `horizontalOverflow`
- viewport外へ出ている可視要素の候補
- `consoleErrors`
- `pageErrors`
- IndexedDB永続化確認結果
- 失敗stage / error message
- スクリーンショットファイル名

## latest.json の意味

`qa-latest/latest.json` は単なる「実行された印」ではなく、結果の状態を明示する。

主な項目:

- `job_status`: GitHub Actions job全体の状態
- `qa_status`: `report.json` が判定したQA状態
- `report_present`: reportが本当に存在するか
- `screenshot_count`: 保存された画像数
- `commit_sha`: QA対象commit

### 重要

`latest.json` が存在するだけではQA成功とみなさない。

確認済みと扱ってよい条件は原則として、

- `job_status == success`
- `qa_status == success`
- `report_present == true`
- `report.json` が対象commitと一致

のすべてを満たした場合。

## ChatGPT側の確認手順

対象: `YutaTeru/memora-sentences`

1. `qa-latest/latest.json` を取得する。
2. `qa_status`, `job_status`, `report_present`, `commit_sha` を確認する。
3. `report.json` を取得し、PC / iPhone 16 の両結果を確認する。
4. まず `screenshots/*-ai-preview.jpg` を画像として開いて目視する。
5. 文字切れ・重なり・細部が疑わしい場合だけ高解像度crop / PNGを追加で開く。
6. 失敗時は `failure-*` 画像、visible button一覧、body excerpt、失敗stageを確認する。

画像ファイルがGitHubに存在するだけでは「目視確認済み」としない。実画像として開いて確認した場合のみ目視確認済みと報告する。

## AIが画像で見る項目

- 文字切れ
- ボタン見切れ
- 要素の重なり
- 本文への固定UI被り
- 横方向のはみ出し
- 不自然な余白
- 文字サイズ・行間
- ボタンのタップしやすさ
- ヘッダーの窮屈さ
- 主操作の分かりやすさ
- PC / iPhone 16 の差
- Reader本文の読みやすさ
- Safe Area周辺

## 機械チェック

最低限以下を取得する。

- viewport width / height
- deviceScaleFactor
- document scrollWidth / scrollHeight
- document clientWidth / clientHeight
- horizontalOverflow
- 可視要素のviewport外候補
- consoleErrors
- pageErrors
- current URL
- page title
- Reader到達可否
- IndexedDB保存後の再読込可否

Playwrightの機械チェック成功だけでUI正常とは判断しない。必ずスクリーンショットの目視確認と併用する。

## 保存量

通常QAは日付別に蓄積せず、`qa-latest` へ最新1回分だけ残す。

- 最新QA: 保持
- 以前の通常QA: `qa-latest` 上では保持しない
- 完成版の基準画像: 必要な場合だけ別途 `qa-baseline/` 等で管理する

## エラー調査

GitHub Actions失敗時は以下の順で確認する。

Workflow Run → Job → Step → Logs → 失敗stage → `report.json` → failure screenshot → DOM / visible button → 修正 → 再実行

Selectorは推測で増やさず、role / label / placeholder / visible text / title の実UIに合わせる。

## 運用方針

今後このリポジトリで「動作確認して」「スクショ撮って」「iPhoneで見て」「UI崩れてない？」と依頼された場合は、このフローを標準として扱う。
