from flask import Flask, render_template, request, jsonify
from flask import Response
import os
import json
import shutil
import requests

# ===================== APP SETUP =====================
app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


# ===================== PATH CONFIG =====================
# Global (tools)
GLOBAL_DIR = os.path.join(BASE_DIR, "..", "Global")
GLOBAL_STATE = os.path.join(GLOBAL_DIR, "state.json")

# Project
PROJECTS_DIR = os.path.join(BASE_DIR, "..", "Projects")
SAMPLE_PROJECT_STATE = os.path.join(
    PROJECTS_DIR, "sample-project", "state.json"
)
APP_STATE = os.path.join(GLOBAL_DIR, "app_state.json")


# ===================== STRUCTURE INIT =====================
def ensure_structure():
    # Global folders
    os.makedirs(os.path.join(GLOBAL_DIR, "prompts"), exist_ok=True)
    os.makedirs(os.path.join(GLOBAL_DIR, "system"), exist_ok=True)

    # Global state
    if not os.path.exists(GLOBAL_STATE):
        with open(GLOBAL_STATE, "w") as f:
            json.dump({
                "prompts": [],
                "system": [],
                "last_opened_global": {}
            }, f, indent=2)

    project_dir = get_project_dir()
    project_meta_path = os.path.join(project_dir, "project.json")

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




# ===================== CORE HELPERS =====================


