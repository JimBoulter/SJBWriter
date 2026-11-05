"""Safe file writes, Markdown documents, outside-change tracking, and name checks."""

import os
import re
import json
import tempfile
from flask import request, jsonify

# ===================== CORE HELPERS =====================


def load_json(path):
    try:
        with open(path, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading JSON from {path}: {e}")
        return None


def save_json(path, data):
    write_text(path, json.dumps(data, indent=2))


def write_text(path, text):
    # Write to a temp file in the same folder, then swap it in,
    # so a crash mid-save never leaves a half-written file
    folder = os.path.dirname(path) or "."
    fd, tmp_path = tempfile.mkstemp(dir=folder, prefix=".tmp-")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(text)
            f.flush()
            os.fsync(f.fileno())
        os.chmod(tmp_path, 0o644)
        os.replace(tmp_path, path)
    except BaseException:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise


# ===================== DOCUMENT FILES =====================
# Each document is a Markdown file: a front-matter header with its title,
# then the text. Obsidian and other editors open these files as they are.
# Older documents were JSON ({id, title, content}); read_doc still reads them.

DOC_EXT = ".md"
FRONT_MATTER = re.compile(r"\A---[ \t]*\n(.*?)\n?---[ \t]*(?:\n|\Z)", re.S)


def doc_stem(filename):
    for ext in (DOC_EXT, ".json"):
        if filename.endswith(ext):
            return filename[:-len(ext)]
    return filename


def doc_name(stem):
    return f"{stem}{DOC_EXT}"


def is_doc_file(name):
    return name.endswith(DOC_EXT) and not name.startswith(".")


def split_front_matter(text):
    """(header lines, body). A file with no header gives ([], text)."""
    match = FRONT_MATTER.match(text)
    if not match:
        return [], text
    body = text[match.end():]
    # One blank line separates the header from the text
    if body.startswith("\n"):
        body = body[1:]
    return match.group(1).splitlines(), body


def header_title(lines):
    for line in lines:
        key, sep, value = line.partition(":")
        if sep and key.strip() == "title":
            value = value.strip()
            if value.startswith('"'):
                try:
                    return json.loads(value)
                except ValueError:
                    return value.strip('"')
            if len(value) > 1 and value.startswith("'") and value.endswith("'"):
                return value[1:-1].replace("''", "'")
            return value
    return None


# Modified time of each document as the app last read or wrote it, so a
# change made by another program (Obsidian) can be noticed before a save
SEEN_MTIME = {}


def remember_mtime(path):
    try:
        SEEN_MTIME[os.path.abspath(path)] = os.path.getmtime(path)
    except OSError:
        pass


def changed_outside(path):
    """True when the file changed on disk since the app last read or wrote it."""
    seen = SEEN_MTIME.get(os.path.abspath(path))
    try:
        return seen is not None and os.path.getmtime(path) != seen
    except OSError:
        return False


def read_doc(path):
    """{id, title, content, wordCount} of a document file, or None."""
    if path.endswith(".json"):
        data = load_json(path)
        if not isinstance(data, dict):
            return None
        title, content = data.get("title"), data.get("content") or ""
    else:
        try:
            with open(path, "r", encoding="utf-8") as f:
                text = f.read()
        except OSError:
            return None
        lines, content = split_front_matter(text)
        title = header_title(lines)
    stem = doc_stem(os.path.basename(path))
    return {"id": stem, "title": title or stem, "content": content, "wordCount": count_words(content)}


def write_doc(path, title, content, extra_header=None):
    """Write a Markdown document. Other header lines (tags added in Obsidian) are kept;
    extra_header gives them for a new file (an imported one)."""
    extra = list(extra_header or [])
    if extra_header is None and os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                lines, _ = split_front_matter(f.read())
            extra = [l for l in lines if l.partition(":")[0].strip() != "title"]
        except OSError:
            pass
    header = ["---", f"title: {json.dumps(title or '', ensure_ascii=False)}", *extra, "---"]
    write_text(path, "\n".join(header) + "\n\n" + (content or ""))
    remember_mtime(path)


# ===================== SAFETY HELPERS =====================

SECTIONS = {"prompts", "system", "background", "writing"}


def is_safe_name(name):
    """One file or folder name: no path separators, no '..', no leading dot."""
    return (
        isinstance(name, str)
        and name.strip() != ""
        and "/" not in name
        and "\\" not in name
        and ".." not in name
        and not name.startswith(".")
    )


def reject_unsafe_names():
    # Every route takes its section, file, and project names from JSON;
    # refuse anything that could point outside the data folders
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None

    if data.get("section") and data["section"] not in SECTIONS:
        return jsonify({"error": "Invalid section"}), 400

    for key in ("filename", "project", "current_project"):
        if data.get(key) and not is_safe_name(data[key]):
            return jsonify({"error": f"Invalid {key}"}), 400

    return None


def count_words(text):
    text = (text or "").strip()
    if not text:
        return 0
    return len(text.split())

def slugify(title):
    title = title.lower()
    title = re.sub(r'[^a-z0-9]+', '-', title)
    return title.strip('-')
