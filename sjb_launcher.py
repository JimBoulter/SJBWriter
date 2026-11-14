
"""Packaged SJB Writer launcher."""

import os
import sys
import threading
import time
import webbrowser

from waitress import create_server

# Find the application resources in development or the frozen bundle.
if getattr(sys, "frozen", False):
    RESOURCE_ROOT = sys._MEIPASS
else:
    RESOURCE_ROOT = os.path.dirname(os.path.abspath(__file__))

APP_DIR = os.path.join(RESOURCE_ROOT, "app")

# Make the existing application modules importable.
sys.path.insert(0, APP_DIR)

from app import app as flask_app

# Explicitly locate Flask's bundled frontend resources.
flask_app.template_folder = os.path.join(APP_DIR, "templates")
flask_app.static_folder = os.path.join(APP_DIR, "static")

def main():
    # Port 0 asks the operating system to assign an available port.
    server = create_server(
        flask_app,
        host="127.0.0.1",
        port=0,
    )

    port = server.effective_port
    url = f"http://127.0.0.1:{port}"

    # Start the local server.
    threading.Thread(target=server.run, daemon=True).start()

    # Give the server a moment to start, then request a new browser window.
    time.sleep(0.5)
    webbrowser.open(url, new=1)

    # Keep the launcher alive while the server runs.
    threading.Event().wait()


if __name__ == "__main__":
    main()
