"""Search and replace across the open project (and, if asked, the AI setup files)."""

import os
import re
from flask import request, jsonify, Blueprint

from sjb.storage import SECTIONS, count_words, load_json, read_doc, save_json, write_doc
from sjb.history import snapshot_file
from sjb.library import find_file_item, get_base_path, get_state_file

bp = Blueprint("search", __name__)

SNIPPETS_PER_DOCUMENT = 3
SNIPPET_CONTEXT = 48   # letters shown before and after a match


def search_pattern(query, match_case, whole_word):
    """The query taken literally. "Whole word" means no letter, digit, or _ right
    before or after it, in any language (the same rule as the find bar)."""
    if not query:
        return None
    body = re.escape(query)
    if whole_word:
        body = rf"(?<!\w){body}(?!\w)"
    return re.compile(body, 0 if match_case else re.IGNORECASE)


def walk_documents(items, folders=()):
    """(filename, folder titles) for each document of a sidebar list, in sidebar order."""
    for item in items or []:
        if isinstance(item, dict) and item.get("type") == "folder":
            yield from walk_documents(item.get("items"), folders + (item.get("title") or "",))
        elif isinstance(item, dict) and item.get("filename"):
            yield item["filename"], list(folders)


def snippet(text, match):
    start, end = match.span()
    before = text[max(0, start - SNIPPET_CONTEXT):start]
    after = text[end:end + SNIPPET_CONTEXT]
    squeeze = lambda s: re.sub(r"\s+", " ", s)
    return {
        "before": ("…" if start > SNIPPET_CONTEXT else "") + squeeze(before).lstrip(),
        "match": match.group(0),
        "after": squeeze(after).rstrip() + ("…" if end + SNIPPET_CONTEXT < len(text) else ""),
    }


def options_from(data):
    sections = [s for s in data.get("sections") or ["writing", "background"] if s in SECTIONS]
    return search_pattern(data.get("query") or "", bool(data.get("matchCase")), bool(data.get("wholeWord"))), sections


@bp.route('/search', methods=['POST'])
def api_search():
    pattern, sections = options_from(request.json or {})
    documents, total = [], 0
    if pattern:
        for section in sections:
            state = load_json(get_state_file(section)) or {}
            for filename, folders in walk_documents(state.get(section)):
                doc = read_doc(os.path.join(get_base_path(section), filename))
                if not doc:
                    continue
                matches = list(pattern.finditer(doc["content"]))
                if not matches:
                    continue
                total += len(matches)
                documents.append({
                    "section": section,
                    "filename": filename,
                    "title": doc["title"],
                    "folders": folders,
                    "count": len(matches),
                    "snippets": [snippet(doc["content"], m) for m in matches[:SNIPPETS_PER_DOCUMENT]],
                })
    return jsonify({"documents": documents, "total": total})


@bp.route('/replace_all', methods=['POST'])
def api_replace_all():
    """Replace in the chosen documents. Each one's current text goes to Version history first."""
    data = request.json or {}
    pattern, sections = options_from({**data, "sections": list(SECTIONS)})
    replacement = data.get("replacement") or ""
    if not pattern:
        return jsonify({"error": "Type something to find."}), 400

    replaced, changed = 0, []
    for target in data.get("targets") or []:
        section, filename = target.get("section"), target.get("filename")
        if section not in sections or not isinstance(filename, str) or "/" in filename or filename.startswith("."):
            continue
        path = os.path.join(get_base_path(section), filename)
        doc = read_doc(path)
        if not doc:
            continue
        new_text, count = pattern.subn(lambda m: replacement, doc["content"])
        if not count:
            continue
        snapshot_file(section, filename, force=True)
        write_doc(path, doc["title"], new_text)

        state_file = get_state_file(section)
        state = load_json(state_file) or {}
        item = find_file_item(state.get(section, []), filename)
        if item:
            item["wordCount"] = count_words(new_text)
            save_json(state_file, state)
        replaced += count
        changed.append({"section": section, "filename": filename})

    return jsonify({"status": "replaced", "replaced": replaced, "documents": len(changed), "changed": changed})
