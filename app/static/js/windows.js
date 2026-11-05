// windows.js: Windows: question windows, closing rules, Version history, Settings, and the Books folder.
// Loaded in order by index.html; all files share one global scope.

let savedModelName = "";

let savedModelSource = "";

async function loadApiKeyStatus() {
  const res = await fetch('/api_key_status');
  const data = await res.json();

  const el = document.getElementById("apiKeyStatus");

  if (data.status === "saved") {
    el.innerText = "API Key: Saved";
  } else {
    el.innerText = "API Key: Not set";
  }
}

// =====================
// VERSION HISTORY
// =====================

let historyTarget = null;

      // { section, filename } shown in the window
let historySelectedId = null;

async function openHistory(section, filename) {
  // Save first so the newest text is on disk
  if (isDirty && currentFile.section === section && currentFile.filename === filename) {
    await saveCurrentFile();
  }

  historyTarget = { section, filename };
  historySelectedId = null;
  document.getElementById("historyRestoreBtn").disabled = true;

  const preview = document.getElementById("historyPreview");
  preview.textContent = "";
  preview.style.fontFamily = editor.style.fontFamily;

  const res = await fetch('/file_history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section, filename })
  });
  const data = await res.json();
  const versions = data.versions || [];

  const list = document.getElementById("historyList");
  list.innerHTML = "";

  if (versions.length === 0) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent =
      "No earlier versions yet. The app keeps the old text each time you save a change, at most every 5 minutes.";
    list.appendChild(empty);
  }

  for (const version of versions) {
    const row = document.createElement("div");
    row.className = "history-row";

    const when = document.createElement("span");
    when.textContent = new Date(version.time).toLocaleString([], {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
    });

    const meta = document.createElement("span");
    meta.className = "history-meta";
    meta.textContent = `${version.words.toLocaleString()} words · ${timeAgo(new Date(version.time))}`;

    row.append(when, meta);
    row.onclick = () => selectVersion(version.id, row);
    list.appendChild(row);
  }

  document.getElementById("historyModal").classList.remove("hidden");
  list.querySelector(".history-row")?.click();
}

async function selectVersion(id, row) {
  historySelectedId = id;
  document.querySelectorAll(".history-row").forEach(r => {
    r.classList.toggle("active", r === row);
  });

  const res = await fetch('/file_version', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...historyTarget, id })
  });
  const data = await res.json();

  document.getElementById("historyPreview").textContent = data.content || "";
  document.getElementById("historyRestoreBtn").disabled = false;
}

async function restoreSelectedVersion() {
  if (!historyTarget || !historySelectedId) return;
  const { section, filename } = historyTarget;

  const res = await fetch('/restore_version', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section, filename, id: historySelectedId })
  });
  const data = await res.json();

  if (data.status !== "restored") {
    showToast(data.error || "Restore failed");
    return;
  }

  fileCache[`${section}/${filename}`] = data.content;

  const isGlobal = section === "prompts" || section === "system";
  const item = findFileItemInTree(
    (isGlobal ? state.global[section] : state.project[section]) || [],
    filename
  );
  if (item) {
    item.title = data.title;
    item.wordCount = data.wordCount;
  }

  if (currentFile.section === section && currentFile.filename === filename) {
    titleInput.value = data.title || "";
    editor.value = data.content;
    isDirty = false;
    lastSavedAt = Date.now();
    updateWordCount();
    updateTokenMeter();
  }

  await renderLists();
  closeHistory();
}

function closeHistory() {
  document.getElementById("historyModal").classList.add("hidden");
  historyTarget = null;
  historySelectedId = null;
}

// =====================
// BOOKS FOLDER (Settings): where prompts, system rules, and projects live
// =====================

async function loadDataFolder() {
  const data = await (await fetch('/data_folder')).json();
  document.getElementById("dataFolderPath").textContent = data.path;
  document.getElementById("dataFolderReset").classList.toggle("hidden", data.isAppFolder);
  return data;
}

async function chooseDataFolder(button) {
  button.disabled = true;
  try {
    // The server opens the Mac "Choose folder" window; elsewhere, type a path
    let { data: pick } = await postJSON('/choose_data_folder', {});
    if (pick.cancelled) return;
    if (pick.error === "no-picker") {
      const typed = await askText("Folder for your books", "", { placeholder: "Full path, for example /Users/you/Books", okLabel: "Next" });
      if (!typed) return;
      ({ data: pick } = await postJSON('/folder_info', { path: typed }));
      if (!pick.exists) {
        showToast("That folder does not exist.");
        return;
      }
    }

    const copy = !pick.hasBooks;
    const agreed = copy
      ? await askConfirm("Copy your books here?", `${pick.path}\n\nThe app copies your books there and uses them from then on. The originals stay where they are, as a backup.`, { okLabel: "Copy and use" })
      : await askConfirm("Use the books in this folder?", `${pick.path}\n\nThis folder already has books. Your current books stay where they are.`, { okLabel: "Use this folder" });
    if (!agreed) return;

    await switchDataFolder({ path: pick.path, copy });
  } finally {
    button.disabled = false;
  }
}

async function resetDataFolder() {
  if (!(await askConfirm("Use the app folder again?", "The books in your chosen folder stay there.", { okLabel: "Use the app folder" }))) return;
  await switchDataFolder({ path: null, copy: false });
}

async function switchDataFolder(body) {
  if (isDirty) await saveCurrentFile();
  const { ok, data } = await postJSON('/set_data_folder', body);
  if (!ok) {
    showToast(data.error || "Could not change the books folder.");
    return;
  }
  await loadProjects();   // sets currentProject for the new place
  loadSelections();
  await loadAll();
  await loadDataFolder();
  showToast(`Books folder: ${data.path}`, "info");
}

