# nexgo-website

Redesigned NexNav marketing site — a static, self-contained prototype of the
welcome, pricing and AI Assistant pages in a dark, high-contrast direction.

## Pages

| File | Route | Source page it replaces |
| --- | --- | --- |
| `index.html` | `/` | `/welcome` |
| `pricing.html` | `/pricing` | `/pricing` |
| `ai-assistant.html` | `/features/ai-assistant` | `/features/ai-assistant` |

Shared styles live in `assets/site.css`; the two interactive pieces — the
scenario switcher on the welcome page and the monthly/annual toggle on
pricing — live in `assets/site.js`.

## Running it

No build step and no dependencies. Open `index.html` directly, or serve the
folder:

```
python3 -m http.server 8000
```

Deploys as-is to GitHub Pages, Netlify or Vercel with the repo root as the
publish directory.

## Design notes

- **Palette** — near-black ground with a violet bias (`#06060B`), violet
  accent (`#7C5CFF`), mint for resolved states, amber for urgency. Semantic
  colours are kept separate from the accent.
- **Type** — Schibsted Grotesk for UI and body, Instrument Serif italic for
  display accents, JetBrains Mono for labels and figures.
- **Single theme.** The design commits to dark rather than adapting to the
  viewer's setting, so every colour is painted explicitly.

## Known placeholders

- `#start` and `#signin` links have no destination yet — wire them to the real
  signup and login routes.
- The AI Assistant FAQ answers were written for this prototype; the live site's
  answers were collapsed and could not be read. Replace them before this copy
  is used anywhere public.
- Pricing figures mirror the live site. Annual prices apply a 20% discount
  ($7.99 and $15.99 per month); confirm against the real billing plans.
