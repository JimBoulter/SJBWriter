// appearance.js: Light/dark mode, accent colors, fonts, and the Visual layout window.
// Loaded in order by index.html; all files share one global scope.

// { "section/filename": content }

// =====================
// APPEARANCE: MODE (light / dark / system) × ACCENT
// =====================

const ACCENTS = ["blue", "indigo", "teal", "crimson", "amber", "violet"];

// Old single-theme names map onto mode + accent
const LEGACY_THEMES = {
  "light": ["light", "blue"],
  "dark": ["dark", "blue"],
  "crimson": ["dark", "crimson"],
  "dark-stellar": ["dark", "blue"],
  "light-stellar": ["light", "blue"]
};

const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

function applyAppearance(mode, accent) {
  const dark = mode === "dark" || (mode === "system" && systemDark.matches);
  document.body.classList.toggle("mode-dark", dark);
  ACCENTS.forEach(a => {
    document.body.classList.toggle(`accent-${a}`, a === accent);
  });
  document.body.dataset.mode = mode;
  document.body.dataset.accent = accent;
  updateModeToggle();
}

// Top bar sun/moon: shows the mode a click switches to
function updateModeToggle() {
  const btn = document.getElementById("modeToggle");
  if (!btn) return;
  const dark = document.body.classList.contains("mode-dark");
  const label = dark ? "Light mode" : "Dark mode";
  btn.innerHTML = iconSvg(dark ? "sun" : "moon");
  btn.dataset.tip = label;
  btn.setAttribute("aria-label", `Switch to ${label.toLowerCase()}`);
}

// Quick switch keeps the accent; "Match system" stays a Settings choice
async function toggleLightDark() {
  const themeMode = document.body.classList.contains("mode-dark") ? "light" : "dark";
  const { accent } = savedAppearance();
  applyAppearance(themeMode, accent);

  state.app_state.themeMode = themeMode;
  state.app_state.accent = accent;
  await fetch('/save_app_state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ themeMode, accent })
  });
}

function savedAppearance() {
  const appState = state.app_state || {};
  const legacy = LEGACY_THEMES[appState.theme] || ["light", "blue"];
  return {
    mode: appState.themeMode || legacy[0],
    accent: ACCENTS.includes(appState.accent) ? appState.accent : legacy[1]
  };
}

// Still accepts the old theme names
function setTheme(theme) {
  const [mode, accent] = LEGACY_THEMES[theme] || [theme, "blue"];
  applyAppearance(mode, accent);
}

// In "Match system" mode, follow the OS as it switches
systemDark.addEventListener("change", () => {
  if (document.body.dataset.mode === "system") {
    applyAppearance("system", document.body.dataset.accent);
  }
});

function pickAccent(accent) {
  document.querySelectorAll(".accent-swatch").forEach(swatch => {
    swatch.setAttribute("aria-checked", String(swatch.dataset.accent === accent));
  });
  previewAppearance();
}

// Settings > Visual: show choices live; Back/Cancel restores the saved look
function previewAppearance() {
  const mode = document.getElementById("themeModeSelect").value;
  const accent =
    document.querySelector('.accent-swatch[aria-checked="true"]')?.dataset.accent || "blue";
  applyAppearance(mode, accent);
}

function loadTheme() {
  const { mode, accent } = savedAppearance();
  applyAppearance(mode, accent);
  const savedSize =
    state.app_state.sidebarFontSize || "13px";
  applySidebarFontSize(savedSize);
}

function applySidebarFontSize(size) {
  document.documentElement.style.setProperty('--sidebar-font-size', size);
}

async function changeEditorFont(font) {
  editor.style.fontFamily = font;
  schedulePreviewRender();
  state.app_state.editor_font = font;
  await fetch('/save_app_state', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      editor_font: font
    })
  });
  editor.focus();
}

async function changeEditorSize(size) {
  editor.style.fontSize = size;
  schedulePreviewRender();
  state.app_state.editor_font_size = size;
  await fetch('/save_app_state', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      editor_font_size: size
    })
  });
  editor.focus();
}

function openVisualPanel() {
  loadVisualSettingsIntoUI();
  document.getElementById("visualModal").classList.remove("hidden");
}

function closeVisualPanel() {
  const { mode, accent } = savedAppearance();
  applyAppearance(mode, accent);
  document.getElementById("visualModal").classList.add("hidden");
}

async function saveVisualSettings() {
  const themeMode = document.getElementById("themeModeSelect").value;
  const accent =
    document.querySelector('.accent-swatch[aria-checked="true"]')?.dataset.accent || "blue";
  const sidebarFontSize =
    document.getElementById("sidebarFontSize").value;

  applyAppearance(themeMode, accent);
  applySidebarFontSize(sidebarFontSize);

  state.app_state.themeMode = themeMode;
  state.app_state.accent = accent;
  state.app_state.sidebarFontSize = sidebarFontSize;
  state.app_state.showWritingCounts =
   document.getElementById("showWritingCounts").checked;
  state.app_state.showBackgroundCounts =
    document.getElementById("showBackgroundCounts").checked;
  state.app_state.showPromptCounts =
    document.getElementById("showPromptCounts").checked;
  state.app_state.showSystemCounts =
    document.getElementById("showSystemCounts").checked;
  state.app_state.showFolderTotals =
    document.getElementById("showFolderTotals").checked;

  await fetch('/save_app_state', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      showWritingCounts:
        state.app_state.showWritingCounts,
      showBackgroundCounts:
        state.app_state.showBackgroundCounts,
      showPromptCounts:
        state.app_state.showPromptCounts,
      showSystemCounts:
        state.app_state.showSystemCounts,
      showFolderTotals:
        state.app_state.showFolderTotals,
      themeMode: state.app_state.themeMode,
      accent: state.app_state.accent,
      sidebarFontSize: state.app_state.sidebarFontSize
    })
  });

  await renderLists();
  closeVisualPanel();
}

function loadVisualSettingsIntoUI() {
  const { mode, accent } = savedAppearance();
  document.getElementById("themeModeSelect").value = mode;
  pickAccent(accent);
  document.getElementById("sidebarFontSize").value =
    state.app_state.sidebarFontSize || "13px";
}
