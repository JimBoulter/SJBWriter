
"""Packaged SJB Writer launcher."""

import os
import sys
import threading
import time
import webbrowser
import signal
from flask import jsonify
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
    shutdown_event = threading.Event()
    shutdown_timer = None
    timer_lock = threading.Lock()

    def cancel_shutdown():
        nonlocal shutdown_timer

        with timer_lock:
            if shutdown_timer is not None:
                shutdown_timer.cancel()
                shutdown_timer = None

    def schedule_shutdown():
        nonlocal shutdown_timer

        with timer_lock:
            if shutdown_timer is not None:
                shutdown_timer.cancel()

            shutdown_timer = threading.Timer(
                3.0,
                shutdown_event.set
            )
            shutdown_timer.daemon = True
            shutdown_timer.start()

    @flask_app.route("/lifecycle/open", methods=["POST"])
    def lifecycle_open():
        cancel_shutdown()
        return jsonify({"status": "active"})

    @flask_app.route("/lifecycle/close", methods=["POST"])
    def lifecycle_close():
        schedule_shutdown()
        return jsonify({"status": "closing"})

    def handle_termination(signum, frame):
        shutdown_event.set()

    signal.signal(signal.SIGTERM, handle_termination)
    signal.signal(signal.SIGINT, handle_termination)

    server = create_server(
        flask_app,
        host="127.0.0.1",
        port=0,
    )

    port = server.effective_port
    url = f"http://127.0.0.1:{port}"

    server_thread = threading.Thread(
        target=server.run,
        daemon=True
    )
    server_thread.start()

    time.sleep(0.5)
    webbrowser.open(url, new=1)

    try:
        shutdown_event.wait()
    finally:
        cancel_shutdown()
        server.close()
        server_thread.join(timeout=2)


if __name__ == "__main__":
    main()
