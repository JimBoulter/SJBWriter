"""Documents as Markdown files: create, save, read, rename, move, outside edits."""

import os
import time
import unittest

from helpers import AppTestCase, doc_text, write, write_json


class DocumentFiles(AppTestCase):

    def test_new_document_is_markdown_with_title_header(self):
        self.json_post("/create_item", section="writing", title='Ch: "Two"')
        name = self.app.doc_name(self.app.slugify('Ch: "Two"'))
        self.assertTrue(name.endswith(".md"))
        self.assertEqual(self.read("Projects", "book", "writing", name), doc_text('Ch: "Two"', ""))

    def test_save_and_load_round_trip(self):
        text = "---\nNot a header.\n\nShe ran."
        self.post("/load_file", section="writing", filename="chapter-1.md")
        result = self.json_post("/save_file", section="writing", filename="chapter-1.md", title="Chapter 1", content=text)
        self.assertEqual(result["status"], "saved")
        self.assertFalse(result["changedOutside"])
        loaded = self.json_post("/load_file", section="writing", filename="chapter-1.md")
        self.assertEqual((loaded["title"], loaded["content"]), ("Chapter 1", text))

    def test_file_without_header_uses_file_name_as_title(self):
        write(self.path("Projects", "book", "writing", "Loose Note.md"), "Plain text.")
        doc = self.app.read_doc(self.path("Projects", "book", "writing", "Loose Note.md"))
        self.assertEqual((doc["title"], doc["content"]), ("Loose Note", "Plain text."))

    def test_save_keeps_other_header_lines(self):
        path = self.path("Projects", "book", "writing", "chapter-1.md")
        write(path, '---\ntitle: "Chapter 1"\ntags: [draft]\n---\n\nOld text.')
        self.post("/save_file", section="writing", filename="chapter-1.md", title="Chapter One", content="New text.")
        self.assertEqual(self.read(path), '---\ntitle: "Chapter One"\ntags: [draft]\n---\n\nNew text.')

    def test_rename_moves_file_and_history(self):
        self.post("/load_file", section="writing", filename="chapter-1.md")
        self.post("/save_file", section="writing", filename="chapter-1.md", title="Chapter 1", content="Second draft.")
        self.post("/rename_item", section="writing", filename="chapter-1.md", title="Opening")
        self.assertTrue(os.path.exists(self.path("Projects", "book", "writing", "opening.md")))
        self.assertFalse(os.path.exists(self.path("Projects", "book", "writing", "chapter-1.md")))
        versions = self.json_post("/file_history", section="writing", filename="opening.md")["versions"]
        self.assertEqual(len(versions), 1)

    def test_duplicate_and_move_to_background(self):
        result = self.json_post("/duplicate_item", section="writing", filename="chapter-1.md")
        self.assertEqual(result["filename"], "chapter-1-copy.md")
        moved = self.json_post("/move_file_section", from_section="writing", section="background", filename="chapter-1-copy.md")
        self.assertEqual(moved["status"], "moved")
        self.assertIn("chapter-1-copy.md", self.names(self.state()["background"]))


