"""What the AI receives, the reply limit, and the price list. All network calls are faked."""

import json
import unittest
from datetime import datetime, timedelta
from unittest import mock

from helpers import AppTestCase, write_json

REQUEST = {
    "system": ["style.md"],
    "background": ["cast.md"],
    "writing": ["chapter-1.md"],
    "current": {"title": "Chapter 2", "content": "Mara stopped."},
    "prompt": "Continue for one paragraph."
}


class FakeStream:
    status_code = 200
    text = ""

    def iter_lines(self, **kwargs):
        return iter([])

    def iter_content(self, **kwargs):
        return iter([])


class LabeledRequest(AppTestCase):

    def test_rules_are_the_system_message_and_the_rest_is_labeled(self):
        parts = self.json_post("/preview_request", **REQUEST)
        self.assertEqual(parts["system"], "Past tense. Close third person.")
        user = parts["user"]
        self.assertIn('<background>\n<document title="Cast">\nMara: a thief with a limp.\n</document>\n</background>', user)
        self.assertIn('<current_document title="Chapter 2">\nMara stopped.\n</current_document>', user)
        order = [user.index(tag) for tag in ("<background>", "<writing>", "<current_document", "<instruction>")]
        self.assertEqual(order, sorted(order))

    def test_generate_sends_exactly_the_preview(self):
        preview = self.json_post("/preview_request", **REQUEST)
        with mock.patch.object(self.app.requests, "post", return_value=FakeStream()) as post:
            write_json(self.path("Global", "config.json"), {"openrouter_api_key": "sk-test"})
            self.client.post("/generate", json={**REQUEST, "settings": {"modelSource": "openrouter", "modelName": "x/y"}}).get_data()
            body = post.call_args.kwargs["json"]
        self.assertEqual(body["messages"], [
            {"role": "system", "content": preview["system"]},
            {"role": "user", "content": preview["user"]}
        ])

    def test_ollama_gets_system_field_and_reply_limit(self):
        with mock.patch.object(self.app.requests, "post", return_value=FakeStream()) as post:
            self.client.post("/generate", json={**REQUEST, "settings": {
                "modelSource": "ollama", "modelName": "llama3", "temperature": 0.5, "maxTokens": 300
            }}).get_data()
            body = post.call_args.kwargs["json"]
        self.assertEqual(body["system"], "Past tense. Close third person.")
        self.assertEqual(body["options"], {"temperature": 0.5, "num_predict": 300})

    def test_no_rules_means_no_system_message(self):
        parts = self.json_post("/preview_request", **{**REQUEST, "system": []})
        self.assertEqual(parts["system"], "")

    def test_quotes_in_titles_keep_the_tag_valid(self):
        self.post("/save_file", section="background", filename="cast.md", title='Mara "Fox"', content="A thief.")
        user = self.json_post("/preview_request", **REQUEST)["user"]
        self.assertIn('<document title="Mara \'Fox\'">', user)


class PriceList(AppTestCase):

    LIVE = {"data": [
        {"id": "paid/model", "pricing": {"prompt": "0.00000015", "completion": "0.0000006"},
         "top_provider": {"max_completion_tokens": 8000}},
        {"id": "openrouter/auto", "pricing": {"prompt": "-1", "completion": "-1"}}
    ]}

    def fake_get(self):
        response = mock.Mock()
        response.json.return_value = self.LIVE
        return mock.patch.object(self.app.requests, "get", return_value=response)

    def save_catalog(self, hours_old, with_prices=True):
        model = {"price": {"in": 1e-7, "out": 1e-6}, "max_out": 8000} if with_prices else {}
        write_json(self.app.OPENROUTER_CATALOG, {
            "checked_at": (datetime.now() - timedelta(hours=hours_old)).isoformat(timespec="seconds"),
            "models": {"paid/model": model}
        })

    def test_refreshes_once_a_day(self):
        with self.fake_get() as get:
            catalog = self.client.get("/openrouter_catalog?auto=1").get_json()
            self.assertEqual(get.call_count, 1, "missing list is fetched")
            self.assertEqual(catalog["models"]["paid/model"]["price"], {"in": 1.5e-7, "out": 6e-7})
            self.assertEqual(catalog["models"]["openrouter/auto"]["price"], {"in": None, "out": None})
            self.client.get("/openrouter_catalog?auto=1")
            self.assertEqual(get.call_count, 1, "a fresh list is not fetched again")
            self.save_catalog(hours_old=25)
            self.client.get("/openrouter_catalog?auto=1")
            self.assertEqual(get.call_count, 2, "a day-old list is fetched again")
            self.save_catalog(hours_old=0, with_prices=False)
            self.client.get("/openrouter_catalog?auto=1")
            self.assertEqual(get.call_count, 3, "a list without prices is fetched again")

    def test_offline_keeps_the_old_list(self):
        self.save_catalog(hours_old=48)
        catalog = self.client.get("/openrouter_catalog?auto=1").get_json()   # the network fails
        self.assertIn("paid/model", catalog["models"])

    def test_reply_limit_is_capped_at_the_model_maximum(self):
        self.save_catalog(hours_old=0)
        self.assertEqual(self.app.reply_limit({"maxTokens": 500, "modelName": "paid/model"}), 500)
        self.assertEqual(self.app.reply_limit({"maxTokens": 99999, "modelName": "paid/model"}), 8000)
        self.assertIsNone(self.app.reply_limit({"maxTokens": ""}))


if __name__ == "__main__":
    unittest.main()
