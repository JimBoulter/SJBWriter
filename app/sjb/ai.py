"""Builds the labeled AI request and sends it to OpenRouter or Ollama."""

import os
import json
import requests
from flask import request, jsonify, Response, Blueprint

from sjb.paths import GLOBAL_DIR
from sjb.storage import DOC_EXT, SECTIONS, is_safe_name, load_json, read_doc
from sjb.library import get_base_path
from sjb.models import OPENROUTER_CATALOG

bp = Blueprint("ai", __name__)

# ===================== AI CLIENT =====================
REASONING_EFFORTS = {"none", "minimal", "low", "medium", "high", "xhigh", "max"}


def generation_options(settings):
    """Temperature (0-2) and reasoning effort from the client; None means "model default"."""
    temperature = settings.get("temperature")
    try:
        temperature = None if temperature is None else min(2.0, max(0.0, float(temperature)))
    except (TypeError, ValueError):
        temperature = None
    effort = settings.get("reasoning")
    return temperature, (effort if effort in REASONING_EFFORTS else None)


def reply_limit(settings):
    """Max reply tokens from the client, capped at the model's own limit; None = no limit."""
    try:
        limit = int(settings.get("maxTokens") or 0)
    except (TypeError, ValueError):
        return None
    if limit < 1:
        return None
    info = (load_json(OPENROUTER_CATALOG) or {}).get("models", {}).get(settings.get("modelName")) \
        if os.path.exists(OPENROUTER_CATALOG) else None
    if info and info.get("max_out"):
        limit = min(limit, info["max_out"])
    return limit


def web_search_plugin(settings):
    """OpenRouter's web plugin when search is on: 1-10 results (10 is the per-search price cap)."""
    if not settings.get("webSearch"):
        return None
    try:
        max_results = int(settings.get("webMaxResults") or 5)
    except (TypeError, ValueError):
        max_results = 5
    return {"id": "web", "max_results": min(10, max(1, max_results))}

def load_document(section, filename):
    """(title, content) of a stored document, or None."""
    if section not in SECTIONS or not is_safe_name(filename):
        return None
    path = os.path.join(get_base_path(section), filename)
    if not os.path.exists(path):
        return None
    doc = read_doc(path)
    return (doc["title"], doc["content"]) if doc else None


def title_attr(text):
    return str(text or "").replace('"', "'").replace("\n", " ").strip()


def build_ai_request(data):
    """System files become the system message. Everything else goes in the user
    message, each part wrapped in a labelled tag so the model can tell notes,
    manuscript, the open document, and the instruction apart."""
    rules = []
    for filename in data.get("system", []):
        doc = load_document("system", filename)
        if doc and doc[1].strip():
            rules.append(doc[1].strip())

    blocks = []

    def add_group(tag, section):
        docs = []
        for filename in data.get(section, []):
            if not (isinstance(filename, str) and (filename.endswith(DOC_EXT) or filename.endswith(".json"))):
                continue
            doc = load_document(section, filename)
            if doc and doc[1].strip():
                docs.append(f'<document title="{title_attr(doc[0])}">\n{doc[1].strip()}\n</document>')
        if docs:
            blocks.append(f"<{tag}>\n" + "\n\n".join(docs) + f"\n</{tag}>")

    add_group("background", "background")
    add_group("writing", "writing")

    current = data.get("current")
    if not isinstance(current, dict):
        # Older pages send the editor text as the last writing item
        raw = [i for i in data.get("writing", []) if isinstance(i, str) and not (i.endswith(DOC_EXT) or i.endswith(".json"))]
        current = {"title": "", "content": raw[-1] if raw else ""}
    if str(current.get("content") or "").strip():
        title = title_attr(current.get("title"))
        open_tag = f'<current_document title="{title}">' if title else "<current_document>"
        blocks.append(f"{open_tag}\n{current['content'].strip()}\n</current_document>")

    instruction = str(data.get("prompt") or "").strip()
    if instruction:
        blocks.append(f"<instruction>\n{instruction}\n</instruction>")

    return {"system": "\n\n".join(rules), "user": "\n\n".join(blocks)}


def call_openrouter(request_parts, settings):
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
        "messages": (
            [{"role": "system", "content": request_parts["system"]}] if request_parts["system"] else []
        ) + [{"role": "user", "content": request_parts["user"]}],
        "stream": True
    }

    # OpenRouter maps one reasoning setting onto each model family's own controls
    temperature, effort = generation_options(settings)
    if temperature is not None:
        data["temperature"] = temperature
    if effort:
        data["reasoning"] = {"effort": effort}
    limit = reply_limit(settings)
    if limit:
        data["max_tokens"] = limit

    # Web search (OpenRouter plugin; billed per search, even on free models)
    web = web_search_plugin(settings)
    if web:
        data["plugins"] = [web]


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

def call_ollama(request_parts, settings):

    model = settings.get("modelName")

    if not model:
        return {"error": "Missing model name"}

    url = "http://localhost:11434/api/generate"

    data = {
        "model": model,
        "prompt": request_parts["user"],
        "stream": True
    }
    if request_parts["system"]:
        data["system"] = request_parts["system"]

    # Ollama: temperature goes in options; "think" turns reasoning on or off
    temperature, effort = generation_options(settings)
    if temperature is not None:
        data.setdefault("options", {})["temperature"] = temperature
    limit = reply_limit(settings)
    if limit:
        data.setdefault("options", {})["num_predict"] = limit
    if effort:
        data["think"] = effort != "none"

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


@bp.route('/generate', methods=['POST'])
def api_generate():
    data = request.json
    request_parts = build_ai_request(data)

    client_settings = data.get("settings", {})

    model_source = client_settings.get("modelSource", "openrouter")
    model_name = client_settings.get("modelName")

    model_settings = {
        "modelName": model_name,
        "temperature": client_settings.get("temperature"),
        "reasoning": client_settings.get("reasoning"),
        "webSearch": client_settings.get("webSearch"),
        "webMaxResults": client_settings.get("webMaxResults"),
        "maxTokens": client_settings.get("maxTokens")
    }

    if model_source == "openrouter":

        result = call_openrouter(request_parts, model_settings)

    elif model_source == "ollama":

        result = call_ollama(request_parts, model_settings)

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




@bp.route('/preview_request', methods=['POST'])
def api_preview_request():
    """The exact system and user messages Generate would send."""
    return jsonify(build_ai_request(request.json or {}))
