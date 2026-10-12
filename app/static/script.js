let fileCache = {}; // { "section/filename": content }


function setTheme(mode) {
  document.body.classList.remove("dark", "crimson", "dark-stellar", "light-stellar");
  if (mode !== "light") {
    document.body.classList.add(mode);
  }
  localStorage.setItem("theme", mode);
}

function previewTheme(mode) {
  setTheme(mode);
}

function loadTheme() {
  const saved = localStorage.getItem("theme") || "light";
  setTheme(saved);
  const savedSize = localStorage.getItem('sjb_sidebar_font_size') || '13px';
  applySidebarFontSize(savedSize);
}

function applySidebarFontSize(size) {
  document.documentElement.style.setProperty('--sidebar-font-size', size);
  localStorage.setItem('sjb_sidebar_font_size', size);
}


const editor = document.getElementById("editor");
const promptBox = document.getElementById("promptBox");


const titleInput = document.getElementById("titleInput");

let currentFile = {
  section: null,
  filename: null
};

let draggedRow = null;

let draggedModelId = null;

let selectedModelId = null;

let activeModelLabelFilters = [];

let modelSearchQuery = "";

let generationUndoStack = [];
const MAX_UNDO = 10;

let isGenerating = false;
let generationCursorPos = null;
let followGeneration = true;

let wakeLock = null;

let currentAbortController = null;


function shouldShowCounts(sectionName) {

  const settings = state.app_state || {};

  switch (sectionName) {

    case "writing":
      return settings.showWritingCounts ?? true;

    case "background":
      return settings.showBackgroundCounts ?? true;

    case "prompts":
      return settings.showPromptCounts ?? false;

    case "system":
      return settings.showSystemCounts ?? false;

    default:
      return false;
  }
}

function shouldShowFolderTotals() {
  return state.app_state?.showFolderTotals ?? true;
}


function getFolderWordCount(items) {
  let total = 0;

  for (const item of items || []) {

    if (item.type === "file") {

      if (item.wordCount == null) {
        return null;
      }

      total += item.wordCount;
    }

    else if (item.type === "folder") {

      const childTotal =
        getFolderWordCount(item.items);

      if (childTotal == null) {
        return null;
      }

      total += childTotal;
    }
  }

  return total;
}


function getFilename(item) {
  return typeof item === "string" ? item : item.filename;
}


function wrapSelection(wrapper) {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const selected = editor.value.substring(start, end);
  if (!selected) {
    const inserted = wrapper + wrapper;
    editor.value =
      editor.value.substring(0, start) +
      inserted +
      editor.value.substring(end);
    editor.selectionStart = editor.selectionEnd = start + wrapper.length;
  } else {
    const newText = wrapper + selected + wrapper;
    editor.value =
      editor.value.substring(0, start) +
      newText +
      editor.value.substring(end);
    editor.selectionStart = start + wrapper.length;
    editor.selectionEnd = end + wrapper.length;
  }
  editor.focus();
}


function insertPrefix(prefix) {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const text = editor.value;
  const before = text.substring(0, start);
  const selected = text.substring(start, end);
  const after = text.substring(end);
  const lines = selected.split('\n').map(line => prefix + line);
  const newText = lines.join('\n');
  editor.value = before + newText + after;
  editor.selectionStart = start;
  editor.selectionEnd = start + newText.length;
  editor.focus();
}


async function changeEditorFont(font) {
  editor.style.fontFamily = font;
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


// TOKEN ESTIMATE
function estimateTokens(text) {
  return Math.floor(text.length / 4);
}

async function ensureFileCached(section, filename) {
  const key = `${section}/${filename}`;

  if (fileCache[key]) return fileCache[key];

  const res = await fetch('/load_file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      section: section,
      filename: filename
    })
  });

  const data = await res.json();

  const content = data.content || "";
  fileCache[key] = content;

  return content;
}


async function fetchModels() {

  const res = await fetch('/models');

  modelRegistry = await res.json();

  renderModelDropdown();
}

async function renderModelsManager() {
  const list =
    document.getElementById("modelsManagerList");

  list.innerHTML = "";

  const scrollContent =
    document.createElement("div");

  scrollContent.classList.add(
    "models-scroll-content"
  );

  list.appendChild(scrollContent);

  const res = await fetch('/models');
  const data = await res.json();

  const filterBar =
    document.getElementById(
      "modelLabelFilters"
    );

  filterBar.innerHTML = "";

  // ---------- HEADER ----------
  const filterHeader =
    document.createElement("div");

  const filterLabel =
    document.createElement("span");

  filterLabel.textContent =
    "Filter by clicking below:";

  const clearBtn =
    document.createElement("button");

  clearBtn.textContent =
    "Clear Filters";

  if (
    activeModelLabelFilters.length === 0
  ) {
    clearBtn.disabled = true;
  }

  clearBtn.onclick = () => {
    activeModelLabelFilters = [];
    renderModelsManager();
  };

  filterHeader.appendChild(filterLabel);
  filterHeader.appendChild(clearBtn);

  filterBar.appendChild(filterHeader);

  // ---------- LABEL COLLECTION ----------
  const allLabels = new Set();

  for (const sourceModels of Object.values(data)) {

    if (!Array.isArray(sourceModels)) {
      continue;
    }

    for (const model of sourceModels) {

      for (const label of (model.labels || [])) {
        allLabels.add(label);
      }
    }
  }

  const chipsContainer =
    document.createElement("div");

  chipsContainer.classList.add(
    "model-filter-chips"
  );

  filterBar.appendChild(chipsContainer);

  for (const label of [...allLabels].sort()) {

    const chip =
      document.createElement("button");

    chip.classList.add(
      "model-filter-chip"
    );

    chip.textContent = label;

    if (
      activeModelLabelFilters.includes(label)
    ) {
      chip.classList.add("active");
    }

    chip.onclick = () => {
      const existingIndex =
        activeModelLabelFilters.indexOf(label);

      // Remove existing
      if (existingIndex !== -1) {
        activeModelLabelFilters.splice(
          existingIndex,
          1
        );

      } else {
        // Limit to 3
        if (
          activeModelLabelFilters.length >= 3
        ) {
          return;
        }
        activeModelLabelFilters.push(label);
      }
      renderModelsManager();
    };
    chipsContainer.appendChild(chip);
  }

  const models = [];

  for (const sourceModels of Object.values(data)) {

    if (Array.isArray(sourceModels)) {
      models.push(...sourceModels);
    }
  }

  const visibleModels = models.filter(model => {

    // ---------- SEARCH ----------
    const searchTarget = [
      model.name || "",
      model.id || "",
      model.source || "",
      ...(model.labels || [])
    ]
      .join(" ")
      .toLowerCase();

    if (
      modelSearchQuery &&
      !searchTarget.includes(modelSearchQuery)
    ) {
      return false;
    }

    // ---------- LABEL FILTERS ----------
    if (
      activeModelLabelFilters.length === 0
    ) {
      return true;
    }

    const labels =
      model.labels || [];

    return activeModelLabelFilters.every(
      filterLabel =>
        labels.includes(filterLabel)
    );
  });

  const groupedModels = {
    ollama: [],
    openrouter: []
  };

  for (const model of visibleModels) {

    const source =
      model.source || "openrouter";

    if (!groupedModels[source]) {
      groupedModels[source] = [];
    }

    groupedModels[source].push(model);
  }

  const providerOrder = [
    "ollama",
    "openrouter"
  ];

  for (const provider of providerOrder) {

    const providerModels =
      groupedModels[provider];

    if (
      !providerModels ||
      providerModels.length === 0
    ) {
      continue;
    }

    const section =
      document.createElement("div");

    section.classList.add(
      "provider-section"
    );

    const header =
      document.createElement("div");

    header.classList.add(
      "provider-header"
    );

    header.textContent =
      provider === "ollama"
        ? "OLLAMA"
        : "OPENROUTER";

    section.appendChild(header);

    for (const model of providerModels) {
    const row = document.createElement("div");
    row.classList.add("model-row");
    row.draggable = true;
    row.dataset.modelId = model.id;

    row.addEventListener("dragstart", () => {
      draggedRow = row;
      draggedModelId = model.id;
      row.classList.add("dragging");
    });

    row.addEventListener("dragend", () => {
      row.classList.remove("dragging");
      document
        .querySelectorAll(".model-row")
        .forEach(r => {
          r.classList.remove("drag-over");
        });
    });

    row.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (row === draggedRow) return;
      document
        .querySelectorAll(".model-row")
        .forEach(r => {
          r.classList.remove("drag-over");
        });
      row.classList.add("drag-over");
    });

    row.addEventListener("drop", async (e) => {
      e.preventDefault();
      document
        .querySelectorAll(".model-row")
        .forEach(r => {
          r.classList.remove(
            "drag-over-top",
            "drag-over-bottom"
          );
        });

      const targetModelId =
        row.dataset.modelId;

      const draggedModel =
        visibleModels.find(
          m => m.id === draggedModelId
        );

      const targetModel =
        visibleModels.find(
          m => m.id === targetModelId
        );

      if (
        !draggedModel ||
        !targetModel
      ) {
        return;
      }

      if (
        draggedModel.source !==
        targetModel.source
      ) {

        row.classList.add(
          "invalid-drop"
        );

        setTimeout(() => {
          row.classList.remove(
            "invalid-drop"
          );
        }, 500);

        return;
      }

      if (
        !draggedModelId ||
        draggedModelId === targetModelId
      ) {
        return;
      }

      await moveModelToPosition(
        draggedModelId,
        targetModelId
      );

      draggedRow = null;
      draggedModelId = null;
    });

    row.onclick = () => {
      selectModel(model);
    };

    if (model.id === selectedModelId) {
      row.classList.add("active");
    }


    // ---------- INFO ----------

    const info = document.createElement("div");
    info.classList.add("model-info");

    const title = document.createElement("div");
    title.classList.add("model-title");

    title.textContent =
      model.name || model.id;

    const meta = document.createElement("div");
    meta.classList.add("model-meta");

    const source =
      model.source || "openrouter";
    const context =
      model.context
        ? ` • ${model.context} ctx`
        : "";
    meta.textContent =
      `${source}${context}`;

    info.appendChild(title);
    info.appendChild(meta);

    if (model.labels?.length) {

      const labels =
        document.createElement("div");

      labels.classList.add("model-labels");

      for (const label of model.labels) {

        const badge =
          document.createElement("span");

        badge.classList.add("model-label");

        badge.textContent = label;

        labels.appendChild(badge);
      }

      info.appendChild(labels);
    }

    // ---------- ACTIONS ----------
    const actions = document.createElement("div");
    actions.classList.add("model-actions");



    row.appendChild(info);
    row.appendChild(actions);

    section.appendChild(row);
  }
  scrollContent.appendChild(section);
}
}

