"""Version history and the Trash: keep old text and deleted items, and bring them back."""

import os
import re
import shutil
from datetime import datetime
from flask import request, jsonify, Blueprint

from sjb import paths
from sjb.storage import (
    DOC_EXT, SECTIONS, count_words, doc_name, doc_stem, is_safe_name, load_json,
    read_doc, save_json, write_doc,
)
from sjb.library import (
    ensure_structure, find_file_item, free_name, get_base_path, get_current_project,
    get_state_file, insert_into_tree,
)

bp = Blueprint("history", __name__)

# ===================== VERSION HISTORY & TRASH =====================
# Each section folder keeps hidden .history/<file>/ and .trash/ folders.

HISTORY_MIN_INTERVAL = 5 * 60   # seconds between automatic versions of one file
HISTORY_KEEP = 50               # versions kept per file
VERSION_ID = re.compile(r"^\d{8}-\d{6}(-\d+)?$")   # timestamp, plus -2, -3… within one second


def version_time(version_id):
    return datetime.strptime(version_id[:15], "%Y%m%d-%H%M%S")


def history_dir(section, filename):
    return os.path.join(get_base_path(section), ".history", doc_stem(filename))


def version_path(section, filename, version_id):
    """A version's file: .md now, .json for versions kept before the switch."""
    folder = history_dir(section, filename)
    for ext in (DOC_EXT, ".json"):
        path = os.path.join(folder, f"{version_id}{ext}")
        if os.path.exists(path):
            return path
    return None


def list_versions(section, filename):
    folder = history_dir(section, filename)
    if not os.path.isdir(folder):
        return []
    return sorted({
        doc_stem(f) for f in os.listdir(folder)
        if (f.endswith(DOC_EXT) or f.endswith(".json")) and VERSION_ID.match(doc_stem(f))
    })


def snapshot_file(section, filename, force=False):
    """Copy the file as it is now into its history before it changes."""
    src = os.path.join(get_base_path(section), filename)
    if not os.path.exists(src):
        return

    versions = list_versions(section, filename)
    folder = history_dir(section, filename)
    now = datetime.now()

    if versions:
        if not force and (now - version_time(versions[-1])).total_seconds() < HISTORY_MIN_INTERVAL:
            return

        # Nothing new to keep if the text matches the newest version
        newest = read_doc(version_path(section, filename, versions[-1]) or "") or {}
        current = read_doc(src) or {}
        if newest.get("content") == current.get("content"):
            return

    base_id = now.strftime("%Y%m%d-%H%M%S")
    version_id, n = base_id, 1
    while version_id in versions:
        n += 1
        version_id = f"{base_id}-{n}"

    os.makedirs(folder, exist_ok=True)
    shutil.copyfile(src, os.path.join(folder, f"{version_id}{DOC_EXT}"))

    # Drop the oldest versions beyond the limit
    for old in versions[:max(0, len(versions) + 1 - HISTORY_KEEP)]:
        old_path = version_path(section, filename, old)
        if old_path:
            os.remove(old_path)


