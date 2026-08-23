# GitHub Screenshot QA Flow

このリポジトリでは GitHub Actions + Playwright を使い、アプリを実際に起動・操作して PC / iPhone 16 の動作、スクリーンショット、Console / Page Error、横はみ出し、IndexedDB 永続化まで確認する。

## 実行タイミング

- `main` push
- `workflow_dispatch`
- 毎日 03:00 JST（18:00 UTC）

## 標準フロー

1. Node.js 22 で依存関係をインストールする。
2. `npm run build` で production build を確認する。
3. Vite を `127.0.0.1:3000` で起動する。
4. Playwright が PC 1440x900 / DPR 1 と iPhone 16 393x852 / DPR 3 で実際に画面を開く。
5. Library を確認する。
6. QA専用教材 `QA Long Reading Sample` を追加する。
7. 英日長文を入力して Reader まで進む。
8. Reader本文が実際に表示されたことを確認する。
9. ページをリロードし、IndexedDB に教材が残っていることを確認する。
10. 保存済み教材を再度 Reader で開く。
11. Console Error / Page Error / horizontal overflow を判定する。
12. 成功・失敗にかかわらず、可能な限り `report.json` と失敗証拠を残す。
13. PC / iPhone の実画像を ChatGPT が後から目視できるよう vision handoff を作る。
14. 最新結果だけを `qa-latest` ブランチへ置き換える。`main` は force push しない。

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

各主要画面で以下を保存する。

- `*-viewport.png`: 高解像度 viewport
- `*-full.png`: 高解像度 full-page
- `*-ai-preview.jpg`: CSSサイズ・quality 55 の軽量全体確認用
- `*-top-crop.jpg`: device scale・quality 65 の高解像度crop
- `*-reader-first-sentence.jpg`: Reader本文の詳細確認用

途中失敗時は `*-failure-<stage>-viewport.png` と `*-failure-<stage>-ai-preview.jpg` を残す。

## AI vision handoff

GitHub連携が private repository のJPEG/PNGをそのまま画像入力へ渡せない場合でも、画像の存在確認だけで終わらないよう `tools/build-qa-vision-contact-sheet.mjs` が vision handoff を作る。

`qa-latest/vision/` には次を保存する。

- `qa-overview.jpg`: Desktop Library / Desktop Reader / iPhone Library / iPhone Reader の4画面コンタクトシート
- `qa-overview.jpg.b64`: overview画像を76文字ごとに改行したUTF-8 base64
- `desktop-1440x900-reader-first-sentence.jpg.b64`: PC Reader詳細cropのbase64
- `iphone-16-reader-first-sentence.jpg.b64`: iPhone Reader詳細cropのbase64
- `manifest.json`: 元画像、byteLength、SHA-256、overviewサイズを記録

ChatGPT は `.b64` を取得して画像へ復号し、`manifest.json` の `byteLength` と `sha256` が一致することを確認してから実画像として開く。

これにより「base64を取得しただけ」と「画像を実際に目視した」を明確に区別できる。

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

- `job_status`
- `qa_status`
- `report_present`
- `screenshot_count`
- `commit_sha`
- `vision_handoff_present`
- `vision_manifest`
- `vision_overview_base64`
- `preview_artifact_status`
- `preview_artifact_available`

`latest.json` が存在するだけでは QA 成功とみなさない。原則として `job_status == success`、`qa_status == success`、`report_present == true`、かつ対象commitが一致する場合に機械QA成功と扱う。

## Actions Artifact

軽量previewの Artifact 保存も補助的に試すが、GitHub Actions Artifact のストレージ上限に達している場合は失敗する。その場合でも `continue-on-error` により QA 本体は失敗させない。

正本は `qa-latest`。Artifactは利用可能な場合だけ補助経路として使う。

## ChatGPT側の確認手順

1. `qa-latest/latest.json` を読む。
2. `qa_status`, `job_status`, `report_present`, `commit_sha` を確認する。
3. `report.json` で PC / iPhone の機械結果を確認する。
4. `vision/manifest.json` を読む。
5. `vision/qa-overview.jpg.b64` を取得・復号する。
6. byteLength / SHA-256 を manifest と照合する。
7. 復号した overview を画像として開き、4画面を目視する。
8. 細部が必要なら Reader first-sentence のbase64や高解像度cropを追加確認する。
9. 失敗時は failure screenshot、visible button、body excerpt、失敗stageを確認する。

実画像を開いていない場合は「スクリーンショット目視済み」と報告しない。

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

- viewport width / height
- deviceScaleFactor
- document scrollWidth / scrollHeight
- document clientWidth / clientHeight
- horizontalOverflow
- viewport外候補
- consoleErrors
- pageErrors
- current URL
- page title
- Reader到達可否
- IndexedDB保存後の再読込可否

Playwrightの機械チェック成功だけでUI正常とは判断しない。

## 保存量

- 最新QA: `qa-latest` に1回分だけ保持
- vision handoff: 最新QAと一緒に置換
- 軽量Preview Artifact: 利用可能なら1日だけ
- 過去の通常QA: `qa-latest` には残さない
- 完成版基準画像: 必要時のみ別途 `qa-baseline` 等で管理

## エラー調査

Workflow Run → Job → Step → Logs → 失敗stage → `report.json` → failure screenshot → DOM / visible button → 修正 → 再実行。

Selectorは推測で増やさず、role / label / placeholder / visible text / title の実UIに合わせる。