function selectModel(model) {
  selectedModelId = model.id;
  renderModelsManager();
  populateModelEditor(model);
}


function populateModelEditor(model) {
  const editor =
    document.getElementById("modelEditor");
  editor.classList.remove("hidden");

  creatingModel = false;

  document
    .getElementById("saveModelChangesBtn")
    .classList.remove("hidden");

  document
    .getElementById("createModelBtn")
    .classList.add("hidden");

  document.getElementById(
    "editModelIdDisplay"
  ).textContent = model.id || "";

  document.getElementById(
    "editModelIdDisplay"
  ).classList.remove("hidden");

  document.getElementById(
    "editModelIdInput"
  ).classList.add("hidden");

  document.getElementById("verifyModelBtn").classList.remove("hidden");
  document.getElementById("verifyModelStatus").textContent = "";

  document.getElementById(
    "editModelName"
  ).value = model.name || model.id || "";

  document.getElementById(
    "editModelSource"
  ).value = model.source || "openrouter";

  document.getElementById(
    "editModelContext"
  ).value = model.context || "";

  document.getElementById(
    "editModelLabels"
  ).value =
    (model.labels || []).join(", ");

  document.getElementById(
    "editModelDescription"
  ).value = model.description || "";
}

async function saveModelChanges() {
  if (!selectedModelId) return;
  const payload = {
    id: selectedModelId,
    name: document.getElementById(
      "editModelName"
    ).value,

    source: document.getElementById(
      "editModelSource"
    ).value,

    context: document.getElementById(
      "editModelContext"
    ).value,

    description: document.getElementById(
      "editModelDescription"
    ).value,

    labels: document.getElementById(
      "editModelLabels"
    ).value
      .split(",")
      .map(label => label.trim())
      .filter(Boolean)
  };
  const res = await fetch(
    "/update_model",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify(payload)
    }
  );
  const data = await res.json();
  if (data.error) {
    alert(data.error);
    return;
  }
  await fetchModels();

  await renderModelsManager();

  renderModelDropdown();
}


async function createModel() {

  const payload = {

    id: document.getElementById(
      "editModelIdInput"
    ).value.trim(),

    name: document.getElementById(
      "editModelName"
    ).value.trim(),

    source: document.getElementById(
      "editModelSource"
    ).value.trim(),

    context: parseInt(
      document.getElementById(
        "editModelContext"
      ).value
    ) || 0,

    description: document.getElementById(
      "editModelDescription"
    ).value.trim(),

    labels: document.getElementById(
      "editModelLabels"
    ).value
      .split(",")
      .map(label => label.trim())
      .filter(Boolean)
  };

  if (!payload.id || !payload.name) {

    alert("Model ID and Name required");
    return;
  }

  const res = await fetch(
    "/add_model",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify(payload)
    }
  );

  const data = await res.json();

  if (data.error) {

    alert(data.error);
    return;
  }

  await fetchModels();

  selectedModelId = payload.id;

  await renderModelsManager();

  // Re-open newly created model
  const sourceModels =
    modelRegistry[payload.source] || [];

  const createdModel =
    sourceModels.find(
      m => m.id === payload.id
    );

  if (createdModel) {
    populateModelEditor(createdModel);
  }
}

async function verifyModelId() {
  const idInput = document.getElementById("editModelIdInput");
  const idDisplay = document.getElementById("editModelIdDisplay");
  const modelId = idInput.classList.contains("hidden")
    ? idDisplay.textContent.trim()
    : idInput.value.trim();
  if (!modelId) {
    document.getElementById("verifyModelStatus").textContent = "Enter a model ID first.";
    return;
  }

  const statusEl = document.getElementById("verifyModelStatus");
  statusEl.textContent = "Checking...";

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models");
    const data = await res.json();
    const match = data.data.find(m => m.id === modelId);

    if (!match) {
      statusEl.textContent = "⚠️ Model not found on OpenRouter.";
      return;
    }

    // Auto-fill blank fields only
    const nameInput = document.getElementById("editModelName");
    const contextInput = document.getElementById("editModelContext");
    const descInput = document.getElementById("editModelDescription");
    const labelsInput = document.getElementById("editModelLabels");

    if (!nameInput.value.trim()) {
      nameInput.value = match.name || "";
    }

    if (!contextInput.value || contextInput.value === "0") {
      contextInput.value = match.context_length || "";
    }

    if (!descInput.value.trim()) {
      descInput.value = match.description || "";
    }

    // Add Free label if applicable and not already present
    const promptCost = parseFloat(match.pricing?.prompt ?? 1);
    const completionCost = parseFloat(match.pricing?.completion ?? 1);
    const isFree = promptCost === 0 && completionCost === 0;

    if (isFree) {
      const currentLabels = labelsInput.value
        .split(",")
        .map(l => l.trim())
        .filter(Boolean);
      if (!currentLabels.map(l => l.toLowerCase()).includes("free")) {
        currentLabels.push("Free");
        labelsInput.value = currentLabels.join(", ");
      }
    }

    statusEl.textContent = `✅ Found: ${match.name} — ${(match.context_length || 0).toLocaleString()} ctx`;

  } catch (err) {
    document.getElementById("verifyModelStatus").textContent = "Error reaching OpenRouter.";
  }
}


async function deleteSelectedModel() {

  if (!selectedModelId) {
    return;
  }

  const model = getModelById(selectedModelId);

  const confirmed =
    confirm(
      `Delete "${model?.name || selectedModelId}"?`
    );

  if (!confirmed) {
    return;
  }

  await deleteModel(selectedModelId);

  selectedModelId = null;

  document
    .getElementById("modelEditor")
    .classList.add("hidden");
}


async function deleteModel(modelId) {

  const res = await fetch('/delete_model', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: modelId
    })
  });

  const data = await res.json();

  if (data.status !== "deleted") {
    alert(data.error || "Delete failed");
    return;
  }

  await fetchModels();
  await renderModelsManager();
}

async function moveModel(modelId, direction) {

  const res = await fetch('/move_model', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: modelId,
      direction: direction
    })
  });

  const data = await res.json();

  if (data.status !== "moved") {
    alert(data.error || "Move failed");
    return;
  }

  await fetchModels();
  await renderModelsManager();
}


