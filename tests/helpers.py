"""Shared setup for the server tests.

Each test runs the app from a throwaway folder: a copy of app/ plus a small,
made-up library (one prompt, one system file, one project). Real books are
never touched, and every network call (OpenRouter, Ollama) fails unless a
test fakes it, so no test can spend credits.
"""

import importlib.util
import json
import os
import shutil
import sys
import tempfile
import unittest
from unittest import mock

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def write_json(path, data):
    write(path, json.dumps(data, indent=2))


def doc_text(title, content):
    return f'---\ntitle: {json.dumps(title)}\n---\n\n{content}'


class NoNetwork(Exception):
    pass


def no_network(*args, **kwargs):
    raise NoNetwork("Tests must not reach the network; fake the call instead.")


class AnyPart:
    """Looks a name up in each part of the app, at the moment it is used, so a
    value that changes while the app runs (the books folder) is always current."""

    def __init__(self, modules):
        self._modules = modules

    def __getattr__(self, name):
        for module in self._modules:
            if hasattr(module, name):
                return getattr(module, name)
        raise AttributeError(name)


class AppTestCase(unittest.TestCase):
    """self.app is the app module, self.client its Flask test client,
    self.root the throwaway app folder."""

    def setUp(self):
        self.root = tempfile.mkdtemp(prefix="sjb-test-")
        self.addCleanup(shutil.rmtree, self.root, ignore_errors=True)
        shutil.copytree(
            os.path.join(REPO, "app"), os.path.join(self.root, "app"),
            ignore=shutil.ignore_patterns("__pycache__")
        )
        self.make_library()
        self.app = self.load_app()

    def make_library(self):
        r = self.root
        write(f"{r}/Global/prompts/continue.md", doc_text("Continue", "Continue the scene."))
        write(f"{r}/Global/system/style.md", doc_text("Style", "Past tense. Close third person."))
        write_json(f"{r}/Global/state.json", {
            "prompts": [{"type": "file", "filename": "continue.md", "title": "Continue"}],
            "system": [{"type": "file", "filename": "style.md", "title": "Style"}],
            "last_opened_global": {}
        })
        write_json(f"{r}/Global/app_state.json", {"current_project": "book", "recent_projects": ["book"]})
        # New projects copy the sample project's menu
        write_json(f"{r}/Projects/sample-project/state.json", {"background": [], "writing": [], "last_opened_project": {}})
        write_json(f"{r}/Projects/sample-project/project.json", {"id": "sample-project", "title": "Sample Project"})

        write_json(f"{r}/Projects/book/project.json", {"id": "book", "title": "My Book"})
        write(f"{r}/Projects/book/background/cast.md", doc_text("Cast", "Mara: a thief with a limp."))
        write(f"{r}/Projects/book/writing/chapter-1.md", doc_text("Chapter 1", "The rain fell.\nMara ran."))
        write_json(f"{r}/Projects/book/state.json", {
            "background": [{"type": "file", "filename": "cast.md", "title": "Cast"}],
            "writing": [{
                "type": "folder", "id": "part-one", "title": "Part One", "collapsed": False,
                "items": [{"type": "file", "filename": "chapter-1.md", "title": "Chapter 1"}]
            }],
            "last_opened_project": {}
        })

    def load_app(self):
        """A fresh copy of the app and its sjb package, reading the throwaway folder.
        Returns one object that finds a name in any part (app.py or sjb/*.py)."""
        app_dir = f"{self.root}/app"
        # Forget any sjb package loaded by an earlier test (it points at another folder)
        for name in [n for n in sys.modules if n == "sjb" or n.startswith("sjb.")]:
            del sys.modules[name]
        sys.path.insert(0, app_dir)
        self.addCleanup(lambda: sys.path.remove(app_dir) if app_dir in sys.path else None)

        spec = importlib.util.spec_from_file_location(f"sjb_app_{id(self)}", f"{app_dir}/app.py")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        parts = [sys.modules[n] for n in sorted(sys.modules) if n.startswith("sjb.")]

        patcher_get = mock.patch("requests.get", side_effect=no_network)
        patcher_post = mock.patch("requests.post", side_effect=no_network)
        patcher_get.start()
        patcher_post.start()
        self.addCleanup(patcher_get.stop)
        self.addCleanup(patcher_post.stop)
        # Keep the console quiet: missing-file reads print a note by design
        quiet = mock.patch("builtins.print", new=lambda *a, **k: None)
        quiet.start()
        self.addCleanup(quiet.stop)
        self.client = module.app.test_client()
        return AnyPart([sys.modules["sjb.paths"], module, *parts])

    # ----- small helpers -----

    def post(self, url, **body):
        return self.client.post(url, json=body)

    def json_post(self, url, **body):
        return self.post(url, **body).get_json()

    def path(self, *parts):
        return os.path.join(self.root, *parts)

    def read(self, *parts):
        with open(self.path(*parts), encoding="utf-8") as f:
            return f.read()

    def state(self, project="book"):
        with open(self.path("Projects", project, "state.json")) as f:
            return json.load(f)

    def names(self, items):
        return self.app.tree_filenames(items)
