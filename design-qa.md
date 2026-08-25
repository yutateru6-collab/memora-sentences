# MEMORA Phase 1 Design QA

- Date: 2026-08-25
- Production: https://memora-sentences.itisnowornever271.workers.dev/
- Repository: `yutateru6-collab/memora-sentences`
- App implementation commit: `fbfe0de3d7c1ee1247c773c8ccc31f41b95d7586`
- Verified main commit: `48c279dda911ded2a504b7769106b06cf7e5d94e`
- GitHub Actions run: `32833730317`
- Result: PASS

## Visual target

The supplied screenshot was treated as the visual reference. The implemented target keeps the same deep navy/purple night sky, stars, flowers, soft glow, glass cards and purple CREATE mascot. The one-screen-one-mascot rule intentionally removes the two extra persona images shown in the reference.

## Assets

- 13 Google Drive PNG originals were mapped by role/state and converted to optimized WebP.
- CREATE: purple v1/v2
- READ: green v1/v2
- MEMORIZE: blue v1
- QUIZ: yellow v1/v2
- PLAY: orange v1/v2
- ORGANIZE: teal v1/v2
- EXPLORE: pink v1/v2
- Verified displayed source dimensions: 1254 x 1254.

## Automated responsive QA

Targets:

- Desktop: 1440 x 900, DPR 1
- iPhone 16: 393 x 852, DPR 3, mobile/touch context

Verified flow on both targets:

1. Open CREATE home.
2. Verify requested Japanese copy and labels.
3. Verify exactly one CREATE mascot and correct asset load.
4. Open empty 教材ライブラリ.
5. Verify exactly one READ mascot and correct asset load.
6. Open 新しい教材を追加.
7. Verify all importer labels.
8. Import realistic QA material.
9. Open Reader and return to Library.
10. Verify material card, word-count badge and 読む action.
11. Verify Library menu items.

Results:

- Desktop horizontal overflow: none in all checked states.
- iPhone horizontal overflow: none in all checked states.
- Console errors: 0.
- Page errors: 0.
- QA status: success.
- Evidence screenshots: 24 files on the `qa-latest` branch.

## Manual production QA

- Production CREATE and Library were opened in the cloud browser.
- CREATE image source: `/memora-world/create-v1.webp`, loaded.
- Library image source: `/memora-world/read-v1.webp`, loaded.
- Desktop production flow completed through importer, Reader and return to Library.
- Reference/prototype side-by-side comparison completed.

## Notes

- The Tailwind CDN prints its existing production warning. It is not an app console error and did not affect the verified flow.
- Reader and later study screens initially received only the shared role background/asset path foundation in Phase 1.

## Reader + iPhone regression update

- Date: 2026-08-25
- Verified main commit: `4f73b357b9b59e3e1e4177a7ecc448e6c2f82c9b`
- GitHub Actions run: `32838931880`
- Result: PASS

Implemented and verified:

1. CREATE keyword field now uses a stable 16px mobile input size to prevent iOS focus zoom/visual viewport corruption.
2. CREATE flow gaps after entering text are 7px on iPhone: topic → choices → persona → actions, with no large blank block.
3. Registered vocabulary lookup is independent of the inline-note visibility toggle.
4. Word-card popovers expose pronunciation, meaning and a clearly labelled 単語メモ section on desktop and mobile.
5. Grammar definitions use a clamped desktop popover and an iPhone bottom sheet; the iPhone sheet stays at x=12, width=369 in the 393px viewport.
6. Reader uses the green READ mascot, dark reading surface, compact feature grouping and a READ COMPLETE continuation card.
7. Reader completion offers 単語を復習 and クイズへ when those resources are available.

Automated browser QA results:

- Desktop 1440 x 900: success.
- iPhone 16 393 x 852 DPR 3: success.
- Horizontal overflow: none across CREATE, Library, importer, Reader word memo and Reader grammar memo states.
- Console errors: 0.
- Page errors: 0.
- Evidence screenshots: 36 files on the `qa-latest` branch.

Visual comparison:

- The supplied broken CREATE screenshot and the iPhone QA screenshot were reviewed together. The opaque blank block is gone and all cards remain in normal document flow.
- The supplied clipped grammar screenshot and the iPhone QA screenshot were reviewed together. The grammar content now appears as a full-width bottom sheet within 12px side margins, with internal scrolling and a visible close control.
- The vocabulary screenshot confirms the entire memo body renders below the card meaning and remains inside the viewport.

## Phase 4 vocabulary screens