async function moveModelToPosition(
  draggedId,
  targetId
) {

  const visibleRows = [
    ...document.querySelectorAll(".model-row")
  ];

  const draggedVisibleIndex =
    visibleRows.findIndex(
      row =>
        row.dataset.modelId === draggedId
    );

  const targetVisibleIndex =
    visibleRows.findIndex(
      row =>
        row.dataset.modelId === targetId
    );

  if (
    draggedVisibleIndex === -1 ||
    targetVisibleIndex === -1
  ) {
    return;
  }

  const direction =
    draggedVisibleIndex < targetVisibleIndex
      ? 1
      : -1;

  const movesNeeded =
    Math.abs(
      targetVisibleIndex -
      draggedVisibleIndex
    );

  for (let i = 0; i < movesNeeded; i++) {

    const res = await fetch('/move_model', {

      method: 'POST',

      headers: {
        'Content-Type': 'application/json'
      },

      body: JSON.stringify({
        id: draggedId,
        direction: direction
      })
    });

    const data = await res.json();

    if (data.status !== "moved") {

      alert(data.error || "Move failed");

      return;
    }
  }

  await fetchModels();

  await renderModelsManager();

  renderModelDropdown();
}

async function openModelsPanel() {
  activeModelLabelFilters = [];
  document.getElementById("settingsMainView")
    .classList.add("hidden");
  document.getElementById("settingsModelsView")
    .classList.remove("hidden");

  const searchInput =
    document.getElementById("modelSearchInput");

  searchInput.value = modelSearchQuery;

  searchInput.oninput = (e) => {

    modelSearchQuery =
      e.target.value.toLowerCase();
    renderModelsManager();
  };

  await renderModelsManager();
}

function openVisualPanel() {
  document.getElementById("settingsMainView").classList.add("hidden");
  document.getElementById("settingsVisualView").classList.remove("hidden");
  loadVisualSettingsIntoUI();
}

function closeVisualPanel() {
  document.getElementById("settingsVisualView").classList.add("hidden");
  document.getElementById("settingsMainView").classList.remove("hidden");
}

function closeModelsPanel() {

  document.getElementById("settingsModelsView")
    .classList.add("hidden");

  document.getElementById("settingsMainView")
    .classList.remove("hidden");
}


function renderModelDropdown() {

  const select =
    document.getElementById("modelName");

  select.innerHTML =
    '<option value="">-- Select Model --</option>';

  const models = [];

  if (modelRegistry.ollama) {
    models.push(...modelRegistry.ollama);
  }

  if (modelRegistry.openrouter) {
    models.push(...modelRegistry.openrouter);
  }

  function appendGroup(label, items) {

    if (!items.length) return;

    const group =
      document.createElement("optgroup");

    group.label = label;

    for (const model of items) {

      const option =
        document.createElement("option");

      option.value = model.id;

      option.textContent =
        model.name || model.id;

      group.appendChild(option);
    }

    select.appendChild(group);
  }

  appendGroup(
    "Ollama (Local)",
    modelRegistry.ollama || []
  );

  appendGroup(
    "OpenRouter",
    modelRegistry.openrouter || []
  );

  // Restore selected model
  if (settings.modelName) {
    select.value = settings.modelName;
    if (select.value !== settings.modelName) {
      settings.modelName = "";
      localStorage.setItem(
        "sjb_settings",
        JSON.stringify(settings)
      );
    }
  }
}


function updateActiveModelDisplay() {
  const el = document.getElementById("activeModel");

  if (!settings.modelName) {
    el.innerText = "Model: None";
    return;
  }

  el.innerText = `Model: ${settings.modelName}`;
}


async function updateTokenMeter() {
  let combined = [];

  // SYSTEM
  for (const f of selected.system) {
    const content = await ensureFileCached("system", f);
    combined.push(content);
  }

  // BACKGROUND
  for (const f of selected.background) {
    const content = await ensureFileCached("background", f);
    combined.push(content);
  }

  // WRITING (exclude current file)
  for (const f of selected.writing) {
    if (f === currentFile.filename) continue;
    const content = await ensureFileCached("writing", f);
    combined.push(content);
  }

  // EDITOR CONTENT
  combined.push(editor.value);

  // PROMPT BOX (already includes selected prompt)
  combined.push(promptBox.value);

  const text = combined.join("\n\n---\n\n");

  const tokens = estimateTokens(text);
  const selectedModel = getModelById(settings.modelName);
  const max = selectedModel?.context || 128000;

  let color = "🟢";
  if (tokens / max > 0.9) color = "🔴";
  else if (tokens / max > 0.7) color = "🟡";

  document.getElementById("tokenMeter").innerText =
    `${color} ${tokens} / ${max}`;
}

function toggleProjectMenu(e) {
  e.stopPropagation();

  document.querySelectorAll('.file-menu').forEach(m => m.remove());

  const rect = e.target.getBoundingClientRect();

  const menu = document.createElement('div');
  menu.classList.add('file-menu');

  // ---- CREATE PROJECT ----

  const create = document.createElement('div');
  create.textContent = "Create Project";

  create.onclick = async () => {

    const name = prompt("Project name:");

    if (!name) return;

    // SAVE FIRST
    if (isDirty) {
      await saveCurrentFile();
    }

    const res = await fetch('/create_project', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: name
      })
    });

    const data = await res.json();

    if (data.status === "created") {

      currentProject = data.project;

      loadSelections();

      await loadProjects();
      await loadAll();

    } else {

      alert(data.error || "Failed to create project");
    }

    menu.remove();
  };

  // ---- RENAME PROJECT ----

  const rename = document.createElement('div');
  rename.textContent = "Rename Project";

  rename.onclick = async () => {

    const project =
      projects.find(p => p.id === currentProject);

    const currentName =
      project?.title || currentProject;

    const newName =
      prompt("New project name:", currentName);

    if (!newName) return;

    const res = await fetch('/rename_project', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        project: currentProject,
        name: newName
      })
    });

    const data = await res.json();

    if (data.status === "renamed") {

      await loadProjects();
      await loadAll();

    } else {

      alert(data.error || "Rename failed");
    }

    menu.remove();
  };

  // ---- DELETE PROJECT ----

  const del = document.createElement('div');
  del.textContent = "Delete Project";

  del.onclick = async () => {

    if (projects.length <= 1) {
      alert("At least one project must exist.");
      return;
    }

    if (currentProject === "default") {

      alert("Cannot delete default project");
      return;
    }

    const confirmed = confirm(
      `Delete project "${currentProject}"?`
    );

    if (!confirmed) return;

    // SAVE FIRST
    if (isDirty) {
      await saveCurrentFile();
    }

    const res = await fetch('/delete_project', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        project: currentProject
      })
    });

    const data = await res.json();

    if (data.status === "deleted") {

      currentProject = data.current_project;

      await loadProjects();

      loadSelections();

      await loadAll();

    } else {

      alert(data.error || "Delete failed");
    }

    menu.remove();
  };

  menu.appendChild(create);
  menu.appendChild(rename);
  menu.appendChild(del);

  document.body.appendChild(menu);

  menu.style.top = `${rect.bottom}px`;
  menu.style.left =
    `${rect.right - menu.offsetWidth}px`;

  setTimeout(() => {
    document.addEventListener('click', () => {
      menu.remove();
    }, { once: true });
  }, 0);
}

function toggleProjectDropdown(e) {

  document.querySelectorAll('.file-menu').forEach(m => m.remove());

  const rect =
    document.getElementById("projectDropdown")
      .getBoundingClientRect();

  const menu = document.createElement('div');

  menu.classList.add('file-menu');

  for (const project of projects) {

    const item = document.createElement('div');

    const projectName =
      project.title || project.id || project;

    const projectId =
      project.id || project;

    item.textContent = projectName;

    if (projectId === currentProject) {
      item.style.fontWeight = "bold";
    }

    item.onclick = async () => {

      // SAVE FIRST
      if (isDirty) {
        await saveCurrentFile();
      }

      const res = await fetch('/switch_project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project: projectId
        })
      });

      const data = await res.json();

      if (data.status === "switched") {

        currentProject = projectId;

        await loadProjects();

        loadSelections();

        await loadAll();

      } else {

        alert(data.error || "Failed to switch project");
      }

      menu.remove();
    };

    menu.appendChild(item);
  }

  document.body.appendChild(menu);

  menu.style.top = `${rect.bottom + 4}px`;
  menu.style.left = `${rect.left}px`;

  setTimeout(() => {
    document.addEventListener('click', () => {
      menu.remove();
    }, { once: true });
  }, 0);
}


editor.addEventListener("input", () => {
  updateTokenMeter();
  updateWordCount();
});

promptBox.addEventListener("input", () => {
  // If editing deviates from original prompt → deselect
  if (selected.prompt && promptBox.value !== originalPromptContent) {
    selected.prompt = null;
    renderLists(); // update radio UI
  }

  saveSelections();
  updateTokenMeter();
  updateWordCount();
});


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


