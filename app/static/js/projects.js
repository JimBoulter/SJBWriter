// projects.js: Projects: the project menu and list, loading a project, Trash, and Export.
// Loaded in order by index.html; all files share one global scope.

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

    const name = await askText("New project", "", { placeholder: "Project name", okLabel: "Create" });

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

      showToast(data.error || "Failed to create project");
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

    const newName = await askText("Rename project", currentName, { okLabel: "Rename" });

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

      showToast(data.error || "Rename failed");
    }

    menu.remove();
  };

  // ---- DELETE PROJECT ----

  const del = document.createElement('div');
  del.textContent = "Delete Project";

  del.onclick = async () => {

    if (projects.length <= 1) {
      showToast("At least one project must exist.", "info");
      return;
    }

    if (currentProject === "default") {

      showToast("Cannot delete default project", "info");
      return;
    }

    const projectTitle = projects.find(p => p.id === currentProject)?.title || currentProject;
    const confirmed = await askConfirm(
      `Delete the project “${projectTitle}”?`,
      "It moves to the Trash. You can restore it from Project ⋯ → Trash…",
      { okLabel: "Delete", danger: true }
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

      showToast(data.error || "Delete failed");
    }

    menu.remove();
  };

  const duplicateProjectItem = document.createElement("div");
  duplicateProjectItem.textContent = "Duplicate Project";
  duplicateProjectItem.onclick = () => duplicateProject();

  const trashItem = document.createElement("div");
  trashItem.textContent = "Trash…";
  trashItem.onclick = () => openTrash();

  const searchItem = document.createElement("div");
  searchItem.textContent = "Search and replace…";
  searchItem.onclick = () => openProjectSearch();

  const importItem = document.createElement("div");
  importItem.textContent = "Import…";
  importItem.onclick = () => openImport();

  const exportItem = document.createElement("div");
  exportItem.textContent = "Export manuscript…";
  exportItem.onclick = () => openExport();

  menu.appendChild(create);
  menu.appendChild(rename);
  menu.appendChild(duplicateProjectItem);
  menu.appendChild(del);
  menu.appendChild(searchItem);
  menu.appendChild(importItem);
  menu.appendChild(exportItem);
  menu.appendChild(trashItem);

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
  e.stopPropagation();

  document.querySelectorAll('.file-menu').forEach(m => m.remove());

  const rect =
    document.getElementById("projectDropdown")
      .getBoundingClientRect();

  const menu = document.createElement("div");
  menu.classList.add("file-menu", "project-menu");

  const allProjects = projects || [];
  const recentIds = recentProjects || [];
  const showRecent = allProjects.length >= 7;

  const projectMap = Object.fromEntries(
    allProjects.map(project => [project.id, project])
  );

  const recent = showRecent
    ? [...new Set(recentIds)]
        .map(id => projectMap[id])
        .filter(Boolean)
        .slice(0, 5)
    : [];

  const recentIdSet = new Set(
    recent.map(project => project.id)
  );

  const alphabetical = allProjects
    .filter(project => !recentIdSet.has(project.id))
    .sort((a, b) =>
      (a.title || a.id).localeCompare(b.title || b.id)
    );

  function addHeader(label) {
    const header = document.createElement("div");
    header.classList.add("project-menu-header");
    header.textContent = label;
    menu.appendChild(header);
  }

  function addProject(project) {
    const item = document.createElement("div");
    item.classList.add("project-menu-item");
    item.innerHTML = iconSvg("book");
    item.appendChild(document.createTextNode(project.title || project.id));

    if (project.id === currentProject) {
      item.classList.add("current");
    }

    item.onclick = async () => {
      try {
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
          showToast(data.error || "Failed to switch project");
        }
      } catch (error) {
        console.error("Project switch failed:", error);
        showToast("Failed to switch project.");
      }

      closeMenu();
    };

    menu.appendChild(item);
  }

  if (recent.length > 0) {
    addHeader("RECENT");

    recent.forEach(addProject);

    const divider = document.createElement("div");
    divider.classList.add("project-menu-divider");
    menu.appendChild(divider);
  }

  if (alphabetical.length > 0) {
    addHeader(recent.length > 0 ? "OTHER PROJECTS" : "PROJECTS");
    alphabetical.forEach(addProject);
  }

  function closeMenu() {
    menu.remove();
    document.removeEventListener("click", handleOutsideClick);
  }

  function handleOutsideClick(event) {
    if (!menu.contains(event.target)) {
      closeMenu();
    }
  }

  menu.addEventListener("click", event => {
    event.stopPropagation();
  });

  document.body.appendChild(menu);

  const gap = 8;
  const below = window.innerHeight - rect.bottom - gap;
  const above = rect.top - gap;

  menu.style.left = `${Math.max(
    8,
    Math.min(rect.left, window.innerWidth - menu.offsetWidth - 8)
  )}px`;

  if (menu.scrollHeight > below && above > below) {
    menu.style.maxHeight = `${Math.max(80, above)}px`;
    menu.style.top = "auto";
    menu.style.bottom = `${window.innerHeight - rect.top + 4}px`;
  } else {
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.bottom = "auto";
    menu.style.maxHeight = `${Math.max(80, below)}px`;
  }

  setTimeout(() => {
    document.addEventListener("click", handleOutsideClick);
  }, 0);
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
    schedulePreviewRender();
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

  // The writer closed the document here last time: stay on the empty state
  if (readPref(`sjb_doc_closed_${currentProject}`, false)) {
    currentFile = {
      section: null,
      filename: null
    };
    editor.value = "";
    schedulePreviewRender();
    titleInput.value = "";
    isDirty = false;
    renderLists();
  }

  else if (
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
      schedulePreviewRender();
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
  const showRecent = allProjects.length >= 7;

  // Build lookup map
  const projectMap = {};

  for (const project of allProjects) {
    projectMap[project.id] = project;
  }

  // Current project label uses TITLE
  const currentMeta = projectMap[currentProject];

  document.getElementById("currentProjectLabel").innerText =
    currentMeta?.title || currentProject;

  // Build recent project objects, ignoring stale IDs
  const recentProjects = showRecent
    ? [...new Set(recentIds)]
        .map(id => projectMap[id])
        .filter(Boolean)
        .slice(0, 5)
    : [];

  const recentProjectIds = new Set(
    recentProjects.map(project => project.id)
  );

  // Remaining projects, sorted alphabetically by title
  const remaining = allProjects
    .filter(project => !recentProjectIds.has(project.id))
    .sort((a, b) =>
      (a.title || a.id).localeCompare(b.title || b.id)
    );

  // ---------- RECENT ----------
  if (recentProjects.length > 0) {
    const recentHeader = document.createElement("div");
    recentHeader.classList.add("project-header");
    recentHeader.textContent = "RECENT";
    container.appendChild(recentHeader);

    for (const project of recentProjects) {
      container.appendChild(createProjectRow(project));
    }

    // Divider between Recent and the other projects
    const divider = document.createElement("div");
    divider.classList.add("project-section-divider");
    container.appendChild(divider);
  }

  // ---------- OTHER PROJECTS (A–Z) ----------
  if (remaining.length > 0) {
    const allHeader = document.createElement("div");
    allHeader.classList.add("project-header");
    allHeader.textContent = recentProjects.length > 0 ? "OTHER PROJECTS" : "PROJECTS";
    container.appendChild(allHeader);

    for (const project of remaining) {
      container.appendChild(createProjectRow(project));
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

      showToast(data.error || "Failed to switch project");
    }
  };

  return row;
}

