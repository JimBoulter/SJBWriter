// core.js: Shared state and small helpers that every other file uses.
// Loaded in order by index.html; all files share one global scope.

let fileCache = {};

const editor = document.getElementById("editor");

const promptBox = document.getElementById("promptBox");

const titleInput = document.getElementById("titleInput");

let currentFile = {
  section: null,
  filename: null
};

function getFilename(item) {
  return typeof item === "string" ? item : item.filename;
}

// Inline icon from the sprite in _icons.html
function iconSvg(name) {
  return `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}

// Small muted icon for a sidebar row: documents are pages, AI setup files are memos
function treeIcon(name) {
  const span = document.createElement("span");
  span.className = "tree-icon";
  span.innerHTML = iconSvg(name);
  return span;
}

function documentIconName(sectionName) {
  return sectionName === "system" || sectionName === "prompts" ? "sticky-note" : "file-text";
}

// =====================
// TOASTS: non-blocking messages in place of alert()
// =====================

function showToast(message, kind = "error") {
  let stack = document.getElementById("toastStack");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "toastStack";
    stack.className = "toast-stack";
    stack.setAttribute("aria-live", "polite");
    document.body.appendChild(stack);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${kind}`;
  toast.setAttribute("role", kind === "error" ? "alert" : "status");
  toast.textContent = message ? String(message) : "Something went wrong.";

  const dismiss = () => {
    toast.classList.add("toast-leaving");
    setTimeout(() => toast.remove(), 200);
  };
  toast.onclick = dismiss;

  stack.appendChild(toast);
  setTimeout(dismiss, kind === "error" ? 7000 : 3500);
}

let selected = {
  system: new Set(),
  background: new Set(),
  writing: new Set(),
  prompt: null
};

let state = {
  global: {},
  project: {}
};

let projects = [];

let currentProject = "default";

let recentProjects = [];

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

function timeAgo(time) {
  const seconds = Math.round((Date.now() - time) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  return new Date(time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// With no file open, typing in the editor would go nowhere: show the empty state instead.
// Waits for startup, so it does not flash while the last file reopens.
let appReady = false;

// Per-viewer sidebar preferences live in localStorage
function readPref(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch (e) {
    return fallback;
  }
}

function writePref(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {}
}

function formatShortDate(isoDate) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString([], { month: "short", day: "numeric" });
}

// =====================
// DUPLICATE (document, folder, project)
// =====================

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { ok: res.ok, data: await res.json() };
}

let settings = {
  modelSource: "openrouter",
  modelName: "",
};

let modelRegistry = {};
