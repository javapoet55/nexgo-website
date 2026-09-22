# Nexdo marketing website

Production: https://nexdoapp.com (Railway service `nexgo-website`). Previous version preserved on branch `Original-Site-backup`.

## Build and run

Node 22+; no dependencies.

- `npm run build` — generates 13 static pages + a 404 page into `dist/`.
- `npm test` — checks one H1 per page, metadata, canonical URLs, internal links and anchors, duplicate ids, and that no inline scripts exist (the server's CSP blocks them).
- `npm start` — serves `dist/` on `PORT` (default 8080). Railway builds the Dockerfile and health-checks `/`.

## Editing

- `site/index.html` — the single source for every page: styles, glass design, Day/Night/Auto theme, navigation, footer, and each page as `<div class="page" data-page="…">`. Internal links are written as `#/page` or `#/page#anchor`; the build rewrites them to `/page`.
- `site/app.js` — theme switcher, mobile menu, current-page highlight, pricing Monthly/Annual toggle, and the feature-comparison expander.
- `scripts/build.mjs` — page titles/descriptions, splits the source into one HTML file per route, and embeds the original legal documents.
- `src/privacy-original.html`, `src/terms-original.html` — the legal texts, shown at `/privacy` and `/terms` without substantive edits (anchor ids are prefixed so they stay unique).

## Pages

`/`, `/voice-ai`, `/features`, `/use-cases`, `/why-nexdo`, `/pricing`, `/help`, `/about`, `/trust`, `/contact`, `/start`, `/privacy`, `/terms`, plus `sitemap.xml`, `robots.txt`, and `404.html`.

Old URLs redirect (301): `/how-it-works` → `/features`, `/features/ai-assistant` → `/features#voice`, `/security` → `/trust`, `/compare/*` → `/why-nexdo`, and the legacy `.html` paths.

## Content sources

- Pricing (plans, prices, trial, discounts, feature comparison, FAQ) mirrors `src/components/pricing.tsx` in the Harbour app repo. Update both together.
- Brand colors: Indigo `#3D29F0`, Blue `#0594F5`, Magenta `#F014C7`, Purple `#8514F5`, Deep navy `#080F2E`, Muted slate `#575C80`.
- Team cards on `/about` and the mailboxes on `/contact` are placeholders to confirm before launch.
