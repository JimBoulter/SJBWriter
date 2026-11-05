"""Version history and the Trash window."""

import os
import unittest

from helpers import AppTestCase, write_json


class VersionHistory(AppTestCase):

    def test_save_keeps_old_text_and_restore_brings_it_back(self):
        self.post("/save_file", section="writing", filename="chapter-1.md", title="Chapter 1", content="Second draft.")
        versions = self.json_post("/file_history", section="writing", filename="chapter-1.md")["versions"]
        self.assertEqual(len(versions), 1)
        restored = self.json_post("/restore_version", section="writing", filename="chapter-1.md", id=versions[0]["id"])
        self.assertEqual(restored["content"], "The rain fell.\nMara ran.")
        # The text replaced by the restore is kept too, so a restore can be undone
        self.assertEqual(len(self.json_post("/file_history", section="writing", filename="chapter-1.md")["versions"]), 2)

    def test_versions_saved_as_json_before_the_switch_still_open(self):
        folder = self.path("Projects", "book", "writing", ".history", "chapter-1")
        write_json(f"{folder}/20261001-090000.json", {"title": "Chapter 1", "content": "A JSON-era version."})
        versions = self.json_post("/file_history", section="writing", filename="chapter-1.md")["versions"]
        self.assertEqual([v["id"] for v in versions], ["20261001-090000"])
        version = self.json_post("/file_version", section="writing", filename="chapter-1.md", id="20261001-090000")
        self.assertEqual(version["content"], "A JSON-era version.")


class Trash(AppTestCase):

    def trash_item(self, original):
        return [i for i in self.client.get("/trash").get_json()["items"] if i["original"] == original][0]

    def test_restore_goes_back_into_its_folder(self):
        self.post("/delete_item", section="writing", filename="chapter-1.md")
        item = self.trash_item("chapter-1.md")
        self.assertEqual((item["title"], item["section"]), ("Chapter 1", "writing"))
        result = self.json_post("/restore_trash", kind="file", section="writing", trash_name=item["trash_name"])
        self.assertEqual(result["filename"], "chapter-1.md")
        folder = self.state()["writing"][0]
        self.assertEqual(self.names(folder["items"]), ["chapter-1.md"])

    def test_restore_to_top_level_when_the_folder_is_gone(self):
        self.post("/delete_item", section="writing", filename="chapter-1.md")
        self.post("/delete_folder", section="writing", folder_id="part-one")
        item = self.trash_item("chapter-1.md")
        self.post("/restore_trash", kind="file", section="writing", trash_name=item["trash_name"])
        self.assertEqual(self.names(self.state()["writing"]), ["chapter-1.md"])

    def test_restore_never_overwrites(self):
        self.post("/delete_item", section="writing", filename="chapter-1.md")
        self.post("/create_item", section="writing", title="Chapter 1")
        item = self.trash_item("chapter-1.md")
        result = self.json_post("/restore_trash", kind="file", section="writing", trash_name=item["trash_name"])
        self.assertEqual(result["filename"], "chapter-1-copy.md")

    def test_project_restore_and_empty(self):
        self.json_post("/create_project", name="Second Book")
        self.post("/switch_project", project="book")
        self.post("/delete_project", project="second-book")
        item = self.trash_item("second-book")
        self.assertEqual((item["kind"], item["title"]), ("project", "Second Book"))
        self.post("/restore_trash", kind="project", trash_name=item["trash_name"])
        self.assertTrue(os.path.isdir(self.path("Projects", "second-book")))

        self.post("/delete_item", section="writing", filename="chapter-1.md")
        emptied = self.json_post("/empty_trash")
        self.assertEqual(emptied["removed"], 1)
        self.assertEqual(self.client.get("/trash").get_json()["items"], [])

    def test_bad_trash_names_are_refused(self):
        self.assertEqual(self.post("/restore_trash", kind="file", section="writing", trash_name="../x").status_code, 400)
        self.assertEqual(self.post("/restore_trash", kind="file", section="writing", trash_name="20261001-090000-missing.md").status_code, 404)


if __name__ == "__main__":
    unittest.main()
