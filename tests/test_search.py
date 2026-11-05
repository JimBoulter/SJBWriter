"""Search and replace across the project."""

import unittest

from helpers import AppTestCase, doc_text, write


class ProjectSearch(AppTestCase):

    def make_library(self):
        super().make_library()
        write(self.path("Projects", "book", "writing", "chapter-1.md"),
              doc_text("Chapter 1", "Mara ran to the café. The cafés were closed.\nMARA waited. Marabel did not."))
        write(self.path("Projects", "book", "background", "cast.md"), doc_text("Cast", "Mara: a thief with a limp."))
        write(self.path("Global", "system", "style.md"), doc_text("Style", "Never call Mara a hero."))

    def search(self, **options):
        return self.json_post("/search", **options)

    def test_finds_in_sidebar_order_with_snippets(self):
        result = self.search(query="Mara")
        self.assertEqual(result["total"], 4, "Mara, MARA, Marabel, and the cast note")
        self.assertEqual([(d["section"], d["title"], d["count"]) for d in result["documents"]],
                         [("writing", "Chapter 1", 3), ("background", "Cast", 1)])
        first = result["documents"][0]
        self.assertEqual(first["folders"], ["Part One"])
        self.assertEqual(first["snippets"][0], {"before": "", "match": "Mara", "after": " ran to the café. The cafés were closed. MARA wa…"})

    def test_match_case_and_whole_word(self):
        self.assertEqual(self.search(query="Mara", matchCase=True)["total"], 3)
        self.assertEqual(self.search(query="Mara", wholeWord=True)["total"], 3, "not Marabel")
        self.assertEqual(self.search(query="café", wholeWord=True)["total"], 1, "not cafés")
        self.assertEqual(self.search(query="a.b")["total"], 0, "the dot is taken literally")

    def test_sections(self):
        self.assertEqual(self.search(query="hero")["total"], 0, "System is not searched unless asked")
        self.assertEqual(self.search(query="hero", sections=["system"])["documents"][0]["title"], "Style")

    def test_replace_keeps_old_text_in_history(self):
        result = self.json_post("/replace_all", query="Mara", wholeWord=True, replacement="Maren",
                                targets=[{"section": "writing", "filename": "chapter-1.md"}])
        self.assertEqual((result["replaced"], result["documents"]), (2, 1))
        text = self.app.read_doc(self.path("Projects", "book", "writing", "chapter-1.md"))["content"]
        self.assertEqual(text, "Maren ran to the café. The cafés were closed.\nMaren waited. Marabel did not.")
        self.assertEqual(self.app.read_doc(self.path("Projects", "book", "background", "cast.md"))["content"],
                         "Mara: a thief with a limp.", "documents not chosen are untouched")
        versions = self.json_post("/file_history", section="writing", filename="chapter-1.md")["versions"]
        old = self.json_post("/file_version", section="writing", filename="chapter-1.md", id=versions[0]["id"])
        self.assertIn("Mara ran", old["content"])

    def test_replacement_is_taken_literally(self):
        self.json_post("/replace_all", query="café", replacement=r"\1 $& tea",
                       targets=[{"section": "writing", "filename": "chapter-1.md"}])
        text = self.app.read_doc(self.path("Projects", "book", "writing", "chapter-1.md"))["content"]
        self.assertTrue(text.startswith(r"Mara ran to the \1 $& tea."))

    def test_refusals(self):
        self.assertEqual(self.post("/replace_all", query="", targets=[]).status_code, 400)
        result = self.json_post("/replace_all", query="Mara", replacement="X",
                                targets=[{"section": "writing", "filename": "../cast.md"},
                                         {"section": "elsewhere", "filename": "chapter-1.md"}])
        self.assertEqual(result["documents"], 0)


if __name__ == "__main__":
    unittest.main()
