"""Import: documents and folders, Markdown, text, and Word, with a preview first."""

import io
import os
import unittest

from helpers import AppTestCase, doc_text


class ImportTestCase(AppTestCase):

    def upload(self, url, files, **fields):
        """files: [(relative path, bytes)], sent the way the page sends them."""
        data = {"files": [(io.BytesIO(content), os.path.basename(path)) for path, content in files],
                "paths": [path for path, _ in files], **fields}
        return self.client.post(url, data=data, content_type="multipart/form-data")

    def word(self, markdown, title=""):
        return self.app.markdown_to_docx(markdown, title)


class ReadingFiles(ImportTestCase):

    def test_word_becomes_markdown(self):
        data = self.word("# Part One\n## Chapter 1\nShe was **very** *tired*, and ***both***.\n- first\n- second\n> a quote\n* * *\nLast line.")
        title, text = self.app.docx_to_markdown(data)
        self.assertEqual(text, "# Part One\n\n## Chapter 1\n\nShe was **very** *tired*, and ***both***.\n\n"
                               "- first\n- second\n\n> a quote\n\n* * *\n\nLast line.")
        self.assertIsNone(title)

    def test_word_files_from_other_programs(self):
        expected = ("# The Lighthouse\n\n## Chapter 1\n\nThe bus left her at the end of the road, where the asphalt "
                    "gave up and the rock began.\n\nShe was **very** tired, and *the lamp* turned once. A ***strange*** "
                    "light.\n\n- first thing\n- second thing\n1. one\n2. two\n\n> A quoted line.\n\n* * *\n\n"
                    "The cottage smelled of paraffin.")
        fixtures = os.path.join(os.path.dirname(__file__), "fixtures")
        for name in ("pandoc-sample.docx", "libreoffice-sample.docx"):
            with open(os.path.join(fixtures, name), "rb") as f:
                self.assertEqual(self.app.docx_to_markdown(f.read())[1], expected, name)

    def test_word_title_from_document_properties(self):
        title, _ = self.app.docx_to_markdown(self.word("Text.", title="The Lighthouse"))
        self.assertEqual(title, "The Lighthouse")

    def test_markdown_header_and_tags_are_read(self):
        title, text, extra, added = self.app.read_upload("a.md", b'---\ntitle: "Opening"\ntags: [draft]\n---\n\nShe ran.')
        self.assertEqual((title, text, extra, added), ("Opening", "She ran.", ["tags: [draft]"], False))


class ParagraphSpacing(ImportTestCase):
    ONE_PER_LINE = ("The streets were a maze of decay, and every turn was a gamble.\n"
                    "His boots clattered on the stones as he ran.\n"
                    "It was the voice.\n"
                    "*\"Let me in. I can help you.\"*\n"
                    "He did not answer.")

    def test_one_paragraph_per_line_gets_empty_lines(self):
        text, added = self.app.spaced(self.ONE_PER_LINE)
        self.assertTrue(added)
        self.assertEqual(text.split("\n\n"), self.ONE_PER_LINE.split("\n"))

    def test_text_wrapped_at_a_fixed_width_is_left_alone(self):
        wrapped = ("The streets were a maze of decay, and every turn was a\n"
                   "gamble with death. His boots clattered on the broken\n"
                   "stones as he ran into the shadows of the old city.\n\n"
                   "Somewhere behind him the enforcers were closing in, their\n"
                   "heavy steps cutting through the noise of the market.")
        self.assertEqual(self.app.spaced(wrapped), (wrapped, False))

    def test_already_spaced_text_is_left_alone(self):
        text = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph."
        self.assertEqual(self.app.spaced(text), (text, False))

    def test_lists_quotes_and_code_stay_together(self):
        text = ("One.\nTwo.\nThree.\n- first\n- second\n> quote one\n> quote two\n"
                "```\ncode line\ncode line\n```\nFour.")
        out = self.app.add_paragraph_breaks(text)
        self.assertIn("- first\n- second", out)
        self.assertIn("> quote one\n> quote two", out)
        self.assertIn("code line\ncode line", out)
        self.assertIn("One.\n\nTwo.\n\nThree.", out)

    def test_import_adds_spacing_and_says_so(self):
        data = self.upload("/import/preview", [("Chapter 1.txt", self.ONE_PER_LINE.encode())]).get_json()
        self.assertEqual(data["items"][0]["kind"], "Text · paragraph spacing added")
        self.upload("/import", [("Chapter 1.txt", self.ONE_PER_LINE.encode())], section="writing")
        content = self.app.read_doc(self.path("Projects", "book", "writing", "chapter-1-2.md"))["content"]
        self.assertEqual(content.count("\n\n"), 4)


