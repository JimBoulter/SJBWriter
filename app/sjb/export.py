"""Export to Markdown and Word, with the built-in .docx writer."""

import os
import re
import zipfile
import io
from xml.sax.saxutils import escape as xml_escape
from flask import request, jsonify, Response, Blueprint

from sjb.storage import load_json, read_doc, slugify
from sjb.library import (
    ensure_structure, get_base_path, get_current_project, get_project_dir,
    get_project_state,
)

bp = Blueprint("export", __name__)

# ===================== EXPORT: MARKDOWN AND WORD =====================
# The Word writer is built in (no extra install), so export works for
# everyone. It covers what fiction needs: headings, paragraphs, bold,
# italic, lists, block quotes, and scene breaks. The page layout is a
# standard manuscript: Times New Roman 12, double spaced, indented
# first lines, 1-inch margins.

SCENE_BREAK = re.compile(r"^(\*\s*){3,}$|^(-\s*){3,}$|^(_\s*){3,}$|^#$")
INLINE = re.compile(
    r"\*\*\*(?!\s)(.+?)(?<!\s)\*\*\*"            # ***bold italic***
    r"|\*\*(?!\s)(.+?)(?<!\s)\*\*"               # **bold**
    r"|(?<!\w)__(?!\s)(.+?)(?<!\s)__(?!\w)"      # __bold__
    r"|\*(?!\s)(.+?)(?<!\s)\*"                   # *italic*
    r"|(?<!\w)_(?!\s)(.+?)(?<!\s)_(?!\w)"        # _italic_
)
XML_UNSAFE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")
PAGE_BREAK = "\f"   # a line holding only this starts the next paragraph on a new page


def docx_runs(text):
    """Word runs for one line of Markdown."""
    runs, pos = [], 0
    for match in INLINE.finditer(text):
        if match.start() > pos:
            runs.append((text[pos:match.start()], False, False))
        both, bold, bold2, italic, italic2 = match.groups()
        if both is not None:
            runs.append((both, True, True))
        elif (bold or bold2) is not None:
            runs.append((bold or bold2, True, False))
        else:
            runs.append((italic or italic2, False, True))
        pos = match.end()
    if pos < len(text):
        runs.append((text[pos:], False, False))

    xml = []
    for chunk, bold, italic in runs:
        props = ("<w:b/>" if bold else "") + ("<w:i/>" if italic else "")
        props = f"<w:rPr>{props}</w:rPr>" if props else ""
        chunk = xml_escape(XML_UNSAFE.sub("", chunk))
        xml.append(f'<w:r>{props}<w:t xml:space="preserve">{chunk}</w:t></w:r>')
    return "".join(xml)


def docx_paragraph(text, style=None, page_break=False):
    props = (f'<w:pStyle w:val="{style}"/>' if style else "") + ("<w:pageBreakBefore/>" if page_break else "")
    return f"<w:p>{f'<w:pPr>{props}</w:pPr>' if props else ''}{docx_runs(text)}</w:p>"


def markdown_to_docx_body(markdown):
    """Each non-empty line is a paragraph, as in the editor."""
    body, page_break = [], False
    for line in markdown.split("\n"):
        if line == PAGE_BREAK:
            page_break = bool(body)   # never a blank first page
            continue
        text = line.strip()
        if not text:
            continue
        heading = re.match(r"^(#{1,6})\s+(.+)$", text)
        bullet = re.match(r"^[-*+]\s+(.+)$", text)
        number = re.match(r"^(\d+)[.)]\s+(.+)$", text)
        if SCENE_BREAK.match(text):
            body.append(docx_paragraph("* * *", "SceneBreak", page_break))
        elif heading:
            body.append(docx_paragraph(heading.group(2), f"Heading{min(len(heading.group(1)), 3)}", page_break))
        elif bullet:
            body.append(docx_paragraph(f"•\t{bullet.group(1)}", "ListItem", page_break))
        elif number:
            body.append(docx_paragraph(f"{number.group(1)}.\t{number.group(2)}", "ListItem", page_break))
        elif text.startswith(">"):
            body.append(docx_paragraph(text.lstrip("> ").strip(), "Quote", page_break))
        else:
            body.append(docx_paragraph(text, None, page_break))
        page_break = False
    return "".join(body)


DOCX_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
DOCX_FILES = {
    "[Content_Types].xml": (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
        '</Types>'
    ),
    "_rels/.rels": (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
        '</Relationships>'
    ),
    "word/_rels/document.xml.rels": (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
        '</Relationships>'
    ),
    "word/styles.xml": (
        f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles {DOCX_NS}>'
        '<w:docDefaults><w:rPrDefault><w:rPr>'
        '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/>'
        '<w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault>'
        '<w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="480" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'
        '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/>'
        '<w:pPr><w:ind w:firstLine="720"/></w:pPr></w:style>'
        '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>'
        '<w:pPr><w:keepNext/><w:spacing w:before="480" w:after="240"/><w:ind w:firstLine="0"/><w:jc w:val="center"/><w:outlineLvl w:val="0"/></w:pPr>'
        '<w:rPr><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:style>'
        '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>'
        '<w:pPr><w:keepNext/><w:spacing w:before="360" w:after="240"/><w:ind w:firstLine="0"/><w:jc w:val="center"/><w:outlineLvl w:val="1"/></w:pPr>'
        '<w:rPr><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style>'
        '<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>'
        '<w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/><w:ind w:firstLine="0"/><w:jc w:val="center"/><w:outlineLvl w:val="2"/></w:pPr>'
        '<w:rPr><w:b/></w:rPr></w:style>'
        '<w:style w:type="paragraph" w:customStyle="1" w:styleId="SceneBreak"><w:name w:val="Scene Break"/><w:basedOn w:val="Normal"/>'
        '<w:pPr><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr></w:style>'
        '<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/>'
        '<w:pPr><w:ind w:left="720" w:right="720" w:firstLine="0"/></w:pPr><w:rPr><w:i/></w:rPr></w:style>'
        '<w:style w:type="paragraph" w:customStyle="1" w:styleId="ListItem"><w:name w:val="List Item"/><w:basedOn w:val="Normal"/>'
        '<w:pPr><w:ind w:left="1080" w:hanging="360"/></w:pPr></w:style>'
        '</w:styles>'
    )
}


