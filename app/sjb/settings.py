"""Settings routes: the API key, app settings, and the Books folder."""

import os
import json
import shutil
import subprocess
from flask import request, jsonify, Blueprint

from sjb import paths
from sjb.paths import (
    APP_ROOT, APP_STATE, DATA_FOLDER_FILE, GLOBAL_DIR, saved_data_folder,
    set_data_root,
)
from sjb.storage import save_json
from sjb.library import ensure_structure, load_app_state, write_app_state

bp = Blueprint("settings", __name__)

@bp.route('/save_api_key', methods=['POST'])
def api_save_api_key():
    data = request.json
    api_key = data.get("apiKey")

    if not api_key:
        return jsonify({"error": "Missing API key"}), 400

    config_path = os.path.join(GLOBAL_DIR, "config.json")

    # Load existing config if exists
    if os.path.exists(config_path):
        with open(config_path, "r") as f:
            config = json.load(f)
    else:
        config = {}

    config["openrouter_api_key"] = api_key

    save_json(config_path, config)

    return jsonify({"status": "saved"})


@bp.route('/api_key_status', methods=['GET'])
def api_key_status():
    config_path = os.path.join(GLOBAL_DIR, "config.json")

    if not os.path.exists(config_path):
        return jsonify({"status": "missing"})

    with open(config_path, "r") as f:
        config = json.load(f)

    if config.get("openrouter_api_key"):
        return jsonify({"status": "saved"})
    else:
        return jsonify({"status": "missing"})


# ----- BOOKS FOLDER (Settings) -----

def has_books(root):
    return os.path.isdir(os.path.join(root, "Projects")) or \
        os.path.exists(os.path.join(root, "Global", "state.json"))


def inside(path, parent):
    path, parent = os.path.realpath(path), os.path.realpath(parent)
    return path == parent or path.startswith(parent + os.sep)


def copy_books(src_root, dest_root):
    """Copy prompts, system rules, their menu, and all projects. The originals stay."""
    skip = shutil.ignore_patterns(".tmp-*", ".DS_Store")
    for part in (("Global", "prompts"), ("Global", "system"), ("Projects",)):
        src = os.path.join(src_root, *part)
        if os.path.isdir(src):
            shutil.copytree(src, os.path.join(dest_root, *part), ignore=skip, dirs_exist_ok=True)
    state = os.path.join(src_root, "Global", "state.json")
    if os.path.exists(state):
        shutil.copy2(state, os.path.join(dest_root, "Global", "state.json"))


def data_folder_status():
    saved = saved_data_folder()
    return {
        "path": paths.DATA_ROOT,
        "isAppFolder": paths.DATA_ROOT == APP_ROOT,
        "missing": saved if saved and not os.path.isdir(saved) else None
    }


@bp.route('/data_folder', methods=['GET'])
def api_data_folder():
    return jsonify(data_folder_status())


@bp.route('/choose_data_folder', methods=['POST'])
def api_choose_data_folder():
    """Open the Mac "Choose folder" window. A web page cannot see real paths,
    so the server asks. Other systems get {"error": "no-picker"}; the page
    then asks for a typed path."""
    if shutil.which("osascript") is None:
        return jsonify({"error": "no-picker"})
    script = [
        "-e", "activate",
        "-e", 'POSIX path of (choose folder with prompt "Choose the folder for your books")'
    ]
    try:
        result = subprocess.run(["osascript", *script], capture_output=True, text=True, timeout=600)
    except subprocess.TimeoutExpired:
        return jsonify({"cancelled": True})
    if result.returncode != 0:
        return jsonify({"cancelled": True})   # the writer clicked Cancel
    path = os.path.abspath(result.stdout.strip())
    return jsonify({"path": path, "hasBooks": has_books(path)})


@bp.route('/folder_info', methods=['POST'])
def api_folder_info():
    """For a typed path: does it exist, and does it hold books already?"""
    path = os.path.abspath(os.path.expanduser(str((request.json or {}).get("path") or "")))
    return jsonify({"path": path, "exists": os.path.isdir(path), "hasBooks": has_books(path)})


@bp.route('/set_data_folder', methods=['POST'])
def api_set_data_folder():
    data = request.json or {}
    target = data.get("path")
    copy = bool(data.get("copy"))

    if target:
        target = os.path.abspath(os.path.expanduser(str(target)))
        if not os.path.isdir(target):
            return jsonify({"error": "That folder does not exist."}), 400
        if not os.access(target, os.W_OK):
            return jsonify({"error": "The app cannot write to that folder."}), 400
        if inside(target, paths.PROJECTS_DIR) or inside(target, paths.LIBRARY_DIR):
            return jsonify({"error": "Pick a folder outside your current books."}), 400
        if os.path.realpath(target) == os.path.realpath(APP_ROOT):
            target = None   # the app folder is the default

    if target and copy:
        if has_books(target):
            return jsonify({"error": "That folder already has books. Use them instead of copying."}), 400
        copy_books(paths.DATA_ROOT, target)

    if target:
        save_json(DATA_FOLDER_FILE, {"path": target})
    elif os.path.exists(DATA_FOLDER_FILE):
        os.remove(DATA_FOLDER_FILE)
    set_data_root(target or APP_ROOT)

    # Open a project that exists in the new place
    app_state = load_app_state()
    projects = sorted(
        p for p in (os.listdir(paths.PROJECTS_DIR) if os.path.isdir(paths.PROJECTS_DIR) else [])
        if not p.startswith(".") and os.path.isdir(os.path.join(paths.PROJECTS_DIR, p))
    )
    if app_state.get("current_project") not in projects:
        app_state["current_project"] = projects[0] if projects else "default"
    app_state["recent_projects"] = [p for p in app_state.get("recent_projects", []) if p in projects]
    write_app_state(app_state)
    ensure_structure()

    return jsonify({"status": "set", **data_folder_status()})


@bp.route('/save_app_state', methods=['POST'])
def api_save_app_state():

    data = request.json

    state = load_app_state()

    state.update(data)

    save_json(APP_STATE, state)

    return jsonify({"status": "saved"})
