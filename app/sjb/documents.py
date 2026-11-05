"""Routes for documents and folders: create, open, save, rename, move, duplicate, delete."""

import os
import shutil
from flask import request, jsonify, Blueprint

from sjb import paths
from sjb.storage import (
    SECTIONS, changed_outside, count_words, doc_name, doc_stem, load_json, read_doc,
    remember_mtime, save_json, slugify, write_doc,
)
from sjb.library import (
    add_word_counts, ensure_structure, find_file_item, find_folder, folder_ids,
    free_name, get_base_path, get_project_state, get_state_file, insert_into_tree,
    load_app_state, parent_folder_id, remove_file_from_tree, remove_folder,
    set_global_last_opened, set_project_last_opened, sync_tree_with_disk,
)
from sjb.history import history_dir, move_to_trash, remember_trash, snapshot_file

bp = Blueprint("documents", __name__)

@bp.route('/load', methods=['GET'])
def api_load_all():
    ensure_structure()

    global_state = load_json(paths.GLOBAL_STATE)
    project_state = load_json(get_project_state())

    # The folders are the truth: pick up files added or removed outside the app
    for state, state_path, sections in (
        (global_state, paths.GLOBAL_STATE, ("prompts", "system")),
        (project_state, get_project_state(), ("background", "writing"))
    ):
        any_change = False
        for section in sections:
            state[section], changed = sync_tree_with_disk(section, state.get(section))
            any_change = any_change or changed
        if any_change:
            save_json(state_path, state)

    # Counts come from the files themselves, so files never saved here still have one
    for section in ("prompts", "system"):
        add_word_counts(section, global_state.get(section))
    for section in ("background", "writing"):
        add_word_counts(section, project_state.get(section))

    return jsonify({
        "global": global_state,
        "project": project_state,
        "app_state": load_app_state()
    })


@bp.route('/opened_file', methods=['POST'])
def api_opened_file():
    ensure_structure()

    data = request.json

    section = data.get("section")
    filename = data.get("filename")

    if not section or not filename:
        return jsonify({"error": "Missing data"}), 400

    # Always update global memory
    set_global_last_opened(section, filename)

    # Only project sections update project memory
    if section in ["background", "writing"]:
        set_project_last_opened(section, filename)

    return jsonify({"status": "updated"})


@bp.route('/save_order', methods=['POST'])
def api_save_order():
    ensure_structure()

    data = request.json

    section = data.get("section")
    items = data.get("items")

    if not section or items is None:
        return jsonify({"error": "Missing data"}), 400

    state_file = get_state_file(section)

    state = load_json(state_file)

    state[section] = items

    save_json(state_file, state)

    return jsonify({"status": "saved"})













# -------create project files---------
@bp.route('/create_item', methods=['POST'])
def api_create_item():
    ensure_structure()

    data = request.json
    section = data.get("section")
    title = data.get("title")

    if not section or not title:
        return jsonify({"error": "Missing data"}), 400

    filename = doc_name(slugify(title))

    base_path = get_base_path(section)
    state_file = get_state_file(section)
    state_key = section



    file_path = os.path.join(base_path, filename)

    # Prevent overwrite
    if os.path.exists(file_path):
        return jsonify({"error": "File already exists"}), 400

    # Create file
    write_doc(file_path, title, "")

    # Update state
    state = load_json(state_file)

    state[state_key].append({
        "type": "file",
        "filename": filename,
        "title": title,
        "wordCount": 0
    })


    save_json(state_file, state)

    return jsonify({"status": "created", "filename": filename})


@bp.route('/create_item_in_folder', methods=['POST'])
def api_create_item_in_folder():

    ensure_structure()

    data = request.json

    section = data.get("section")
    folder_id = data.get("folder_id")
    title = data.get("title")

    if not section or not folder_id or not title:
        return jsonify({
            "error": "Missing data"
        }), 400

    filename = doc_name(slugify(title))

    base_path = get_base_path(section)

    file_path = os.path.join(
        base_path,
        filename
    )

    if os.path.exists(file_path):
        return jsonify({
            "error": "File already exists"
        }), 400

    write_doc(file_path, title, "")

    state_file = get_state_file(section)

    state = load_json(state_file)

    folder = find_folder(
        state[section],
        folder_id
    )

    if not folder:

        return jsonify({
            "error": "Folder not found"
        }), 404

    folder["items"].append({
        "type": "file",
        "filename": filename,
        "title": title,
        "wordCount": 0
    })

    save_json(
        state_file,
        state
    )

    return jsonify({
        "status": "created",
        "filename": filename
    })