def markdown_to_docx(markdown, title=""):
    """A complete .docx file (bytes) from Markdown text."""
    document = (
        f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document {DOCX_NS}><w:body>'
        f'{markdown_to_docx_body(markdown)}'
        '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>'
        '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>'
        '</w:sectPr></w:body></w:document>'
    )
    core = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
        'xmlns:dc="http://purl.org/dc/elements/1.1/">'
        f'<dc:title>{xml_escape(XML_UNSAFE.sub("", title or ""))}</dc:title></cp:coreProperties>'
    )
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as package:
        for name, text in DOCX_FILES.items():
            package.writestr(name, text)
        package.writestr("word/document.xml", document)
        package.writestr("docProps/core.xml", core)
    return buffer.getvalue()


def with_title(title, content, level=1):
    """Content under a title heading at the given level. When the text already
    starts with that title as a heading, that heading is used, at this level."""
    lines = content.split("\n")
    first = next((i for i, line in enumerate(lines) if line.strip()), None)
    if first is not None:
        heading = re.match(r"^#{1,6}\s+(.+)$", lines[first].strip())
        if heading and heading.group(1).strip().lower() == (title or "").strip().lower():
            lines[first] = f"{'#' * level} {heading.group(1).strip()}"
            return "\n".join(lines)
    return f"{'#' * level} {title}\n\n{content}"


def export_response(markdown, title, fmt, name):
    name = slugify(name) or "export"
    if fmt == "docx":
        return Response(
            markdown_to_docx(markdown, title),
            mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{name}.docx"'}
        )
    text = "\n".join(line for line in markdown.split("\n") if line != PAGE_BREAK)
    return Response(
        text.strip() + "\n",
        mimetype="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{name}.md"'}
    )


@bp.route('/export_document', methods=['POST'])
def api_export_document():
    data = request.json or {}
    section, filename = data.get("section"), data.get("filename")
    fmt = data.get("format")
    if not section or not filename or fmt not in ("md", "docx"):
        return jsonify({"error": "Missing data"}), 400
    doc = read_doc(os.path.join(get_base_path(section), filename))
    if doc is None:
        return jsonify({"error": "File not found"}), 404
    return export_response(with_title(doc["title"], doc["content"]), doc["title"], fmt, doc["title"] or doc["id"])


@bp.route('/export_manuscript', methods=['POST'])
def api_export_manuscript():
    """The Writing section as one file, in sidebar order. Folders and documents
    can become headings (a folder one level above what it holds), and each
    document can start a new page in Word."""
    ensure_structure()
    data = request.json or {}
    fmt = data.get("format")
    if fmt not in ("md", "docx"):
        return jsonify({"error": "Missing data"}), 400
    only = set(data["only"]) if isinstance(data.get("only"), list) else None
    headings = data.get("headings", True)
    page_breaks = data.get("pageBreaks", True)

    def has_included(items):
        return any(
            has_included(i.get("items")) if i.get("type") == "folder" else (only is None or i.get("filename") in only)
            for i in items or [] if isinstance(i, dict)
        )

    parts, exported = [], 0
    new_pages = page_breaks and fmt == "docx"
    # A folder heading starts the new page; its first document joins it there
    page_started = False

    def walk(items, depth):
        nonlocal page_started, exported
        for item in items or []:
            if not isinstance(item, dict):
                continue
            if item.get("type") == "folder":
                if not has_included(item.get("items")):
                    continue
                if headings:
                    if new_pages and not page_started:
                        parts.append(PAGE_BREAK)
                    parts.append(f"{'#' * min(depth + 1, 6)} {item.get('title') or ''}")
                    page_started = new_pages
                walk(item.get("items"), depth + 1)
            elif only is None or item.get("filename") in only:
                doc = read_doc(os.path.join(get_base_path("writing"), item.get("filename", "")))
                if doc is None:
                    continue
                if new_pages and not page_started:
                    parts.append(PAGE_BREAK)
                page_started = False
                exported += 1
                parts.append(with_title(doc["title"], doc["content"], min(depth + 1, 6)) if headings else doc["content"])

    walk(load_json(get_project_state()).get("writing", []), 0)
    if not exported:
        return jsonify({"error": "There is nothing to export."}), 400

    meta = load_json(os.path.join(get_project_dir(), "project.json")) or {}
    title = meta.get("title") or get_current_project()
    markdown = "\n\n".join(parts)
    return export_response(markdown, title, fmt, f"{title} manuscript")
