// sidebar.js: The document lists: render, tick, sort, fold, drag, move, menus, and panel widths.
// Loaded in order by index.html; all files share one global scope.

let draggedRow = null;

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

// =====================
// CREATE NEW FILE
// =====================

async function createNew(section) {
  const title = await askText("New document", "", { placeholder: "Title", okLabel: "Create" });

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
    showToast(data.error || "Error creating file");
  }
}

// ===================
// END CREATE NEW FILE
// ===================


// ===================
// CREATE NEW FOLDER
// ===================


async function createFolder(section) {

  const title = await askText("New folder", "", { placeholder: "Folder name", okLabel: "Create" });

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

    showToast(data.error || "Error creating folder");
  }
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

async function renderLists() {
  await renderSection('promptsList', state.global.prompts || [], 'prompts');
  await renderSection('systemList', state.global.system || [], 'system');
  await renderSection('backgroundList', state.project.background || [], 'background');
  await renderSection('writingList', state.project.writing || [], 'writing');
  updateAiSummary();
  updateEmptyState();
}

// Documents were .json files before the switch to Markdown; ticks saved
// back then still point at the old names
const toMarkdownName = name =>
  typeof name === "string" && name.endsWith(".json") ? name.slice(0, -5) + ".md" : name;

function loadSelections() {

  // ---------- GLOBAL ----------
  const globalSaved =
    localStorage.getItem("sjb_selected_global");

  if (globalSaved) {
    try {

      const data = JSON.parse(globalSaved);

      selected.system = new Set((data.system || []).map(toMarkdownName));
      selected.prompt = toMarkdownName(data.prompt) || null;

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
        new Set((data.background || []).map(toMarkdownName));

      selected.writing =
        new Set((data.writing || []).map(toMarkdownName));

    } catch (e) {
      console.error("Failed loading project selections", e);
    }
  } else {

    // clean defaults
    selected.background = new Set();
    selected.writing = new Set();
  }
}

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
  }

  // Listeners go on once; the container element survives re-renders
  if (!isRecursive && !container.dataset.dropReady) {
    container.dataset.dropReady = "1";

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
      if (draggedSection !== sectionName) {
        await moveFileToSection(draggedSection, sectionName, draggedFilename);
        return;
      }

      await moveFileTo(sectionName, draggedFilename, null, null, null);
    });
  }

  for (let item of sortForView(items, sectionName)) {
    if (item.type === "folder") {
      const folderRow =
        document.createElement("div");

      folderRow.classList.add("folder-row");
      folderRow.draggable = true;
      folderRow.dataset.section = sectionName;
      folderRow.dataset.folderId = item.id;
      folderRow.style.marginLeft = `calc(var(--tree-indent) * ${depth})`;

      // Arrow (collapse/expand toggle)
      const folderArrow = document.createElement("span");
      folderArrow.className = "folder-arrow";
      folderArrow.innerHTML = iconSvg(item.collapsed ? "chevron-right" : "chevron-down");
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

      folderLabel.className = "tree-label";
      const folderText = document.createElement("span");
      folderText.className = "tree-text";
      folderText.textContent = item.title;
      folderLabel.append(treeIcon(item.collapsed ? "folder" : "folder-open"), folderText);
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

        folderText.appendChild(countSpan);
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
      menuBtn.innerHTML = iconSvg("ellipsis");
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
        const draggedFolderId = e.dataTransfer.getData('folder-id');

        if (draggedSection !== sectionName) {
          if (draggedFolderId) {
            showToast("Folders move only within their own section.", "info");
            return;
          }
          const otherFile = e.dataTransfer.getData('text/plain');
          if (otherFile) {
            await moveFileToSection(draggedSection, sectionName, otherFile, { folderId: item.id });
          }
          return;
        }

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
    const row = document.createElement('div');
    row.classList.add('file-row');
    row.style.marginLeft =
      `calc(var(--tree-indent) * ${depth})`;

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
    label.className = "tree-label";
    label.style.cursor = "pointer";

    label.appendChild(treeIcon(documentIconName(sectionName)));
    const labelText = document.createElement("span");
    labelText.className = "tree-text";
    labelText.appendChild(
      document.createTextNode(title)
    );
    label.appendChild(labelText);
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

      labelText.appendChild(countSpan);
    }

    row.onclick = (e) => {
      // Prevent checkbox/radio clicks from triggering open
      if (e.target.tagName.toLowerCase() === 'input') return;
      openFile(sectionName, filename);
    };


    // Empty slot where folders have their arrow, so files line up with folders
    const arrowSlot = document.createElement("span");
    arrowSlot.className = "tree-spacer";
    row.appendChild(arrowSlot);
    row.appendChild(input);
    row.appendChild(label);

    // Ellipsis Button
    const menuBtn = document.createElement('span');
    menuBtn.innerHTML = iconSvg("ellipsis");
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

      const rect = row.getBoundingClientRect();
      const position = e.clientY < rect.top + rect.height / 2 ? "before" : "after";

      const draggedFolderId = e.dataTransfer.getData('folder-id');

      if (draggedSection !== sectionName) {
        if (draggedFolderId) {
          showToast("Folders move only within their own section.", "info");
          return;
        }
        const otherFile = e.dataTransfer.getData('text/plain');
        if (otherFile) {
          await moveFileToSection(draggedSection, sectionName, otherFile, { targetFilename: filename, position });
        }
        return;
      }
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

    const title = await askText("New document", "", { placeholder: "Title", okLabel: "Create" });

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

      showToast(
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

    const newTitle = await askText("Rename folder", folder.title, { okLabel: "Rename" });

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

      showToast(
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

    if (!(await askConfirm(`Delete the folder “${folder.title}”?`, "", { okLabel: "Delete", danger: true }))) {
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

      showToast(
        data.error ||
        "Delete failed"
      );
    }

    menu.remove();
  };

  const duplicateFolder = document.createElement('div');
  duplicateFolder.textContent = "Duplicate Folder";
  duplicateFolder.onclick = () => duplicateFolderItem(section, folder.id);

  menu.appendChild(addFile);
  menu.appendChild(rename);
  menu.appendChild(duplicateFolder);
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
    const currentTitle = findFileItemInTree(
      (section === "prompts" || section === "system" ? state.global[section] : state.project[section]) || [],
      filename
    )?.title || "";
    const newTitle = await askText("Rename document", currentTitle, { okLabel: "Rename" });
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
      showToast(data.error);
    }
  };

  const del = document.createElement('div');
  del.textContent = "Delete";
  del.onclick = async () => {
    const docTitle = findFileItemInTree(
      (section === "prompts" || section === "system" ? state.global[section] : state.project[section]) || [],
      filename
    )?.title || filename;
    if (!(await askConfirm(
      `Delete “${docTitle}”?`,
      "It moves to the Trash. You can restore it from Project ⋯ → Trash…",
      { okLabel: "Delete", danger: true }
    ))) return;

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
          schedulePreviewRender();

          isDirty = false;

          renderLists();
          updateTokenMeter();
        }
      }

    } else {

      showToast(data.error);
    }
  };

  const history = document.createElement('div');
  history.textContent = "Version history…";
  history.onclick = () => openHistory(section, filename);

  const duplicate = document.createElement('div');
  duplicate.textContent = "Duplicate";
  duplicate.onclick = () => duplicateDocument(section, filename);

  const exportMd = document.createElement('div');
  exportMd.textContent = "Export as Markdown";
  exportMd.onclick = () => exportDocument(section, filename, "md");

  const exportWord = document.createElement('div');
  exportWord.textContent = "Export as Word";
  exportWord.onclick = () => exportDocument(section, filename, "docx");

  menu.appendChild(rename);
  menu.appendChild(duplicate);
  menu.appendChild(history);
  menu.appendChild(exportMd);
  menu.appendChild(exportWord);
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

