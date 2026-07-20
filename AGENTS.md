# AGENTS.md

Instructions for AI coding agents (Claude Code, Cursor, Codex, etc.) working in this repo.

## What this repo is

A static HTML slide deck for Manifest Product All Hands. Each slide/story is a separate file. Served from GitHub Pages — there is **no build step, no server, no backend**. `index.html` must be openable directly from disk in a browser.

## Static-site constraint (non-negotiable)

- **The site must remain pure static.** Hosted on GitHub Pages. A developer must be able to double-click `index.html` and have everything work.
- **No server-side anything.** No serverless functions, no Node runtime at request time, no APIs pointed at backends we own.
- **No build step required to view the site.** Tooling like `npm run lint` is fine for CI; anything that compiles, bundles, or transforms source into a separate `dist/` is not. The HTML/CSS/JS files in the repo root are the files the browser loads.
- **Third-party dependencies via CDN only** (matching existing Tailwind + Google Fonts usage). Do not introduce npm runtime dependencies that require bundling.
- **If a task seems to require a build step, stop and flag it to the user** rather than introducing one.

## Styling rules

- **Use Tailwind utility classes whenever possible.** This is the default — reach for utilities before writing any CSS.
- **Never write inline `style="..."` attributes** in HTML you author or edit.
- **Never write a `<style>` block in an HTML file** (neither in `<head>` nor in `<body>`).
- **When a custom class is genuinely needed** (Tailwind can't express it), add it to the global stylesheet `styles.css` only. Do not create additional CSS files.
- **Prefer patterns already in the repo over inventing new ones.** Before writing a new component/class, grep `index.html`, `story-*.html`, and `styles.css` for an existing pattern you can reuse. Examples: the `.ag-*` agenda classes, the `.slide` + `#stage` structure, existing button styles.
- Existing legacy files contain inline styles and `style.cssText` in JS — these are pre-existing and out of scope unless the task explicitly involves reworking them. Do not introduce _new_ violations.

## Story files

Each slide story lives in a standalone `story-NN-slug.html` file. They share a common shape (see any existing story-\*.html).

### Every story file must include a metadata block in its `<head>`:

```html
<script type="application/json" id="story-meta">
  {
    "id": "<slug>",
    "title": "<display title>",
    "author": "<person's name>",
    "section": "<Cialfo | BridgeU | CRM | FlowAI | ...>",
    "dateAdded": "YYYY-MM-DD",
    "dateUpdated": "YYYY-MM-DD"
  }
</script>
```

### Rules

- **When you create a new story file**: add its filename to `stories-index.js`, include a `story-meta` block, set both dates to today's date, ask the user for `author` and `section` if not given.
- **When you edit an existing story file**: bump `dateUpdated` to today's date.
- **The `id` in `story-meta` must match the slug portion of the filename** (`story-01-cdocs.html` → `id: "cdocs"`).
- **Never hardcode `<a href="story-NN-...html">` navigation links in a story file.** Story-to-story "Next" navigation is injected dynamically by `app.js` based on `stories-index.js` and the user's config stored in `localStorage`. The "Back to agenda" link is also injected by `app.js`.

## Runtime architecture (how the deck composes itself)

- `stories-index.js` defines `window.STORIES` — the canonical ordered list of story objects (id, file, title, author, section, dateAdded, dateUpdated). It also exposes helpers under `window.AH26` for reading/writing the user's saved config in `localStorage`. This file is the **single source of truth for the app at runtime**; the `story-meta` block inside each story file is a human/agent-facing duplicate that must be kept in sync (see Story files rules above).
- `index.html` is the agenda dashboard. It reads `window.STORIES` + saved config, then renders the agenda dynamically into `#ag-grid`.
- `config.html` is the admin UI. Reads the same data, lets the user toggle + drag-reorder stories, writes `{ order, enabled }` back to `localStorage["ah26_agenda"]` via `window.AH26.saveConfig`.
- `app.js` is loaded by every page. On story pages, it injects a "Next Story" button by computing the current story's position in the (user-configured) enabled list, plus a "Back to agenda" link.

## Conventions

- HTML/CSS/JS is formatted by Prettier (`.prettierrc.json`). Run `npm run format` before committing.
- HTML is validated by `html-validate` (`.htmlvalidate.json`). Run `npm run lint:html`.
- `npm run lint` runs both.
- Branch protection requires changes to land via PR. See `.github/pull_request_template.md`.