// INSERT LOGIC
function getInsertMode() {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const length = editor.value.length;

  if (length === 0) return "empty";
  if (start === 0 && end === 0) return "start";
  if (start === length && end === length) return "end";
  return "middle";
}

function formatOutput(content, mode) {
  if (mode === "empty") return content;

  if (mode === "start") {
    return `${content}\n\n********\nEnd of generated content above\n********\n\n`;
  }

  if (mode === "end") {
    return `\n\n********\nNew generated content below\n********\n\n${content}`;
  }

  return `\n\n********\nNew generated content below\n********\n\n${content}\n\n********\nEnd of generated content above\n********\n\n`;
}

function insertAtCursor(text) {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;

  const before = editor.value.substring(0, start);
  const after = editor.value.substring(end);

  editor.value = before + text + after;

  editor.selectionStart = editor.selectionEnd = start + text.length;
}

function insertAtGenerationPoint(text) {

  const before = editor.value.substring(0, generationCursorPos);
  const after = editor.value.substring(generationCursorPos);

  editor.value = before + text + after;

  generationCursorPos += text.length;

}


function clearPrompt() {
  promptBox.value = "";
  selected.prompt = null;
  saveSelections();
  renderLists();
  updateTokenMeter();
}


// =====================
// GENERATE WITH SELECTIONS
// =====================

async function generate() {
  if (!settings.modelName) {
    alert("Please select a model in Settings.");
    return;
  }

  isGenerating = true;
  followGeneration = true;
  generationCursorPos = editor.selectionStart;
  currentAbortController = new AbortController();
  document.getElementById("stopGenerateBtn").disabled = false;
  document.getElementById("loadingIndicator").style.display = "block";
  await requestWakeLock();

  const button = document.querySelector(".controls button");
  const originalText = button.innerText;

  button.innerText = "Generating...";
  button.disabled = true;

// Snapshot before generation
generationUndoStack.push({
  content: editor.value,
  title: titleInput.value
});
if (generationUndoStack.length > MAX_UNDO) {
  generationUndoStack.shift();
}
updateUndoButton();

  try {
    // Preserve order from state
    const systemFiles = collectFilenames(state.global.system || [])
      .filter(f => selected.system.has(f));
    const backgroundFiles = collectFilenames(state.project.background || [])
      .filter(f => selected.background.has(f));
    const writingFiles = collectFilenames(state.project.writing || [])
      .filter(f => selected.writing.has(f) && f !== currentFile.filename);

    // Final ordered payload
    const payload = {
      system: systemFiles,
      background: backgroundFiles,
      writing: [...writingFiles, editor.value],
      prompt: promptBox.value,
      settings: settings
    };

    const res = await fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: currentAbortController.signal
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      alert(errData.error || `Generation failed (${res.status})`);
      generationUndoStack.pop();
      updateUndoButton();
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const mode = getInsertMode();
    let started = false;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        // Add separators only once
        if (!started) {
          insertAtGenerationPoint(formatOutput("", mode));
          started = true;
        }
        insertAtGenerationPoint(chunk);
        isDirty = true;
        if (followGeneration) {
          editor.scrollTop = editor.scrollHeight;
        }
        updateWordCount();
      }
    } catch (err) {
      if (err.name === "AbortError") {
        console.log("Generation stopped by user.");
      } else {
        throw err;
      }
    }

    await saveCurrentFile();


    // Restore prompt to original after generation
    if (selected.prompt) {
      promptBox.value = originalPromptContent;
    }

  } finally {
    isGenerating = false;
    generationCursorPos = null;
    currentAbortController = null;
    releaseWakeLock();
    document.getElementById("stopGenerateBtn").disabled = true;
    button.innerText = originalText;
    button.disabled = false;
    document.getElementById("loadingIndicator").style.display = "none";
  }
}

async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
    } catch (err) {
      console.log('Wake Lock not available:', err);
    }
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}

function stopGeneration() {
  if (currentAbortController) {
    currentAbortController.abort();
  }
}


function undoLastGeneration() {
  if (generationUndoStack.length === 0) {
    alert("Nothing to undo.");
    return;
  }
  const snapshot = generationUndoStack.pop();
  editor.value = snapshot.content;
  titleInput.value = snapshot.title;
  isDirty = true;
  updateWordCount();
  updateTokenMeter();
  updateUndoButton();
}

function updateUndoButton() {
  const btn = document.getElementById("undoGenerateBtn");
  if (btn) btn.disabled = generationUndoStack.length === 0;
}


let selected = {
  system: new Set(),
  background: new Set(),
  writing: new Set(),
  prompt: null
};

let originalPromptContent = "";


let state = {
  global: {},
  project: {}
};

let projects = [];
let currentProject = "default";
let recentProjects = [];
let modelsData = [];
let selectedModelIndex = null;
let creatingModel = false;

function showAddModelForm() {

    creatingModel = true;

    document
        .getElementById("modelEditor")
        .classList
        .remove("hidden");

    // ID mode
    document
        .getElementById("editModelIdDisplay")
        .classList
        .add("hidden");

    document
        .getElementById("editModelIdInput")
        .classList
        .remove("hidden");

    document
        .getElementById("verifyModelBtn")
        .classList.remove("hidden");
    document
        .getElementById("verifyModelStatus")
        .textContent = "";

    // Buttons
    document
        .getElementById("saveModelChangesBtn")
        .classList
        .add("hidden");

    document
        .getElementById("createModelBtn")
        .classList
        .remove("hidden");

    // Clear fields
    document.getElementById("editModelIdInput").value = "";

    document.getElementById("editModelName").value = "";

    document.getElementById("editModelSource").value =
        "openrouter";

    document.getElementById("editModelContext").value = "";

    document.getElementById("editModelLabels").value = "";

    document.getElementById("editModelDescription").value = "";
}



// =====================
// CREATE NEW FILE
// =====================

async function createNew(section) {
  const title = prompt("Enter title:");

  if (!title) return;

  const res = await fetch('/create_item', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      section: section,
      title: title
    })
  });

  const data = await res.json();

  if (data.status === "created") {
    const prevSelected = {
      system: new Set(selected.system),
      background: new Set(selected.background),
      writing: new Set(selected.writing),
      prompt: selected.prompt
    };

    await loadAll();

    // restore selections
    selected = prevSelected;

    await openFile(section, data.filename);

  } else {
    alert(data.error || "Error creating file");
  }
}
// ===================
// END CREATE NEW FILE
// ===================


// ===================
// CREATE NEW FOLDER
// ===================


async function createFolder(section) {

  const title = prompt("Folder name:");

  if (!title) return;

  const res = await fetch('/create_folder', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      section,
      title
    })
  });

  const data = await res.json();

  if (data.status === "created") {

    await loadAll();

  } else {

    alert(data.error || "Error creating folder");
  }
}


function collectFilenames(items) {

  const filenames = [];

  for (const item of items) {

    // Legacy fallback
    if (typeof item === "string") {
      filenames.push(item);
      continue;
    }

    // Typed files
    if (item.type === "file") {
      filenames.push(item.filename);
      continue;
    }

    // Typed folders
    if (
      item.type === "folder" &&
      Array.isArray(item.items)
    ) {
      filenames.push(
        ...collectFilenames(item.items)
      );
    }
  }

  return filenames;
}

function getFolderSelectionState(folderItems, sectionName) {
  const filenames = collectFilenames(folderItems);
  if (filenames.length === 0) return "empty";

  const selectedSet = selected[sectionName];
  const selectedCount = filenames.filter(f => selectedSet.has(f)).length;

  if (selectedCount === 0) return "empty";
  if (selectedCount === filenames.length) return "full";
  return "partial";
}

function setFolderSelection(folderItems, sectionName, shouldSelect) {
  const filenames = collectFilenames(folderItems);
  const selectedSet = selected[sectionName];
  for (const f of filenames) {
    if (shouldSelect) {
      selectedSet.add(f);
    } else {
      selectedSet.delete(f);
    }
  }
}


// ===================
// END CREATE NEW FOLDER
// ===================