# -------save project files---------
@bp.route('/save_file', methods=['POST'])
def api_save_file():
    ensure_structure()

    data = request.json
    section = data.get("section")
    filename = data.get("filename")
    content = data.get("content")
    title = data.get("title")
    word_count = count_words(content)

    if not section or not filename:
        return jsonify({"error": "Missing data"}), 400

    base_path = get_base_path(section)

    file_path = os.path.join(base_path, filename)

    if not os.path.exists(file_path):
        return jsonify({"error": "File not found"}), 404

    # Another program (Obsidian) changed the file since the app read it:
    # keep that version in history before the app's text replaces it
    outside = changed_outside(file_path)

    # Keep the previous text as a version before overwriting it
    previous = read_doc(file_path) or {}
    if previous.get("content") and previous.get("content") != content:
        snapshot_file(section, filename, force=outside)

    write_doc(file_path, title, content)

    # Update last opened + title in state
    state_file = get_state_file(section)

    state = load_json(state_file)

    # Update title in state
    item = find_file_item(
        state.get(section, []),
        filename
    )

    if item:
        item["title"] = title
        item["wordCount"] = word_count

    save_json(state_file, state)


    return jsonify({
        "status": "saved",
        "wordCount": word_count,
        "changedOutside": outside and previous.get("content") != content
    })


# -------create folders---------
@bp.route('/create_folder', methods=['POST'])
def api_create_folder():
    ensure_structure()

    data = request.json

    section = data.get("section")
    title = data.get("title")

    if not section or not title:
        return jsonify({"error": "Missing data"}), 400

    state_file = get_state_file(section)

    state = load_json(state_file)

    state[section].append({
        "type": "folder",
        "id": slugify(title),
        "title": title,
        "collapsed": False,
        "items": []
    })

    save_json(state_file, state)

    return jsonify({"status": "created"})



# -------load project files---------
@bp.route('/load_file', methods=['POST'])
def api_load_file():
    ensure_structure()

    data = request.json

    section = data.get("section")
    filename = data.get("filename")

    if not section or not filename:
        return jsonify({"error": "Missing data"}), 400

    base_path = get_base_path(section)

    file_path = os.path.join(base_path, filename)

    if not os.path.exists(file_path):
        return jsonify({"error": "File not found"}), 404

    # Opened for editing: from now on, a change by another program is noticed
    remember_mtime(file_path)
    return jsonify(read_doc(file_path) or {})


@bp.route('/file_status', methods=['POST'])
def api_file_status():
    """Whether the open document still exists, and whether another program changed it."""
    data = request.json
    section, filename = data.get("section"), data.get("filename")
    if not section or not filename:
        return jsonify({"error": "Missing data"}), 400
    path = os.path.join(get_base_path(section), filename)
    return jsonify({"exists": os.path.exists(path), "changedOutside": changed_outside(path)})



# -------persist project folder state---------
@bp.route('/update_folder_state', methods=['POST'])
def api_update_folder_state():
    ensure_structure()

    data = request.json

    section = data.get("section")
    state_data = data.get("state")

    if not section or state_data is None:
        return jsonify({"error": "Missing data"}), 400

    state_file = get_state_file(section)

    state = load_json(state_file)

    state[section] = state_data

    save_json(state_file, state)

    return jsonify({"status": "saved"})



# ----- ELLIPSIS MENU ITEMS ----

@bp.route('/delete_item', methods=['POST'])
def api_delete_item():
    ensure_structure()

    data = request.json
    section = data.get("section")
    filename = data.get("filename")

    if not section or not filename:
        return jsonify({"error": "Missing data"}), 400

    # Determine path + state
    base_path = get_base_path(section)
    state_file = get_state_file(section)

    file_path = os.path.join(base_path, filename)

    if not os.path.exists(file_path):
        return jsonify({"error": "File not found"}), 404

    state = load_json(state_file)
    folder_id = parent_folder_id(state.get(section, []), filename)

    # Move the file to the section's trash instead of deleting it
    trash_root = os.path.join(base_path, ".trash")
    trash_name = move_to_trash(file_path, trash_root)
    remember_trash(trash_root, trash_name, {"filename": filename, "folder": folder_id or None})

    # Update state

    state[section] = remove_file_from_tree(state.get(section, []), filename)

    # Clear last opened if needed
    if section in ["prompts", "system"]:
        key = "last_opened_global"
    else:
        key = "last_opened_project"

    if state.get(key, {}).get("filename") == filename:
        state[key] = {}


    save_json(state_file, state)

    return jsonify({"status": "deleted"})