async function duplicateProject() {
  if (isDirty) await saveCurrentFile();
  const { ok, data } = await postJSON('/duplicate_project', { project: currentProject });
  if (!ok) return showToast(data.error || "Could not duplicate the project");
  await loadProjects();
  showToast(`Duplicated as "${data.title}". Find it in the project menu.`, "info");
}

// =====================
// SEARCH AND REPLACE across the project: every match listed before replacing
// =====================

let searchResults = [];
let searchTimer = null;

function searchOptions() {
  return {
    query: document.getElementById("searchQuery").value,
    matchCase: document.getElementById("searchMatchCase").checked,
    wholeWord: document.getElementById("searchWholeWord").checked,
    sections: [...document.querySelectorAll('input[name="searchSection"]:checked')].map(i => i.value)
  };
}

async function openProjectSearch(query) {
  if (isDirty) await saveCurrentFile();   // search the newest text
  if (typeof query === "string" && query) document.getElementById("searchQuery").value = query;
  // Start from the find bar's options when coming from it
  if (findBarOpen()) {
    document.getElementById("searchMatchCase").checked = findState.matchCase;
    document.getElementById("searchWholeWord").checked = findState.wholeWord;
  }
  document.getElementById("searchModal").classList.remove("hidden");
  const field = document.getElementById("searchQuery");
  field.focus();
  field.select();
  await runProjectSearch();
}