function setSidebarCollapsed(collapsed) {
  document.body.classList.toggle("sidebar-collapsed", collapsed);
  document.getElementById("sidebarToggle").setAttribute("aria-pressed", String(!collapsed));

  try {
    localStorage.setItem("sjb_sidebar_collapsed", collapsed ? "1" : "0");
  } catch (e) {}
}

function toggleSidebar() {
  setSidebarCollapsed(!document.body.classList.contains("sidebar-collapsed"));
}

// Open every folder above the current file so its highlight is visible
async function revealActiveFile() {
  const { section, filename } = currentFile;
  if (!section || !filename) return;

  const tree = (section === "prompts" || section === "system")
    ? state.global[section]
    : state.project[section];

  let changed = false;

  const openPath = (items) => {
    for (const item of items || []) {
      if (item && item.type === "folder") {
        if (openPath(item.items)) {
          if (item.collapsed) {
            item.collapsed = false;
            changed = true;
          }
          return true;
        }
      } else if (item === filename || item?.filename === filename) {
        return true;
      }
    }
    return false;
  };

  openPath(tree);

  if (changed) {
    await fetch('/update_folder_state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section, state: tree })
    });
    await renderLists();
  }

  document.querySelector(".file-row.active-file")?.scrollIntoView({ block: "nearest" });
}

// =====================
// SIDEBAR: SORT, FOLD, SECTION ORDER, MOVES BETWEEN SECTIONS
// =====================

const SECTION_LABELS = {
  prompts: "Prompts",
  system: "System",
  background: "Background",
  writing: "Writing"
};

