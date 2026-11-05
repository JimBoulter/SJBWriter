"""The writer's model list, and OpenRouter's public model and price list."""

import os
import json
import requests
from datetime import datetime
from flask import request, jsonify, Blueprint

from sjb.paths import GLOBAL_DIR
from sjb.storage import load_json, save_json

bp = Blueprint("models", __name__)

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


def per_token_price(value):
    """OpenRouter prices are strings in dollars per token; routers list -1 (unknown)."""
    try:
        price = float(value)
    except (TypeError, ValueError):
        return None
    return price if price >= 0 else None


@bp.route('/models', methods=['GET'])
def api_get_models():
    model_file = os.path.join(GLOBAL_DIR, "modelList.json")
    order_file = os.path.join(GLOBAL_DIR, "ollama_order.json")

    if not os.path.exists(model_file):
        return jsonify({"openrouter": [], "ollama": []})

    with open(model_file, "r") as f:
        data = json.load(f)

    saved_ollama_models = data.setdefault("ollama", [])
    saved_by_id = {
        model["id"]: model
        for model in saved_ollama_models
        if model.get("id")
    }

    available_ollama_models = []

    try:
        response = requests.get(
            "http://localhost:11434/api/tags",
            timeout=5
        )
        response.raise_for_status()
        ollama_data = response.json()

        catalog_changed = False

        for discovered in ollama_data.get("models", []):
            model_id = discovered.get("name")

            if not model_id:
                continue

            model = saved_by_id.get(model_id)

            if model is None:
                model = {
                    "id": model_id,
                    "name": model_id,
                    "source": "ollama",
                    "context": (
                        discovered.get("details", {})
                        .get("context_length", 0)
                    ),
                    "description": "",
                    "labels": []
                }

                saved_ollama_models.append(model)
                saved_by_id[model_id] = model
                catalog_changed = True

            available_ollama_models.append(model)

        if catalog_changed:
            save_model_list(data)

        catalog_ids = [
            model["id"]
            for model in saved_ollama_models
            if model.get("id")
        ]
        available_ids = [
            model["id"]
            for model in available_ollama_models
        ]

        order_changed = False

        if os.path.exists(order_file):
            with open(order_file, "r") as f:
                saved_order = json.load(f)

            if not isinstance(saved_order, list):
                saved_order = []
                order_changed = True

            # Newly installed models go to the top of this local list.
            new_installed_ids = [
                model_id
                for model_id in available_ids
                if model_id not in saved_order
            ]

            if new_installed_ids:
                saved_order = new_installed_ids + saved_order
                order_changed = True

            # Keep catalog entries so reinstalling a model can restore
            # its previous position.
            for model_id in catalog_ids:
                if model_id not in saved_order:
                    saved_order.append(model_id)
                    order_changed = True

        else:
            # On first initialization, use Ollama's current inventory
            # order, followed by any known models that are not installed.
            saved_order = available_ids + [
                model_id
                for model_id in catalog_ids
                if model_id not in available_ids
            ]
            order_changed = True

        if order_changed:
            save_json(order_file, saved_order)

        order_positions = {
            model_id: index
            for index, model_id in enumerate(saved_order)
        }

        available_ollama_models.sort(
            key=lambda model: order_positions.get(
                model["id"],
                len(order_positions)
            )
        )

    except Exception as e:
        print(f"Ollama discovery failed: {e}")

    data["ollama"] = available_ollama_models
    return jsonify(data)



@bp.route('/add_model', methods=['POST'])
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


@bp.route('/update_model', methods=['POST'])
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

@bp.route('/delete_model', methods=['POST'])
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


