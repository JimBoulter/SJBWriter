// editor.js: The open document: open, save, formatting, preview, zen, status bar, toolbars, outside changes.
// Loaded in order by index.html; all files share one global scope.

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

editor.addEventListener("input", () => {
  updateTokenMeter();
  updateWordCount();
});

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
    lastSavedAt = Date.now();
    if (data.changedOutside) {
      showToast("This document was also changed in another program. That version is kept in Version history.", "info");
    }
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

// Words inside quotation marks ("…" or “…”). A quote still open at the end of a
// paragraph counts to that paragraph's end: the usual way speech runs on.
function countDialogueWords(text) {
  let words = 0;
  for (const paragraph of text.split("\n")) {
    let inQuote = false;
    let spoken = "";
    for (const ch of paragraph) {
      if (!inQuote && (ch === "\u201C" || ch === '"')) {
        inQuote = true;
      } else if (inQuote && (ch === "\u201D" || ch === '"')) {
        inQuote = false;
        spoken += " ";
      } else if (inQuote) {
        spoken += ch;
      }
    }
    const said = spoken.trim();
    if (said) words += said.split(/\s+/).length;
  }
  return words;
}

function updateWordCount() {
  const text = editor.value.trim();
  const count = text === "" ? 0 : text.split(/\s+/).length;
  document.getElementById("wordCount").textContent = `${count.toLocaleString()} words`;

  const dialogue = count === 0 ? 0 : countDialogueWords(text);
  const dialogueEl = document.getElementById("dialoguePercent");
  dialogueEl.textContent = count === 0 ? "" : `${Math.round((dialogue / count) * 100)}% dialogue`;
  dialogueEl.dataset.tip = `${dialogue.toLocaleString()} of ${count.toLocaleString()} words are in quotes`;
  document.getElementById("readingTime").textContent =
    count === 0 ? "" : `${Math.max(1, Math.round(count / 230))} min read`;
  schedulePreviewRender();
  updateStatusBar();
}

// =====================
// SIDEBAR, ZEN MODE, STATUS BAR
// =====================

let lastSavedAt = null;

function setZen(on) {
  document.body.classList.toggle("zen", on);
  document.getElementById("zenToggle").setAttribute("aria-pressed", String(on));
  if (!on && !previewOn) editor.focus();
}

function toggleZen() {
  setZen(!document.body.classList.contains("zen"));
}

function updateEmptyState() {
  if (!appReady) return;
  document.body.classList.toggle("no-document", !currentFile.filename);
}

function updateStatusBar() {
  updateEmptyState();
  const project = document.getElementById("currentProjectLabel")
    .textContent.trim();
  const file = currentFile.filename ? (titleInput.value || "Untitled") : "";
  document.getElementById("statusLocation").textContent =
    file ? `${project} › ${file}` : project;

  const saveStatus = document.getElementById("saveStatus");
  if (!currentFile.filename) {
    saveStatus.textContent = "";
  } else if (isDirty) {
    saveStatus.textContent = "Unsaved";
    saveStatus.dataset.state = "dirty";
  } else {
    saveStatus.textContent = lastSavedAt ? `Saved · ${timeAgo(lastSavedAt)}` : "Saved";
    saveStatus.dataset.state = "saved";
  }
}

// Keeps "Saved · 2 min ago" current and catches title edits
setInterval(updateStatusBar, 2000);

// =====================
// MARKDOWN PREVIEW
// =====================

const preview = document.getElementById("preview");

const IMAGE_URL = /\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i;

let previewOn = false;

let previewFrame = null;