const SORT_MODES = ["manual", "az", "za"];

const SORT_INFO = {
  manual: { icon: "arrow-up-down", tip: "Sort: My order" },
  az: { icon: "arrow-down-a-z", tip: "Sort: A–Z" },
  za: { icon: "arrow-down-z-a", tip: "Sort: Z–A" }
};

function getSort(section) {
  return readPref("sjb_sort", {})[section] || "manual";
}

// Sorting only changes the view; the saved hand-made order stays as it is
function sortForView(items, section) {
  const mode = getSort(section);
  if (mode === "manual") return items;

  const title = item => (typeof item === "string" ? item : item.title || item.filename || "");
  const byTitle = (a, b) => title(a).localeCompare(title(b), undefined, { numeric: true, sensitivity: "base" });
  const folders = items.filter(i => i?.type === "folder").sort(byTitle);
  const files = items.filter(i => i?.type !== "folder").sort(byTitle);
  if (mode === "za") {
    folders.reverse();
    files.reverse();
  }
  return [...folders, ...files];
}

function updateSortButtons() {
  document.querySelectorAll(".sort-btn").forEach(btn => {
    const info = SORT_INFO[getSort(btn.dataset.sortSection)];
    btn.innerHTML = iconSvg(info.icon);
    btn.dataset.tip = info.tip;
    btn.setAttribute("aria-label", info.tip);
    btn.classList.toggle("is-sorted", info !== SORT_INFO.manual);
  });
}

async function cycleSort(section) {
  const sorts = readPref("sjb_sort", {});
  const next = SORT_MODES[(SORT_MODES.indexOf(getSort(section)) + 1) % SORT_MODES.length];
  sorts[section] = next;
  writePref("sjb_sort", sorts);
  updateSortButtons();
  await renderLists();
}

function sectionEl(section) {
  return document.querySelector(`.section[data-weight="${section}"]`);
}

function applySectionFolds() {
  const folded = readPref("sjb_folded_sections", []);
  Object.keys(SECTION_LABELS).forEach(section => {
    const isFolded = folded.includes(section);
    sectionEl(section)?.classList.toggle("folded", isFolded);
    sectionEl(section)?.querySelector(".section-toggle")
      ?.setAttribute("aria-expanded", String(!isFolded));
  });
}

function toggleSectionFold(section) {
  const folded = new Set(readPref("sjb_folded_sections", []));
  folded.has(section) ? folded.delete(section) : folded.add(section);
  writePref("sjb_folded_sections", [...folded]);
  applySectionFolds();
}

// Sections reorder within their group (Prompts/System, Background/Writing)
function applySectionOrder() {
  const order = readPref("sjb_section_order", []);
  order.forEach(section => {
    const el = sectionEl(section);
    el?.parentElement.appendChild(el);
  });
}

function saveSectionPositions() {
  writePref(
    "sjb_section_order",
    [...document.querySelectorAll(".section[data-weight]")].map(el => el.dataset.weight)
  );
}

function initSectionHeaders() {
  document.querySelectorAll(".section-header").forEach(header => {
    const section = header.dataset.section;
    const el = sectionEl(section);

    header.addEventListener("dragstart", (e) => {
      // Rows inside the section start their own drags
      if (e.target !== header) return;
      e.dataTransfer.setData("application/x-sjb-section", section);
      e.dataTransfer.effectAllowed = "move";
      el.classList.add("dragging-section");
    });

    header.addEventListener("dragend", () => {
      el.classList.remove("dragging-section");
      document.querySelectorAll(".section-header").forEach(h => {
        h.classList.remove("drop-before", "drop-after", "drop-into");
      });
    });

    header.addEventListener("dragover", (e) => {
      const types = [...e.dataTransfer.types];
      if (types.includes("application/x-sjb-section")) {
        e.preventDefault();
        const rect = header.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;
        header.classList.toggle("drop-before", before);
        header.classList.toggle("drop-after", !before);
      } else if (types.includes("text/plain")) {
        // A file dropped on a header lands at the top level of that section
        e.preventDefault();
        header.classList.add("drop-into");
      }
    });

    header.addEventListener("dragleave", () => {
      header.classList.remove("drop-before", "drop-after", "drop-into");
    });

    header.addEventListener("drop", async (e) => {
      e.preventDefault();
      header.classList.remove("drop-before", "drop-after", "drop-into");

      const draggedSection = e.dataTransfer.getData("application/x-sjb-section");
      if (draggedSection) {
        const dragged = sectionEl(draggedSection);
        if (draggedSection === section || dragged.parentElement !== el.parentElement) {
          if (dragged.parentElement !== el.parentElement) {
            showToast("Prompts and System are shared by all projects, so they stay apart from Background and Writing.", "info");
          }
          return;
        }
        const rect = header.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;
        el.parentElement.insertBefore(dragged, before ? el : el.nextSibling);
        saveSectionPositions();
        return;
      }

      const filename = e.dataTransfer.getData("text/plain");
      const fromSection = e.dataTransfer.getData("section");
      if (filename && e.dataTransfer.getData("folder-id")) return;
      if (filename && fromSection === section) {
        await moveFileTo(section, filename, null, null, null);
      } else if (filename && fromSection) {
        await moveFileToSection(fromSection, section, filename);
      }
    });
  });
}

