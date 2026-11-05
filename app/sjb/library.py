"""Projects, sections, and the sidebar lists (trees) that hold the documents."""

import os
import shutil

from sjb import paths
from sjb.paths import APP_STATE, SAMPLE_PROJECT_STATE
from sjb.storage import (
    SECTIONS, count_words, doc_stem, is_doc_file, is_safe_name, load_json, read_doc,
    save_json,
)

# ===================== STRUCTURE INIT =====================
def ensure_structure():
    # Global folders
    os.makedirs(os.path.join(paths.LIBRARY_DIR, "prompts"), exist_ok=True)
    os.makedirs(os.path.join(paths.LIBRARY_DIR, "system"), exist_ok=True)

    # Global state
    if not os.path.exists(paths.GLOBAL_STATE):
        save_json(paths.GLOBAL_STATE, {
            "prompts": [],
            "system": [],
            "last_opened_global": {}
        })

    project_dir = get_project_dir()
    project_meta_path = os.path.join(project_dir, "project.json")
    # A fresh install has no project folder yet
    os.makedirs(project_dir, exist_ok=True)

    if not os.path.exists(project_meta_path):
        save_json(project_meta_path, {
            "id": get_current_project(),
            "title": get_current_project().replace("-", " ").title()
        })
    project_state = get_project_state()

    # Project folders
    os.makedirs(os.path.join(project_dir, "background"), exist_ok=True)
    os.makedirs(os.path.join(project_dir, "writing"), exist_ok=True)

    # Project state
    if not os.path.exists(project_state):
        if os.path.exists(SAMPLE_PROJECT_STATE):
            shutil.copy2(SAMPLE_PROJECT_STATE, project_state)
        else:
            raise FileNotFoundError(
                f"Sample project state not found: {SAMPLE_PROJECT_STATE}"
            )


def rename_in_tree(items, renamed):
    result = []
    for item in items or []:
        if isinstance(item, str):
            result.append(renamed.get(item, item))
            continue
        if isinstance(item, dict) and item.get("type") == "folder":
            item["items"] = rename_in_tree(item.get("items"), renamed)
        elif isinstance(item, dict) and item.get("filename") in renamed:
            item["filename"] = renamed[item["filename"]]
        result.append(item)
    return result


def tree_filenames(items):
    names = []
    for item in items or []:
        if isinstance(item, dict) and item.get("type") == "folder":
            names += tree_filenames(item.get("items"))
        elif isinstance(item, dict) and item.get("filename"):
            names.append(item["filename"])
        elif isinstance(item, str):
            names.append(item)
    return names


def sync_tree_with_disk(section, items):
    """Match a sidebar list to its folder: .md files made in another program
    (Obsidian) are added at the end; entries whose file is gone are dropped.
    Returns (items, changed)."""
    folder = get_base_path(section)
    if not os.path.isdir(folder):
        return items or [], False
    on_disk = {
        name for name in os.listdir(folder)
        if is_doc_file(name) and os.path.isfile(os.path.join(folder, name))
    }
    listed = set(tree_filenames(items))
    changed = False
    for name in listed - on_disk:
        items = remove_file_from_tree(items, name)
        changed = True
    for name in sorted(on_disk - listed):
        doc = read_doc(os.path.join(folder, name)) or {}
        items = (items or []) + [{"type": "file", "filename": name, "title": doc.get("title") or doc_stem(name)}]
        changed = True
    return items or [], changed


# ===================== APP STATE HELPERS =====================

def load_app_state():
    defaults = {
        "current_project": "default",
        "recent_projects": ["default"],
        "showWritingCounts": True,
        "showBackgroundCounts": True,
        "showPromptCounts": False,
        "showSystemCounts": False,
        "showFolderTotals": True,
        "editor_font": "Georgia",
        "editor_font_size": "16px"
    }

    if not os.path.exists(APP_STATE):
        save_json(APP_STATE, defaults)
        return defaults

    state = load_json(APP_STATE)

    changed = False

    for key, value in defaults.items():
        if key not in state:
            state[key] = value
            changed = True

    if changed:
        save_json(APP_STATE, state)

    return state


def write_app_state(state):
    save_json(APP_STATE, state)


def get_current_project():
    state = load_app_state()
    return state.get("current_project", "default")


def get_project_dir():
    project = get_current_project()
    if not is_safe_name(project):
        project = "default"
    return os.path.join(paths.PROJECTS_DIR, project)


def get_project_state():
    return os.path.join(get_project_dir(), "state.json")



