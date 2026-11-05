"""The one-time switch from JSON documents to Markdown, and old page names."""

import os
import shutil
from flask import request

from sjb import paths
from sjb.storage import doc_name, doc_stem, load_json, save_json, write_doc
from sjb.library import free_name, rename_in_tree

# ===================== MIGRATION: JSON DOCUMENTS TO MARKDOWN =====================
# Runs once per start. Each JSON document becomes a .md file next to it, and
# the JSON file moves to <section>/.json-backup/. Running it again does nothing.

def migrate_section_folder(folder):
    """Convert one section folder; returns {old filename: new filename}."""
    renamed = {}
    if not os.path.isdir(folder):
        return renamed
    for name in sorted(os.listdir(folder)):
        path = os.path.join(folder, name)
        if name.startswith(".") or not name.endswith(".json") or not os.path.isfile(path):
            continue
        data = load_json(path)
        if not isinstance(data, dict) or not ("content" in data or "title" in data):
            continue   # not a document: leave it alone

        stem = doc_stem(name)
        if os.path.exists(os.path.join(folder, doc_name(stem))):
            stem = free_name(lambda c: os.path.exists(os.path.join(folder, doc_name(c))), stem)
        write_doc(os.path.join(folder, doc_name(stem)), data.get("title") or stem, data.get("content") or "")

        backup = os.path.join(folder, ".json-backup")
        os.makedirs(backup, exist_ok=True)
        dest, n = os.path.join(backup, name), 1
        while os.path.exists(dest):
            n += 1
            dest = os.path.join(backup, f"{doc_stem(name)}-{n}.json")
        shutil.move(path, dest)
        renamed[name] = doc_name(stem)
    return renamed


def migrate_state_file(state_path, folders, last_key):
    """Convert the folders' documents and point the state file's lists at the new names."""
    state = load_json(state_path) if os.path.exists(state_path) else None
    changed = False
    for section, folder in folders.items():
        renamed = migrate_section_folder(folder)
        if renamed and isinstance(state, dict):
            state[section] = rename_in_tree(state.get(section, []), renamed)
            last = state.get(last_key) or {}
            if last.get("section") == section and last.get("filename") in renamed:
                last["filename"] = renamed[last["filename"]]
            changed = True
    if changed and isinstance(state, dict):
        save_json(state_path, state)


def migrate_documents():
    migrate_state_file(
        paths.GLOBAL_STATE,
        {s: os.path.join(paths.LIBRARY_DIR, s) for s in ("prompts", "system")},
        "last_opened_global"
    )
    if not os.path.isdir(paths.PROJECTS_DIR):
        return
    for project in sorted(os.listdir(paths.PROJECTS_DIR)):
        project_dir = os.path.join(paths.PROJECTS_DIR, project)
        if project.startswith(".") or not os.path.isdir(project_dir):
            continue
        migrate_state_file(
            os.path.join(project_dir, "state.json"),
            {s: os.path.join(project_dir, s) for s in ("background", "writing")},
            "last_opened_project"
        )


def migrate_once():
    if not paths.DOCUMENTS_MIGRATED:
        paths.DOCUMENTS_MIGRATED = True
        migrate_documents()


def markdown_name(name):
    return doc_name(doc_stem(name)) if isinstance(name, str) and name.endswith(".json") else name


def accept_old_document_names():
    """A page opened before the switch to Markdown still sends x.json; use x.md.
    After the migration no .json documents exist, so the mapping is safe."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None
    for key in ("filename", "target_filename"):
        if key in data:
            data[key] = markdown_name(data[key])
    for key in ("system", "background", "writing"):
        if isinstance(data.get(key), list):
            data[key] = [markdown_name(n) for n in data[key]]
    if isinstance(data.get("items"), list):
        data["items"] = rename_in_tree(data["items"], OldNames())
    return None


class OldNames(dict):
    """rename_in_tree mapping that turns any x.json into x.md."""
    def __contains__(self, name):
        return isinstance(name, str) and name.endswith(".json")

    def __getitem__(self, name):
        return markdown_name(name)

    def get(self, name, default=None):
        return markdown_name(name) if name in self else default
