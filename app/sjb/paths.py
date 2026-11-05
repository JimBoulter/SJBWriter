"""Where the app's settings live, and where the writer's books live (movable at run time)."""

import os
import json

# The app/ folder (this file sits in app/sjb/)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# ===================== PATH CONFIG =====================
APP_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))

# App settings stay with the app: API key, model lists, app state
GLOBAL_DIR = os.path.join(APP_ROOT, "Global")
APP_STATE = os.path.join(GLOBAL_DIR, "app_state.json")

# The shipped sample project; new projects copy its menu
SAMPLE_PROJECT_STATE = os.path.join(APP_ROOT, "Projects", "sample-project", "state.json")

# The writer's books: prompts, system rules, their menu, and all projects.
# They live in the app folder unless the writer picks another folder in
# Settings (saved in data_folder.json), for example inside an Obsidian vault.
DATA_FOLDER_FILE = os.path.join(APP_ROOT, "data_folder.json")


def saved_data_folder():
    try:
        with open(DATA_FOLDER_FILE, "r", encoding="utf-8") as f:
            path = json.load(f).get("path")
        return path if isinstance(path, str) and path else None
    except (OSError, ValueError, AttributeError):
        return None


def set_data_root(root):
    """Point every book path at root. Takes effect at once; no restart needed."""
    global DATA_ROOT, LIBRARY_DIR, GLOBAL_STATE, PROJECTS_DIR, DOCUMENTS_MIGRATED
    DATA_ROOT = os.path.abspath(root)
    LIBRARY_DIR = os.path.join(DATA_ROOT, "Global")     # prompts, system, state.json
    GLOBAL_STATE = os.path.join(LIBRARY_DIR, "state.json")
    PROJECTS_DIR = os.path.join(DATA_ROOT, "Projects")
    DOCUMENTS_MIGRATED = False


# A chosen folder that is missing (an unplugged drive) falls back to the app
# folder; the page warns about it
set_data_root(saved_data_folder() if saved_data_folder() and os.path.isdir(saved_data_folder()) else APP_ROOT)
