"""Import documents and folders: Markdown, plain text, and Word (.docx), with a preview first."""

import io
import os
import re
import zipfile
import xml.etree.ElementTree as ET
from flask import request, jsonify, Blueprint

from sjb import paths
from sjb.storage import count_words, doc_name, header_title, load_json, save_json, slugify, split_front_matter, write_doc
from sjb.library import folder_ids, get_base_path, get_project_state
from sjb.projects import make_project

bp = Blueprint("importer", __name__)

KINDS = {".md": "Markdown", ".markdown": "Markdown", ".txt": "Text", ".docx": "Word"}
IMPORT_SECTIONS = ("writing", "background")
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
DC_TITLE = "{http://purl.org/dc/elements/1.1/}title"


# ----- READING FILES -----

def word_on(props, tag):
    """True when a run property such as bold is switched on (<w:b/> or w:val="1")."""
    el = props.find(f"{W}{tag}") if props is not None else None
    return el is not None and el.get(f"{W}val", "true").lower() not in ("0", "false", "none")


def word_runs(paragraph):
    """The paragraph's text, with **bold** and *italic* as Markdown."""
    pieces = []   # (text, bold, italic)
    for run in paragraph.iter(f"{W}r"):
        props = run.find(f"{W}rPr")
        bold, italic = word_on(props, "b"), word_on(props, "i")
        text = ""
        for child in run:
            if child.tag == f"{W}t":
                text += child.text or ""
            elif child.tag == f"{W}tab":
                text += "\t"
            elif child.tag == f"{W}br" and child.get(f"{W}type") not in ("page", "column"):
                text += "\n"
        if not text:
            continue
        if pieces and pieces[-1][1:] == (bold, italic):
            pieces[-1] = (pieces[-1][0] + text, bold, italic)
        else:
            pieces.append((text, bold, italic))

    out = []
    for text, bold, italic in pieces:
        mark = "***" if bold and italic else "**" if bold else "*" if italic else ""
        core = text.strip()
        if not mark or not core:
            out.append(text)
            continue
        # Markers hug the words; spaces stay outside them
        lead, trail = text[:len(text) - len(text.lstrip())], text[len(text.rstrip()):]
        out.append(f"{lead}{mark}{core}{mark}{trail}")
    return "".join(out)


def word_numbered_lists(package):
    """(list id, level) pairs that Word numbers (1, 2, 3 or a, b, c) instead of bulleting."""
    root = ET.fromstring(package.read("word/numbering.xml"))
    numbered_levels = {}
    for abstract in root.iter(f"{W}abstractNum"):
        for level in abstract.iter(f"{W}lvl"):
            fmt = level.find(f"{W}numFmt")
            if fmt is not None and fmt.get(f"{W}val") not in ("bullet", "none"):
                numbered_levels.setdefault(abstract.get(f"{W}abstractNumId"), set()).add(level.get(f"{W}ilvl"))
    result = set()
    for num in root.iter(f"{W}num"):
        abstract_id = num.find(f"{W}abstractNumId")
        levels = numbered_levels.get(abstract_id.get(f"{W}val") if abstract_id is not None else None, set())
        result |= {(num.get(f"{W}numId"), lvl) for lvl in levels}
    return result


def docx_to_markdown(data):
    """(title, Markdown) from a .docx file: headings, bold, italic, lists, quotes."""
    with zipfile.ZipFile(io.BytesIO(data)) as package:
        names = package.namelist()
        body = ET.fromstring(package.read("word/document.xml")).find(f"{W}body")
        style_names = {}
        if "word/styles.xml" in names:
            for style in ET.fromstring(package.read("word/styles.xml")).iter(f"{W}style"):
                name = style.find(f"{W}name")
                style_names[style.get(f"{W}styleId")] = (name.get(f"{W}val") if name is not None else "").lower()
        numbered_lists = word_numbered_lists(package) if "word/numbering.xml" in names else set()
        title = None
        if "docProps/core.xml" in names:
            found = ET.fromstring(package.read("docProps/core.xml")).find(DC_TITLE)
            title = (found.text or "").strip() if found is not None else None

    blocks, list_run, counters = [], False, {}
    for paragraph in body.iter(f"{W}p"):
        text = word_runs(paragraph).strip()
        props = paragraph.find(f"{W}pPr")
        style_el = props.find(f"{W}pStyle") if props is not None else None
        style_id = style_el.get(f"{W}val", "") if style_el is not None else ""
        style = style_names.get(style_id, style_id.lower())
        # A drawn line between scenes (LibreOffice style, or Word/Pandoc's rule shape)
        if not text and ("horizontal line" in style or any(
                el.get("{urn:schemas-microsoft-com:office:office}hr") == "t" for el in paragraph.iter())):
            text = "* * *"
        if not text:
            list_run = False
            continue
        heading = re.search(r"heading\s*([1-6])", style)
        # Word lists use numbering; plainer files (and this app's own export)
        # use a list style with a typed bullet or number
        num = props.find(f"{W}numPr") if props is not None else None
        is_list = num is not None or "list" in style
        num_key = None
        if num is not None:
            num_id = num.find(f"{W}numId")
            level = num.find(f"{W}ilvl")
            num_key = (num_id.get(f"{W}val") if num_id is not None else "",
                       level.get(f"{W}val", "0") if level is not None else "0")

        if style == "title":
            line = f"# {text}"
        elif heading:
            line = f"{'#' * int(heading.group(1))} {text}"
        elif num_key in numbered_lists:
            counters[num_key] = counters.get(num_key, 0) + 1
            line = f"{counters[num_key]}. {text}"
        elif is_list:
            numbered = re.match(r"^(\d+)[.)]\s*(.*)$", text, re.S)
            line = f"{numbered.group(1)}. {numbered.group(2)}" if numbered \
                else "- " + re.sub(r"^[•◦▪·\-–]\s*", "", text)
        elif "quot" in style or "block text" in style:
            line = f"> {text}"
        else:
            line = text
        # List items sit on following lines; everything else is a paragraph
        if is_list and list_run and blocks:
            blocks[-1] += "\n" + line
        else:
            blocks.append(line)
        list_run = is_list
    return title or None, "\n\n".join(blocks)


