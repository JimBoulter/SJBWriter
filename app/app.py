"""SJB Writer: starts the app and connects the parts in app/sjb/.

Each part is one file with one job:
  paths      where app settings and the writer's books live
  storage    safe file writes, Markdown documents, name checks
  library    projects, sections, and the sidebar lists
  migrate    the one-time switch from JSON documents to Markdown
  history    version history and the Trash
  documents  routes for documents and folders
  projects   routes for projects
  ai         the labeled AI request, OpenRouter, Ollama
  models     the model list and OpenRouter's price list
  export     Markdown and Word export
  importer   importing documents and folders (Markdown, text, Word)
  search     search and replace across the project
  settings   API key, app settings, Books folder
"""

from flask import Flask, render_template

from sjb import ai, documents, export, history, importer, models, projects, search, settings
from sjb.migrate import accept_old_document_names, migrate_once
from sjb.storage import reject_unsafe_names

app = Flask(__name__)

APP_VERSION = "0.9.0"

# Before every request, in this order: convert old JSON documents once,
# map old .json names from pages opened before the switch, then refuse
# any name that could point outside the data folders
app.before_request(migrate_once)
app.before_request(accept_old_document_names)
app.before_request(reject_unsafe_names)

for part in (documents, projects, history, ai, models, export, importer, search, settings):
    app.register_blueprint(part.bp)


@app.route("/")
def route_home():
    return render_template("index.html", app_version=APP_VERSION)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5050, debug=True)