class Preview(ImportTestCase):

    def test_preview_lists_and_skips_without_writing(self):
        files = [
            ("Book/Part 1/Chapter 10.md", b"Ten."),
            ("Book/Part 1/Chapter 2.txt", b"Two words."),
            ("Book/Notes.docx", self.word("Some notes here.")),
            ("Book/old.doc", b"binary"),
            ("Book/cover.jpg", b"jpg"),
            ("Book/.DS_Store", b"x"),
            ("Book/.obsidian/app.json", b"{}"),
        ]
        before = sorted(os.listdir(self.path("Projects", "book", "writing")))
        data = self.upload("/import/preview", files).get_json()
        self.assertEqual(data["root"], "Book")
        self.assertEqual(data["suggestedProject"], "Book")
        self.assertEqual([i["title"] for i in data["items"]], ["Notes", "Chapter 2", "Chapter 10"],
                         "natural order: Chapter 2 before Chapter 10")
        self.assertEqual([i["kind"] for i in data["items"]], ["Word", "Text", "Markdown"])
        self.assertEqual(data["items"][0]["words"], 3)
        self.assertEqual({s["path"]: s["reason"][:8] for s in data["skipped"]},
                         {"Book/cover.jpg": "Not a Ma", "Book/old.doc": "Old Word"})
        self.assertEqual(data["folders"], 1)
        self.assertEqual(sorted(os.listdir(self.path("Projects", "book", "writing"))), before, "preview writes nothing")


class Importing(ImportTestCase):

    def test_folder_into_this_project_keeps_folders(self):
        files = [
            ("Book/Part 1/Chapter 1.md", doc_text("The Light", "The rain fell.").encode()),
            ("Book/Part 1/Scene/Beat.txt", b"A beat."),
            ("Book/Ending.docx", self.word("It ends **well**.")),
        ]
        result = self.upload("/import", files, section="writing", destination="project", keepFolders="1").get_json()
        self.assertEqual((result["status"], result["documents"], result["folders"]), ("imported", 3, 3))
        writing = self.state()["writing"]
        book = writing[-1]
        self.assertEqual((book["type"], book["title"]), ("folder", "Book"))
        part = [i for i in book["items"] if i.get("title") == "Part 1"][0]
        self.assertEqual(self.names(part["items"]), ["the-light.md", "beat.md"])
        self.assertEqual(self.app.read_doc(self.path("Projects", "book", "writing", "ending.md"))["content"], "It ends **well**.")

    def test_flat_import_never_overwrites(self):
        files = [("Chapter 1.md", b"Imported text.")]
        result = self.upload("/import", files, section="writing", keepFolders="0").get_json()
        self.assertEqual(result["documents"], 1)
        self.assertEqual(self.app.read_doc(self.path("Projects", "book", "writing", "chapter-1.md"))["content"],
                         "The rain fell.\nMara ran.", "the existing chapter is untouched")
        self.assertIn("chapter-1-2.md", self.names(self.state()["writing"]))

    def test_tags_survive_and_background_works(self):
        files = [("cast.md", b'---\ntitle: "Cast list"\ntags: [people]\n---\n\nMara.')]
        self.upload("/import", files, section="background")
        text = self.read("Projects", "book", "background", "cast-list.md")
        self.assertIn("tags: [people]", text)

    def test_as_a_new_project(self):
        files = [("Salt Roads/One.md", b"First."), ("Salt Roads/Two.md", b"Second.")]
        result = self.upload("/import", files, destination="new", projectName="", section="writing").get_json()
        self.assertEqual(result["project"], "salt-roads")
        self.assertEqual(self.app.get_current_project(), "salt-roads", "the new project opens")
        self.assertEqual(self.names(self.state("salt-roads")["writing"]), ["one.md", "two.md"])
        again = self.upload("/import", files, destination="new", projectName="Salt Roads").get_json()
        self.assertEqual(again["project"], "salt-roads-2", "a taken name gets a number")

    def test_refusals(self):
        self.assertEqual(self.upload("/import", [("a.md", b"x")], section="system").status_code, 400)
        self.assertEqual(self.upload("/import", [("a.jpg", b"x")]).status_code, 400)

    def test_paths_from_the_browser_never_reach_the_disk(self):
        self.upload("/import", [("../../../escape.md", b"Nope.")], keepFolders="1")
        self.assertFalse(os.path.exists(self.path("escape.md")))
        self.assertTrue(os.path.exists(self.path("Projects", "book", "writing", "escape.md")))


if __name__ == "__main__":
    unittest.main()