function closeProjectSearch() {
  document.getElementById("searchModal").classList.add("hidden");
}

async function runProjectSearch() {
  const options = searchOptions();
  const { data } = await postJSON('/search', options);
  searchResults = data.documents || [];

  const summary = document.getElementById("searchSummary");
  const n = (count, word) => `${count.toLocaleString()} ${word}${count === 1 ? "" : (word === "match" ? "es" : "s")}`;
  summary.textContent = !options.query ? ""
    : searchResults.length ? `${n(data.total, "match")} in ${n(searchResults.length, "document")}.`
    : "No matches.";

  const list = document.getElementById("searchResults");
  list.innerHTML = "";
  for (const doc of searchResults) {
    const group = document.createElement("div");
    group.className = "search-doc";

    const head = document.createElement("div");
    head.className = "search-doc-head";
    const tick = document.createElement("input");
    tick.type = "checkbox";
    tick.checked = true;
    tick.setAttribute("aria-label", `Replace in ${doc.title}`);
    tick.addEventListener("change", updateReplaceButton);
    doc.tick = tick;
    const title = document.createElement("button");
    title.type = "button";
    title.className = "link-btn search-doc-title";
    title.textContent = doc.title;
    title.onclick = () => openSearchResult(doc, options);
    const where = document.createElement("span");
    where.className = "history-meta";
    where.textContent = [TRASH_PLACES[doc.section], ...doc.folders].join(" › ") + ` · ${n(doc.count, "match")}`;
    head.append(tick, title, where);
    group.appendChild(head);

    for (const s of doc.snippets) {
      const line = document.createElement("div");
      line.className = "search-snippet";
      const mark = document.createElement("mark");
      mark.className = "find-hit";
      mark.textContent = s.match;
      line.append(document.createTextNode(s.before), mark, document.createTextNode(s.after));
      group.appendChild(line);
    }
    if (doc.count > doc.snippets.length) {
      const more = document.createElement("div");
      more.className = "search-snippet search-more";
      more.textContent = `and ${doc.count - doc.snippets.length} more`;
      group.appendChild(more);
    }
    list.appendChild(group);
  }
  updateReplaceButton();
}

function chosenResults() {
  return searchResults.filter(doc => doc.tick?.checked);
}

function updateReplaceButton() {
  const chosen = chosenResults();
  const button = document.getElementById("searchReplaceBtn");
  button.disabled = chosen.length === 0;
  button.textContent = chosen.length
    ? `Replace in ${chosen.length} document${chosen.length === 1 ? "" : "s"}`
    : "Replace";
}

