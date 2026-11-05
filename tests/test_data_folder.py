"""Settings → Books folder. The Mac folder window is faked."""

import json
import os
import shutil
import tempfile
import unittest
from unittest import mock

from helpers import AppTestCase


class BooksFolder(AppTestCase):

    def setUp(self):
        super().setUp()
        self.vault = tempfile.mkdtemp(prefix="sjb-vault-")
        self.addCleanup(shutil.rmtree, self.vault, ignore_errors=True)

    def test_picker(self):
        picked = mock.Mock(returncode=0, stdout=self.vault + "\n")
        with mock.patch.object(self.app.subprocess, "run", return_value=picked):
            self.assertEqual(self.json_post("/choose_data_folder"), {"path": self.vault, "hasBooks": False})
        with mock.patch.object(self.app.subprocess, "run", return_value=mock.Mock(returncode=1, stdout="")):
            self.assertEqual(self.json_post("/choose_data_folder"), {"cancelled": True})
        with mock.patch.object(self.app.shutil, "which", return_value=None):
            self.assertEqual(self.json_post("/choose_data_folder"), {"error": "no-picker"})

    def test_copy_books_and_work_there(self):
        result = self.json_post("/set_data_folder", path=self.vault, copy=True)
        self.assertEqual(result["path"], self.vault)
        self.assertTrue(os.path.exists(f"{self.vault}/Projects/book/writing/chapter-1.md"))
        self.assertTrue(os.path.exists(f"{self.vault}/Global/prompts/continue.md"))
        self.assertFalse(os.path.exists(f"{self.vault}/Global/app_state.json"), "app settings stay with the app")

        self.post("/create_item", section="writing", title="Vault Chapter")
        self.assertTrue(os.path.exists(f"{self.vault}/Projects/book/writing/vault-chapter.md"))
        self.assertFalse(os.path.exists(self.path("Projects", "book", "writing", "vault-chapter.md")))

        # The choice survives a restart
        app = self.load_app()
        self.assertEqual(app.DATA_ROOT, self.vault)

    def test_refusals(self):
        self.assertEqual(self.post("/set_data_folder", path=self.path("Projects", "book"), copy=True).status_code, 400)
        self.assertEqual(self.post("/set_data_folder", path=self.vault + "/missing", copy=True).status_code, 400)
        self.post("/set_data_folder", path=self.vault, copy=True)
        self.post("/set_data_folder", path=None)
        self.assertEqual(self.post("/set_data_folder", path=self.vault, copy=True).status_code, 400, "already has books")

    def test_reset_and_missing_folder(self):
        self.post("/set_data_folder", path=self.vault, copy=True)
        self.assertTrue(self.json_post("/set_data_folder", path=None)["isAppFolder"])
        self.assertFalse(os.path.exists(self.path("data_folder.json")))

        with open(self.path("data_folder.json"), "w") as f:
            json.dump({"path": self.vault + "/unplugged"}, f)
        self.load_app()
        status = self.client.get("/data_folder").get_json()
        self.assertTrue(status["isAppFolder"])
        self.assertEqual(status["missing"], self.vault + "/unplugged")


if __name__ == "__main__":
    unittest.main()
