# GitHub Screenshot QA Flow

このリポジトリでは、GitHub Actions + Playwright を使ってアプリを実際に起動・操作し、PC / iPhone 16 のスクリーンショット、機械チェック、失敗証拠を `qa-latest` ブランチへ保存する。

## 標準フロー

1. `main` 更新時、手動実行時、または毎日 03:00 JST に `.github/workflows/qa-screenshots.yml` を実行する。
2. Node.js 22 で依存関係をインストールする。
3. `npm run build` で production build を確認する。
4. Vite を `127.0.0.1:3000` で起動する。
5. Playwright が PC（1440x900）と iPhone 16（393x852 CSS px / DPR 3）で実際に画面を開く。
6. Library を表示し、初期UIを撮影・計測する。
7. QA専用教材 `QA Long Reading Sample` を追加し、長文を入力して Reader まで進む。
8. Reader本文の表示を確認する。
9. ページをリロードし、IndexedDB にQA教材が残ることを確認する。
10. 保存済み教材を再度 Reader で開く。
11. Console Error / Page Error / document horizontal overflow を確認する。
12. 成功・失敗にかかわらず `report.json` を可能な限り生成する。
13. 途中失敗時は、その時点の画面を failure screenshot として保存する。
14. 軽量preview・crop・reportのActions Artifact保存を補助的に試す。Artifact容量不足などで失敗してもQA本体は失敗扱いにしない。
15. 完全な最新結果は `qa-latest` ブランチへ orphan commit + force push で置き換える。`main` は force push しない。

## 基本ユーザーフロー

- Libraryを開く
- 教材追加UIを開く
- 教材名を入力
- 英日長文を入力
- 「データを読み込んで作成」を実行
- Readerへの遷移と本文表示を確認
- リロード
- QA教材の永続化を確認
- 保存済み教材を再びReaderで開く

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

各主要画面で保存するもの:

- `*-viewport.png`: 高解像度の現在画面
- `*-full.png`: full-page PNG
- `*-ai-preview.jpg`: `scale: css`, quality 55
- `*-top-crop.jpg`: `scale: device`, quality 65
- `*-reader-first-sentence.jpg`: Reader本文の高解像度crop

失敗時は `*-failure-<stage>-viewport.png` と `*-failure-<stage>-ai-preview.jpg` も保存する。

## 軽量Preview Artifact（補助経路）

画像受け渡し補助として次だけをArtifact保存することを試みる。

- `report.json`
- `*-ai-preview.jpg`
- `*-top-crop.jpg`
- `*-first-sentence.jpg`

Artifact名は `qa-preview-<workflow run id>`、保持期間は1日。

ただし GitHub Actions Artifact のストレージ容量上限に達している場合、アップロードは失敗する。その場合でも `continue-on-error` によりQA job全体は失敗させず、`qa-latest` を正本として利用する。

`latest.json` の `preview_artifact_status` / `preview_artifact_available` を確認し、実際にArtifactが利用できる場合だけ取得する。

## report.json

少なくとも以下を保存する。

- generatedAt / status
- repository / commit SHA / workflow run ID
- target device / viewport / deviceScaleFactor
- URL / page title
- 実行した操作
- document dimensions / horizontalOverflow
- viewport外へ出ている可視要素候補
- consoleErrors / pageErrors
- IndexedDB永続化確認結果
- 失敗stage / error message
- スクリーンショットファイル名

## latest.json

主な項目:

- `job_status`: GitHub Actions job全体
- `qa_status`: `report.json` のQA判定
- `report_present`
- `screenshot_count`
- `commit_sha`
- `preview_artifact`
- `preview_artifact_status`
- `preview_artifact_available`
- `preview_artifact_retention_days`

`latest.json` が存在するだけではQA成功とみなさない。QA本体を確認済みと扱う条件は原則、`job_status == success`、`qa_status == success`、`report_present == true`、かつ `report.json` が対象commitと一致すること。

Artifactは補助経路なので、`preview_artifact_available == false` だけではQA本体の失敗とはしない。

## ChatGPT側の確認手順

1. `qa-latest/latest.json` を取得する。
2. `qa_status`, `job_status`, `report_present`, `commit_sha` を確認する。
3. `report.json` でPC / iPhone 16 の両結果を確認する。
4. 画像を直接materializeできる場合は `screenshots/*-ai-preview.jpg` を画像として開く。
5. 直接開けず、かつ `preview_artifact_available == true` の場合だけArtifactを取得する。
6. Artifactが容量不足等で利用できなければ、`qa-latest` の画像保存確認と機械結果を報告し、「実画像としてはまだ目視していない」と明確に区別する。
7. 細部が疑わしい場合だけ高解像度crop / PNGを追加で開く。

画像ファイルがGitHubに存在するだけでは「目視確認済み」としない。

## AIが画像で見る項目

文字切れ、ボタン見切れ、要素の重なり、本文への固定UI被り、横方向のはみ出し、不自然な余白、文字サイズ・行間、ボタンのタップしやすさ、ヘッダー、主操作、PC / iPhone 16 の差、Reader本文、Safe Area周辺。

## 機械チェック

viewport、deviceScaleFactor、document dimensions、horizontalOverflow、viewport外候補、consoleErrors、pageErrors、current URL、page title、Reader到達、IndexedDB保存後の再読込を確認する。

Playwrightの機械チェック成功だけでUI正常とは判断しない。

## 保存量

- 最新QA: `qa-latest` に保持
- 軽量Preview Artifact: 利用可能なら1日だけ
- Artifact容量上限時: `qa-latest` のみ使用
- 以前の通常QA: `qa-latest` 上では保持しない
- 完成版の基準画像: 必要時だけ別途管理

## エラー調査

Workflow Run → Job → Step → Logs → 失敗stage → `report.json` → failure screenshot → DOM / visible button → 修正 → 再実行。

Selectorは推測で増やさず、role / label / placeholder / visible text / title の実UIに合わせる。

## 運用方針

今後このリポジトリで「動作確認して」「スクショ撮って」「iPhoneで見て」「UI崩れてない？」と依頼された場合は、このフローを標準として扱う。
