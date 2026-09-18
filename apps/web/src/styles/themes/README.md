# Themes

Each subfolder is a complete visual theme snapshot: `styles.css` (tokens, base styles, button helpers) and `ui.css` (ng-primitives wrapper styles).

## Available themes

- **refined-dark** — Minimalist neutral charcoal + violet accent. Inspired by Linear / Vercel / Arc. **Currently active.**
- **twilight-arcade** — Aubergine background + coral/lavender gradient accents. Stronger personality, gaming/indie vibe.

## How to switch themes

1. Copy the chosen theme over the active files:

```bash
cp src/styles/themes/<theme-name>/styles.css src/styles.css
cp src/styles/themes/<theme-name>/ui.css src/styles/ui.css
```

2. Update `src/index.html` `<meta name="theme-color">` to match the bg:
   - refined-dark: `#0a0a0c`
   - twilight-arcade: `#181028`

3. Hard refresh the browser (Cmd+Shift+R) to bypass the service worker cache.

## How to preview without committing

```bash
cp src/styles/themes/twilight-arcade/styles.css src/styles.css
cp src/styles/themes/twilight-arcade/ui.css src/styles/ui.css
# review in browser
git restore src/styles.css src/styles/ui.css   # if you don't keep it
```