// One line, one paragraph: the same rule as the Word export. Markdown joins
// lines that have no empty line between them into one paragraph, so the
// preview adds that empty line. Code blocks, and lines inside one list, quote,
// or table, stay together.
function paragraphPerLine(text) {
  const kind = line =>
    /^\s*([-*+]|\d+[.)])\s/.test(line) ? "list"
    : /^\s*>/.test(line) ? "quote"
    : /^\s*\|/.test(line) ? "table"
    : "text";
  const fence = line => /^\s*(```|~~~)/.test(line);
  const lines = text.split("\n");
  const out = [];
  let inCode = false;

  lines.forEach((line, i) => {
    out.push(line);
    if (fence(line)) inCode = !inCode;
    const next = lines[i + 1];
    if (inCode || next === undefined || !line.trim() || !next.trim()) return;
    const a = kind(line), b = kind(next);
    if (a === b && a !== "text") return;            // the next item of the same list, quote, or table
    if (a === "list" && /^\s+\S/.test(next)) return;  // an indented line that continues a list item
    out.push("");
  });
  return out.join("\n");
}

function renderPreview() {
  previewFrame = null;

  const html = marked.parse(paragraphPerLine(editor.value), { gfm: true, breaks: true });
  preview.innerHTML = DOMPurify.sanitize(html);

  preview.querySelectorAll("a[href]").forEach(a => {
    const href = a.getAttribute("href");

    // A plain link straight to an image file shows the image
    if (IMAGE_URL.test(href) && !a.querySelector("img")) {
      const img = document.createElement("img");
      img.src = href;
      img.alt = a.textContent;
      a.textContent = "";
      a.appendChild(img);
    }

    // Open links in a new tab so the app never navigates away
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  });

  // Match the editor's chosen font
  preview.style.fontFamily = editor.style.fontFamily;
  preview.style.fontSize = editor.style.fontSize;
}

// Re-render at most once per frame (generation streams many small chunks)
function schedulePreviewRender() {
  if (!previewOn || previewFrame) return;
  previewFrame = requestAnimationFrame(renderPreview);
}

function setPreview(on) {
  previewOn = on;
  if (on) renderPreview();

  editor.classList.toggle("hidden", on);
  preview.classList.toggle("hidden", !on);
  document.getElementById("previewToggle").setAttribute("aria-pressed", String(on));
  document.querySelectorAll(".formatting .md-tool").forEach(btn => {
    btn.disabled = on;
  });

  try {
    localStorage.setItem("sjb_preview", on ? "1" : "0");
  } catch (e) {}

  if (!on) editor.focus();
}

function togglePreview() {
  setPreview(!previewOn);
}

preview.addEventListener("dblclick", () => setPreview(false));

// =====================
// CLOSE THE DOCUMENT (title-row × and the app logo)
// =====================

// Saves first, then shows the empty state; remembered per project across reloads
async function closeDocument() {
  if (!currentFile.filename) return;
  if (isGenerating) {
    showToast("Please wait for generation to finish.", "info");
    return;
  }
  if (isDirty) await saveCurrentFile();

  currentFile = {
    section: null,
    filename: null
  };
  titleInput.value = "";
  editor.value = "";
  isDirty = false;
  lastSavedAt = null;
  writePref(`sjb_doc_closed_${currentProject}`, true);

  updateWordCount();
  updateTokenMeter();
  await renderLists();
}

// =====================
// TOOLBAR OVERFLOW: buttons that do not fit move into a "⋯" menu
// =====================

// Least important first; Preview and Generate always stay
const OVERFLOW_GROUPS = {
  formatting: {
    bar: ".formatting",
    hideOrder: ['[aria-label="Bullet list"]', '[aria-label="Heading"]', '[aria-label="Italic"]', '[aria-label="Bold"]', "#zenToggle"]
  },
  actions: {
    bar: ".controls",
    hideOrder: ['[aria-label="Clear instruction"]', '[aria-label="Save (⌘S)"]', "#previewRequestBtn", "#undoGenerateBtn", "#stopGenerateBtn"]
  }
};

function overflowItems(name) {
  const bar = document.querySelector(OVERFLOW_GROUPS[name].bar);
  return OVERFLOW_GROUPS[name].hideOrder.map(sel => bar.querySelector(sel)).filter(Boolean);
}

function fitToolbar(name) {
  const bar = document.querySelector(OVERFLOW_GROUPS[name].bar);
  const more = bar.querySelector(".toolbar-more");
  const fits = () => bar.scrollWidth <= bar.clientWidth + 1;

  overflowItems(name).forEach(el => el.classList.remove("is-overflowed"));
  more.classList.add("hidden");
  if (fits()) return;

  more.classList.remove("hidden");
  for (const el of overflowItems(name)) {
    el.classList.add("is-overflowed");
    if (fits()) break;
  }
}

function fitToolbars() {
  fitToolbar("formatting");
  fitToolbar("actions");
}

function openOverflowMenu(button, name) {
  document.querySelectorAll(".file-menu").forEach(m => m.remove());

  const menu = document.createElement("div");
  menu.className = "file-menu overflow-menu";

  // Same left-to-right order as on the toolbar
  overflowItems(name)
    .filter(el => el.classList.contains("is-overflowed"))
    .reverse()
    .forEach(el => {
      const item = document.createElement("div");
      item.className = "overflow-item";
      if (el.disabled) item.classList.add("is-disabled");
      item.innerHTML = el.innerHTML;
      item.appendChild(document.createTextNode(el.getAttribute("aria-label")));
      item.onclick = () => {
        if (!el.disabled) el.click();
        menu.remove();
      };
      menu.appendChild(item);
    });

  document.body.appendChild(menu);

  // Below the toolbar button, or above it when the button sits low (AI dock)
  const rect = button.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  const above = rect.top > window.innerHeight / 2;
  menu.style.top = `${above ? rect.top - menuRect.height - 4 : rect.bottom + 4}px`;
  menu.style.left = `${Math.max(8, rect.right - menuRect.width)}px`;

  setTimeout(() => {
    document.addEventListener("click", () => menu.remove(), { once: true });
  }, 0);
}

// =====================
// OUTSIDE CHANGES: documents are plain .md files, so another program
// (Obsidian) may add, remove, or edit them while the app is open
// =====================

let syncingWithDisk = false;

async function syncWithDisk() {
  if (!appReady || isGenerating || syncingWithDisk) return;
  syncingWithDisk = true;
  try {
    const data = await (await fetch('/load')).json();
    state.global = { ...state.global, prompts: data.global.prompts, system: data.global.system };
    state.project = { ...state.project, background: data.project.background, writing: data.project.writing };
    await renderLists();

    if (!currentFile.filename) return;
    const { data: status } = await postJSON('/file_status', {
      section: currentFile.section,
      filename: currentFile.filename
    });

    if (!status.exists) {
      showToast("This document was moved or deleted in another program.", "info");
    } else if (status.changedOutside && isDirty) {
      showToast("This document changed in another program. Your next save keeps that version in Version history.", "info");
    } else if (status.changedOutside) {
      const { data: doc } = await postJSON('/load_file', {
        section: currentFile.section,
        filename: currentFile.filename
      });
      fileCache[`${currentFile.section}/${currentFile.filename}`] = doc.content || "";
      titleInput.value = doc.title || "";
      editor.value = doc.content || "";
      schedulePreviewRender();
      updateWordCount();
      updateTokenMeter();
      showToast("Reloaded: this document changed in another program.", "info");
    }
  } catch (e) {
    console.error("Could not check for outside changes", e);
  } finally {
    syncingWithDisk = false;
  }
}

window.addEventListener("focus", syncWithDisk);

async function openFile(section, filename) {

  if (isGenerating) {
    showToast("Please wait for generation to finish before switching files.", "info");
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
    showToast(data.error || "Failed to load file");
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
  lastSavedAt = null;
  writePref(`sjb_doc_closed_${currentProject}`, false);
  saveSelections();
  await renderLists();
  await revealActiveFile();
  updateTokenMeter();
  updateWordCount();
  // A different document: recount the search, without jumping to a match
  if (findBarOpen()) {
    findState.origin = 0;
    updateFind({ select: false });
  }
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


// =====================
// FIND AND REPLACE in the open document (⌘F, ⌘⇧H)
// =====================

const findState = { matchCase: false, wholeWord: false, matches: [], current: -1, origin: 0 };
const findBar = document.getElementById("findBar");
const findInput = document.getElementById("findInput");
const replaceInput = document.getElementById("replaceInput");

function findBarOpen() {
  return !findBar.classList.contains("hidden");
}

// The search as a pattern: the text taken literally; "whole word" means no
// letter or digit right before or after it (in any language)
function findPattern(query) {
  if (!query) return null;
  const literal = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const body = findState.wholeWord ? `(?<![\\p{L}\\p{N}_])${literal}(?![\\p{L}\\p{N}_])` : literal;
  return new RegExp(body, findState.matchCase ? "gu" : "giu");
}

function updateFind({ select = true, from = findState.origin } = {}) {
  const pattern = findPattern(findInput.value);
  findState.matches = pattern ? [...editor.value.matchAll(pattern)].map(m => [m.index, m.index + m[0].length]) : [];
  const n = findState.matches.length;
  if (!n) {
    findState.current = -1;
  } else {
    const next = findState.matches.findIndex(([start]) => start >= from);
    findState.current = next === -1 ? 0 : next;
  }
  document.getElementById("findCount").textContent =
    !findInput.value ? "" : n ? `${findState.current + 1} of ${n}` : "No matches";
  findBar.classList.toggle("no-match", Boolean(findInput.value) && !n);
  if (select && n) showMatch();
  else renderFindHighlights();
}

// Select the current match and scroll it into view, keeping the typing focus where it is
function showMatch() {
  const [start, end] = findState.matches[findState.current];
  editor.setSelectionRange(start, end);
  editor.scrollTop = Math.max(0, caretOffset(start) - editor.clientHeight / 3);
  renderFindHighlights();
}

// A text box cannot color words, and hides its selection while the cursor is
// in the find field. So a see-through copy of the text lies exactly on top of
// the editor: its letters are invisible, only the marks behind the matches show.
const findHighlights = document.createElement("div");
findHighlights.className = "find-highlights hidden";
findHighlights.setAttribute("aria-hidden", "true");
editor.insertAdjacentElement("afterend", findHighlights);

function renderFindHighlights() {
  const show = findBarOpen() && findState.matches.length > 0 && !previewOn;
  findHighlights.classList.toggle("hidden", !show);
  if (!show) return;

  const style = getComputedStyle(editor);
  for (const prop of ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing",
                      "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "tabSize"]) {
    findHighlights.style[prop] = style[prop];
  }
  Object.assign(findHighlights.style, {
    top: `${editor.offsetTop}px`, left: `${editor.offsetLeft}px`,
    width: `${editor.clientWidth}px`, height: `${editor.clientHeight}px`
  });

  const text = editor.value;
  const parts = [];
  let at = 0;
  findState.matches.forEach(([start, end], i) => {
    parts.push(document.createTextNode(text.slice(at, start)));
    const mark = document.createElement("mark");
    mark.className = i === findState.current ? "find-hit current" : "find-hit";
    mark.textContent = text.slice(start, end);
    parts.push(mark);
    at = end;
  });
  // A trailing space keeps the last line's height the same as in the editor
  parts.push(document.createTextNode(text.slice(at) + " "));
  findHighlights.replaceChildren(...parts);
  findHighlights.scrollTop = editor.scrollTop;
}

editor.addEventListener("scroll", () => {
  if (!findHighlights.classList.contains("hidden")) findHighlights.scrollTop = editor.scrollTop;
});
new ResizeObserver(() => renderFindHighlights()).observe(editor);

// How far down the editor a position in the text sits, measured on a hidden copy
let caretMirror = null;
function caretOffset(position) {
  if (!caretMirror) {
    caretMirror = document.createElement("div");
    caretMirror.setAttribute("aria-hidden", "true");
    document.body.appendChild(caretMirror);
  }
  const style = getComputedStyle(editor);
  for (const prop of ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing",
                      "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "boxSizing", "tabSize"]) {
    caretMirror.style[prop] = style[prop];
  }
  Object.assign(caretMirror.style, {
    position: "absolute", visibility: "hidden", top: "0", left: "-9999px",
    width: `${editor.clientWidth}px`, whiteSpace: "pre-wrap", overflowWrap: "break-word"
  });
  caretMirror.textContent = editor.value.slice(0, position);
  const marker = document.createElement("span");
  marker.textContent = "\u200b";
  caretMirror.appendChild(marker);
  return marker.offsetTop;
}

function openFindBar(withReplace = false) {
  if (!currentFile.filename) return;
  if (previewOn) setPreview(false);
  findBar.classList.remove("hidden");
  setReplaceRow(withReplace || !document.getElementById("replaceRow").classList.contains("hidden"));
  // Selected text (one short line) becomes the search
  const chosen = editor.value.slice(editor.selectionStart, editor.selectionEnd);
  if (chosen && !chosen.includes("\n") && chosen.length < 100) findInput.value = chosen;
  findState.origin = editor.selectionStart;
  (withReplace && findInput.value ? replaceInput : findInput).focus();
  findInput.select();
  updateFind();
}

function closeFindBar() {
  findBar.classList.add("hidden");
  renderFindHighlights();
  editor.focus();
}

function setReplaceRow(show) {
  document.getElementById("replaceRow").classList.toggle("hidden", !show);
  const toggle = document.getElementById("replaceToggle");
  toggle.setAttribute("aria-expanded", String(show));
  toggle.querySelector("use").setAttribute("href", show ? "#i-chevron-down" : "#i-chevron-right");
  fitToolbars();
}

function findStep(direction) {
  if (!findState.matches.length) return updateFind();
  const n = findState.matches.length;
  findState.current = (findState.current + direction + n) % n;
  findState.origin = findState.matches[findState.current][0];
  document.getElementById("findCount").textContent = `${findState.current + 1} of ${n}`;
  showMatch();
}


function toggleFindOption(option) {
  findState[option] = !findState[option];
  document.getElementById(option === "matchCase" ? "findCase" : "findWord")
    .setAttribute("aria-pressed", String(findState[option]));
  updateFind();
}

// Typing through the editor keeps ⌘Z working: one undo step per replace
function typeOver(start, end, text) {
  const scroll = editor.scrollTop;
  editor.focus();
  editor.setSelectionRange(start, end);
  if (!document.execCommand(text ? "insertText" : "delete", false, text)) {
    editor.setRangeText(text, start, end, "end");
    editor.dispatchEvent(new Event("input", { bubbles: true }));
  }
  editor.scrollTop = scroll;
}

function replaceCurrent() {
  if (findState.current < 0) return updateFind();
  const [start, end] = findState.matches[findState.current];
  // Replace only what is selected and still matches; otherwise just show the match
  if (editor.selectionStart !== start || editor.selectionEnd !== end) return showMatch();
  typeOver(start, end, replaceInput.value);
  findState.origin = start + replaceInput.value.length;
  updateFind();
  replaceInput.focus();
}

function replaceAllInDocument() {
  const pattern = findPattern(findInput.value);
  const count = pattern ? [...editor.value.matchAll(pattern)].length : 0;
  if (!count) return;
  const replacement = replaceInput.value;
  typeOver(0, editor.value.length, editor.value.replace(pattern, () => replacement));
  findState.origin = 0;
  updateFind({ select: false });
  showToast(`Replaced ${count} match${count === 1 ? "" : "es"}. ⌘Z undoes it.`, "info");
  replaceInput.focus();
}

findInput.addEventListener("input", () => updateFind());
findInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    findStep(e.shiftKey ? -1 : 1);
  }
});
replaceInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    if (e.metaKey || e.ctrlKey) replaceAllInDocument();
    else replaceCurrent();
  }
});
// Edits in the document keep the count right
editor.addEventListener("input", () => {
  if (findBarOpen()) updateFind({ select: false, from: editor.selectionStart });
});

