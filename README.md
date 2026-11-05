**Developer's Note:** This is a fork of Jim Boulter's app [SJB Writer](https://github.com/blossomz37/SJBWriter-fork).
**Date:** 2026-10-22
___

# SJBWriter

**A local-first writing environment with AI assistance, flexible project organization, and control over your creative workflow.**

SJBWriter is a writing application designed to help you organize creative projects, manage writing files, and work with large language models (LLMs) when you choose. It combines a structured writing environment with the flexibility to use local AI models or connect to online models.

SJBWriter began as a personal project inspired by my own writing workflow. It's being developed with an emphasis on practical features, a comfortable writing environment, and keeping the writer in control.

**Current version:** 0.9.0  
**Development status:** Early development

## What SJBWriter Offers

### Organized Writing Projects

- Keep separate creative projects in their own workspaces.
- Organize writing and background material into folders.
- Create and manage writing files within each project.
- Customize your workspace with themes and font settings.
- Save your work locally and return to it between sessions.

### Flexible AI Assistance

SJBWriter supports two ways to work with language models:

- **Ollama:** Connect to models running locally on your computer.
- **OpenRouter:** Connect to supported online models through an API key.

Choose models according to your hardware, preferences, and the task at hand. SJBWriter includes model management features to help you organize available models and keep useful descriptions and notes.

AI assistance is optional. You can use SJBWriter to organize and manage your writing without generating anything through an AI model.

### A Local-First Approach

Your projects and application data are stored locally. You control your files and can back them up using your preferred tools.

When you use Ollama with a locally running model, prompts can be processed on your own computer without sending them to an online model provider.

When you use OpenRouter, your prompts are sent through that service to the selected model provider. Review the applicable providers' privacy policies and terms before sending sensitive material.

## Installation and Setup

SJBWriter is currently a Python application that runs locally through a browser. It is not yet packaged as a standalone desktop application.

### Requirements

- Python 3
- Flask
- Requests
- A modern web browser

Ollama is optional. An OpenRouter API key is also optional and is needed only if you want to use models through that service.

### Platform Support

**Mac is the only platform tested so far.** Windows compatibility testing is planned, and installation notes and any necessary updates will be added as that testing progresses.

### Getting Started on Mac

1. Install Python from [python.org](https://www.python.org/downloads/) if it isn't already available.
2. Clone or download this repository.
3. Open a terminal in the SJBWriter project directory.
4. Install the required Python packages:

   ```bash
   python3 -m pip install -r requirements.txt
   ```

5. Start the application:

   ```bash
   cd app
   python3 app.py
   ```

6. Open the local address displayed in the terminal, normally `http://127.0.0.1:5050`.

Keep the terminal running while using the application. To stop the server, return to the terminal and press `Ctrl+C`.

These instructions describe the current development version. Installation and dependency management may change as SJBWriter evolves.

### Running the Tests

The server tests use only Python's built-in `unittest`. From the project folder:

```bash
python3 -m unittest discover tests
```

Each test runs the app on a small, made-up library in a temporary folder, so your own books are never touched. Calls to OpenRouter and Ollama are faked, so the tests never spend credits.

An optional browser smoke test clicks through the main features in a real browser. It needs Node and Playwright:

```bash
npm install --no-save playwright && npx playwright install chromium
node tests/browser/smoke.mjs
```

### Configuring AI Models

You can explore the application without configuring AI assistance.

To use local models, install [Ollama](https://ollama.com/) separately and download a model compatible with your computer. SJBWriter can discover locally installed models.

To use online models, configure an API key for [OpenRouter](https://openrouter.ai/). API usage may incur charges depending on the model and provider.

## Development Status

SJBWriter is actively evolving. Version 0.9.0 includes the core writing environment, project and file organization, visual customization, and model management.

The application has been tested on both Apple Silicon and Intel Macs. Windows compatibility testing is still planned.

Features, installation instructions, and the user interface may change as development continues. The README will be updated as testing and development progress.

## Privacy and Data

SJBWriter is designed around local file storage and user control.

- Project and writing data are stored locally.
- Local Ollama models can process prompts on your computer.
- Online model services require sending prompts to external providers.
- Users are responsible for protecting their API keys and deciding what information to share with external services.

Local storage does not automatically replace backups. Keep copies of important writing and project data.

## Contributing and Feedback

SJBWriter is currently a personal development project shared publicly so others can explore its progress.

Feedback, suggestions, and reports of reproducible issues are welcome. Please include your operating system, Python version, and steps to reproduce a problem when reporting an issue.

## License

A license has not yet been specified. Licensing will be addressed after Windows testing and before the project is ready for broader distribution. Until a license is added, please do not assume that the source code is available for unrestricted reuse, redistribution, or modification.