@bp.route('/move_model', methods=['POST'])
def api_move_model():
    data = request.json or {}

    model_id = data.get("id")
    direction = data.get("direction")

    if model_id is None or direction is None:
        return jsonify({"error": "Missing data"}), 400

    try:
        direction = int(direction)
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid direction"}), 400

    if direction not in (-1, 1):
        return jsonify({"error": "Invalid direction"}), 400

    models = load_model_list()
    target_source = None

    for source, source_models in models.items():
        if any(
            model.get("id") == model_id
            for model in source_models
        ):
            target_source = source
            break

    if target_source is None:
        return jsonify({"error": "Model not found"}), 404

    if target_source == "ollama":
        order_file = os.path.join(
            GLOBAL_DIR,
            "ollama_order.json"
        )

        try:
            response = requests.get(
                "http://localhost:11434/api/tags",
                timeout=5
            )
            response.raise_for_status()

            installed_ids = [
                model.get("name")
                for model in response.json().get("models", [])
                if model.get("name")
            ]

        except Exception as e:
            print(f"Ollama discovery failed: {e}")
            return jsonify({
                "error": "Ollama is unavailable"
            }), 503

        if model_id not in installed_ids:
            return jsonify({"error": "Model not installed"}), 404

        if os.path.exists(order_file):
            with open(order_file, "r") as f:
                saved_order = json.load(f)
        else:
            saved_order = [
                model.get("id")
                for model in models.get("ollama", [])
                if model.get("id")
            ]

        # Retain saved positions for models that are currently uninstalled.
        for saved_model in models.get("ollama", []):
            saved_id = saved_model.get("id")
            if saved_id and saved_id not in saved_order:
                saved_order.append(saved_id)

        # Newly installed models appear at the top of the local order.
        new_ids = [
            model_id
            for model_id in installed_ids
            if model_id not in saved_order
        ]
        saved_order = new_ids + saved_order

        visible_order = [
            model_id
            for model_id in saved_order
            if model_id in installed_ids
        ]

        index = visible_order.index(model_id)
        new_index = index + direction

        if new_index < 0 or new_index >= len(visible_order):
            return jsonify({"error": "Invalid move"}), 400

        other_id = visible_order[new_index]
        first_position = saved_order.index(model_id)
        second_position = saved_order.index(other_id)

        saved_order[first_position], saved_order[second_position] = (
            saved_order[second_position],
            saved_order[first_position]
        )

        save_json(order_file, saved_order)

    else:
        existing = models.get(target_source, [])

        index = next(
            (
                i for i, model in enumerate(existing)
                if model.get("id") == model_id
            ),
            None
        )

        if index is None:
            return jsonify({"error": "Model not found"}), 404

        new_index = index + direction

        if new_index < 0 or new_index >= len(existing):
            return jsonify({"error": "Invalid move"}), 400

        existing[index], existing[new_index] = (
            existing[new_index],
            existing[index]
        )

        save_model_list(models)

    return jsonify({"status": "moved"})


# ----- OPENROUTER MODEL CHECK -----
OPENROUTER_CATALOG = os.path.join(GLOBAL_DIR, "openrouter_models.json")
CATALOG_MAX_AGE = 24 * 60 * 60   # seconds; the app refreshes prices once a day


def refresh_openrouter_catalog():
    """Fetch OpenRouter's live model list and keep a compact copy. Raises on network errors."""
    response = requests.get("https://openrouter.ai/api/v1/models", timeout=20)
    response.raise_for_status()
    live = response.json().get("data", [])

    catalog = {
        m["id"]: {
            "name": m.get("name"),
            "context": m.get("context_length"),
            "expires": m.get("expiration_date"),
            "reasoning": m.get("reasoning"),
            "temperature": "temperature" in (m.get("supported_parameters") or []),
            # Dollars per token; base rates (some models list time-of-day discounts)
            "price": {
                "in": per_token_price((m.get("pricing") or {}).get("prompt")),
                "out": per_token_price((m.get("pricing") or {}).get("completion"))
            },
            "max_out": (m.get("top_provider") or {}).get("max_completion_tokens")
        }
        for m in live if m.get("id")
    }
    checked_at = datetime.now().isoformat(timespec="seconds")
    save_json(OPENROUTER_CATALOG, {"checked_at": checked_at, "models": catalog})
    return checked_at, catalog


@bp.route('/check_openrouter_models', methods=['POST'])
def api_check_openrouter_models():
    """Fetch OpenRouter's live model list, keep a compact copy, and report on the user's models."""
    try:
        checked_at, catalog = refresh_openrouter_catalog()
    except Exception as e:
        return jsonify({"error": f"Could not reach OpenRouter: {e}"}), 502

    report = []
    for model in (load_model_list() or {}).get("openrouter", []):
        info = catalog.get(model.get("id"))
        report.append({
            "id": model.get("id"),
            "name": model.get("name") or model.get("id"),
            "status": "gone" if not info else ("leaving" if info.get("expires") else "available"),
            "expires": info.get("expires") if info else None
        })

    return jsonify({"checked_at": checked_at, "total": len(catalog), "models": report})


@bp.route('/openrouter_catalog', methods=['GET'])
def api_openrouter_catalog():
    """The saved copy of OpenRouter's model list. With ?auto=1 it is fetched again
    first when it is missing, older than a day, or from before prices were kept."""
    saved = (load_json(OPENROUTER_CATALOG) or {}) if os.path.exists(OPENROUTER_CATALOG) else {}

    if request.args.get("auto"):
        try:
            age = datetime.now() - datetime.fromisoformat(saved.get("checked_at", ""))
            stale = age.total_seconds() > CATALOG_MAX_AGE
        except (TypeError, ValueError):
            stale = True
        has_prices = any("price" in m for m in saved.get("models", {}).values())
        if stale or not has_prices:
            try:
                checked_at, catalog = refresh_openrouter_catalog()
                saved = {"checked_at": checked_at, "models": catalog}
            except Exception:
                pass  # Offline: keep the old copy

    return jsonify(saved)