async function loadAll() {
  const res = await fetch('/load');
  const data = await res.json();

  state.global = data.global;
  state.project = data.project;
  state.app_state = data.app_state;
  fileCache = {};

  // Restore global editor preferences
  const editorFont = state.app_state.editor_font || "Georgia";
  const editorFontSize = state.app_state.editor_font_size || "16px";

  editor.style.fontFamily = editorFont;
  editor.style.fontSize = editorFontSize;

  fontSelect.value = editorFont;
  fontSizeSelect.value = editorFontSize;

  // Remove invalid selections
  const allBackgroundFilenames = collectFilenames(state.project.background);
  const allWritingFilenames = collectFilenames(state.project.writing);

  selected.background = new Set(
    [...selected.background].filter(f =>
      allBackgroundFilenames.includes(f)
    )
  );
  selected.writing = new Set(
    [...selected.writing].filter(f =>
      allWritingFilenames.includes(f)
    )
  );

  const allWritingFiles =
    collectFilenames(state.project.writing);

  const allBackgroundFiles =
    collectFilenames(state.project.background);

  const fileStillExists =
    (
      currentFile.section === "writing" &&
      allWritingFiles.includes(currentFile.filename)
    ) ||
    (
      currentFile.section === "background" &&
      allBackgroundFiles.includes(currentFile.filename)
    ) ||
    (
      currentFile.section === "system"
    ) ||
    (
      currentFile.section === "prompts"
    );

  if (!fileStillExists) {
    currentFile = {
      section: null,
      filename: null
    };

    editor.value = "";
    titleInput.value = "";
  }

  renderLists();

  // Primary startup restore:
  // restore the actual last file opened anywhere

  const globalLast = state.global.last_opened_global;
  const allFilenames = [
    ...collectFilenames(state.project.writing),
    ...collectFilenames(state.project.background),
    ...collectFilenames(state.global.prompts || []),
    ...collectFilenames(state.global.system || [])
  ];
  if (
    globalLast &&
    globalLast.project === currentProject &&
    globalLast.section &&
    globalLast.filename &&
    allFilenames.includes(globalLast.filename)
  ) {
    await openFile(globalLast.section, globalLast.filename);
  }

  // Future project fallback
  else {
    const projectLast = state.project.last_opened_project;
    if (
      projectLast &&
      projectLast.section &&
      projectLast.filename &&
      allFilenames.includes(projectLast.filename)
    ) {
      await openFile(projectLast.section, projectLast.filename);
    }

    // Final fallback
    else if (allWritingFiles.length > 0) {
      await openFile('writing', allWritingFiles[0]);
    }
    else {

      // No files exist in this project
      currentFile = {
        section: null,
        filename: null
      };

      editor.value = "";
      titleInput.value = "";

      isDirty = false;

      renderLists();
    }
  }

  updateTokenMeter();
}


async function loadProjects() {
  const res = await fetch('/projects');
  const data = await res.json();
  projects = data.projects || [];
  recentProjects = data.recent || [];
  currentProject = data.current || "default";
  renderProjectList(data);
}


function renderProjectList(data) {
  const container =
    document.getElementById("projectsList");

  container.innerHTML = "";

  const allProjects = data.projects || [];
  const recentIds = data.recent || [];

  // Build lookup map
  const projectMap = {};

  for (const project of allProjects) {
    projectMap[project.id] = project;
  }

  // Current project label uses TITLE
  const currentMeta = projectMap[currentProject];

  document.getElementById("currentProjectLabel").innerText =
    `Project: ${currentMeta?.title || currentProject}`;

  // Build recent project objects
  const recentProjects = recentIds
    .map(id => projectMap[id])
    .filter(Boolean);

  // Remaining alpha list
  const remaining = allProjects.filter(
    p => !recentIds.includes(p.id)
  );

  // ---------- RECENT ----------
  if (recentProjects.length > 0) {

    const recentHeader = document.createElement("div");
    recentHeader.classList.add("project-header");
    recentHeader.textContent = "Recent";
    container.appendChild(recentHeader);

    for (const project of recentProjects) {
      container.appendChild(
        createProjectRow(project)
      );
    }
  }

  // ---------- ALL PROJECTS ----------
  if (remaining.length > 0) {

    const allHeader = document.createElement("div");
    allHeader.classList.add("project-header");
    allHeader.textContent = "All Projects";

    container.appendChild(allHeader);

    for (const project of remaining) {
      container.appendChild(
        createProjectRow(project)
      );
    }
  }
}

function createProjectRow(project) {

  const row = document.createElement("div");

  row.classList.add("project-row");

  if (project.id === currentProject) {
    row.classList.add("active-project");
  }

  row.textContent = project.title;

  row.onclick = async () => {

    // SAVE FIRST
    if (isDirty) {
      await saveCurrentFile();
    }

    const res = await fetch('/switch_project', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        project: project.id
      })
    });

    const data = await res.json();

    if (data.status === "switched") {

      currentProject = project.id;

      await loadProjects();

      loadSelections();

      await loadAll();

    } else {

      alert(data.error || "Failed to switch project");
    }
  };

  return row;
}

async function createProject() {

  const name = prompt("Project name:");

  if (!name) return;

  const res = await fetch('/create_project', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: name
    })
  });

  const data = await res.json();

  if (data.status === "created") {

    currentProject = data.project;

    loadSelections();

    await loadProjects();
    await loadAll();

  } else {

    alert(data.error || "Failed to create project");
  }
}


async function renderLists() {
  await renderSection('promptsList', state.global.prompts || [], 'prompts');
  await renderSection('systemList', state.global.system || [], 'system');
  await renderSection('backgroundList', state.project.background || [], 'background');
  await renderSection('writingList', state.project.writing || [], 'writing');
}



async function saveCurrentFile() {

  if (!currentFile.filename) return;

  const res = await fetch('/save_file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      section: currentFile.section,
      filename: currentFile.filename,
      title: titleInput.value,
      content: editor.value
    })
  });

  const data = await res.json();

  if (data.status === "saved") {
    isDirty = false;
    fileCache[`${currentFile.section}/${currentFile.filename}`] = editor.value;

    const isGlobal =
      currentFile.section === "prompts" ||
      currentFile.section === "system";

    const stateArr = isGlobal
      ? state.global[currentFile.section]
      : state.project[currentFile.section];

    const item = findFileItemInTree(
      stateArr || [],
      currentFile.filename
    );

    if (item) {
      item.title = titleInput.value;

      if (typeof data.wordCount === "number") {
        item.wordCount = data.wordCount;
      }
    }

    await renderLists();

  } else {
    console.error("Save failed", data);
  }
}


function loadSelections() {

  // ---------- GLOBAL ----------
  const globalSaved =
    localStorage.getItem("sjb_selected_global");

  if (globalSaved) {
    try {

      const data = JSON.parse(globalSaved);

      selected.system = new Set(data.system || []);
      selected.prompt = data.prompt || null;

    } catch (e) {
      console.error("Failed loading global selections", e);
    }
  }

  // ---------- PROJECT ----------
  const projectSaved =
    localStorage.getItem(`sjb_selected_${currentProject}`);

  if (projectSaved) {
    try {

      const data = JSON.parse(projectSaved);

      selected.background =
        new Set(data.background || []);

      selected.writing =
        new Set(data.writing || []);

    } catch (e) {
      console.error("Failed loading project selections", e);
    }
  } else {

    // clean defaults
    selected.background = new Set();
    selected.writing = new Set();
  }
}



editor.addEventListener("keydown", function (e) {
  if (e.key === "Tab") {
    e.preventDefault();

    const start = editor.selectionStart;
    const end = editor.selectionEnd;

    const value = editor.value;

    const before = value.substring(0, start);
    const selected = value.substring(start, end);
    const after = value.substring(end);

    // MULTI-LINE SELECTION
    if (selected.includes("\n")) {
      const lines = selected.split("\n");

      let newLines;

      if (e.shiftKey) {
        // UNINDENT
        newLines = lines.map(line =>
          line.startsWith("  ") ? line.slice(2) : line
        );
      } else {
        // INDENT
        newLines = lines.map(line => "  " + line);
      }

      const newText = newLines.join("\n");

      editor.value = before + newText + after;

      editor.selectionStart = start;
      editor.selectionEnd = start + newText.length;

    } else {
      // SINGLE LINE
      if (e.shiftKey) {
        // UNINDENT
        if (before.endsWith("  ")) {
          editor.value =
            before.slice(0, -2) + selected + after;

          editor.selectionStart = editor.selectionEnd = start - 2;
        }
      } else {
        // INDENT
        editor.value =
          before + "  " + selected + after;

        editor.selectionStart = editor.selectionEnd = start + 2;
      }
    }
  }
});

editor.addEventListener('wheel', () => {
  if (isGenerating) {
    followGeneration = false;
  }
});

editor.addEventListener('touchmove', () => {
  if (isGenerating) {
    followGeneration = false;
  }
});

