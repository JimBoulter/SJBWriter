// startup.js: Keyboard shortcuts, the panel-size watcher, and the start of the page. Loads last.
// Loaded in order by index.html; all files share one global scope.

// Re-fit whenever the writing area changes width (window, sidebar, AI panel)
new ResizeObserver(() => {
  keepEditorRoom();
  fitToolbars();
}).observe(document.querySelector(".right"));

// =====================
// KEYBOARD SHORTCUTS (⌘ on Mac, Ctrl elsewhere)
// =====================
// ⌘E preview (same key as Obsidian) · ⌘S save · ⌘Enter generate
// ⌘\ sidebar · ⌘⌥\ AI setup · ⌘⇧F zen · Esc stops generation, then leaves zen

document.addEventListener("keydown", (e) => {
  // While a window is open, only Esc (close it) applies
  const openModal = [...document.querySelectorAll(".modal")].filter(m => !m.classList.contains("hidden")).pop();
  if (openModal) {
    if (e.key === "Escape") closeModal(openModal);
    return;
  }

  if ((e.metaKey || e.ctrlKey) && e.altKey && e.code === "Backslash") {
    e.preventDefault();
    toggleAiPanel();
    return;
  }

  const mod = (e.metaKey || e.ctrlKey) && !e.altKey;
  const key = e.key.toLowerCase();

  if (mod && !e.shiftKey && key === "f" && currentFile.filename) {
    e.preventDefault();
    openFindBar(false);
    return;
  } else if (mod && e.shiftKey && key === "h" && currentFile.filename) {
    e.preventDefault();
    openFindBar(true);
    return;
  } else if (mod && key === "g" && findBarOpen()) {
    e.preventDefault();
    findStep(e.shiftKey ? -1 : 1);
    return;
  } else if (e.key === "Escape" && findBarOpen() && findBar.contains(document.activeElement)) {
    closeFindBar();
    return;
  }

  if (mod && !e.shiftKey && key === "e") {
    e.preventDefault();
    togglePreview();
  } else if (mod && !e.shiftKey && key === "s") {
    e.preventDefault();
    saveCurrentFile();
  } else if (mod && !e.shiftKey && e.key === "Enter") {
    e.preventDefault();
    if (!isGenerating && aiEnabled()) generate();
  } else if (mod && !e.shiftKey && e.key === "\\") {
    e.preventDefault();
    toggleSidebar();
  } else if (mod && e.shiftKey && key === "f") {
    e.preventDefault();
    toggleZen();
  } else if (e.key === "Escape") {
    if (isGenerating) stopGeneration();
    else if (document.body.classList.contains("zen")) setZen(false);
  }
});

window.onload = async () => {
  loadSettings();
  await fetchModels();
  await loadProjects();
  loadSelections();
  await loadAll();
  loadTheme();
  updateUndoButton();

  try {
    if (localStorage.getItem("sjb_preview") === "1") setPreview(true);
    if (localStorage.getItem("sjb_sidebar_collapsed") === "1") setSidebarCollapsed(true);
  } catch (e) {}

  setAiPanelOpen(readPref("sjb_ai_panel_open", false));
  initPanelResize();
  applyAiEnabled();
  initGenerationPanel();
  initMarkersPanel();
  warnIfDataFolderMissing();

  // Prices stay current: the app refreshes them once a day, only while AI is on
  loadOpenRouterCatalog(aiEnabled()).then(() => {
    renderModelDropdown();
    updateReasoningNote();
    updateMaxTokensNote();
    updateTokenMeter();
  });
  applySectionOrder();
  applySectionFolds();
  updateSortButtons();
  initSectionHeaders();

  appReady = true;
  updateStatusBar();
};