# ----- PARAGRAPH SPACING -----
# Many programs write one paragraph per line with no empty line between.
# Markdown needs the empty line, or it joins the lines into one paragraph.

def line_kind(line):
    if re.match(r"^\s*([-*+]|\d+[.)])\s", line):
        return "list"
    if re.match(r"^\s*>", line):
        return "quote"
    if re.match(r"^\s*\|", line):
        return "table"
    if re.match(r"^\s*#{1,6}\s", line):
        return "heading"
    return "text"


def is_fence(line):
    return bool(re.match(r"^\s*(```|~~~)", line))


def add_paragraph_breaks(text):
    """Put an empty line between lines that are separate paragraphs (same rule as the preview)."""
    lines = text.split("\n")
    out, in_code = [], False
    for i, line in enumerate(lines):
        out.append(line)
        if is_fence(line):
            in_code = not in_code
        nxt = lines[i + 1] if i + 1 < len(lines) else None
        if in_code or nxt is None or not line.strip() or not nxt.strip():
            continue
        a, b = line_kind(line), line_kind(nxt)
        if a == b and a in ("list", "quote", "table"):
            continue
        if a == "list" and re.match(r"^\s+\S", nxt):
            continue
        out.append("")
    return "\n".join(out)


def one_paragraph_per_line(text):
    """True when the text uses one line per paragraph: lines of prose follow each other
    directly, few empty lines separate them, and most lines end a sentence (text wrapped
    at a fixed width, like an email, breaks lines mid-sentence and is left alone)."""
    lines = text.split("\n")
    direct = gapped = ends = prose = 0
    in_code = False
    for i, line in enumerate(lines):
        if is_fence(line):
            in_code = not in_code
            continue
        if in_code or not line.strip() or line_kind(line) != "text":
            continue
        prose += 1
        if re.search(r"[.!?…:\"”’'*)\]]\s*$", line):
            ends += 1
        nxt = lines[i + 1] if i + 1 < len(lines) else ""
        if nxt.strip():
            direct += line_kind(nxt) == "text"
        else:
            later = next((l for l in lines[i + 1:] if l.strip()), None)
            gapped += later is not None and line_kind(later) == "text"
    return direct >= 2 and gapped <= direct * 0.5 and ends >= prose * 0.6


def spaced(text):
    """(text, True) with paragraph breaks added when it uses one paragraph per line."""
    if one_paragraph_per_line(text):
        return add_paragraph_breaks(text), True
    return text, False


def read_upload(filename, data):
    """(title or None, text, extra header lines, spacing added?) for one supported file."""
    ext = os.path.splitext(filename)[1].lower()
    if ext == ".docx":
        title, text = docx_to_markdown(data)
        return title, text, [], False
    text = data.decode("utf-8-sig", errors="replace").replace("\r\n", "\n").replace("\r", "\n")
    if ext in (".md", ".markdown"):
        lines, body = split_front_matter(text)
        extra = [l for l in lines if l.partition(":")[0].strip() != "title"]
        body, added = spaced(body)
        return header_title(lines), body, extra, added
    text, added = spaced(text)
    return None, text, [], added


# ----- THE PLAN: what an import would do -----

def natural_key(text):
    """Chapter 2 before Chapter 10."""
    return [int(part) if part.isdigit() else part for part in re.split(r"(\d+)", text.lower())]


def clean_parts(path):
    """A relative path from the browser, as safe name parts (never used as a disk path)."""
    return [p for p in path.replace("\\", "/").split("/") if p not in ("", ".", "..")]