async function replaceInProject(button) {
  const options = searchOptions();
  const chosen = chosenResults();
  const matches = chosen.reduce((sum, doc) => sum + doc.count, 0);
  const replacement = document.getElementById("searchReplacement").value;
  const what = replacement ? `with “${replacement}”` : "with nothing (they are deleted)";
  const agreed = await askConfirm(
    `Replace ${matches} match${matches === 1 ? "" : "es"} in ${chosen.length} document${chosen.length === 1 ? "" : "s"}?`,
    `“${options.query}” is replaced ${what}. Each document's current text is kept in Version history first.`,
    { okLabel: "Replace" }
  );
  if (!agreed) return;

  if (isDirty) await saveCurrentFile();
  button.disabled = true;
  try {
    const { ok, data } = await postJSON('/replace_all', {
      ...options,
      replacement,
      targets: chosen.map(doc => ({ section: doc.section, filename: doc.filename }))
    });
    if (!ok) {
      showToast(data.error || "Replace failed");
      return;
    }
    // Reload lists and the open document, which may have changed
    const open = currentFile.filename && data.changed.some(c => c.section === currentFile.section && c.filename === currentFile.filename);
    await loadAll();
    if (open) await openFile(currentFile.section, currentFile.filename);
    showToast(`Replaced ${data.replaced} match${data.replaced === 1 ? "" : "es"} in ${data.documents} document${data.documents === 1 ? "" : "s"}. Old text is in Version history.`, "info");
    await runProjectSearch();
  } finally {
    updateReplaceButton();
  }
}

// Open a result with the find bar showing the same search
async function openSearchResult(doc, options) {
  closeProjectSearch();
  await openFile(doc.section, doc.filename);
  editor.setSelectionRange(0, 0);
  findInput.value = options.query;
  for (const [option, id] of [["matchCase", "findCase"], ["wholeWord", "findWord"]]) {
    findState[option] = options[option];
    document.getElementById(id).setAttribute("aria-pressed", String(options[option]));
  }
  openFindBar(false);
}

for (const id of ["searchQuery", "searchMatchCase", "searchWholeWord"]) {
  document.getElementById(id).addEventListener(id === "searchQuery" ? "input" : "change", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(runProjectSearch, 200);
  });
}
document.querySelectorAll('input[name="searchSection"]').forEach(box => box.addEventListener("change", runProjectSearch));
document.getElementById("searchQuery").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    runProjectSearch();
  }
});


// =====================
// IMPORT: documents or a whole folder (Markdown, text, Word), preview first
// =====================

let importSelection = [];   // [{ file, path }] in the order chosen

function openImport() {
  importSelection = [];
  for (const id of ["importFiles", "importFolder"]) document.getElementById(id).value = "";
  document.getElementById("importPreview").classList.add("hidden");
  const run = document.getElementById("importRun");
  run.disabled = true;
  run.textContent = "Import";
  // Always start on "this project": a new project should never be made by accident
  document.querySelector('input[name="importDest"][value="project"]').checked = true;
  const project = (projects || []).find(p => p.id === currentProject);
  document.getElementById("importThisProject").textContent = `This project (“${project?.title || currentProject}”)`;
  document.getElementById("importModal").classList.remove("hidden");
}

function pickImport(kind) {
  document.getElementById(kind === "folder" ? "importFolder" : "importFiles").click();
}

for (const id of ["importFiles", "importFolder"]) {
  document.getElementById(id).addEventListener("change", (e) => {
    // A folder gives each file its path inside the folder; single files just their name
    importSelection = [...e.target.files].map(file => ({ file, path: file.webkitRelativePath || file.name }));
    if (importSelection.length) previewImport();
  });
}

function importForm() {
  const form = new FormData();
  for (const { file, path } of importSelection) {
    form.append("files", file);
    form.append("paths", path);
  }
  return form;
}