- Date: 2026-08-25
- Verified main commit: `eefc1b92fb46f8baa636ea4a01affb9c962d37c9`
- GitHub Actions run: `32853573414`
- Production: `https://memora-sentences.itisnowornever271.workers.dev/`
- Source visual truth: `/workspace/scratch/77ee672929b9/upload/67BDEFEF-1849-407D-A312-3E310C67B358.jpeg`
- Browser-rendered implementation evidence: production cloud-browser capture of the `単語デッキ` state; persisted automated captures at `qa-latest/screenshots/desktop-1440x900-deck-list-viewport.png` and `qa-latest/screenshots/iphone-16-deck-list-viewport.png`

### Dimensions and normalization

- Source raster: 864 x 1536 px. The source is a mobile art-direction reference and does not expose its original CSS viewport or DPR.
- Production cloud-browser capture: 1363 x 936 CSS px at DPR 1.
- Automated desktop capture: 1440 x 900 CSS px at DPR 1, 1440 x 900 output px.
- Automated iPhone capture: 393 x 852 CSS px at DPR 3, 1179 x 2556 output px. The `ai-preview.jpg` companion is normalized to 393 x 852 px for inspection.
- Because the supplied image depicts CREATE while Phase 4 depicts MEMORIZE/ORGANIZE, the full-view comparison evaluates shared art direction rather than one-to-one content geometry. Screen-specific geometry and overflow were checked against the product specification and browser-rendered Phase 4 states.

### State and primary interactions tested

1. Open `単語デッキ` from the Library menu.
2. Verify the four user-facing actions: `カード一覧`, `4択ゲーム`, `単語を覚える`, `本文を読む`.
3. Open `単語カード一覧`, verify the teal ORGANIZE guide, and flip a card to the active v2 state.
4. Open the flashcard, reveal the answer, and verify `もう一度`, `むずかしい`, `できた`, `かんたん`.
5. Complete a one-card session, verify the in-app `今日の復習、おわり！` screen, and restart the session.
6. Re-run CREATE input, Reader word memo, and Reader grammar memo regression checks.

### Full-view comparison evidence

- The source and deployed MEMORIZE screen were opened together in one comparison input.
- Typography: both use bright, high-weight Japanese headings over quiet secondary copy. The implementation intentionally uses a more restrained MEMORIZE header hierarchy appropriate for a utility screen.
- Spacing/layout: the implementation preserves large breathing room, rounded glass surfaces, one mascot per state, and a clear two-level card hierarchy. No horizontal overflow was present at either target.
- Colors/tokens: deep navy/purple night background, blue-violet surface gradient, low-opacity glass borders, warm star accents, and soft outer glow align with the supplied night-garden direction. MEMORIZE uses the specified blue accent without changing the shared background world.
- Image quality: the exact Drive-sourced 1254 x 1254 WebP assets load at natural resolution. The screen uses `/memora-world/memorize-v1.webp`; ORGANIZE switches from `/memora-world/organize-v1.webp` to `/memora-world/organize-v2.webp` after interaction. No placeholder, emoji mascot, CSS drawing, or custom SVG replacement is used.
- Copy/content: developer-facing labels (`ID`, `Next:`, `(No Content)`) are absent. Actions use concrete Japanese learning verbs.

### Focused region evidence

- The action-card region was inspected in the deployed cloud browser: all four controls are legible, have consistent 44px-or-larger targets, and `単語を覚える` is visually prioritized.
- Automated screenshots cover card-front, card-back, flashcard-front, and completion states on desktop and iPhone. The result report confirms the expected single mascot asset in every state.
- The completion state was checked for a semantic dialog, the `1枚クリアしました` count, both continuation actions, and absence of a native browser dialog.

### Findings and comparison history

- Initial P1 interaction finding: the Library menu rendered visually but the later header body intercepted pointer events over `単語デッキ` on desktop and iPhone.
- Fix: added an explicit stacking context to `.memora-app-header__actions` and a higher z-index to `.memora-header-menu` in `memora-world.css`.
- Post-fix evidence: run `32853573414` completed the entire 14-action flow on both targets. The menu opened `単語デッキ`; all Phase 4 screens and states were reached successfully.
- Remaining P0/P1/P2 findings: none.
- Follow-up P3 only: the desktop screen could gain slightly more mid-page ambient sparkle density in a later polish pass, but the quieter density supports the requested non-childish utility balance.

### Automated and production verification

- Desktop 1440 x 900: success.
- iPhone 16 393 x 852 DPR 3: success.
- Horizontal overflow: none across CREATE, Library, importer, Reader memo states, deck list, card list, flashcard, and completion.
- Console errors: 0.
- Page errors: 0.
- Native browser dialogs: 0.
- Evidence screenshots: 66 files on `qa-latest`.
- Production bundle observed in the cloud browser: `index-CLTS9mYs.js` with `index-CHwcoVd2.css`.

final result: passed