function renderSection(
  elementId,
  items,
  sectionName,
  depth = 0,
  isRecursive = false
) {
  const container =
    typeof elementId === "string"
      ? document.getElementById(elementId)
      : elementId;

  if (!container) {
    console.error(
      "renderSection missing container:",
      elementId,
      sectionName
    );
    return;
  }

  if (!isRecursive) {
    container.innerHTML = '';

    container.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    container.addEventListener('drop', async (e) => {
      // Only handle drops directly on the container (empty space),
      // not on file-row or folder-row (those stopPropagation or handle their own)
      if (e.target !== container) return;

      const draggedFilename = e.dataTransfer.getData('text/plain');
      const draggedSection = e.dataTransfer.getData('section');
      if (!draggedFilename) return;
      if (draggedSection !== sectionName) return;

      await moveFileTo(sectionName, draggedFilename, null, null, null);
    });
  }

  for (let item of items) {
    if (item.type === "folder") {
      const folderRow =
        document.createElement("div");

      folderRow.classList.add("folder-row");
      folderRow.draggable = true;
      folderRow.dataset.section = sectionName;
      folderRow.dataset.folderId = item.id;
      folderRow.style.marginLeft = `${depth * 16}px`;

      // Arrow (collapse/expand toggle)
      const folderArrow = document.createElement("span");
      folderArrow.textContent = item.collapsed ? "▶" : "▼";
      folderArrow.style.cursor = "pointer";
      folderArrow.style.flexShrink = "0";
      folderArrow.onclick = async () => {
        item.collapsed = !item.collapsed;
        await fetch('/update_folder_state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            section: sectionName,
            state: sectionName === 'prompts'
              ? state.global.prompts
              : sectionName === 'system'
                ? state.global.system
                : state.project[sectionName]
          })
        });
        renderLists();
      };
      folderRow.appendChild(folderArrow);

      // Selection checkbox (skip for prompts — single-select only)
      if (sectionName !== "prompts") {
        const folderCheckbox = document.createElement("input");
        folderCheckbox.type = "checkbox";
        const folderState = getFolderSelectionState(item.items || [], sectionName);
        if (folderState === "full") {
          folderCheckbox.checked = true;
        } else if (folderState === "partial") {
          folderCheckbox.indeterminate = true;
        }
        folderCheckbox.onchange = () => {
          const shouldSelect = folderCheckbox.checked;
          setFolderSelection(item.items || [], sectionName, shouldSelect);
          saveSelections();
          renderLists();
          updateTokenMeter();
        };
        folderRow.appendChild(folderCheckbox);
      }

      // Title
      const folderLabel = document.createElement("span");

      folderLabel.textContent = item.title;
      if (
        shouldShowCounts(sectionName) &&
        shouldShowFolderTotals()
      ) {

        const total =
          getFolderWordCount(item.items);

        const countSpan =
          document.createElement("span");

        countSpan.classList.add("word-count");

        if (total === null) {
          countSpan.textContent = " (?)";
        }
        else if (total > 0) {
          countSpan.textContent =
            ` (${total.toLocaleString()})`;
        }

        folderLabel.appendChild(countSpan);
      }
      folderLabel.style.cursor = "pointer";
      folderLabel.onclick = async () => {
        item.collapsed = !item.collapsed;
        await fetch('/update_folder_state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            section: sectionName,
            state: sectionName === 'prompts'
              ? state.global.prompts
              : sectionName === 'system'
                ? state.global.system
                : state.project[sectionName]
          })
        });
        renderLists();
      };
      folderRow.appendChild(folderLabel);

      const menuBtn =
        document.createElement("span");
      menuBtn.textContent = "⋯";
      menuBtn.classList.add("menu-btn");
      menuBtn.onclick = (e) => {
        e.stopPropagation();
        toggleFolderMenu(
          folderRow,
          sectionName,
          item
        );
      };

      folderRow.appendChild(menuBtn);

      // FOLDER DRAG START/END (for reordering folders)
      folderRow.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        draggedRow = folderRow;
        folderRow.classList.add('dragging');
        e.dataTransfer.setData('folder-id', item.id);
        e.dataTransfer.setData('section', sectionName);
      });

      folderRow.addEventListener('dragend', () => {
        folderRow.classList.remove('dragging');
        draggedRow = null;
        document.querySelectorAll('.file-row, .folder-row').forEach(r => {
          r.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-folder');
        });
      });

      // FOLDER DRAG OVER — highlight as drop target (file→folder) or top/bottom (folder reorder)
      folderRow.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        document.querySelectorAll('.folder-row, .file-row').forEach(r => {
          r.classList.remove('drag-over-folder', 'drag-over-top', 'drag-over-bottom');
        });

        const draggedFolderId = draggedRow?.dataset?.folderId;
        if (draggedFolderId) {
          // Folder being dragged over another folder — show top/bottom reorder indicator
          if (draggedFolderId === item.id) return;
          const rect = folderRow.getBoundingClientRect();
          const midpoint = rect.top + rect.height / 2;
          if (e.clientY < midpoint) {
            folderRow.classList.add('drag-over-top');
          } else {
            folderRow.classList.add('drag-over-bottom');
          }
        } else {
          // File being dragged over folder — highlight as "move into"
          folderRow.classList.add('drag-over-folder');
        }
      });

      folderRow.addEventListener('dragleave', () => {
        folderRow.classList.remove('drag-over-folder', 'drag-over-top', 'drag-over-bottom');
      });

      // DROP on folder — either move file into this folder, or reorder this folder
      folderRow.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        folderRow.classList.remove('drag-over-folder', 'drag-over-top', 'drag-over-bottom');

        const draggedSection = e.dataTransfer.getData('section');
        if (draggedSection !== sectionName) return;

        const draggedFolderId = e.dataTransfer.getData('folder-id');
        if (draggedFolderId) {
          if (draggedFolderId === item.id) return;
          const rect = folderRow.getBoundingClientRect();
          const position = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
          await moveFolderTo(sectionName, draggedFolderId, null, item.id, position);
          return;
        }

        const draggedFilename = e.dataTransfer.getData('text/plain');
        if (!draggedFilename) return;
        await moveFileTo(sectionName, draggedFilename, null, null, item.id);
      });

      container.appendChild(folderRow);

      if (!item.collapsed) {
        renderSection(
          container,
          item.items,
          sectionName,
          depth + 1,
          true
        );
      }
      continue;
    }

    // Legacy string support
    if (typeof item === "string") {

      item = {
        type: "file",
        filename: item,
        title: item
      };
    }

    // Legacy object support
    if (!item.type && item.filename) {

      item = {
        type: "file",
        filename: item.filename,
        title: item.title || item.filename
      };
    }

    if (item.type !== "file") {
      continue;
    }
    const filename = item.filename;
    const title =
      item.title || item.filename;
    if (item.filename === "17.json") {
    }

    const row = document.createElement('div');
    row.classList.add('file-row');
    row.style.marginLeft =
      `${depth * 16}px`;

    row.draggable = true;
    row.dataset.section = sectionName;
    row.dataset.filename = filename;


    // ✅ Highlight if active
    if (
      currentFile.section === sectionName &&
      currentFile.filename === filename
    ) {
      row.classList.add('active-file');
    }

    const input = document.createElement('input');

    if (sectionName === "prompts") {
      input.type = "radio";
      input.name = "promptSelect";
      input.checked = selected.prompt === filename;
    } else {
      input.type = "checkbox";
      input.checked = selected[sectionName].has(filename);
    }

    input.onchange = () => {
      if (sectionName === "prompts") {
        selected.prompt = filename;
        loadPromptIntoBox(filename);
      } else {
        if (input.checked) {
          selected[sectionName].add(filename);
        } else {
          selected[sectionName].delete(filename);
        }
        }
      saveSelections();
      renderLists();
      updateTokenMeter();
    };


    const label = document.createElement('span');
    label.style.cursor = "pointer";

    label.appendChild(
      document.createTextNode(" " + title)
    );
    if (shouldShowCounts(sectionName)) {

      const countSpan =
        document.createElement("span");

      countSpan.classList.add("word-count");

      if (item.wordCount == null) {

        countSpan.textContent = " (?)";
      }
      else if (item.wordCount > 0) {

        countSpan.textContent =
          ` (${item.wordCount.toLocaleString()})`;
      }

      label.appendChild(countSpan);
    }

    row.onclick = (e) => {
      // Prevent checkbox/radio clicks from triggering open
      if (e.target.tagName.toLowerCase() === 'input') return;
      openFile(sectionName, filename);
    };


    row.appendChild(input);
    row.appendChild(label);

    // Ellipsis Button
    const menuBtn = document.createElement('span');
    menuBtn.textContent = "⋯";
    menuBtn.classList.add("menu-btn");

    menuBtn.onclick = (e) => {
      e.stopPropagation();
      toggleMenu(row, sectionName, filename);
    };

    row.appendChild(menuBtn);

    // DRAG START
    row.addEventListener('dragstart', (e) => {
      draggedRow = row;
      row.classList.add('dragging');
      e.dataTransfer.setData('text/plain', filename);
      e.dataTransfer.setData('section', sectionName);
    });

    // DRAG END
    row.addEventListener('dragend', () => {
      row.classList.remove('dragging');
      draggedRow = null;
      document.querySelectorAll('.file-row, .folder-row').forEach(r => {
        r.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-folder');
      });
    });

    // DRAG OVER
    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (row === draggedRow) return;
      document.querySelectorAll('.file-row').forEach(r => {
        r.classList.remove('drag-over-top', 'drag-over-bottom');
      });
      const rect = row.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      if (e.clientY < midpoint) {
        row.classList.add('drag-over-top');
      } else {
        row.classList.add('drag-over-bottom');
      }
    });

    // DROP on file row — insert before or after this file (root level)
    row.addEventListener('drop', async (e) => {
      e.preventDefault();
      const draggedSection = e.dataTransfer.getData('section');
      if (draggedSection !== sectionName) return;

      const rect = row.getBoundingClientRect();
      const position = e.clientY < rect.top + rect.height / 2 ? "before" : "after";

      const draggedFolderId = e.dataTransfer.getData('folder-id');
      if (draggedFolderId) {
        await moveFolderTo(sectionName, draggedFolderId, filename, null, position);
        return;
      }

      const draggedFilename = e.dataTransfer.getData('text/plain');
      if (!draggedFilename || draggedFilename === filename) return;
      await moveFileTo(sectionName, draggedFilename, filename, position, null);
    });

    container.appendChild(row);
  }
}