def load_json(path):
    try:
        with open(path, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading JSON from {path}: {e}")
        return None


def save_json(path, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


def count_words(text):
    text = (text or "").strip()
    if not text:
        return 0
    return len(text.split())


# -------slug naming project files---------
import re

def slugify(title):
    title = title.lower()
    title = re.sub(r'[^a-z0-9]+', '-', title)
    return title.strip('-')


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
    return os.path.join(PROJECTS_DIR, get_current_project())


def get_project_state():
    return os.path.join(get_project_dir(), "state.json")



def set_global_last_opened(section, filename):
    state = load_json(GLOBAL_STATE)

    state["last_opened_global"] = {
        "project": get_current_project(),
        "section": section,
        "filename": filename
    }

    save_json(GLOBAL_STATE, state)


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
        return GLOBAL_STATE
    return get_project_state()

def get_base_path(section):
    if section in ["prompts", "system"]:
        return os.path.join(GLOBAL_DIR, section)
    return os.path.join(get_project_dir(), section)

def load_file_content(section, filename):
    base_path = get_base_path(section)
    file_path = os.path.join(base_path, filename)

    if not os.path.exists(file_path):
        return ""

    data = load_json(file_path)
    if not data:
        return ""

    return data.get("content", "")

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


# ===================== MODEL HELPERS =====================

MODEL_LIST_PATH = os.path.join(
    GLOBAL_DIR,
    "modelList.json"
)


def load_model_list():

    if not os.path.exists(MODEL_LIST_PATH):

        default_models = {
            "openrouter": [],
            "ollama": []
        }

        save_json(
            MODEL_LIST_PATH,
            default_models
        )

        return default_models

    return load_json(MODEL_LIST_PATH)


def save_model_list(data):
    save_json(MODEL_LIST_PATH, data)


# ===================== AI CLIENT =====================
def call_openrouter(prompt, settings):
    def get_api_key():
        config_path = os.path.join(GLOBAL_DIR, "config.json")

        if not os.path.exists(config_path):
            return None

        with open(config_path, "r") as f:
            config = json.load(f)

        return config.get("openrouter_api_key")

    api_key = get_api_key()

    model = settings.get("modelName")

    if not api_key:
        return {
            "error": "API key not set"
        }

    if not model:
        return {"error": "Missing model name"}


    url = "https://openrouter.ai/api/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    data = {
        "model": model,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "stream": True
    }


    try:
        response = requests.post(
            url,
            headers=headers,
            json=data,
            stream=True
        )

        print("\n=== OPENROUTER RESPONSE ===")
        print(response.status_code)
        print(response.headers.get("content-type"))
        print("==========================\n")

        if response.status_code != 200:
            if response.status_code == 400:
                return {
                    "error": "This model may be invalid or deprecated. Please verify it in Settings → Manage Models → select the model → Verify.",
                    "details": response.text
                }
            return {
                "error": f"OpenRouter error {response.status_code}",
                "details": response.text
            }

        def generate_stream():
            for line in response.iter_lines():

                if not line:
                    continue

                decoded = line.decode('utf-8')

                if not decoded.startswith("data: "):
                    continue

                payload = decoded[6:]

                if payload == "[DONE]":
                    break


                try:
                    chunk = json.loads(payload)

                    delta = (
                        chunk["choices"][0]
                        .get("delta", {})
                        .get("content", "")
                    )

                    if delta:
                        yield delta

                except Exception:
                    continue

        return generate_stream()


    except Exception as e:
        return {"error": str(e)}

def call_ollama(prompt, settings):

    model = settings.get("modelName")

    if not model:
        return {"error": "Missing model name"}

    url = "http://localhost:11434/api/generate"

    data = {
        "model": model,
        "prompt": prompt,
        "stream": True
    }

    try:

        response = requests.post(
            url,
            json=data,
            stream=True
        )

        if response.status_code != 200:
            return {
                "error": f"Ollama error {response.status_code}",
                "details": response.text
            }

        def generate_stream():

            for line in response.iter_lines():

                if not line:
                    continue

                try:
                    chunk = json.loads(
                        line.decode("utf-8")
                    )

                    text = chunk.get("response", "")

                    if text:
                        yield text

                    if chunk.get("done"):

                        print("\n=== OLLAMA STATS ===")
                        print(f"Model: {chunk.get('model')}")
                        print(f"Done Reason: {chunk.get('done_reason')}")
                        print(f"Prompt Tokens: {chunk.get('prompt_eval_count')}")
                        print(f"Output Tokens: {chunk.get('eval_count')}")
                        print(f"Load Duration: {chunk.get('load_duration')}")
                        print(f"Total Duration: {chunk.get('total_duration')}")
                        print("====================\n")
                        break

                except Exception:
                    continue

        return generate_stream()

    except Exception as e:
        return {"error": str(e)}

# ===================== ROUTES =====================
# ---------- ROUTES (ALL ABOVE app.run) ----------

@app.route("/")
def route_home():
    return render_template("index.html")


@app.route('/save_api_key', methods=['POST'])
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


@app.route('/load', methods=['GET'])
def api_load_all():
    ensure_structure()

    global_state = load_json(GLOBAL_STATE)
    project_state = load_json(get_project_state())

    return jsonify({
        "global": global_state,
        "project": project_state,
        "app_state": load_app_state()
    })


@app.route('/generate', methods=['POST'])
def api_generate():
    data = request.json

    prompt_parts = []

    prompt_parts = []

    for section in ["system", "background", "writing"]:
        for item in data.get(section, []):

            # writing section may contain raw editor content
            if section == "writing":
                if isinstance(item, str) and item.endswith(".json"):
                    content = load_file_content(section, item)
                    prompt_parts.append(content)
                else:
                    prompt_parts.append(item)

            # all other sections are stored files
            else:
                prompt_parts.append(load_file_content(section, item))


    prompt_parts.append(data.get("prompt", ""))

    prompt = "\n\n---\n\n".join(prompt_parts)

    client_settings = data.get("settings", {})

    model_source = client_settings.get("modelSource", "openrouter")
    model_name = client_settings.get("modelName")

    if model_source == "openrouter":

        result = call_openrouter(
            prompt,
            {"modelName": model_name}
        )

    elif model_source == "ollama":

        result = call_ollama(
            prompt,
            {"modelName": model_name}
        )

    else:

        result = {
            "error": f"Unknown model source: {model_source}"
        }

    if isinstance(result, dict) and result.get("error"):
        return jsonify(result), 400

    return Response(
        result,
        mimetype='text/plain'
    )



@app.route('/models', methods=['GET'])
def api_get_models():
    model_file = os.path.join(GLOBAL_DIR, "modelList.json")

    if not os.path.exists(model_file):
        return jsonify({"openrouter": []})

    with open(model_file, "r") as f:
        data = json.load(f)

    try:
        response = requests.get(
            "http://localhost:11434/api/tags",
            timeout=5
        )

        ollama_data = response.json()

        ollama_models = data.setdefault("ollama", [])

        existing_ids = {
            model["id"]
            for model in ollama_models
        }

        for discovered in ollama_data.get("models", []):
            model_id = discovered.get("name")

            if not model_id or model_id in existing_ids:
                continue

            ollama_models.append({
                "id": model_id,
                "name": model_id,
                "source": "ollama",
                "context": (
                    discovered
                    .get("details", {})
                    .get("context_length", 0)
                ),
                "description": "",
                "labels": []
            })

    except Exception as e:
        print(f"Ollama discovery failed: {e}")

    return jsonify(data)

@app.route('/add_model', methods=['POST'])
def api_add_model():

    data = request.json

    model_id = data.get("id", "").strip()
    name = data.get("name", "").strip()
    source = data.get("source", "openrouter").strip()
    context = data.get("context", 0)
    description = data.get("description", "").strip()
    labels = data.get("labels", [])

    if not model_id or not name:
        return jsonify({
            "error": "Missing required fields"
        }), 400

    models = load_model_list()

    source_models = models.get(source, [])

    # Prevent duplicate IDs
    for model in source_models:

        if model.get("id") == model_id:

            return jsonify({
                "error": "Model already exists"
            }), 400

    source_models.append({
        "id": model_id,
        "name": name,
        "source": source,
        "context": context,
        "description": description,
        "labels": labels
    })

    models[source] = source_models

    save_model_list(models)

    return jsonify({
        "status": "created"
    })


@app.route('/update_model', methods=['POST'])
def api_update_model():
    data = request.json
    model_id = data.get("id")
    if not model_id:
        return jsonify({
            "error": "Missing model ID"
        }), 400

    models = load_model_list()
    target = None

    for source_models in models.values():

        target = next(
            (
                m for m in source_models
                if m.get("id") == model_id
            ),
            None
        )

        if target:
            break

    if not target:
        return jsonify({
            "error": "Model not found"
        }), 404

    target["name"] = data.get("name", "")
    target["source"] = data.get(
        "source",
        "openrouter"
    )
    target["context"] = data.get(
        "context",
        ""
    )
    target["description"] = data.get(
        "description",
        ""
    )
    target["labels"] = data.get(
        "labels",
        []
    )
    save_model_list(models)
    return jsonify({
        "status": "success"
    })

@app.route('/delete_model', methods=['POST'])
def api_delete_model():

    data = request.json

    model_id = data.get("id")

    if not model_id:
        return jsonify({
            "error": "Missing model ID"
        }), 400

    models = load_model_list()

    for source, source_models in models.items():

        updated = [
            m for m in source_models
            if m.get("id") != model_id
        ]

        models[source] = updated

    save_model_list(models)

    return jsonify({
        "status": "deleted"
    })

@app.route('/move_model', methods=['POST'])
def api_move_model():

    data = request.json

    model_id = data.get("id")
    direction = data.get("direction")

    if model_id is None or direction is None:
        return jsonify({
            "error": "Missing data"
        }), 400

    models = load_model_list()

    target_source = None
    existing = None

    for source, source_models in models.items():

        if any(
            m.get("id") == model_id
            for m in source_models
        ):
            target_source = source
            existing = source_models
            break

    if existing is None:
        return jsonify({
            "error": "Model not found"
        }), 404

    index = next(
        (
            i for i, m in enumerate(existing)
            if m.get("id") == model_id
        ),
        None
    )

    new_index = index + int(direction)

    if new_index < 0 or new_index >= len(existing):
        return jsonify({
            "error": "Invalid move"
        }), 400

    existing[index], existing[new_index] = (
        existing[new_index],
        existing[index]
    )

    save_model_list(models)

    return jsonify({
        "status": "moved"
    })


@app.route('/api_key_status', methods=['GET'])
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


@app.route('/opened_file', methods=['POST'])
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


@app.route('/save_order', methods=['POST'])
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


@app.route('/projects', methods=['GET'])
def api_get_projects():

    os.makedirs(PROJECTS_DIR, exist_ok=True)

    projects = []

    for folder in os.listdir(PROJECTS_DIR):

        project_dir = os.path.join(PROJECTS_DIR, folder)

        if not os.path.isdir(project_dir):
            continue

        meta_path = os.path.join(project_dir, "project.json")

        if os.path.exists(meta_path):
            meta = load_json(meta_path)

            projects.append({
                "id": meta.get("id", folder),
                "title": meta.get("title", folder)
            })

        else:
            projects.append({
                "id": folder,
                "title": folder.replace("-", " ").title()
            })

    projects.sort(key=lambda p: p["title"].lower())

    app_state = load_app_state()

    return jsonify({
        "projects": projects,
        "recent": app_state.get("recent_projects", []),
        "current": app_state.get("current_project", "default")
    })


@app.route('/create_project', methods=['POST'])
def api_create_project():

    data = request.json

    name = data.get("name", "").strip()

    if not name:
        return jsonify({"error": "Missing project name"}), 400

    project_slug = slugify(name)

    project_dir = os.path.join(PROJECTS_DIR, project_slug)

    if os.path.exists(project_dir):
        return jsonify({"error": "Project already exists"}), 400

    # Create folders
    os.makedirs(os.path.join(project_dir, "background"))
    os.makedirs(os.path.join(project_dir, "writing"))

    # Create project metadata
    save_json(
        os.path.join(project_dir, "project.json"),
        {
            "id": project_slug,
            "title": name
        }
    )

    # Create state
    save_json(
        os.path.join(project_dir, "state.json"),
        {
            "background": [],
            "writing": [],
            "last_opened_project": {}
        }
    )

    # Update app state
    app_state = load_app_state()

    app_state["current_project"] = project_slug

    recent = app_state.get("recent_projects", [])

    if project_slug in recent:
        recent.remove(project_slug)

    recent.insert(0, project_slug)

    app_state["recent_projects"] = recent[:5]

    write_app_state(app_state)

    return jsonify({
        "status": "created",
        "project": project_slug
    })

@app.route('/rename_project', methods=['POST'])
def api_rename_project():

    data = request.json

    old_id = data.get("project")
    new_name = data.get("name", "").strip()

    if not old_id or not new_name:
        return jsonify({"error": "Missing data"}), 400

    new_slug = slugify(new_name)

    old_dir = os.path.join(PROJECTS_DIR, old_id)
    new_dir = os.path.join(PROJECTS_DIR, new_slug)

    if not os.path.exists(old_dir):
        return jsonify({"error": "Project not found"}), 404

    if os.path.exists(new_dir):
        return jsonify({"error": "Target project exists"}), 400

    # Rename folder
    os.rename(old_dir, new_dir)

    # Update metadata
    meta_path = os.path.join(new_dir, "project.json")

    meta = load_json(meta_path)

    meta["id"] = new_slug
    meta["title"] = new_name

    save_json(meta_path, meta)

    # Update app state
    app_state = load_app_state()

    if app_state.get("current_project") == old_id:
        app_state["current_project"] = new_slug

    recent = app_state.get("recent_projects", [])

    recent = [
        new_slug if p == old_id else p
        for p in recent
    ]

    app_state["recent_projects"] = recent

    write_app_state(app_state)

    return jsonify({
        "status": "renamed",
        "project": new_slug
    })

@app.route('/delete_project', methods=['POST'])
def api_delete_project():

    data = request.json

    project = data.get("project")

    if not project:
        return jsonify({"error": "Missing project"}), 400

    if project == "default":
        return jsonify({
            "error": "Cannot delete default project"
        }), 400

    project_dir = os.path.join(PROJECTS_DIR, project)

    if not os.path.exists(project_dir):
        return jsonify({"error": "Project not found"}), 404

    app_state = load_app_state()

    # Get all existing projects BEFORE deletion
    all_projects = [
        p for p in os.listdir(PROJECTS_DIR)
        if os.path.isdir(os.path.join(PROJECTS_DIR, p))
    ]

    # Prevent deleting final project
    if len(all_projects) <= 1:
        return jsonify({
            "error": "At least one project must exist"
        }), 400

    import shutil

    shutil.rmtree(project_dir)

    # Remove from recents
    recent = app_state.get("recent_projects", [])

    recent = [
        p for p in recent
        if p != project
    ]

    app_state["recent_projects"] = recent

    # Determine surviving project
    remaining_projects = [
        p for p in all_projects
        if p != project
    ]

    # Prefer most recent surviving project
    new_current = None

    for p in recent:
        if p in remaining_projects:
            new_current = p
            break

    # Fallback alphabetical
    if not new_current and remaining_projects:
        new_current = sorted(remaining_projects)[0]

    # Emergency fallback
    if not new_current:
        new_current = "default"

    # Update current project
    if app_state.get("current_project") == project:
        app_state["current_project"] = new_current

    write_app_state(app_state)

    return jsonify({
        "status": "deleted",
        "current_project": app_state["current_project"]
    })

@app.route('/switch_project', methods=['POST'])
def api_switch_project():

    data = request.json

    project = data.get("project")

    if not project:
        return jsonify({"error": "Missing project"}), 400

    project_dir = os.path.join(PROJECTS_DIR, project)

    if not os.path.exists(project_dir):
        return jsonify({"error": "Project not found"}), 404

    app_state = load_app_state()

    app_state["current_project"] = project

    recent = app_state.get("recent_projects", [])

    if project in recent:
        recent.remove(project)

    recent.insert(0, project)

    app_state["recent_projects"] = recent[:5]

    write_app_state(app_state)

    return jsonify({"status": "switched"})


"""
# -----------test route-------------- - deprecated?
@app.route('/test_create')
def test_create():
    with app.test_request_context(json={
        "section": "writing",
        "title": "Chapter One"
    }):
        return create_item()

@app.route('/test_load')
def test_load():
    with app.test_request_context(json={
        "section": "writing",
        "filename": "chapter-one.json"
    }):
        return load_file()

@app.route('/test_save')
def test_save():
    with app.test_request_context(json={
        "section": "writing",
        "filename": "chapter-one.json",
        "title": "Chapter One",
        "content": "This is a test save."
    }):
        return save_file()
"""











# -------create project files---------
@app.route('/create_item', methods=['POST'])
def api_create_item():
    ensure_structure()

    data = request.json
    section = data.get("section")
    title = data.get("title")

    if not section or not title:
        return jsonify({"error": "Missing data"}), 400

    filename = slugify(title) + ".json"

    base_path = get_base_path(section)
    state_file = get_state_file(section)
    state_key = section



    file_path = os.path.join(base_path, filename)

    # Prevent overwrite
    if os.path.exists(file_path):
        return jsonify({"error": "File already exists"}), 400

    # Create file
    with open(file_path, "w") as f:
        json.dump({
            "id": filename.replace(".json", ""),
            "title": title,
            "content": ""
        }, f, indent=2)

    # Update state
    state = load_json(state_file)

    state[state_key].append({
        "type": "file",
        "filename": filename,
        "title": title
    })


    save_json(state_file, state)

    return jsonify({"status": "created", "filename": filename})


@app.route('/create_item_in_folder', methods=['POST'])
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

    filename = slugify(title) + ".json"

    base_path = get_base_path(section)

    file_path = os.path.join(
        base_path,
        filename
    )

    if os.path.exists(file_path):
        return jsonify({
            "error": "File already exists"
        }), 400

    with open(file_path, "w") as f:

        json.dump({
            "id": filename.replace(
                ".json",
                ""
            ),
            "title": title,
            "content": ""
        }, f, indent=2)

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
        "title": title
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
@app.route('/save_file', methods=['POST'])
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

    with open(file_path, "w") as f:
        json.dump({
            "id": filename.replace(".json", ""),
            "title": title,
            "content": content,
            "wordCount": word_count
        }, f, indent=2)

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
        "wordCount": word_count
    })


