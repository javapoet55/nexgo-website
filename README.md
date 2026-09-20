# NexDo marketing website

Production: https://nexdoapp.com (existing Railway service `nexgo-website`, project `supportive-encouragement`).

## Build and run

Node 22+; no runtime or build dependencies.

- `npm run build` generates the 14 static pages in `dist/`.
- `npm test` validates links, anchors, assets, headings, metadata, fonts, and comparison footer coverage.
- `npm start` serves the built site on `PORT` (default 8080).
- Railway builds the supplied multi-stage Dockerfile and checks `/` before switching traffic.

The server serves only `dist/`. Source, original legal documents, and repository metadata are not public. Previous `.html` URLs and `/welcome` permanently redirect to their corresponding current pages. Unknown URLs return an actual 404. No database, credentials, or app service changes are required.

## Editing

`scripts/build.mjs` contains the page content, shared navigation/footer, metadata, FAQ, and sourced comparison data. `assets/site.css` and `assets/site.js` contain the responsive design and interactions. The original Privacy Policy and Terms remain in `src/` and are included without substantive edits; one relative policy link is normalized to its current route. Existing top-level HTML prototypes are replaced by the generated site.

## Pages

`/`, `/features`, `/how-it-works`, `/features/ai-assistant`, `/security`, `/pricing`, `/contact`, `/privacy`, `/terms`, and `/compare/{asana,monday,akiflow,motion,todoist}`. The build also generates sitemap.xml, robots.txt, and a 404 page.

## Brand and sources

Preserves the repository’s actual logo, favicon, blue/violet palette, Schibsted Grotesk and Instrument Serif typography. Fonts are self-hosted. Product screenshots originate from the existing Harbour design references and prior NexDo voice deliverables, optimized as WebP. Competitor sources are linked directly on each comparison page and were reviewed September 20, 2026. No third-party screenshots or testimonials are used.

NexDo facts were checked against the existing Harbour implementation and docs for Shopping Lists, Important Moments, calendar, continuous voice, and contact actions. Ordering is a handoff, not an advertised in-app checkout. Scheduled Moments email is configuration-dependent. App Store availability is not claimed.

## Configuration

- Canonical origin defaults to `https://nexdoapp.com`. For another domain, set `SITE_URL` at build time and rebuild. Existing Railway domains and DNS are retained.
- CTAs link to the verified app login at `https://harbour-production-f8a0.up.railway.app/login`.
- Support uses the existing website address `support@nexdoapp.com` (mailbox delivery was not tested).
- Pricing is intentionally a plan-information page until prices, limits, and trial terms are authoritative. Existing drafts disagreed about annual prices.
- Add an authoritative App Store URL when available.
- No analytics vendor is installed. `assets/site.js` emits `nexdo:analytics` CustomEvents and optionally invokes `window.nexdoAnalytics(name, details)`. Events are page_view, cta_click, and scenario_view; no prompt or user account data is collected. Connect the selected provider and adjust the content security policy only when its privacy/consent configuration is settled.
- Open Graph and Twitter metadata reuse the real brand logo. No fabricated social proof or availability claims.

## Release validation

Build and link checks; browser checks for desktop and mobile layouts, navigation, keyboard Escape, scenario switching, FAQs, and comparison scrolling. Public HTTP checks cover all routes, redirects, security headers, missing routes, and app login. This is not a full third-party accessibility certification.