function toggleFolderMenu(
  row,
  section,
  folder
) {

  document
    .querySelectorAll('.file-menu')
    .forEach(m => m.remove());

  const rect =
    row.getBoundingClientRect();

  const menu =
    document.createElement('div');

  menu.classList.add('file-menu');

  // ---------- Add File ----------

  const addFile =
    document.createElement('div');

  addFile.textContent =
    "Add File";

  addFile.onclick = async () => {

    const title =
      prompt("Enter title:");

    if (!title) return;

    const res =
      await fetch(
        '/create_item_in_folder',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json'
          },
          body: JSON.stringify({
            section,
            folder_id: folder.id,
            title
          })
        }
      );

    const data =
      await res.json();

    if (
      data.status === "created"
    ) {

      await loadAll();

      await openFile(
        section,
        data.filename
      );

    } else {

      alert(
        data.error ||
        "Error creating file"
      );
    }

    menu.remove();
  };

  // ---------- Rename Folder ----------

  const rename =
    document.createElement('div');

  rename.textContent =
    "Rename Folder";

  rename.onclick = async () => {

    const newTitle =
      prompt(
        "New folder name:",
        folder.title
      );

    if (!newTitle) return;

    const res =
      await fetch(
        '/rename_folder',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json'
          },
          body: JSON.stringify({
            section,
            folder_id: folder.id,
            title: newTitle
          })
        }
      );

    const data =
      await res.json();

    if (
      data.status === "renamed"
    ) {

      await loadAll();

    } else {

      alert(
        data.error ||
        "Rename failed"
      );
    }

    menu.remove();
  };

  // ---------- Delete Folder ----------

  const del =
    document.createElement('div');

  del.textContent =
    "Delete Folder";

  del.onclick = async () => {

    if (
      !confirm(
        `Delete folder "${folder.title}"?`
      )
    ) {
      return;
    }

    const res =
      await fetch(
        '/delete_folder',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json'
          },
          body: JSON.stringify({
            section,
            folder_id: folder.id
          })
        }
      );

    const data =
      await res.json();

    if (
      data.status === "deleted"
    ) {

      await loadAll();

    } else {

      alert(
        data.error ||
        "Delete failed"
      );
    }

    menu.remove();
  };

  menu.appendChild(addFile);
  menu.appendChild(rename);
  menu.appendChild(del);

  document.body.appendChild(menu);

  const menuRect =
    menu.getBoundingClientRect();

  let top = rect.bottom;

  let left =
    rect.right - menuRect.width;

  if (
    rect.bottom + menuRect.height >
    window.innerHeight
  ) {
    top =
      rect.top - menuRect.height;
  }

  if (top < 0) top = 10;

  if (
    left + menuRect.width >
    window.innerWidth
  ) {
    left =
      window.innerWidth -
      menuRect.width -
      10;
  }

  menu.style.top =
    `${top}px`;

  menu.style.left =
    `${left}px`;

  setTimeout(() => {

    document.addEventListener(
      'click',
      () => menu.remove(),
      { once: true }
    );

  }, 0);
}

function removeFileFromTree(items, filename) {
  const result = [];
  for (const item of items) {
    if (item.type === "folder") {
      result.push({
        ...item,
        items: removeFileFromTree(item.items || [], filename)
      });
    } else if (getFilename(item) === filename) {
      // drop it
    } else {
      result.push(item);
    }
  }
  return result;
}

function findFileItemInTree(items, filename) {
  for (const item of items) {
    if (item.type === "folder") {
      const found = findFileItemInTree(item.items || [], filename);
      if (found) return found;
    } else if (getFilename(item) === filename) {
      return item;
    }
  }
  return null;
}

async function moveFileTo(sectionName, draggedFilename, targetFilename, position, targetFolderId) {
  // Get the right state array
  const isGlobal = sectionName === 'prompts' || sectionName === 'system';
  const stateArr = isGlobal ? state.global[sectionName] : state.project[sectionName];

  // Find the file object being moved
  const fileObj = findFileItemInTree(stateArr, draggedFilename);
  if (!fileObj) return;

  // Ensure it has type
  const fileItem = {
    type: "file",
    filename: fileObj.filename || fileObj,
    title: fileObj.title || fileObj.filename || fileObj
  };

  // Remove from wherever it currently is
  const cleaned = removeFileFromTree(stateArr, draggedFilename);

  // Insert into new location
  function insertInto(items) {
    if (targetFolderId) {
      return items.map(item => {
        if (item.type === "folder" && item.id === targetFolderId) {
          return { ...item, items: [...(item.items || []), fileItem] };
        }
        if (item.type === "folder") {
          return { ...item, items: insertInto(item.items || []) };
        }
        return item;
      });
    }

    // Insert relative to targetFilename — search recursively
    const result = [];
    let foundHere = false;

    for (const item of items) {
      if (item.type === "folder") {
        const newFolderItems = insertInto(item.items || []);
        // Detect if insertion happened inside this folder by checking length change
        if (newFolderItems.length !== (item.items || []).length) {
          foundHere = true;
        }
        result.push({ ...item, items: newFolderItems });
        continue;
      }
      if (getFilename(item) === targetFilename) {
        if (position === "before") {
          result.push(fileItem);
          result.push(item);
        } else {
          result.push(item);
          result.push(fileItem);
        }
        foundHere = true;
      } else {
        result.push(item);
      }
    }

    // Only append at this level if nothing matched anywhere below
    if (!foundHere && items === cleaned) {
      result.push(fileItem);
    }

    return result;
  }

  const newState = insertInto(cleaned);

  // Update local state
  if (isGlobal) {
    state.global[sectionName] = newState;
  } else {
    state.project[sectionName] = newState;
  }

  // Persist
  await fetch('/update_folder_state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section: sectionName, state: newState })
  });

  renderLists();
}


function removeFolderFromTree(items, folderId) {
  const result = [];
  for (const item of items) {
    if (item.type === "folder" && item.id === folderId) {
      continue; // drop it
    } else if (item.type === "folder") {
      result.push({
        ...item,
        items: removeFolderFromTree(item.items || [], folderId)
      });
    } else {
      result.push(item);
    }
  }
  return result;
}

function findFolderInTree(items, folderId) {
  for (const item of items) {
    if (item.type === "folder") {
      if (item.id === folderId) return item;
      const found = findFolderInTree(item.items || [], folderId);
      if (found) return found;
    }
  }
  return null;
}

async function moveFolderTo(sectionName, draggedFolderId, targetFilename, targetFolderIdForFile, position) {
  const isGlobal = sectionName === 'prompts' || sectionName === 'system';
  const stateArr = isGlobal ? state.global[sectionName] : state.project[sectionName];

  const folderObj = findFolderInTree(stateArr, draggedFolderId);
  if (!folderObj) return;

  // Only support reordering at the SAME level as the target (root level for now)
  const cleaned = removeFolderFromTree(stateArr, draggedFolderId);

  const result = [];
  let inserted = false;
  for (const item of cleaned) {
    const isTargetFile = item.type === "file" && getFilename(item) === targetFilename;
    const isTargetFolder = item.type === "folder" && item.id === targetFolderIdForFile;

    if ((isTargetFile || isTargetFolder)) {
      if (position === "before") {
        result.push(folderObj);
        result.push(item);
      } else {
        result.push(item);
        result.push(folderObj);
      }
      inserted = true;
    } else {
      result.push(item);
    }
  }
  if (!inserted) {
    result.push(folderObj);
  }

  if (isGlobal) {
    state.global[sectionName] = result;
  } else {
    state.project[sectionName] = result;
  }

  await fetch('/update_folder_state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section: sectionName, state: result })
  });

  renderLists();
}