def set_global_last_opened(section, filename):
    state = load_json(paths.GLOBAL_STATE)

    state["last_opened_global"] = {
        "project": get_current_project(),
        "section": section,
        "filename": filename
    }

    save_json(paths.GLOBAL_STATE, state)


def set_project_last_opened(section, filename):
    state = load_json(get_project_state())

    state["last_opened_project"] = {
        "section": section,
        "filename": filename
    }

    save_json(get_project_state(), state)

# ===================== FILE & CONTENT HELPERS =====================

def get_state_file(section):
    if section in ["prompts", "system"]:
        return paths.GLOBAL_STATE
    return get_project_state()

def get_base_path(section):
    if section in ["prompts", "system"]:
        return os.path.join(paths.LIBRARY_DIR, section)
    return os.path.join(get_project_dir(), section)

def load_file_content(section, filename):
    if section not in SECTIONS or not is_safe_name(filename):
        return ""

    base_path = get_base_path(section)
    file_path = os.path.join(base_path, filename)

    if not os.path.exists(file_path):
        return ""

    doc = read_doc(file_path)
    return doc["content"] if doc else ""


def add_word_counts(section, items):
    """Fill in every file's word count from its file, so the sidebar never shows (?)."""
    for item in items or []:
        if isinstance(item, dict) and item.get("type") == "folder":
            add_word_counts(section, item.get("items"))
        elif isinstance(item, dict) and item.get("filename"):
            item["wordCount"] = count_words(load_file_content(section, item["filename"]))


def parent_folder_id(items, filename, folder_id=None):
    """Id of the folder that holds filename; None at the top level."""
    for item in items:
        if isinstance(item, dict) and item.get("type") == "folder":
            found = parent_folder_id(item.get("items", []), filename, item.get("id"))
            if found is not False:
                return found
        elif (item.get("filename") if isinstance(item, dict) else item) == filename:
            return folder_id
    return False

def find_file_item(items, filename):

    for item in items:

        if (
            isinstance(item, dict)
            and item.get("type") == "file"
            and item.get("filename") == filename
        ):
            return item

        if (
            isinstance(item, dict)
            and item.get("type") == "folder"
        ):
            found = find_file_item(
                item.get("items", []),
                filename
            )

            if found:
                return found

    return None


def find_folder(items, folder_id):

    for item in items:

        if item.get("type") == "folder":

            if item.get("id") == folder_id:
                return item

            found = find_folder(
                item.get("items", []),
                folder_id
            )

            if found:
                return found

    return None

def remove_folder(items, folder_id):

    for i, item in enumerate(items):

        if (
            item.get("type") == "folder"
            and item.get("id") == folder_id
        ):
            return items.pop(i)

        if item.get("type") == "folder":

            removed = remove_folder(
                item.get("items", []),
                folder_id
            )

            if removed:
                return removed

    return None


def remove_file_from_tree(items, filename):
    result = []
    for item in items:
        if isinstance(item, dict) and item.get("type") == "folder":
            item["items"] = remove_file_from_tree(item.get("items", []), filename)
            result.append(item)
        elif isinstance(item, dict) and item.get("filename") == filename:
            continue  # drop it
        elif isinstance(item, str) and item == filename:
            continue  # drop it
        else:
            result.append(item)
    return result


def insert_into_tree(items, entry, folder_id=None, target_filename=None, position="after"):
    """Place entry inside a folder, next to a target file, or at the end."""
    if folder_id:
        folder = find_folder(items, folder_id)
        if folder:
            folder.setdefault("items", []).append(entry)
            return

    if target_filename:
        def place(level):
            for i, item in enumerate(level):
                if isinstance(item, dict) and item.get("type") == "folder":
                    if place(item.get("items", [])):
                        return True
                elif (item.get("filename") if isinstance(item, dict) else item) == target_filename:
                    level.insert(i if position == "before" else i + 1, entry)
                    return True
            return False

        if place(items):
            return

    items.append(entry)


# ----- FREE NAMES AND FOLDER IDS (for copies and restores) -----

def free_name(exists, stem):
    """stem-copy, then stem-copy-2, -3 ... whichever is free."""
    candidate, n = f"{stem}-copy", 1
    while exists(candidate):
        n += 1
        candidate = f"{stem}-copy-{n}"
    return candidate


def folder_ids(items):
    ids = set()
    for item in items or []:
        if isinstance(item, dict) and item.get("type") == "folder":
            ids.add(item.get("id"))
            ids |= folder_ids(item.get("items"))
    return ids