def build_plan(uploads):
    """uploads: [(relative path, bytes)]. Returns (root folder name or None, items, skipped)."""
    entries = [(clean_parts(path), data) for path, data in uploads]
    entries = [(parts, data) for parts, data in entries if parts]
    # Hidden files and folders (.DS_Store, .obsidian, .trash) are left out quietly
    entries = [(parts, data) for parts, data in entries if not any(p.startswith(".") for p in parts)]
    entries.sort(key=lambda e: natural_key("/".join(e[0])))

    firsts = {parts[0] for parts, _ in entries}
    root = next(iter(firsts)) if len(firsts) == 1 and all(len(parts) > 1 for parts, _ in entries) else None

    items, skipped = [], []
    for parts, data in entries:
        path = "/".join(parts)
        name = parts[-1]
        ext = os.path.splitext(name)[1].lower()
        if ext not in KINDS:
            reason = "Old Word format: open it in Word and save it as .docx" if ext == ".doc" \
                else "Not a Markdown, text, or Word file"
            skipped.append({"path": path, "reason": reason})
            continue
        try:
            title, text, extra, added = read_upload(name, data)
        except Exception:
            skipped.append({"path": path, "reason": "Could not read this file"})
            continue
        items.append({
            "path": path,
            "folders": parts[1:-1] if root else parts[:-1],
            "title": (title or os.path.splitext(name)[0]).strip() or "Untitled",
            "kind": KINDS[ext] + (" · paragraph spacing added" if added else ""),
            "text": text,
            "extra": extra,
        })
    return root, items, skipped


def uploads_from_request():
    files = request.files.getlist("files")
    rel_paths = request.form.getlist("paths")
    return [(rel_paths[i] if i < len(rel_paths) and rel_paths[i] else f.filename or "", f.read())
            for i, f in enumerate(files)]


# ----- WRITING -----

def unique_stem(base_path, stem):
    stem = stem or "untitled"
    candidate, n = stem, 1
    while os.path.exists(os.path.join(base_path, doc_name(candidate))):
        n += 1
        candidate = f"{stem}-{n}"
    return candidate


def write_import(items, section, keep_folders, wrap_title=None):
    """Write the documents into the open project's section and add them to its sidebar list."""
    base_path = get_base_path(section)
    os.makedirs(base_path, exist_ok=True)
    state_path = get_project_state()
    state = load_json(state_path) or {}
    tree = state.setdefault(section, [])
    taken = folder_ids(tree)

    def new_folder(title, into):
        folder_id, n = slugify(title) or "folder", 1
        base_id = folder_id
        while folder_id in taken:
            n += 1
            folder_id = f"{base_id}-{n}"
        taken.add(folder_id)
        folder = {"type": "folder", "id": folder_id, "title": title, "collapsed": False, "items": []}
        into.append(folder)
        return folder["items"]

    container = new_folder(wrap_title, tree) if wrap_title else tree
    made = {}
    for item in items:
        target = container
        if keep_folders:
            for depth in range(len(item["folders"])):
                key = tuple(item["folders"][:depth + 1])
                if key not in made:
                    made[key] = new_folder(key[-1], target)
                target = made[key]
        stem = unique_stem(base_path, slugify(item["title"]))
        write_doc(os.path.join(base_path, doc_name(stem)), item["title"], item["text"], extra_header=item["extra"])
        target.append({"type": "file", "filename": doc_name(stem), "title": item["title"],
                       "wordCount": count_words(item["text"])})
    save_json(state_path, state)
    return len(made) + (1 if wrap_title else 0)


# ----- ROUTES -----

@bp.route('/import/preview', methods=['POST'])
def api_import_preview():
    """What an import would bring in. Nothing is written."""
    root, items, skipped = build_plan(uploads_from_request())
    if len(items) == 1 and not root:
        suggested = items[0]["title"]
    else:
        suggested = root or "Imported"
    return jsonify({
        "root": root,
        "suggestedProject": suggested,
        "items": [{k: item[k] for k in ("path", "folders", "title", "kind")} | {"words": count_words(item["text"])}
                  for item in items],
        "skipped": skipped,
        "folders": len({tuple(item["folders"][:d + 1]) for item in items for d in range(len(item["folders"]))}),
    })


@bp.route('/import', methods=['POST'])
def api_import():
    section = request.form.get("section", "writing")
    if section not in IMPORT_SECTIONS:
        return jsonify({"error": "Choose Writing or Background"}), 400
    destination = request.form.get("destination", "project")
    keep_folders = request.form.get("keepFolders", "1") == "1"

    root, items, skipped = build_plan(uploads_from_request())
    if not items:
        return jsonify({"error": "There is nothing to import."}), 400

    project = None
    wrap = None
    if destination == "new":
        name = (request.form.get("projectName") or root or "Imported").strip()
        slug, n = slugify(name) or "imported", 1
        base_slug = slug
        while os.path.exists(os.path.join(paths.PROJECTS_DIR, slug)):
            n += 1
            slug = f"{base_slug}-{n}"
        project = make_project(name, slug)
    elif keep_folders and root:
        wrap = root   # an imported folder stays together inside this project

    folders = write_import(items, section, keep_folders, wrap_title=wrap)
    return jsonify({
        "status": "imported",
        "project": project,
        "section": section,
        "documents": len(items),
        "folders": folders,
        "skipped": len(skipped),
    })