async function previewImport() {
  const run = document.getElementById("importRun");
  run.disabled = true;
  run.textContent = "Reading…";
  let data;
  try {
    const res = await fetch('/import/preview', { method: 'POST', body: importForm() });
    data = await res.json();
  } catch (e) {
    showToast("Could not read those files.");
    run.textContent = "Import";
    return;
  }

  const count = n => `${n} document${n === 1 ? "" : "s"}`;
  const parts = [count(data.items.length)];
  if (data.folders) parts.push(`${data.folders} folder${data.folders === 1 ? "" : "s"}`);
  if (data.skipped.length) parts.push(`${data.skipped.length} skipped`);
  document.getElementById("importSummary").textContent = `Found ${parts.join(", ")}.`;

  const list = document.getElementById("importList");
  list.innerHTML = "";
  const row = (icon, title, meta, skipped) => {
    const el = document.createElement("div");
    el.className = "import-row" + (skipped ? " is-skipped" : "");
    const iconEl = document.createElement("span");
    iconEl.className = "tree-icon";
    iconEl.innerHTML = iconSvg(icon);
    const text = document.createElement("div");
    text.className = "trash-text";
    const t = document.createElement("span");
    t.className = "trash-title";
    t.textContent = title;
    const m = document.createElement("span");
    m.className = "history-meta";
    m.textContent = meta;
    text.append(t, m);
    el.append(iconEl, text);
    list.appendChild(el);
  };
  for (const item of data.items) {
    row("file-text", item.title, [item.path, item.kind, `${item.words.toLocaleString()} words`].join(" · "), false);
  }
  for (const item of data.skipped) {
    row("x", item.path, `Skipped: ${item.reason}`, true);
  }

  document.getElementById("importProjectName").value = data.suggestedProject;
  document.getElementById("importKeepRow").classList.toggle("hidden", !data.folders && !data.root);
  document.getElementById("importPreview").classList.remove("hidden");
  run.textContent = data.items.length ? `Import ${count(data.items.length)}` : "Import";
  run.disabled = !data.items.length;
}

async function runImport(button) {
  const form = importForm();
  const destination = document.querySelector('input[name="importDest"]:checked').value;
  form.set("destination", destination);
  form.set("projectName", document.getElementById("importProjectName").value.trim());
  form.set("section", document.querySelector('input[name="importSection"]:checked').value);
  form.set("keepFolders", document.getElementById("importKeep").checked ? "1" : "0");

  if (isDirty) await saveCurrentFile();
  button.disabled = true;
  try {
    const res = await fetch('/import', { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Import failed");
      return;
    }
    closeImport();
    if (data.project) {
      await loadProjects();   // the new project is now the open one
      loadSelections();
    }
    await loadAll();
    const where = data.section === "writing" ? "Writing" : "Background";
    showToast(`Imported ${data.documents} document${data.documents === 1 ? "" : "s"} into ${where}.`, "info");
  } finally {
    button.disabled = false;
  }
}

function closeImport() {
  document.getElementById("importModal").classList.add("hidden");
}


// =====================
// EXPORT: one document, or the Writing section as one manuscript
// =====================

// POST, then save the reply as a file with the name the server gives
async function downloadExport(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    showToast(data.error || "Export failed");
    return false;
  }
  const name = (res.headers.get("Content-Disposition") || "").match(/filename="([^"]+)"/)?.[1] || "export";
  const link = document.createElement("a");
  link.href = URL.createObjectURL(await res.blob());
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  showToast(`Exported ${name}`, "info");
  return true;
}

async function exportDocument(section, filename, format) {
  if (isDirty && currentFile.section === section && currentFile.filename === filename) {
    await saveCurrentFile();
  }
  await downloadExport('/export_document', { section, filename, format });
}

function openExport() {
  const project = (projects || []).find(p => p.id === currentProject);
  const ticked = collectFilenames(state.project.writing || []).filter(f => selected.writing.has(f)).length;
  document.getElementById("exportHint").textContent =
    `The Writing section of “${project?.title || currentProject}”, in sidebar order.`;
  document.getElementById("exportTickedCount").textContent = ticked;
  document.getElementById("exportTicked").disabled = ticked === 0;

  // The writer's last choices
  const saved = readPref("sjb_export", {});
  const pick = (name, value) => {
    const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (input && !input.disabled) input.checked = true;
  };
  pick("exportFormat", saved.format || "docx");
  pick("exportWhich", ticked ? saved.which || "all" : "all");
  document.getElementById("exportHeadings").checked = saved.headings ?? true;
  document.getElementById("exportPageBreaks").checked = saved.pageBreaks ?? true;

  document.getElementById("exportModal").classList.remove("hidden");
}