@bp.route('/rename_item', methods=['POST'])
def api_rename_item():
    ensure_structure()

    data = request.json
    section = data.get("section")
    filename = data.get("filename")
    new_title = data.get("title")

    if not section or not filename or not new_title:
        return jsonify({"error": "Missing data"}), 400

    new_filename = doc_name(slugify(new_title))

    base_path = get_base_path(section)
    state_file = get_state_file(section)

    old_path = os.path.join(base_path, filename)
    new_path = os.path.join(base_path, new_filename)

    if not os.path.exists(old_path):
        return jsonify({"error": "File not found"}), 404

    if os.path.exists(new_path):
        return jsonify({"error": "Target filename exists"}), 400


    # Same text (and header lines) under the new name and title
    content = (read_doc(old_path) or {}).get("content", "")
    os.rename(old_path, new_path)
    write_doc(new_path, new_title, content)

    # Version history follows the file to its new name
    old_history = history_dir(section, filename)
    new_history = history_dir(section, new_filename)
    if os.path.isdir(old_history) and not os.path.exists(new_history):
        os.rename(old_history, new_history)

    # Update state
    state = load_json(state_file)

    item = find_file_item(
        state.get(section, []),
        filename
    )

    if item:
        item["filename"] = new_filename
        item["title"] = new_title

    if section in ["prompts", "system"]:
        key = "last_opened_global"
    else:
        key = "last_opened_project"

    if state.get(key, {}).get("filename") == filename:
        state[key]["filename"] = new_filename


    save_json(state_file, state)

    return jsonify({
        "status": "renamed",
        "filename": new_filename
    })


@bp.route('/rename_folder', methods=['POST'])
def api_rename_folder():

    ensure_structure()

    data = request.json

    section = data.get("section")
    folder_id = data.get("folder_id")
    new_title = data.get("title")

    if not section or not folder_id or not new_title:
        return jsonify({
            "error": "Missing data"
        }), 400

    state_file = get_state_file(section)

    state = load_json(state_file)

    folder = find_folder(
        state.get(section, []),
        folder_id
    )

    if not folder:
        return jsonify({
            "error": "Folder not found"
        }), 404

    folder["title"] = new_title

    save_json(
        state_file,
        state
    )

    return jsonify({
        "status": "renamed"
    })


@bp.route('/delete_folder', methods=['POST'])
def api_delete_folder():

    ensure_structure()

    data = request.json

    section = data.get("section")
    folder_id = data.get("folder_id")

    if not section or not folder_id:
        return jsonify({
            "error": "Missing data"
        }), 400

    state_file = get_state_file(section)

    state = load_json(state_file)

    folder = find_folder(
        state.get(section, []),
        folder_id
    )

    if not folder:
        return jsonify({
            "error": "Folder not found"
        }), 404

    if folder.get("items"):
        return jsonify({
            "error": "Folder is not empty"
        }), 400

    remove_folder(
        state[section],
        folder_id
    )

    save_json(
        state_file,
        state
    )

    return jsonify({
        "status": "deleted"
    })


# ----- DUPLICATE A DOCUMENT OR FOLDER -----

def copy_document(section, filename, mark_copy=True):
    """Copy one document file; returns its new sidebar entry."""
    base = get_base_path(section)
    data = read_doc(os.path.join(base, filename)) or {}
    stem = doc_stem(filename)
    new_stem = free_name(lambda c: os.path.exists(os.path.join(base, doc_name(c))), stem)
    title = data.get("title") or stem
    if mark_copy:
        title = f"{title} (copy)"
    content = data.get("content", "")
    write_doc(os.path.join(base, doc_name(new_stem)), title, content)
    return {"type": "file", "filename": doc_name(new_stem), "title": title, "wordCount": count_words(content)}