def move_to_trash(path, trash_root):
    """Move a file or folder into trash_root instead of deleting it."""
    os.makedirs(trash_root, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    name = os.path.basename(path)
    dest, n = os.path.join(trash_root, f"{stamp}-{name}"), 1
    while os.path.exists(dest):
        n += 1
        dest = os.path.join(trash_root, f"{stamp}-{n}-{name}")
    shutil.move(path, dest)
    return os.path.basename(dest)


TRASH_NAME = re.compile(r"^(\d{8}-\d{6})(?:-\d+)?-(.+)$")


def trash_index_path(trash_root):
    # Hidden, so trash listings skip it
    return os.path.join(trash_root, ".index.json")


def load_trash_index(trash_root):
    path = trash_index_path(trash_root)
    return (load_json(path) or {}) if os.path.exists(path) else {}


def remember_trash(trash_root, trash_name, info):
    """Note where a trashed file came from, so Restore can put it back."""
    index = load_trash_index(trash_root)
    index[trash_name] = info
    save_json(trash_index_path(trash_root), index)


def forget_trash(trash_root, trash_name):
    index = load_trash_index(trash_root)
    if index.pop(trash_name, None) is not None:
        save_json(trash_index_path(trash_root), index)


def trash_roots():
    """Each trash folder the Trash window shows: (kind, section, path)."""
    roots = [("file", section, os.path.join(get_base_path(section), ".trash"))
             for section in ("writing", "background", "system", "prompts")]
    roots.append(("project", None, os.path.join(paths.PROJECTS_DIR, ".trash")))
    return roots


# ----- VERSION HISTORY -----

@bp.route('/file_history', methods=['POST'])
def api_file_history():
    ensure_structure()

    data = request.json
    section = data.get("section")
    filename = data.get("filename")

    if not section or not filename:
        return jsonify({"error": "Missing data"}), 400

    versions = []
    for version_id in reversed(list_versions(section, filename)):
        version = read_doc(version_path(section, filename, version_id) or "") or {}
        versions.append({
            "id": version_id,
            "time": version_time(version_id).isoformat(),
            "title": version.get("title", ""),
            "words": count_words(version.get("content", ""))
        })

    return jsonify({"versions": versions})


@bp.route('/file_version', methods=['POST'])
def api_file_version():
    ensure_structure()

    data = request.json
    section = data.get("section")
    filename = data.get("filename")
    version_id = data.get("id", "")

    if not section or not filename or not VERSION_ID.match(version_id):
        return jsonify({"error": "Missing data"}), 400

    path = version_path(section, filename, version_id)
    if not path:
        return jsonify({"error": "Version not found"}), 404

    version = read_doc(path) or {}
    return jsonify({
        "title": version.get("title", ""),
        "content": version.get("content", "")
    })


@bp.route('/restore_version', methods=['POST'])
def api_restore_version():
    ensure_structure()

    data = request.json
    section = data.get("section")
    filename = data.get("filename")
    version_id = data.get("id", "")

    if not section or not filename or not VERSION_ID.match(version_id):
        return jsonify({"error": "Missing data"}), 400

    file_path = os.path.join(get_base_path(section), filename)
    saved_version = version_path(section, filename, version_id)

    if not os.path.exists(file_path) or not saved_version:
        return jsonify({"error": "Version not found"}), 404

    version = read_doc(saved_version) or {}
    content = version.get("content", "")
    title = version.get("title") or (read_doc(file_path) or {}).get("title", "")
    word_count = count_words(content)

    # Keep the current text as a version too, so a restore can be undone
    snapshot_file(section, filename, force=True)

    write_doc(file_path, title, content)

    state_file = get_state_file(section)
    state = load_json(state_file)
    item = find_file_item(state.get(section, []), filename)
    if item:
        item["title"] = title
        item["wordCount"] = word_count
    save_json(state_file, state)

    return jsonify({
        "status": "restored",
        "title": title,
        "content": content,
        "wordCount": word_count
    })


# ----- TRASH -----

@bp.route('/trash', methods=['GET'])
def api_trash():
    ensure_structure()
    items = []

    for kind, section, root in trash_roots():
        if not os.path.isdir(root):
            continue
        index = load_trash_index(root)

        for name in os.listdir(root):
            match = TRASH_NAME.match(name)
            if name.startswith(".") or not match:
                continue
            path = os.path.join(root, name)
            original = index.get(name, {}).get("filename") or match.group(2)

            if kind == "project":
                if not os.path.isdir(path):
                    continue
                meta = load_json(os.path.join(path, "project.json")) or {}
                title = meta.get("title") or original
            else:
                data = read_doc(path) or {}
                title = data.get("title") or doc_stem(original)

            items.append({
                "kind": kind,
                "section": section,
                "trash_name": name,
                "original": original,
                "title": title,
                "deleted": version_time(match.group(1)).isoformat()
            })

    items.sort(key=lambda i: i["trash_name"], reverse=True)
    return jsonify({"items": items, "project": get_current_project()})


@bp.route('/restore_trash', methods=['POST'])
def api_restore_trash():
    ensure_structure()

    data = request.json
    kind = data.get("kind")
    section = data.get("section")
    trash_name = data.get("trash_name")

    if not is_safe_name(trash_name) or not TRASH_NAME.match(trash_name):
        return jsonify({"error": "Invalid trash item"}), 400

    if kind == "project":
        root = os.path.join(paths.PROJECTS_DIR, ".trash")
        src = os.path.join(root, trash_name)
        if not os.path.isdir(src):
            return jsonify({"error": "Item not found"}), 404

        project = TRASH_NAME.match(trash_name).group(2)
        if os.path.exists(os.path.join(paths.PROJECTS_DIR, project)):
            project = free_name(lambda c: os.path.exists(os.path.join(paths.PROJECTS_DIR, c)), project)
        dest = os.path.join(paths.PROJECTS_DIR, project)
        shutil.move(src, dest)

        meta_path = os.path.join(dest, "project.json")
        meta = load_json(meta_path) or {}
        if meta and meta.get("id") != project:
            save_json(meta_path, {**meta, "id": project})
        return jsonify({"status": "restored", "project": project})

    if section not in SECTIONS:
        return jsonify({"error": "Missing data"}), 400

    base_path = get_base_path(section)
    root = os.path.join(base_path, ".trash")
    src = os.path.join(root, trash_name)
    if not os.path.isfile(src):
        return jsonify({"error": "Item not found"}), 404

    info = load_trash_index(root).get(trash_name, {})
    filename = info.get("filename") or TRASH_NAME.match(trash_name).group(2)
    if not is_safe_name(filename):
        return jsonify({"error": "Invalid trash item"}), 400

    # Never overwrite a document that took the name in the meantime
    # Documents trashed before the switch to Markdown come back as .md
    stem = doc_stem(filename)
    if os.path.exists(os.path.join(base_path, doc_name(stem))):
        stem = free_name(lambda c: os.path.exists(os.path.join(base_path, doc_name(c))), stem)
    filename = doc_name(stem)

    doc = read_doc(src) or {}
    content = doc.get("content", "")
    title = doc.get("title") or stem
    if src.endswith(DOC_EXT):
        # Keep its header lines: move it back, then set the title
        shutil.move(src, os.path.join(base_path, filename))
        write_doc(os.path.join(base_path, filename), title, content)
    else:
        write_doc(os.path.join(base_path, filename), title, content)
        os.remove(src)
    forget_trash(root, trash_name)

    # Back into its old folder, or the top level if that folder is gone
    state_file = get_state_file(section)
    state = load_json(state_file)
    tree = state.setdefault(section, [])
    insert_into_tree(tree, {
        "type": "file", "filename": filename, "title": title, "wordCount": count_words(content)
    }, folder_id=info.get("folder"))
    save_json(state_file, state)

    return jsonify({"status": "restored", "section": section, "filename": filename})


@bp.route('/empty_trash', methods=['POST'])
def api_empty_trash():
    """Delete for good everything the Trash window shows. The client asks first."""
    ensure_structure()
    removed = 0
    for _kind, _section, root in trash_roots():
        if os.path.isdir(root):
            removed += len([n for n in os.listdir(root) if not n.startswith(".")])
            shutil.rmtree(root)
    return jsonify({"status": "emptied", "removed": removed})
