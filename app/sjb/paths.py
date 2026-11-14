
"""Where the app's settings live, and where the writer's books live (movable at run time)."""

import json
import os
import sys

# The app/ folder (this file sits in app/sjb/)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ===================== PATH CONFIG =====================

FROZEN = getattr(sys, "frozen", False)

if FROZEN:
    # PyInstaller's bundled, read-only resources
    RESOURCE_ROOT = sys._MEIPASS
    APP_ROOT = os.path.abspath(os.path.dirname(sys.executable))

    # Writable settings belong outside the app bundle
    SUPPORT_DIR = os.path.join(
        os.path.expanduser("~"),
        "Library",
        "Application Support",
        "SJB Writer",
    )
    os.makedirs(SUPPORT_DIR, exist_ok=True)

    GLOBAL_DIR = SUPPORT_DIR
    APP_STATE = os.path.join(SUPPORT_DIR, "app_state.json")
    DATA_FOLDER_FILE = os.path.join(SUPPORT_DIR, "data_folder.json")

    SAMPLE_PROJECT_STATE = os.path.join(
        RESOURCE_ROOT, "Projects", "sample-project", "state.json"
    )

    DEFAULT_DATA_ROOT = os.path.join(
        os.path.expanduser("~"), "Documents", "SJB Writer"
    )
else:
    # Preserve the existing source/development layout
    APP_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
    RESOURCE_ROOT = APP_ROOT

    GLOBAL_DIR = os.path.join(APP_ROOT, "Global")
    APP_STATE = os.path.join(GLOBAL_DIR, "app_state.json")
    DATA_FOLDER_FILE = os.path.join(APP_ROOT, "data_folder.json")

    SAMPLE_PROJECT_STATE = os.path.join(
        APP_ROOT, "Projects", "sample-project", "state.json"
    )

    DEFAULT_DATA_ROOT = APP_ROOT

# Bundled starter content. These are read-only sources, never working files.
STARTER_GLOBAL_STATE = os.path.join(RESOURCE_ROOT, "Global", "state.json")
STARTER_PROMPTS_DIR = os.path.join(RESOURCE_ROOT, "Global", "prompts")
STARTER_SYSTEM_DIR = os.path.join(RESOURCE_ROOT, "Global", "system")
SAMPLE_PROJECT_DIR = os.path.join(RESOURCE_ROOT, "Projects", "sample-project")

# The writer's books: prompts, system rules, their menu, and all projects.
# They live in DEFAULT_DATA_ROOT unless the writer picks another folder.

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
    LIBRARY_DIR = os.path.join(DATA_ROOT, "Global")
    GLOBAL_STATE = os.path.join(LIBRARY_DIR, "state.json")
    PROJECTS_DIR = os.path.join(DATA_ROOT, "Projects")
    DOCUMENTS_MIGRATED = False


# A missing custom folder (for example, an unplugged drive) falls back to
# the default Books folder. The Settings page can still report the missing path.
_saved_folder = saved_data_folder()
set_data_root(
    _saved_folder
    if _saved_folder and os.path.isdir(_saved_folder)
    else DEFAULT_DATA_ROOT
)
