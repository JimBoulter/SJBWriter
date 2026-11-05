// models.js: Manage Models, the model pickers, and the OpenRouter model check.
// Loaded in order by index.html; all files share one global scope.

let draggedModelId = null;

let selectedModelId = null;

let activeModelLabelFilters = [];

let modelSearchQuery = "";

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

    const availability = openrouterAvailability(model);
    if (availability) {
      const flag = document.createElement("span");
      flag.className = `model-flag model-flag-${availability.kind}`;
      flag.textContent = availability.text;
      info.appendChild(flag);
    }

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

  const deleteButton =
    document.getElementById("deleteModelBtn");

  const isOllama = model.source === "ollama";

  deleteButton.disabled = isOllama;
  deleteButton.title = isOllama
    ? "Ollama models are managed outside SJB Writer. Uninstall the model through Ollama to reclaim disk space. SJB Writer retains its catalog information for future reinstalls."
    : "Delete this model from SJB Writer.";

  deleteButton.style.opacity = isOllama ? "0.5" : "";
  deleteButton.style.cursor = isOllama ? "not-allowed" : "";

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
    showToast(data.error);
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

    showToast("Model ID and Name required", "info");
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

    showToast(data.error);
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

  if (model?.source === "ollama") {
    return;
  }

  const confirmed = await askConfirm(
    `Delete “${model?.name || selectedModelId}”?`,
    "It is removed from your model list. You can add it again later.",
    { okLabel: "Delete", danger: true }
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
    showToast(data.error || "Delete failed");
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

      showToast(data.error || "Move failed");

      return;
    }
  }

  await fetchModels();

  await renderModelsManager();

  renderModelDropdown();
}

async function openModelsPanel() {
  activeModelLabelFilters = [];
  document.getElementById("settingsMainLayout")
    .classList.add("hidden");
  document.getElementById("settingsModelsView")
    .classList.remove("hidden");

  const searchInput =
    document.getElementById("modelSearchInput");
  searchInput.value = modelSearchQuery;
  searchInput.oninput = (e) => {
    modelSearchQuery = e.target.value.toLowerCase();
    renderModelsManager();
  };
  await renderModelsManager();
}

function closeModelsPanel() {
  document.getElementById("settingsModelsView")
    .classList.add("hidden");
  document.getElementById("settingsMainLayout")
    .classList.remove("hidden");
}

function renderModelDropdown() {
  const selects = [
    document.getElementById("modelName"),
    document.getElementById("footerModelName")
  ].filter(Boolean);

  selects.forEach(select => {
    select.innerHTML =
      '<option value="">-- Select Model --</option>';
  });

  function appendGroup(label, items) {
    if (!items.length) return;

    selects.forEach(select => {
      const group = document.createElement("optgroup");
      group.label = label;

      for (const model of items) {
        const option = document.createElement("option");
        option.value = model.id;
        const availability = openrouterAvailability(model);
        option.textContent = (model.name || model.id) +
          (availability ? ` (${availability.kind === "gone" ? "removed from OpenRouter" : `leaves ${formatShortDate(openrouterCatalog.models[model.id].expires)}`})` : "");
        group.appendChild(option);
      }

      select.appendChild(group);
    });
  }

  appendGroup("Ollama (Local)", modelRegistry.ollama || []);
  appendGroup("OpenRouter", modelRegistry.openrouter || []);

  if (settings.modelName) {
    const modelExists = selects.some(select =>
      Array.from(select.options).some(
        option => option.value === settings.modelName
      )
    );

    if (!modelExists) {
      settings.modelName = "";
      settings.modelSource = "openrouter";
      localStorage.setItem(
        "sjb_settings",
        JSON.stringify(settings)
      );
    }
  }

  selects.forEach(select => {
    select.value = settings.modelName;

    select.onchange = () => {
      setActiveModel(select.value);
    };
  });
}

function setActiveModel(modelId) {
  const selectedModel = getModelById(modelId);

  settings.modelName = modelId;
  settings.modelSource = selectedModel?.source || "openrouter";

  updateActiveModelDisplay();
  updateTokenMeter();
  updateReasoningNote();
  updateMaxTokensNote();
}

function updateActiveModelDisplay() {
  const modelId = settings.modelName || "";

  const el = document.getElementById("activeModel");
  if (el) {
    el.innerText = modelId ? `Model: ${modelId}` : "Model: None";
  }

  const settingsSelect = document.getElementById("modelName");
  const footerSelect = document.getElementById("footerModelName");

  if (settingsSelect) settingsSelect.value = modelId;
  if (footerSelect) footerSelect.value = modelId;
}

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
// OPENROUTER MODEL CHECK (Manage Models → Check OpenRouter)
// =====================

let openrouterCatalog = null;

   // { checked_at, models: { id: { expires, reasoning, ... } } }

// auto: let the server fetch a fresh copy first when its copy is over a day old
async function loadOpenRouterCatalog(auto = false) {
  try {
    const data = await (await fetch(auto ? '/openrouter_catalog?auto=1' : '/openrouter_catalog')).json();
    openrouterCatalog = data.models ? data : null;
  } catch (e) {
    openrouterCatalog = null;
  }
}

// "Removed" or "Leaves Oct 31" for an OpenRouter model, from the last check
function openrouterAvailability(model) {
  if (!openrouterCatalog || (model.source || "openrouter") !== "openrouter") return null;
  const info = openrouterCatalog.models[model.id];
  if (!info) return { kind: "gone", text: "Removed from OpenRouter" };
  if (info.expires) return { kind: "leaving", text: `Leaves ${formatShortDate(info.expires)}` };
  return null;
}

async function checkOpenRouterModels(button) {
  button.disabled = true;
  const label = button.textContent;
  button.textContent = "Checking…";

  try {
    const res = await fetch('/check_openrouter_models', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Could not check OpenRouter");
      return;
    }
    await loadOpenRouterCatalog();
    showModelCheckSummary(data);
    renderModelDropdown();
    await renderModelsManager();
    updateReasoningNote();
  } finally {
    button.disabled = false;
    button.textContent = label;
  }
}

function showModelCheckSummary(data) {
  const box = document.getElementById("modelCheckSummary");
  box.innerHTML = "";
  box.classList.remove("hidden");

  const gone = data.models.filter(m => m.status === "gone");
  const leaving = data.models.filter(m => m.status === "leaving");
  const time = new Date(data.checked_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const line = (text, kind) => {
    const p = document.createElement("p");
    if (kind) p.className = `model-check-${kind}`;
    p.textContent = text;
    box.appendChild(p);
  };

  line(`Checked at ${time}: ${data.total.toLocaleString()} models on OpenRouter.`);
  if (gone.length) {
    line(`No longer on OpenRouter (${gone.length}): ${gone.map(m => m.name).join(", ")}.`, "gone");
  }
  if (leaving.length) {
    line(`Leaving soon: ${leaving.map(m => `${m.name} (${formatShortDate(m.expires)})`).join(", ")}.`, "leaving");
  }
  if (!gone.length && !leaving.length) {
    line("All your OpenRouter models are available.", "ok");
  }
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