// A chosen folder that went missing (an unplugged drive): say so at start
async function warnIfDataFolderMissing() {
  const data = await (await fetch('/data_folder')).json();
  if (data.missing) {
    showToast(`Your books folder is missing: ${data.missing}. Using the app folder until it is back.`);
  }
}

// =====================
// QUESTION WINDOW: askText() and askConfirm() replace the browser's prompt()
// and confirm(), which block the page and look different in each browser
// =====================

let askResolve = null;

function openAsk({ title, message = "", value = null, placeholder = "", okLabel = "OK", danger = false }) {
  if (askResolve) finishAsk(null);   // a new question replaces an unanswered one

  document.getElementById("askTitle").textContent = title;
  const messageEl = document.getElementById("askMessage");
  messageEl.textContent = message;
  messageEl.classList.toggle("hidden", !message);

  const input = document.getElementById("askInput");
  input.classList.toggle("hidden", value === null);
  input.value = value ?? "";
  input.placeholder = placeholder;

  const ok = document.getElementById("askOk");
  ok.textContent = okLabel;
  ok.classList.toggle("primary-btn", !danger);
  ok.classList.toggle("danger-solid", danger);

  document.getElementById("askModal").classList.remove("hidden");
  if (value !== null) {
    input.focus();
    input.select();
  } else {
    // A question that deletes starts on Cancel, so Enter cannot delete by accident
    (danger ? document.getElementById("askCancel") : ok).focus();
  }
  return new Promise(resolve => { askResolve = resolve; });
}

function answerAsk() {
  const input = document.getElementById("askInput");
  finishAsk(input.classList.contains("hidden") ? true : input.value);
}

function finishAsk(answer) {
  document.getElementById("askModal").classList.add("hidden");
  const resolve = askResolve;
  askResolve = null;
  resolve?.(answer);
}

document.getElementById("askInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    answerAsk();
  }
});

// The typed text, trimmed; null when cancelled or left empty
async function askText(title, value = "", options = {}) {
  const answer = await openAsk({ title, value, ...options });
  const text = typeof answer === "string" ? answer.trim() : "";
  return text || null;
}

async function askConfirm(title, message = "", options = {}) {
  return (await openAsk({ title, message, ...options })) === true;
}

// Help pages (app/static/help/) open in their own tab, so the writing stays put
function openHelp() {
  window.open("/static/help/index.html", "_blank", "noopener");
}


// =====================
// MODALS: × button, Esc, or a click on the backdrop closes them
// =====================

const MODAL_CLOSERS = {
  settingsModal: () => closeSettings(true),
  historyModal: () => closeHistory(),
  visualModal: () => closeVisualPanel(),
  trashModal: () => closeTrash(),
  requestModal: () => closeRequestPreview(),
  exportModal: () => closeExport(),
  importModal: () => closeImport(),
  searchModal: () => closeProjectSearch(),
  askModal: () => finishAsk(null)
};

function closeModal(modal) {
  MODAL_CLOSERS[modal.id]?.();
}

document.querySelectorAll(".modal").forEach(modal => {
  modal.addEventListener("mousedown", (e) => {
    if (e.target === modal) closeModal(modal);
  });
});

async function openSettings() {
  savedModelName = settings.modelName;
  savedModelSource = settings.modelSource;
  loadSettingsIntoUI();
  await loadDataFolder();
  await loadApiKeyStatus();
  await fetchModels();
  document.getElementById("settingsModal").classList.remove("hidden");
}

function closeSettings(restoreModel = false) {
  if (restoreModel) {
    settings.modelName = savedModelName;
    settings.modelSource = savedModelSource;
  }

  document.getElementById("modelName").value =
    settings.modelName;

  updateActiveModelDisplay();
  updateTokenMeter();

  document.getElementById("settingsModal").classList.add("hidden");
}

async function saveSettings() {
  const selectedModel =
    getModelById(
      document.getElementById("modelName").value
    );
  settings.modelSource =
    selectedModel?.source || "openrouter";
  settings.modelName = document.getElementById("modelName").value;
  const apiKey = document.getElementById("apiKey").value;
  localStorage.setItem("sjb_settings", JSON.stringify({
    modelSource: settings.modelSource,
    modelName: settings.modelName
  }));
  if (apiKey) {
    await fetch('/save_api_key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: apiKey })
    });
  }


  const aiWasOn = aiEnabled();
  state.app_state.aiEnabled = document.getElementById("aiEnabledToggle").checked;
  applyAiEnabled();
  if (aiEnabled() && !aiWasOn) await loadOpenRouterCatalog(true);
  await fetch('/save_app_state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ aiEnabled: state.app_state.aiEnabled })
  });

  updateActiveModelDisplay();
  await updateTokenMeter();
  closeSettings();
}

function loadSettings() {
  const saved = localStorage.getItem("sjb_settings");
  if (saved) {
    settings = JSON.parse(saved);
  updateActiveModelDisplay();
  }
}

function loadSettingsIntoUI() {
  document.getElementById("modelName").value = settings.modelName;
  document.getElementById("aiEnabledToggle").checked = aiEnabled();
  document.getElementById("showWritingCounts").checked =
    state.app_state.showWritingCounts;
  document.getElementById("showBackgroundCounts").checked =
    state.app_state.showBackgroundCounts;
  document.getElementById("showPromptCounts").checked =
    state.app_state.showPromptCounts;
  document.getElementById("showSystemCounts").checked =
    state.app_state.showSystemCounts;
  document.getElementById("showFolderTotals").checked =
    state.app_state.showFolderTotals;
  document.getElementById("sidebarFontSize").value =
    state.app_state.sidebarFontSize || "13px";
}