# -------create folders---------
@app.route('/create_folder', methods=['POST'])
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
@app.route('/load_file', methods=['POST'])
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

    content = load_json(file_path)

    return jsonify(content)



# -------persist project folder state---------
@app.route('/update_folder_state', methods=['POST'])
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

@app.route('/delete_item', methods=['POST'])
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

    # Delete file
    os.remove(file_path)

    # Update state
    state = load_json(state_file)

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



@app.route('/rename_item', methods=['POST'])
def api_rename_item():
    ensure_structure()

    data = request.json
    section = data.get("section")
    filename = data.get("filename")
    new_title = data.get("title")

    if not section or not filename or not new_title:
        return jsonify({"error": "Missing data"}), 400

    new_filename = slugify(new_title) + ".json"

    base_path = get_base_path(section)
    state_file = get_state_file(section)

    old_path = os.path.join(base_path, filename)
    new_path = os.path.join(base_path, new_filename)

    if not os.path.exists(old_path):
        return jsonify({"error": "File not found"}), 404

    if os.path.exists(new_path):
        return jsonify({"error": "Target filename exists"}), 400


    # Load file content
    content = load_json(old_path)

    content["title"] = new_title
    content["id"] = new_filename.replace(".json", "")

    save_json(new_path, content)

    os.remove(old_path)

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


@app.route('/rename_folder', methods=['POST'])
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


@app.route('/delete_folder', methods=['POST'])
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


@app.route('/save_app_state', methods=['POST'])
def api_save_app_state():

    data = request.json

    state = load_app_state()

    state.update(data)

    save_json(APP_STATE, state)

    return jsonify({"status": "saved"})



# ---------- RUN LAST ----------

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5050, debug=True)