// Move a file to another section: on disk, with its history, into the dropped spot
async function moveFileToSection(fromSection, toSection, filename, opts = {}) {
  const wasOpen = currentFile.section === fromSection && currentFile.filename === filename;
  if (wasOpen && isDirty) await saveCurrentFile();

  const res = await fetch('/move_file_section', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from_section: fromSection,
      section: toSection,
      filename,
      folder_id: opts.folderId || null,
      target_filename: opts.targetFilename || null,
      position: opts.position || "after"
    })
  });
  const data = await res.json();

  if (!res.ok) {
    showToast(data.error || "Move failed");
    return;
  }

  // Checkbox and prompt selections do not follow the file across sections
  if (fromSection === "prompts") {
    if (selected.prompt === filename) selected.prompt = null;
  } else {
    selected[fromSection]?.delete(filename);
  }
  saveSelections();
  delete fileCache[`${fromSection}/${filename}`];

  if (wasOpen) {
    currentFile.section = toSection;
    await fetch('/opened_file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: toSection, filename })
    });
  }

  await loadAll();
  showToast(`Moved to ${SECTION_LABELS[toSection]}.`, "info");
}

// =====================
// RESIZABLE SIDEBAR AND AI PANEL (drag the inner edge, double-click to reset)
// =====================

const PANEL_SIZES = {
  sidebar: { min: 200, max: 520, cssVar: "--sidebar-w", pref: "sjb_sidebar_w" },
  ai: { min: 240, max: 520, cssVar: "--ai-panel-w", pref: "sjb_ai_panel_w" }
};

function applyPanelWidth(name, px) {
  const { cssVar } = PANEL_SIZES[name];
  if (px == null) document.documentElement.style.removeProperty(cssVar);
  else document.documentElement.style.setProperty(cssVar, `${px}px`);
}

function initPanelResize() {
  for (const [name, size] of Object.entries(PANEL_SIZES)) {
    applyPanelWidth(name, readPref(size.pref, null));
  }

  document.querySelectorAll(".resize-handle").forEach(handle => {
    const name = handle.dataset.resize;
    const size = PANEL_SIZES[name];
    const panel = handle.parentElement;
    const otherPanel = document.querySelector(name === "sidebar" ? ".ai-panel" : ".left");
    let width = null;

    const onMove = (e) => {
      const rect = panel.getBoundingClientRect();
      const wanted = name === "sidebar" ? e.clientX - rect.left : rect.right - e.clientX;
      // Never squeeze the editor below its minimum
      const room = window.innerWidth - otherPanel.getBoundingClientRect().width - EDITOR_MIN_WIDTH;
      width = Math.round(Math.max(size.min, Math.min(size.max, room, wanted)));
      applyPanelWidth(name, width);
    };

    const onUp = () => {
      handle.removeEventListener("pointermove", onMove);
      handle.classList.remove("dragging");
      document.body.classList.remove("is-resizing");
      if (width != null) writePref(size.pref, width);
    };

    handle.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      width = null;
      handle.setPointerCapture(e.pointerId);
      handle.classList.add("dragging");
      document.body.classList.add("is-resizing");
      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onUp, { once: true });
      handle.addEventListener("pointercancel", onUp, { once: true });
    });

    handle.addEventListener("dblclick", () => {
      applyPanelWidth(name, null);
      writePref(size.pref, null);
    });
  });
}

async function duplicateDocument(section, filename) {
  if (currentFile.section === section && currentFile.filename === filename && isDirty) {
    await saveCurrentFile();
  }
  const { ok, data } = await postJSON('/duplicate_item', { section, filename });
  if (!ok) return showToast(data.error || "Could not duplicate");
  await loadAll();
  showToast(`Duplicated as "${data.title}".`, "info");
}

async function duplicateFolderItem(section, folderId) {
  if (isDirty) await saveCurrentFile();
  const { ok, data } = await postJSON('/duplicate_folder', { section, folder_id: folderId });
  if (!ok) return showToast(data.error || "Could not duplicate the folder");
  await loadAll();
  showToast(`Duplicated as "${data.title}".`, "info");
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

  updateAiSummary();
}
