# SJB Writer

**A local-first writing environment with AI assistance, flexible project organization, and control over your creative workflow.**

SJB Writer is a writing application designed to help you organize creative projects, manage writing files, and work with large language models (LLMs) when you choose. It combines a structured writing environment with the flexibility to use local AI models or connect to online models.

SJB Writer began as a personal project inspired by my own writing workflow. It's being developed with an emphasis on practical features, a clean and comfortable writing environment, and keeping the writer in control.

**Current version:** 1.0.0
**Development status:** Initial release

## What SJB Writer Offers

### Organized Writing Projects

- Keep separate creative projects in their own workspaces.
- Organize writing and background material into folders.
- Create and manage writing files within each project.
- Customize your workspace with themes and font settings.
- Save your work locally and return to it between sessions.

### Flexible AI Assistance

SJB Writer supports two ways to work with language models:

- **Ollama:** Connect to models running locally on your computer.
- **OpenRouter:** Connect to supported online models through an API key.

Choose models according to your hardware, preferences, and the task at hand. SJB Writer includes model management features to help you organize available models and keep useful descriptions and notes.

AI assistance is optional. You can use SJB Writer to organize and manage your writing without generating anything through an AI model.

### A Local-First Approach

Your projects and application data are stored locally. You control your files and can back them up using your preferred tools.

When you use Ollama with a locally running model, prompts can be processed on your own computer without sending them to an online model provider.

When you use OpenRouter, your prompts are sent through that service to the selected model provider. Review the applicable providers' privacy policies and terms before sending sensitive material.


### Platform Support

**Mac is the only platform tested so far.** A standalone Mac application is in development. Windows compatibility testing is planned.


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

To use local models, install [Ollama](https://ollama.com/) separately and download a model compatible with your computer. SJB Writer can discover locally installed models.

To use online models, configure an API key for [OpenRouter](https://openrouter.ai/). API usage may incur charges depending on the model and provider.

## Development Status

Version 1.0.0 includes the core writing environment, nested project organization, document importing, visual customization, search and replace, and model management.

The application has been tested on both Apple Silicon and Intel Macs. Windows compatibility testing is still planned.

SJB Writer is actively evolving. Features and the user interface may change as development continues. Updates and release notes will be provided as the project progresses.

## Privacy and Data

SJB Writer is designed around local file storage and user control.

- Project and writing data are stored locally.
- Local Ollama models can process prompts on your computer.
- Online model services require sending prompts to external providers.
- Users are responsible for protecting their API keys and deciding what information to share with external services.

Local storage does not automatically replace backups. Keep copies of important writing and project data.

## Contributing and Feedback

SJB Writer is currently an independently developed project shared publicly so others can explore its progress.

Feedback, suggestions, and reports of reproducible issues are welcome. Please include your operating system, Python version, and steps to reproduce a problem when reporting an issue.


## Acknowledgments

SJB Writer incorporates contributions from Carlo V. Santiago. His work helped expand and improve the application, and his contributions are greatly appreciated.

[github.com/blossomz37](https://github.com/blossomz37)

## License

SJB Writer is licensed under the PolyForm Noncommercial License 1.0.0.

You may use, study, modify, and distribute this software for noncommercial purposes, subject to the terms of the license.

Commercial use requires separate permission from SJB Property Group, LLC.

See [LICENSE](LICENSE) for the complete license terms.

Copyright 2026 SJB Property Group, LLC.