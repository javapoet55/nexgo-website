# Nexdo marketing website

Production: https://nexdoapp.com (Railway service `nexgo-website`). Previous version preserved on branch `Original-Site-backup`.

## Build and run

Node 22+; no dependencies.

- `npm run build` — generates 16 static pages + a 404 page into `dist/`.
- `npm test` — checks one H1 per page, metadata, canonical URLs, internal links and anchors, duplicate ids, and that no inline scripts exist (the server's CSP blocks them).
- `npm start` — serves `dist/` on `PORT` (default 8080). Railway builds the Dockerfile and health-checks `/`.

## Editing

- `site/index.html` — the single source for every page: styles, glass design, Day/Night/Auto theme, navigation, footer, and each page as `<div class="page" data-page="…">`. Internal links are written as `#/page` or `#/page#anchor`; the build rewrites them to `/page`.
- `site/app.js` — theme switcher, mobile menu, current-page highlight, pricing Monthly/Annual toggle, and the feature-comparison expander.
- `scripts/build.mjs` — page titles/descriptions, splits the source into one HTML file per route, and embeds the original legal documents.
- `src/privacy-original.html`, `src/terms-original.html` — the legal texts, shown at `/privacy` and `/terms` without substantive edits (anchor ids are prefixed so they stay unique).

## Pages

`/`, `/voice-ai`, `/shopping-lists`, `/important-moments`, `/ask-ai`, `/features`, `/use-cases`, `/why-nexdo`, `/pricing`, `/help`, `/about`, `/trust`, `/contact`, `/start`, `/privacy`, `/terms`, plus `sitemap.xml`, `robots.txt`, and `404.html`.

Old URLs redirect (301): `/how-it-works` → `/features`, `/features/ai-assistant` → `/features#voice`, `/security` → `/trust`, `/compare/*` → `/why-nexdo`, and the legacy `.html` paths.

## Content sources

- Pricing (plans, prices, trial, discounts, feature comparison, FAQ) mirrors `src/components/pricing.tsx` in the Harbour app repo. Update both together.
- Brand colors: Indigo `#3D29F0`, Blue `#0594F5`, Magenta `#F014C7`, Purple `#8514F5`, Deep navy `#080F2E`, Muted slate `#575C80`.
- Team cards on `/about` and the mailboxes on `/contact` are placeholders to confirm before launch.

## Support chatbot

Every page includes Ask support. The build indexes metadata and FAQ answers from published pages into `dist/support-articles.json`; hidden pricing is excluded. Answers link to their published sources. No API key is required: matching guide excerpts are returned, with an honest fallback for missing answers.

To enable AI later, add `OPENAI_API_KEY` to this website service in Railway. Optionally set `SUPPORT_CHAT_MODEL` (otherwise `OPENAI_MODEL`, then `gpt-5.4-mini`). Redeploy/restart after changing variables. No key is placed in browser code. AI uses only the published sources, validates source IDs and uses `store: false`; source validation does not guarantee every generated sentence, so the UI identifies possible mistakes. Conversations stay in browser memory and are not saved by this service.

The endpoint is `/api/support/chat`. Requests are capped at 16 KB, nine messages and a 1,000-character question. Per-process limits: ten requests per visitor/minute, sixty total/minute, five concurrent. Add shared gateway rate limits if scaling across replicas. All client answers use textContent, with source links restricted to server-owned local paths. No account data, database access, mutations, or external page crawling.

Run `npm run build && npm test` for source/link checks and support tests.
