// ai.js: The AI side: setup panel, Generate, markers, generation settings, token meter, cost, and the request preview.
// Loaded in order by index.html; all files share one global scope.

let generationUndoStack = [];

const MAX_UNDO = 10;

let isGenerating = false;

let generationCursorPos = null;

let followGeneration = true;

let wakeLock = null;

let currentAbortController = null;

// TOKEN ESTIMATE
function estimateTokens(text) {
  return Math.floor(text.length / 4);
}

// OpenRouter's web plugin (Exa): one search, up to 10 results. Models with
// their own search pass through the provider's price instead.
const WEB_SEARCH_COST = 0.007;

function formatUSD(amount) {
  if (amount === 0) return "$0";
  if (amount < 0.0001) return "<$0.0001";
  if (amount < 0.01) return `$${Number(amount.toPrecision(2))}`;
  if (amount < 1) return `$${amount.toFixed(3)}`;
  return `$${amount.toFixed(2)}`;
}

// The reply limit the server will use: the setting, capped at the model's own maximum
function replyLimit() {
  const wanted = generationSettings().maxTokens;
  const maxOut = openrouterCatalog?.models[settings.modelName]?.max_out;
  return wanted && maxOut ? Math.min(wanted, maxOut) : wanted;
}

// What a request of this size may cost with the chosen model and settings.
// Prices come from the saved OpenRouter list (refreshed once a day).
function requestCost(tokens) {
  if (!settings.modelName) return null;
  const model = getModelById(settings.modelName);
  if ((model?.source || settings.modelSource) === "ollama") {
    return { short: "local", detail: "Ollama runs on this Mac, so it costs nothing." };
  }

  const info = openrouterCatalog?.models[settings.modelName];
  const price = info?.price;
  if (!price || price.in == null || price.out == null) {
    return {
      short: "price unknown",
      detail: "No price for this model yet. Check OpenRouter in Manage Models to get the latest list."
    };
  }

  const extras = generationSettings();
  const limit = replyLimit();
  const web = extras.webSearch ? WEB_SEARCH_COST : 0;
  const input = tokens * price.in;
  const perMillion = n => formatUSD(n * 1e6);
  const rates = `${perMillion(price.in)} in / ${perMillion(price.out)} out per million tokens`;
  const webNote = web ? ` Web search adds about ${formatUSD(web)} (more for models with their own search).` : "";

  if (price.in === 0 && price.out === 0) {
    return web
      ? { short: `≈ ${formatUSD(web)}`, detail: `Free model. Web search still costs about ${formatUSD(web)}.` }
      : { short: "free", detail: "Free model." };
  }
  if (limit) {
    const most = input + limit * price.out + web;
    return {
      short: `up to ${formatUSD(most)}`,
      detail: `Input ≈ ${formatUSD(input)}. Reply at most ${limit.toLocaleString()} tokens ≈ ${formatUSD(limit * price.out)}.${webNote} Most it can cost: ${formatUSD(most)}. Rates: ${rates}.`
    };
  }
  return {
    short: `${formatUSD(input + web)} + reply`,
    detail: `Input ≈ ${formatUSD(input)}. The reply costs ${perMillion(price.out)} per million tokens; set a Max reply length to cap it.${webNote} Rates: ${rates}.`
  };
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

// Matches the narrow-window rules in style.css
const NARROW = window.matchMedia("(max-width: 700px)");

NARROW.addEventListener("change", () => updateTokenMeter());

function isOpenFile(section, filename) {
  return currentFile.section === section && currentFile.filename === filename;
}

async function updateTokenMeter() {
  // Built the same way as the server's build_ai_request, so this count
  // matches the "What the AI will see" preview
  const read = (section, tree, set) => Promise.all(
    collectFilenames(tree || [])
      .filter(f => set.has(f) && (section === "system" || !isOpenFile(section, f)))
      .map(async f => ({
        title: findFileItemInTree(tree || [], f)?.title || f.replace(/\.(md|json)$/, ""),
        content: ((await ensureFileCached(section, f)) || "").trim()
      }))
  );
  const group = (tag, docs) => {
    const body = docs.filter(d => d.content)
      .map(d => `<document title="${d.title}">\n${d.content}\n</document>`)
      .join("\n\n");
    return body ? `<${tag}>\n${body}\n</${tag}>` : "";
  };
  const wrap = (open, close, text) => text.trim() ? `<${open}>\n${text.trim()}\n</${close}>` : "";

  const parts = {
    Rules: (await read("system", state.global?.system, selected.system))
      .map(d => d.content).filter(Boolean).join("\n\n"),
    Notes: group("background", await read("background", state.project?.background, selected.background)),
    Chapters: group("writing", await read("writing", state.project?.writing, selected.writing)),
    "This document": wrap(`current_document title="${titleInput.value}"`, "current_document", editor.value),
    Instruction: wrap("instruction", "instruction", promptBox.value)
  };

  const tokens = estimateTokens(Object.values(parts).filter(Boolean).join("\n\n"));
  const selectedModel = getModelById(settings.modelName);
  // Context sizes typed into Manage Models are stored as text
  const max = Number(selectedModel?.context) || 128000;

  let level = "ok";
  if (tokens / max > 0.9) level = "high";
  else if (tokens / max > 0.7) level = "warn";

  const short = n =>
    n >= 1000000 ? `${Math.round(n / 100000) / 10}M`
    : n >= 1000 ? `${Math.round(n / 1000)}k`
    : String(n);
  const meter = document.getElementById("tokenMeter");
  meter.dataset.level = level;
  const cost = requestCost(tokens);
  // Narrow windows get the short form; the tooltip keeps the details
  meter.innerText = (NARROW.matches ? `≈ ${short(tokens)} tokens` : `AI request ≈ ${tokens.toLocaleString()} tokens`) +
    (cost ? ` · ${cost.short}` : "");

  // Hover: where the tokens come from, and how much of the model's limit they use
  const breakdown = Object.entries(parts)
    .filter(([, text]) => text)
    .map(([name, text]) => `${name} ${estimateTokens(text).toLocaleString()}`)
    .join(" · ") || "Nothing to send yet";
  const used = (tokens / max) * 100;
  meter.dataset.tip =
    `${breakdown} — ${used < 0.1 ? "<0.1" : used.toFixed(used < 10 ? 1 : 0)}% of this model's ${short(max)} limit.` +
    (cost ? ` ${cost.detail}` : "") + " Click to see the exact text.";
}

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

const DEFAULT_MARKER_BEFORE = "********\nNew generated content below\n********";

const DEFAULT_MARKER_AFTER = "********\nEnd of generated content above\n********";

// Marker text from Settings; empty strings when markers are turned off
function getOutputMarkers() {
  const appState = state.app_state || {};
  if (appState.showOutputMarkers === false) return { before: "", after: "" };
  return {
    before: appState.outputMarkerBefore ?? DEFAULT_MARKER_BEFORE,
    after: appState.outputMarkerAfter ?? DEFAULT_MARKER_AFTER
  };
}

// Text placed before and after the AI output, by where the cursor was.
// Markers sit in their own paragraph; with markers off, only the paragraph breaks remain.
function getOutputWrappers(mode) {
  const { before, after } = getOutputMarkers();
  const open = before ? `${before}\n\n` : "";
  const close = after ? `\n\n${after}` : "";

  if (mode === "empty") return { before: "", after: "" };
  if (mode === "start") return { before: "", after: `${close}\n\n` };
  if (mode === "end") return { before: `\n\n${open}`, after: "" };
  return { before: `\n\n${open}`, after: `${close}\n\n` };
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

// What goes to the AI, in sidebar order. The open document is sent from the
// editor (unsaved text included), so it is left out of its own section's list.
function aiRequestParts() {
  const picked = (tree, set, section) => collectFilenames(tree || [])
    .filter(f => set.has(f))
    .filter(f => !(currentFile.section === section && currentFile.filename === f));

  return {
    // Rules stay rules, even while one is open in the editor
    system: collectFilenames(state.global.system || []).filter(f => selected.system.has(f)),
    background: picked(state.project.background, selected.background, "background"),
    writing: picked(state.project.writing, selected.writing, "writing"),
    current: { title: currentFile.filename ? titleInput.value : "", content: editor.value },
    prompt: promptBox.value
  };
}

async function generate() {
  if (!settings.modelName) {
    showToast("Please select a model in Settings.", "info");
    return;
  }

  isGenerating = true;
  followGeneration = true;
  generationCursorPos = editor.selectionStart;
  currentAbortController = new AbortController();
  document.getElementById("stopGenerateBtn").disabled = false;
  document.getElementById("loadingIndicator").style.display = "block";
  await requestWakeLock();

  const button = document.getElementById("generateBtn");
  button.classList.add("is-busy");
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
    const payload = {
      ...aiRequestParts(),
      settings: { ...settings, ...generationSettings() }
    };

    const res = await fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: currentAbortController.signal
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      showToast(errData.error || `Generation failed (${res.status})`);
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
          const wrap = getOutputWrappers(mode);
          insertAtGenerationPoint(wrap.before);
          // Closing text goes after the cursor, so the AI text streams in between
          editor.value =
            editor.value.substring(0, generationCursorPos) +
            wrap.after +
            editor.value.substring(generationCursorPos);
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
    button.classList.remove("is-busy");
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
    showToast("Nothing to undo.", "info");
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

let originalPromptContent = "";

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

// The writing area never gets narrower than this (about 50 characters a line);
// below it, the AI setup panel tucks itself away
const EDITOR_MIN_WIDTH = 440;

// =====================
// GENERATION SETTINGS (temperature, reasoning; in the AI setup panel)
// =====================

const DEFAULT_TEMPERATURE = 0.7;

let generationSaveTimer = null;

// Sent with every generation; "default" reasoning sends nothing, so each model uses its own
function generationSettings() {
  const appState = state.app_state || {};
  const temperature = appState.temperature ?? DEFAULT_TEMPERATURE;
  const reasoning = appState.reasoningEffort || "default";
  return {
    temperature,
    reasoning: reasoning === "default" ? null : reasoning,
    webSearch: Boolean(appState.webSearch),
    webMaxResults: appState.webMaxResults ?? 5,
    maxTokens: appState.maxTokens || null
  };
}

function showTemperature(value) {
  document.getElementById("temperatureValue").textContent = Number(value).toFixed(1);
}

function saveGenerationSettings() {
  const temperature = Number(document.getElementById("temperatureInput").value);
  const reasoningEffort = document.getElementById("reasoningSelect").value;
  const webSearch = document.getElementById("webSearchToggle").checked;
  const maxField = document.getElementById("webMaxResults");
  const webMaxResults = Math.min(10, Math.max(1, Math.round(Number(maxField.value) || 5)));
  document.getElementById("aiGeneration").classList.toggle("web-off", !webSearch);

  const maxTokensValue = Math.round(Number(document.getElementById("maxTokensInput").value));
  const maxTokens = maxTokensValue >= 1 ? maxTokensValue : null;

  const values = { temperature, reasoningEffort, webSearch, webMaxResults, maxTokens };
  Object.assign(state.app_state, values);
  clearTimeout(generationSaveTimer);
  generationSaveTimer = setTimeout(() => fetch('/save_app_state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values)
  }), 300);
  updateTokenMeter();
}

function resetTemperature() {
  document.getElementById("temperatureInput").value = DEFAULT_TEMPERATURE;
  showTemperature(DEFAULT_TEMPERATURE);
  saveGenerationSettings();
}

// What the selected model does with the Reasoning setting
function updateReasoningNote() {
  const note = document.getElementById("reasoningNote");
  if (!note) return;
  const model = getModelById(settings.modelName);

  if (model?.source === "ollama") {
    note.textContent = "Ollama: Off turns thinking off; any level turns it on. Models that cannot think may refuse.";
    return;
  }
  const info = model && openrouterCatalog?.models[model.id];
  if (model && openrouterCatalog && !info) {
    note.textContent = "This model is no longer on OpenRouter. Pick another in the model list.";
    return;
  }
  if (!info) {
    note.textContent = openrouterCatalog
      ? "Models that cannot reason ignore this."
      : "Models that cannot reason ignore this. Check OpenRouter in Manage Models to see what each model supports.";
    return;
  }
  const r = info.reasoning;
  if (!r || (!r.supported_efforts && !r.mandatory)) {
    note.textContent = "This model does not reason, so this setting is ignored.";
  } else if (r.mandatory) {
    note.textContent = `This model always reasons${r.default_effort ? ` (default: ${r.default_effort})` : ""}, so Off has no effect.`;
  } else {
    note.textContent = `This model supports: ${r.supported_efforts.join(", ")}${r.default_effort ? ` (default: ${r.default_effort})` : ""}.`;
  }
}

function initGenerationPanel() {
  const slider = document.getElementById("temperatureInput");
  const reasoning = document.getElementById("reasoningSelect");
  const details = document.getElementById("aiGeneration");

  slider.value = state.app_state.temperature ?? DEFAULT_TEMPERATURE;
  reasoning.value = state.app_state.reasoningEffort || "default";
  showTemperature(slider.value);
  details.open = readPref("sjb_generation_open", true);

  slider.addEventListener("input", () => {
    showTemperature(slider.value);
    saveGenerationSettings();
  });
  reasoning.addEventListener("change", saveGenerationSettings);

  const web = document.getElementById("webSearchToggle");
  const maxField = document.getElementById("webMaxResults");
  web.checked = Boolean(state.app_state.webSearch);
  maxField.value = state.app_state.webMaxResults ?? 5;
  details.classList.toggle("web-off", !web.checked);
  web.addEventListener("change", saveGenerationSettings);
  maxField.addEventListener("input", saveGenerationSettings);
  // Show the corrected number once the writer leaves the field
  maxField.addEventListener("change", () => {
    maxField.value = state.app_state.webMaxResults;
  });

  const maxTokensField = document.getElementById("maxTokensInput");
  maxTokensField.value = state.app_state.maxTokens || "";
  maxTokensField.addEventListener("input", saveGenerationSettings);
  maxTokensField.addEventListener("change", () => {
    maxTokensField.value = state.app_state.maxTokens || "";
  });

  details.addEventListener("toggle", () => writePref("sjb_generation_open", details.open));
}

// The selected model's own reply limit, when the price list knows it
function updateMaxTokensNote() {
  const note = document.getElementById("maxTokensNote");
  if (!note) return;
  const model = getModelById(settings.modelName);
  const maxOut = model?.source !== "ollama" && openrouterCatalog?.models[model?.id]?.max_out;
  note.textContent =
    "In tokens (1,000 is about 750 words). Reasoning counts too. Leave it empty for no limit." +
    (maxOut ? ` This model allows up to ${maxOut.toLocaleString()}.` : "");
}

// =====================
// AI OUTPUT MARKERS (in the AI setup panel; saved as you type)
// =====================

let markersSaveTimer = null;

function markerFields() {
  return {
    toggle: document.getElementById("showOutputMarkers"),
    before: document.getElementById("outputMarkerBefore"),
    after: document.getElementById("outputMarkerAfter")
  };
}

function showMarkerState() {
  const { toggle } = markerFields();
  document.getElementById("aiMarkers").classList.toggle("is-off", !toggle.checked);
}

async function saveMarkers() {
  const { toggle, before, after } = markerFields();
  const markers = {
    showOutputMarkers: toggle.checked,
    outputMarkerBefore: before.value,
    outputMarkerAfter: after.value
  };
  Object.assign(state.app_state, markers);
  await fetch('/save_app_state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(markers)
  });
}

function initMarkersPanel() {
  const { toggle, before, after } = markerFields();
  const details = document.getElementById("aiMarkers");

  toggle.checked = state.app_state.showOutputMarkers !== false;
  before.value = state.app_state.outputMarkerBefore ?? DEFAULT_MARKER_BEFORE;
  after.value = state.app_state.outputMarkerAfter ?? DEFAULT_MARKER_AFTER;
  details.open = readPref("sjb_markers_open", false);
  showMarkerState();

  toggle.addEventListener("change", () => {
    showMarkerState();
    saveMarkers();
  });

  [before, after].forEach(field => field.addEventListener("input", () => {
    clearTimeout(markersSaveTimer);
    markersSaveTimer = setTimeout(saveMarkers, 400);
  }));

  details.addEventListener("toggle", () => writePref("sjb_markers_open", details.open));
}

// =====================
// AI ON/OFF (Settings → AI features): off = a plain document editor
// =====================

function aiEnabled() {
  return state.app_state?.aiEnabled !== false;
}

function applyAiEnabled() {
  document.body.classList.toggle("ai-off", !aiEnabled());
  fitToolbars();
}

// =====================
// AI SETUP PANEL (System + Prompts, on the right)
// =====================

// An automatic hide (no room) does not change the writer's saved preference
function setAiPanelOpen(open, { auto = false } = {}) {
  document.body.classList.toggle("ai-panel-open", open);
  document.getElementById("aiSummaryChip").setAttribute("aria-expanded", String(open));
  document.getElementById("aiPanelToggle").setAttribute("aria-pressed", String(open));
  if (!auto) {
    writePref("sjb_ai_panel_open", open);
    aiPanelAutoHidden = false;
  }
}

function editorWidth() {
  return document.querySelector(".right").getBoundingClientRect().width;
}

function toggleAiPanel() {
  if (!aiEnabled()) return;
  const opening = !document.body.classList.contains("ai-panel-open");
  if (!opening) {
    setAiPanelOpen(false);
    return;
  }

  // Open, then check the editor still has its minimum width
  setAiPanelOpen(true, { auto: true });
  if (editorWidth() < EDITOR_MIN_WIDTH) {
    setAiPanelOpen(false, { auto: true });
    showToast("Not enough room for AI setup. Widen the window or hide the sidebar (⌘\\).", "info");
    return;
  }
  setAiPanelOpen(true);
}

let aiPanelAutoHidden = false;

let aiPanelLastWidth = 320;

let editorRoomNoticeShown = false;

// Hide the AI panel when the editor gets too narrow; bring it back when there is room
function keepEditorRoom() {
  const open = document.body.classList.contains("ai-panel-open");
  const width = editorWidth();

  if (open && width < EDITOR_MIN_WIDTH) {
    aiPanelLastWidth = document.querySelector(".ai-panel").getBoundingClientRect().width || aiPanelLastWidth;
    setAiPanelOpen(false, { auto: true });
    aiPanelAutoHidden = true;
    if (appReady && !editorRoomNoticeShown) {
      editorRoomNoticeShown = true;
      showToast("AI setup is tucked away to give the editor room. It comes back when the window is wider.", "info");
    }
  } else if (!open && aiPanelAutoHidden && width - aiPanelLastWidth >= EDITOR_MIN_WIDTH) {
    setAiPanelOpen(true, { auto: true });
    aiPanelAutoHidden = false;
  }
}

// "2 rules · Prompt: EPBM 3": what the AI will get, even with the panel closed
function updateAiSummary() {
  const text = document.getElementById("aiSummaryText");
  if (!text || !state.global) return;

  const rules = collectFilenames(state.global.system || [])
    .filter(f => selected.system.has(f)).length;

  let prompt = "No prompt";
  if (selected.prompt) {
    const item = findFileItemInTree(state.global.prompts || [], selected.prompt);
    prompt = `Prompt: ${item?.title || selected.prompt.replace(/\.(md|json)$/, "")}`;
  }

  const rulesText = rules === 0 ? "No rules" : rules === 1 ? "1 rule" : `${rules} rules`;
  text.textContent = `${rulesText} · ${prompt}`;
  document.getElementById("aiSummaryChip")
    .classList.toggle("is-active", rules > 0 || Boolean(selected.prompt));
  fitToolbars();
}

// =====================
// AI REQUEST PREVIEW: the exact text Generate sends
// =====================

let requestPreviewText = "";

async function openRequestPreview() {
  const { data } = await postJSON('/preview_request', aiRequestParts());
  const system = data.system || "";
  const user = data.user || "";

  const systemBox = document.getElementById("requestSystem");
  systemBox.textContent = system || "No System files are ticked, so no rules message is sent.";
  systemBox.classList.toggle("is-empty", !system);

  const userBox = document.getElementById("requestUser");
  userBox.textContent = user || "Nothing to send yet. Tick some files or type an instruction.";
  userBox.classList.toggle("is-empty", !user);

  const extras = generationSettings();
  // Counted like the status bar, so both show the same number
  const tokens = estimateTokens([system, user].filter(Boolean).join("\n\n"));
  const cost = requestCost(tokens);
  document.getElementById("requestSummary").textContent = [
    settings.modelName ? `Model: ${settings.modelName}` : "No model chosen",
    `about ${tokens.toLocaleString()} tokens`,
    extras.webSearch && settings.modelSource !== "ollama"
      ? `web search adds up to ${extras.webMaxResults} results`
      : "",
    replyLimit() ? `reply limit ${replyLimit().toLocaleString()} tokens` : ""
  ].filter(Boolean).join(" · ");
  document.getElementById("requestCost").textContent = cost ? `Cost: ${cost.detail}` : "";

  requestPreviewText = (system ? `[System]\n${system}\n\n[User]\n` : "") + user;
  document.getElementById("requestModal").classList.remove("hidden");
}

async function copyRequestPreview(button) {
  try {
    await navigator.clipboard.writeText(requestPreviewText);
    showToast("Copied the AI request.", "info");
  } catch {
    showToast("Could not copy. Select the text and copy it by hand.");
  }
}

function closeRequestPreview() {
  document.getElementById("requestModal").classList.add("hidden");
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
