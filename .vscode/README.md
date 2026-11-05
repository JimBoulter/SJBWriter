# Start and stop the app in VS Code

Open this repository as a folder in VS Code, then choose **Terminal → Run Task**:

- **SJB Writer: Start** runs the fork at <http://127.0.0.1:4107/>.
- **SJB Writer: Stop** stops this checkout's server on port 4107. It also works
  for a server started outside VS Code, including the one launched from chat.

To restart, run Stop, then Start. The Start task keeps server output in its own
terminal. If the app is already running outside VS Code, run Stop before Start.

The Start task uses the existing `~/.venvs/web/bin/python` environment, which
already has Flask and Requests installed on this Mac. It needs no VS Code
Python extension. On another machine, change `command` in `tasks.json` to a
Python environment with `requirements.txt` installed.

Port 4107 is registered as `sjb-writer-fork-ui`. The Stop script verifies that
every listener on that port has this repository's `app` folder as its working
directory before sending SIGTERM.

Task format: [VS Code task documentation](https://code.visualstudio.com/docs/debugtest/tasks).