async function runExport(button) {
  const options = {
    format: document.querySelector('input[name="exportFormat"]:checked').value,
    which: document.querySelector('input[name="exportWhich"]:checked').value,
    headings: document.getElementById("exportHeadings").checked,
    pageBreaks: document.getElementById("exportPageBreaks").checked
  };
  writePref("sjb_export", options);

  if (isDirty) await saveCurrentFile();
  button.disabled = true;
  try {
    const done = await downloadExport('/export_manuscript', {
      format: options.format,
      headings: options.headings,
      pageBreaks: options.pageBreaks,
      only: options.which === "ticked"
        ? collectFilenames(state.project.writing || []).filter(f => selected.writing.has(f))
        : null
    });
    if (done) closeExport();
  } finally {
    button.disabled = false;
  }
}

function closeExport() {
  document.getElementById("exportModal").classList.add("hidden");
}

// =====================
// TRASH: deleted documents and projects, with Restore
// =====================

const TRASH_PLACES = {
  writing: "Writing",
  background: "Background",
  system: "AI setup · System",
  prompts: "AI setup · Prompts"
};

let trashItems = [];

async function openTrash() {
  document.getElementById("trashModal").classList.remove("hidden");
  await loadTrash();
}

async function loadTrash() {
  const data = await (await fetch('/trash')).json();
  trashItems = data.items || [];

  const projectTitle =
    (projects || []).find(p => p.id === data.project)?.title || data.project;
  document.getElementById("trashHint").textContent =
    `Deleted documents from “${projectTitle}” and the AI setup, plus deleted projects. Restore puts an item back where it was.`;

  const list = document.getElementById("trashList");
  list.innerHTML = "";
  document.getElementById("trashEmptyBtn").disabled = trashItems.length === 0;

  if (trashItems.length === 0) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = "The trash is empty.";
    list.appendChild(empty);
    return;
  }

  for (const item of trashItems) {
    const row = document.createElement("div");
    row.className = "trash-row";

    const icon = document.createElement("span");
    icon.className = "tree-icon";
    icon.innerHTML = iconSvg(
      item.kind === "project" ? "book"
        : (item.section === "system" || item.section === "prompts") ? "sticky-note"
        : "file-text"
    );

    const text = document.createElement("div");
    text.className = "trash-text";

    const title = document.createElement("span");
    title.className = "trash-title";
    title.textContent = item.title;

    const deleted = new Date(item.deleted);
    const meta = document.createElement("span");
    meta.className = "history-meta";
    meta.textContent = [
      item.kind === "project" ? "Project" : TRASH_PLACES[item.section],
      "deleted " + deleted.toLocaleString([], {
        month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
      }),
      timeAgo(deleted)
    ].join(" · ");

    text.append(title, meta);

    const restore = document.createElement("button");
    restore.type = "button";
    restore.textContent = "Restore";
    restore.onclick = () => restoreTrashItem(item, restore);

    row.append(icon, text, restore);
    list.appendChild(row);
  }
}

async function restoreTrashItem(item, button) {
  button.disabled = true;

  const { data } = await postJSON('/restore_trash', {
    kind: item.kind,
    section: item.section || undefined,
    trash_name: item.trash_name
  });

  if (data.status !== "restored") {
    button.disabled = false;
    showToast(data.error || "Restore failed");
    return;
  }

  if (item.kind === "project") {
    await loadProjects();
    showToast(`Restored the project “${item.title}”.`, "info");
  } else {
    if (isDirty) await saveCurrentFile();
    await loadAll();
    showToast(`Restored “${item.title}” to ${TRASH_PLACES[item.section]}.`, "info");
  }

  await loadTrash();
}

async function emptyTrash() {
  if (trashItems.length === 0) return;

  const count = trashItems.length === 1 ? "1 item" : `${trashItems.length} items`;
  if (!(await askConfirm(`Delete ${count} forever?`, "You cannot undo this.", { okLabel: "Empty trash", danger: true }))) return;

  const { data } = await postJSON('/empty_trash', {});
  if (data.status !== "emptied") {
    showToast(data.error || "Could not empty the trash");
    return;
  }
  await loadTrash();
}

function closeTrash() {
  document.getElementById("trashModal").classList.add("hidden");
}
