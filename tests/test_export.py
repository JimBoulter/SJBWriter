"""Export to Markdown and Word."""

import io
import json
import unittest
import zipfile
import xml.etree.ElementTree as ET

from helpers import AppTestCase, doc_text, write

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def paragraphs(docx_bytes):
    """(style, starts a new page, text) for each paragraph of a .docx."""
    package = zipfile.ZipFile(io.BytesIO(docx_bytes))
    for name in package.namelist():
        ET.fromstring(package.read(name))   # every part must be valid XML
    body = ET.fromstring(package.read("word/document.xml"))
    result = []
    for p in body.iter(f"{W}p"):
        style = p.find(f".//{W}pStyle")
        result.append((
            style.get(f"{W}val") if style is not None else None,
            p.find(f".//{W}pageBreakBefore") is not None,
            "".join(t.text or "" for t in p.iter(f"{W}t"))
        ))
    return result, package.read("word/document.xml").decode()


class ExportDocument(AppTestCase):

    def test_markdown_has_title_heading_and_no_file_header(self):
        response = self.post("/export_document", section="writing", filename="chapter-1.md", format="md")
        self.assertIn('filename="chapter-1.md"', response.headers["Content-Disposition"])
        self.assertEqual(response.data.decode(), "# Chapter 1\n\nThe rain fell.\nMara ran.\n")

    def test_word_formatting(self):
        write(self.path("Projects", "book", "writing", "chapter-1.md"), doc_text("Chapter 1",
            "She was **very** *tired* & cold <here>.\n* * *\n***Both*** and snake_case_word.\n- an item\n> a quote"))
        response = self.post("/export_document", section="writing", filename="chapter-1.md", format="docx")
        self.assertTrue(response.mimetype.endswith("wordprocessingml.document"))
        paras, xml = paragraphs(response.data)
        self.assertEqual(paras[0], ("Heading1", False, "Chapter 1"))
        self.assertIn('<w:b/></w:rPr><w:t xml:space="preserve">very</w:t>', xml)
        self.assertIn('<w:i/></w:rPr><w:t xml:space="preserve">tired</w:t>', xml)
        self.assertIn('<w:b/><w:i/></w:rPr><w:t xml:space="preserve">Both</w:t>', xml)
        self.assertIn("&amp; cold &lt;here&gt;", xml)
        self.assertIn("snake_case_word", xml)
        styles = [p[0] for p in paras]
        for style in ("SceneBreak", "ListItem", "Quote"):
            self.assertIn(style, styles)


class ExportManuscript(AppTestCase):

    def make_library(self):
        super().make_library()
        write(self.path("Projects", "book", "writing", "chapter-2.md"), doc_text("Chapter 2", "# Chapter 2\nIt had its own heading."))
        state = self.state()
        state["writing"][0]["items"].append({"type": "file", "filename": "chapter-2.md", "title": "Chapter 2"})
        with open(self.path("Projects", "book", "state.json"), "w") as f:
            json.dump(state, f)

    def test_word_manuscript_structure(self):
        response = self.post("/export_manuscript", format="docx", headings=True, pageBreaks=True)
        self.assertIn('filename="my-book-manuscript.docx"', response.headers["Content-Disposition"])
        paras, _ = paragraphs(response.data)
        headings = [p for p in paras if p[0] and p[0].startswith("Heading")]
        self.assertEqual(headings, [
            ("Heading1", False, "Part One"),     # no blank first page
            ("Heading2", False, "Chapter 1"),    # joins its folder's page
            ("Heading2", True, "Chapter 2"),     # own heading kept, set to chapter level
        ])

    def test_markdown_only_ticked_without_headings(self):
        response = self.post("/export_manuscript", format="md", headings=False, only=["chapter-2.md"])
        self.assertEqual(response.data.decode(), "# Chapter 2\nIt had its own heading.\n")

    def test_nothing_to_export(self):
        self.assertEqual(self.post("/export_manuscript", format="md", only=[]).status_code, 400)


if __name__ == "__main__":
    unittest.main()