class OutsideChanges(AppTestCase):
    """Another program (Obsidian) may edit the files while the app is open."""

    def edit_outside(self, text):
        time.sleep(0.02)   # a new modified time
        write(self.path("Projects", "book", "writing", "chapter-1.md"), doc_text("Chapter 1", text))

    def test_save_over_outside_edit_keeps_it_in_history(self):
        self.post("/load_file", section="writing", filename="chapter-1.md")
        self.edit_outside("Edited in Obsidian.")
        status = self.json_post("/file_status", section="writing", filename="chapter-1.md")
        self.assertEqual(status, {"exists": True, "changedOutside": True})

        result = self.json_post("/save_file", section="writing", filename="chapter-1.md", title="Chapter 1", content="Edited in the app.")
        self.assertTrue(result["changedOutside"])
        newest = self.json_post("/file_history", section="writing", filename="chapter-1.md")["versions"][0]
        kept = self.json_post("/file_version", section="writing", filename="chapter-1.md", id=newest["id"])
        self.assertEqual(kept["content"], "Edited in Obsidian.")
        self.assertFalse(self.json_post("/file_status", section="writing", filename="chapter-1.md")["changedOutside"])

    def test_word_counts_do_not_hide_an_outside_edit(self):
        self.post("/load_file", section="writing", filename="chapter-1.md")
        self.edit_outside("Edited in Obsidian.")
        self.client.get("/load")   # reads every file for word counts
        self.assertTrue(self.json_post("/file_status", section="writing", filename="chapter-1.md")["changedOutside"])

    def test_sidebar_follows_the_folder(self):
        write(self.path("Projects", "book", "writing", "From Obsidian.md"), "New note.")
        os.remove(self.path("Projects", "book", "background", "cast.md"))
        project = self.client.get("/load").get_json()["project"]
        added = [i for i in project["writing"] if i.get("filename") == "From Obsidian.md"]
        self.assertEqual(added[0]["title"], "From Obsidian")
        self.assertEqual(project["background"], [])
        # Folders stay as they were
        self.assertEqual(project["writing"][0]["id"], "part-one")


class JsonToMarkdown(AppTestCase):
    """Libraries from before the switch hold JSON documents."""

    def make_library(self):
        super().make_library()
        r = self.root
        os.remove(f"{r}/Projects/book/writing/chapter-1.md")
        write_json(f"{r}/Projects/book/writing/chapter-1.json", {"id": "chapter-1", "title": "Chapter 1", "content": "Old JSON text."})
        write_json(f"{r}/Projects/book/writing/notes.json", {"not": "a document"})
        state = {
            "background": [{"type": "file", "filename": "cast.md", "title": "Cast"}],
            "writing": [{"type": "folder", "id": "part-one", "title": "Part One", "collapsed": False,
                         "items": [{"type": "file", "filename": "chapter-1.json", "title": "Chapter 1"}]}],
            "last_opened_project": {"section": "writing", "filename": "chapter-1.json"}
        }
        write_json(f"{r}/Projects/book/state.json", state)

    def test_conversion(self):
        self.client.get("/load")   # the first request converts
        writing = self.path("Projects", "book", "writing")
        self.assertEqual(self.app.read_doc(f"{writing}/chapter-1.md")["content"], "Old JSON text.")
        self.assertTrue(os.path.exists(f"{writing}/.json-backup/chapter-1.json"))
        self.assertTrue(os.path.exists(f"{writing}/notes.json"), "non-documents are left alone")
        state = self.state()
        self.assertEqual(self.names(state["writing"]), ["chapter-1.md"])
        self.assertEqual(state["writing"][0]["id"], "part-one")
        self.assertEqual(state["last_opened_project"]["filename"], "chapter-1.md")

    def test_conversion_runs_once(self):
        self.client.get("/load")
        self.app.migrate_documents()
        self.assertEqual(os.listdir(self.path("Projects", "book", "writing", ".json-backup")), ["chapter-1.json"])

    def test_pages_from_before_still_save(self):
        self.client.get("/load")
        result = self.post("/save_file", section="writing", filename="chapter-1.json", title="Chapter 1", content="Typed in an old page.")
        self.assertEqual(result.status_code, 200)
        self.assertEqual(self.app.read_doc(self.path("Projects", "book", "writing", "chapter-1.md"))["content"], "Typed in an old page.")


class Safety(AppTestCase):

    def test_path_tricks_are_refused(self):
        for body in (
            {"section": "writing", "filename": "../../Global/state.json"},
            {"section": "writing", "filename": ".hidden.md"},
            {"section": "elsewhere", "filename": "chapter-1.md"},
        ):
            self.assertEqual(self.post("/load_file", **body).status_code, 400, body)

    def test_fresh_install_loads(self):
        os.remove(self.path("Global", "app_state.json"))
        self.app = self.load_app()   # no saved state: a "default" project with no folder yet
        self.assertEqual(self.client.get("/load").status_code, 200)
        self.assertTrue(os.path.isdir(self.path("Projects", "default")))


if __name__ == "__main__":
    unittest.main()