async function saveSectionOrder(sectionName) {
  const containerMap = {
    prompts: 'promptsList',
    system: 'systemList',
    background: 'backgroundList',
    writing: 'writingList'
  };

  const container =
    document.getElementById(containerMap[sectionName]);

  const rows = container.querySelectorAll('.file-row');

  const reordered = Array.from(rows).map(row => {
    const filename = row.dataset.filename;

    const source =
      sectionName === 'prompts' || sectionName === 'system'
        ? state.global[sectionName]
        : state.project[sectionName];

    return source.find(item => {
      return getFilename(item) === filename;
    });
  });

  // Update local state immediately
  if (sectionName === 'prompts' || sectionName === 'system') {
    state.global[sectionName] = reordered;
  } else {
    state.project[sectionName] = reordered;
  }

  // Persist backend
  await fetch('/save_order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      section: sectionName,
      items: reordered
    })
  });
}


// ---- Ellipsis Menu Logic ----
function toggleMenu(row, section, filename) {
  // Remove any existing menus
  document.querySelectorAll('.file-menu').forEach(m => m.remove());

  const rect = row.getBoundingClientRect();

  const menu = document.createElement('div');
  menu.classList.add('file-menu');

  // --- CONTENT ---

  const rename = document.createElement('div');
  rename.textContent = "Rename";
  rename.onclick = async () => {
    const newTitle = prompt("New name:");
    if (!newTitle) return;

    const res = await fetch('/rename_item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section, filename, title: newTitle })
    });

    const data = await res.json();

    if (data.status === "renamed") {

      if (
        currentFile.section === section &&
        currentFile.filename === filename
      ) {
        currentFile.filename = data.filename;

        await openFile(
          currentFile.section,
          currentFile.filename
        );
      }

      await loadAll();

    } else {
      alert(data.error);
    }
  };

  const del = document.createElement('div');
  del.textContent = "Delete";
  del.onclick = async () => {
    if (!confirm("Delete this file?")) return;

    const res = await fetch('/delete_item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section, filename })
    });

    const data = await res.json();
    if (data.status === "deleted") {
      const deletedWasCurrent =
        currentFile.section === section &&
        currentFile.filename === filename;

      // Clear last_opened pointers before loadAll tries to restore them
      if (state.global.last_opened_global?.filename === filename) {
        state.global.last_opened_global = {};
      }
      if (state.project.last_opened_project?.filename === filename) {
        state.project.last_opened_project = {};
      }

      await loadAll();

      // If deleted file was active,
      // load a sensible replacement
      if (deletedWasCurrent) {

        let replacement = null;

        // Determine source list
        let source;

        if (section === "prompts" || section === "system") {
          source = state.global[section];
        } else {
          source = state.project[section];
        }

        // Try first remaining file (skip folders, search recursively)
        if (source && source.length > 0) {
          const allFiles = collectFilenames(source);
          if (allFiles.length > 0) {
            replacement = { filename: allFiles[0] };
          }
        }

        if (replacement) {
          const newFilename =
            typeof replacement === "string"
              ? replacement
              : replacement.filename;

          await openFile(section, newFilename);

        } else {

          // Fully clear editor state safely
          currentFile = {
            section: null,
            filename: null
          };

          titleInput.value = "";
          editor.value = "";

          isDirty = false;

          renderLists();
          updateTokenMeter();
        }
      }

    } else {

      alert(data.error);
    }
  };

  menu.appendChild(rename);
  menu.appendChild(del);

  // --- POSITIONING LOGIC ---

  document.body.appendChild(menu);

  const menuRect = menu.getBoundingClientRect();

  let top = rect.bottom;
  let left = rect.right - menuRect.width;

  // If not enough space below → open upward
  if (rect.bottom + menuRect.height > window.innerHeight) {
    top = rect.top - menuRect.height;
  }

  // If still offscreen top → clamp
  if (top < 0) top = 10;

  // Prevent right overflow
  if (left + menuRect.width > window.innerWidth) {
    left = window.innerWidth - menuRect.width - 10;
  }

  menu.style.top = `${top}px`;
  menu.style.left = `${left}px`;

  // Close on click outside
  setTimeout(() => {
    document.addEventListener('click', () => {
      menu.remove();
    }, { once: true });
  }, 0);
}

function updateWordCount() {
  const text = editor.value.trim();
  const count = text === "" ? 0 : text.split(/\s+/).length;
  document.getElementById("wordCount").textContent = `${count.toLocaleString()} words`;
}


let settings = {
  modelSource: "openrouter",
  modelName: "",
};
let modelRegistry = {};

async function openSettings() {
  loadSettingsIntoUI();
  await loadApiKeyStatus();
  await fetchModels();
  document.getElementById("settingsModal").classList.remove("hidden");
}


function closeSettings() {
  document.getElementById("settingsModal").classList.add("hidden");
}



function closeModelsPanel() {

  document
    .getElementById("settingsModelsView")
    .classList.add("hidden");

  document
    .getElementById("settingsMainView")
    .classList.remove("hidden");
}


function addModelRow() {
  alert("Add Model UI coming next.");
}


function getModelById(modelId) {
  for (const sourceModels of Object.values(modelRegistry)) {
    const found = sourceModels.find(
      m => m.id === modelId
    );

    if (found) {
      return found;
    }
  }
  return null;
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
  updateActiveModelDisplay();
  closeSettings();
}

async function saveVisualSettings() {
  const theme = document.getElementById("themeSelect").value;
  setTheme(theme);
  applySidebarFontSize(document.getElementById('sidebarFontSize').value);
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
        state.app_state.showFolderTotals
    })
  });

  await renderLists();
  closeVisualPanel();
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
}

function loadVisualSettingsIntoUI() {
  document.getElementById("themeSelect").value =
    localStorage.getItem("theme") || "light";
  document.getElementById('sidebarFontSize').value =
    localStorage.getItem('sjb_sidebar_font_size') || '13px';
}



async function loadPromptIntoBox(filename) {
  const res = await fetch('/load_file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      section: 'prompts',
      filename: filename
    })
  });

  const data = await res.json();

  fileCache[`prompts/${filename}`] = data.content || "";

  originalPromptContent = data.content || "";
  promptBox.value = originalPromptContent;

  saveSelections();
  updateTokenMeter();
}


function saveSelections() {

  // GLOBAL selections
  const globalData = {
    system: Array.from(selected.system),
    prompt: selected.prompt
  };

  localStorage.setItem(
    "sjb_selected_global",
    JSON.stringify(globalData)
  );

  // PROJECT selections
  const projectData = {
    background: Array.from(selected.background),
    writing: Array.from(selected.writing)
  };

  localStorage.setItem(
    `sjb_selected_${currentProject}`,
    JSON.stringify(projectData)
  );
}



async function openFile(section, filename) {

  if (isGenerating) {
    alert("Please wait for generation to finish before switching files.");
    return;
  }

  if (isDirty) {
    await saveCurrentFile();
  }

  const res = await fetch('/load_file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      section: section,
      filename: filename
    })
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.error || "Failed to load file");
    return;
  }

  // ✅ Cache HERE
  fileCache[`${section}/${filename}`] = data.content || "";

  currentFile.section = section;
  currentFile.filename = filename;

  await fetch('/opened_file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      section,
      filename
    })
  });


  titleInput.value = data.title || "";
  editor.value = data.content || "";
  isDirty = false;
  saveSelections();
  await renderLists();
  updateTokenMeter();
  updateWordCount();
}



let isDirty = false;
let idleTimer = null;

editor.addEventListener("input", () => {
  isDirty = true;

  if (idleTimer) clearTimeout(idleTimer);

  idleTimer = setTimeout(() => {
    if (isDirty) {
      saveCurrentFile();
    }
  }, 30000);
});


editor.addEventListener("paste", function (e) {
    e.preventDefault();

    const text =
        (e.clipboardData || window.clipboardData).getData("text/plain");

    insertAtCursor(text);

    isDirty = true;
    updateTokenMeter();
    updateWordCount();
});


titleInput.addEventListener("input", () => {
  isDirty = true;
});

titleInput.addEventListener("blur", async () => {
  if (isDirty) {
    await saveCurrentFile();
  }
});


window.addEventListener("beforeunload", (e) => {
  if (isDirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});



window.onload = async () => {
  loadTheme();
  loadSettings();
  await loadProjects();
  loadSelections();
  await loadAll();
  updateUndoButton();
};