// Canonical list of stories and their metadata.
// This file is read by index.html, config.html, and app.js at runtime.
//
// IMPORTANT (see AGENTS.md):
//   - When adding a new story: append it to STORIES below AND create
//     story-NN-<id>.html with a matching <script id="story-meta"> block.
//   - When editing a story: bump `dateUpdated` here AND in the story file.
//
// Kept as a plain <script>-loadable file (not ES module) so that index.html
// works when opened directly from disk (file://), where fetch() of relative
// files is blocked by browsers.

window.STORIES = [
  // Stories will be added here
];

// ── AGENDA LOCK ──────────────────────────────────────────────────────────────
// Set to true to lock the agenda to a specific set of stories for presentation.
const AH26_LOCKED = false;
const AH26_LOCKED_ORDER = [];
// ─────────────────────────────────────────────────────────────────────────────

// Helpers available everywhere stories-index.js is loaded.
window.AH26 = window.AH26 || {};

window.AH26.LOCALSTORAGE_KEY = "ah26_agenda";

// Read the user's saved config, filling in defaults from STORIES.
window.AH26.loadConfig = function () {
  let raw = {};
  try {
    raw = JSON.parse(localStorage.getItem(window.AH26.LOCALSTORAGE_KEY) || "{}") || {};
  } catch (e) {
    raw = {};
  }

  const allIds = window.STORIES.map((s) => s.id);
  const validOrder = Array.isArray(raw.order) ? raw.order.filter((id) => allIds.includes(id)) : [];
  const order = [...validOrder, ...allIds.filter((id) => !validOrder.includes(id))];

  const enabled = {};
  allIds.forEach((id) => {
    enabled[id] = raw.enabled && raw.enabled[id] !== undefined ? !!raw.enabled[id] : true;
  });

  return { order, enabled };
};

window.AH26.saveConfig = function (config) {
  try {
    localStorage.setItem(window.AH26.LOCALSTORAGE_KEY, JSON.stringify(config));
  } catch (e) {}
};

window.AH26.resetConfig = function () {
  try {
    localStorage.removeItem(window.AH26.LOCALSTORAGE_KEY);
  } catch (e) {}
};

if (AH26_LOCKED) {
  (function () {
    const allIds = window.STORIES.map((s) => s.id);
    const enabled = {};
    allIds.forEach((id) => { enabled[id] = AH26_LOCKED_ORDER.includes(id); });
    window.AH26.saveConfig({ order: AH26_LOCKED_ORDER, enabled });
  })();
}

window.AH26.enabledInOrder = function (config) {
  return config.order.filter((id) => config.enabled[id]);
};

window.AH26.findStory = function (id) {
  return window.STORIES.find((s) => s.id === id) || null;
};

window.AH26.formatDate = function (iso) {
  if (!iso) return "";
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(iso);
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
};

window.AH26.currentStoryId = function () {
  const name = (location.pathname.split("/").pop() || "").toLowerCase();
  const m = name.match(/^story-\d+-(.+?)(?:\.html)?$/);
  return m ? m[1] : null;
};