def copy_folder(section, folder, taken_ids):
    """Copy a folder and everything in it; documents inside keep their titles."""
    new_id = free_name(lambda c: c in taken_ids, folder.get("id") or "folder")
    taken_ids.add(new_id)
    items = []
    for item in folder.get("items", []):
        if isinstance(item, dict) and item.get("type") == "folder":
            items.append(copy_folder(section, item, taken_ids))
        else:
            filename = item if isinstance(item, str) else item.get("filename")
            if filename and os.path.exists(os.path.join(get_base_path(section), filename)):
                items.append(copy_document(section, filename, mark_copy=False))
    return {
        "type": "folder",
        "id": new_id,
        "title": folder.get("title"),
        "collapsed": folder.get("collapsed", False),
        "items": items
    }


def insert_after_folder(items, folder_id, entry):
    for i, item in enumerate(items):
        if isinstance(item, dict) and item.get("type") == "folder":
            if item.get("id") == folder_id:
                items.insert(i + 1, entry)
                return True
            if insert_after_folder(item.get("items", []), folder_id, entry):
                return True
    return False


@bp.route('/duplicate_item', methods=['POST'])
def api_duplicate_item():
    ensure_structure()
    data = request.json
    section = data.get("section")
    filename = data.get("filename")

    if not section or not filename:
        return jsonify({"error": "Missing data"}), 400
    if not os.path.exists(os.path.join(get_base_path(section), filename)):
        return jsonify({"error": "File not found"}), 404

    entry = copy_document(section, filename)
    state_file = get_state_file(section)
    state = load_json(state_file)
    insert_into_tree(state.setdefault(section, []), entry, target_filename=filename, position="after")
    save_json(state_file, state)
    return jsonify({"status": "duplicated", "filename": entry["filename"], "title": entry["title"]})


@bp.route('/duplicate_folder', methods=['POST'])
def api_duplicate_folder():
    ensure_structure()
    data = request.json
    section = data.get("section")
    folder_id = data.get("folder_id")

    if not section or not folder_id:
        return jsonify({"error": "Missing data"}), 400

    state_file = get_state_file(section)
    state = load_json(state_file)
    tree = state.setdefault(section, [])
    folder = find_folder(tree, folder_id)
    if not folder:
        return jsonify({"error": "Folder not found"}), 404

    copy = copy_folder(section, folder, folder_ids(tree))
    copy["title"] = f"{folder.get('title')} (copy)"
    insert_after_folder(tree, folder_id, copy)
    save_json(state_file, state)
    return jsonify({"status": "duplicated", "folder_id": copy["id"], "title": copy["title"]})


# ----- MOVE A FILE TO ANOTHER SECTION -----

@bp.route('/move_file_section', methods=['POST'])
def api_move_file_section():
    ensure_structure()

    data = request.json
    from_section = data.get("from_section")
    to_section = data.get("section")
    filename = data.get("filename")

    if from_section not in SECTIONS or not to_section or not filename:
        return jsonify({"error": "Missing data"}), 400

    if from_section == to_section:
        return jsonify({"error": "File is already in this section"}), 400

    src = os.path.join(get_base_path(from_section), filename)
    dest = os.path.join(get_base_path(to_section), filename)

    if not os.path.exists(src):
        return jsonify({"error": "File not found"}), 404

    if os.path.exists(dest):
        return jsonify({
            "error": f"{to_section.title()} already has a file with this name"
        }), 400

    os.makedirs(os.path.dirname(dest), exist_ok=True)
    shutil.move(src, dest)

    # Version history follows the file
    old_history = history_dir(from_section, filename)
    new_history = history_dir(to_section, filename)
    if os.path.isdir(old_history) and not os.path.exists(new_history):
        os.makedirs(os.path.dirname(new_history), exist_ok=True)
        shutil.move(old_history, new_history)

    # Take it out of the source list (keeping its title and word count)
    source_state_file = get_state_file(from_section)
    source_state = load_json(source_state_file)
    old_item = find_file_item(source_state.get(from_section, []), filename)
    entry = {"type": "file", "filename": filename}
    if isinstance(old_item, dict):
        entry.update({k: old_item[k] for k in ("title", "wordCount") if k in old_item})
    source_state[from_section] = remove_file_from_tree(
        source_state.get(from_section, []), filename
    )
    save_json(source_state_file, source_state)

    # Put it into the target list; reload, as both lists may share a state file
    target_state_file = get_state_file(to_section)
    target_state = load_json(target_state_file)
    insert_into_tree(
        target_state.setdefault(to_section, []),
        entry,
        folder_id=data.get("folder_id"),
        target_filename=data.get("target_filename"),
        position=data.get("position", "after")
    )
    save_json(target_state_file, target_state)

    return jsonify({"status": "moved", "section": to_section, "filename": filename})
