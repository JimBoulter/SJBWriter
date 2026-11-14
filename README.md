# SJB Writer

**A local-first writing environment with AI assistance, flexible project organization, and control over your creative workflow.**

SJB Writer is a writing application designed to help you organize creative projects, manage writing files, and work with large language models (LLMs) when you choose. It combines a structured writing environment with the flexibility to use local AI models or connect to online models.

SJB Writer began as a personal project inspired by my own writing workflow. It's being developed with an emphasis on practical features, a clean and comfortable writing environment, and keeping the writer in control.

**Current version:** 1.0.0
**Development status:** Initial release

## Version 1.0.0: Release Notes and Known Issues

SJB Writer 1.0.0 is the first public release of the standalone macOS application. The currently available packaged build is for Apple Silicon Macs.

### Known Issues and Workarounds

The following issues are known in version 1.0.0. They may not affect every user or configuration, but they are documented here so users know they are recognized and are being addressed.

- **macOS security warning:** The application is currently ad-hoc signed and has not yet been notarized by Apple. macOS may prevent it from opening initially. If this happens, use System Settings > Privacy & Security to review the security notice and select Open Anyway, if that option is available.
- **Ollama model discovery:** On some installations, locally installed Ollama models may not appear until an online model has first been added. Local model discovery should work independently and is being corrected.
- **OpenRouter API key saving:** After entering or changing an API key, press Enter to save it. The current interface does not provide a sufficiently clear method of saving, but confirmation that the key has been saved will properly reflect when it is done.
- **Theme persistence:** Theme preferences may not persist between application launches in the packaged version.
- **Browser behavior:** The application currently opens in a new browser tab rather than a dedicated application window on some browsers.
- **Application shutdown:** Closing the browser tab or window does not automatically stop the SJB Writer background process. The launcher may continue running until it is closed separately.

These issues are being addressed for the next release.

### Planned Version 1.0.1

The current target date for version 1.0.1 is **Friday, November 20, 2026**.

This release is expected to include fixes for the known issues listed above, along with:

- A standalone build for Intel-based Macs.
- Windows compatibility and a standalone Windows build, if development and testing go well.

Release timing and platform availability may change depending on testing results.

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

**MmacOS is the only platform currently supported by the standalone release. Apple Silicon is supported in version 1.0.0. An Intel Mac build is planned for version 1.0.1, with Windows support under consideration for that release.


### Configuring AI Models

You can explore the application without configuring AI assistance.

To use local models, install [Ollama](https://ollama.com/) separately and download a model compatible with your computer. SJB Writer can discover locally installed models.

To use online models, configure an API key for [OpenRouter](https://openrouter.ai/). API usage may incur charges depending on the model and provider.

## Development Status

Version 1.0.0 includes the core writing environment, nested project organization, document importing, visual customization, search and replace, and model management.

The application has been tested on both Apple Silicon and Intel Macs. Windows compatibility testing is still planned. This 1.0.0 release only supports Apple silicon.

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

See [LICENSE](LICENSE.txt) for the complete license terms.

Copyright 2026 SJB Property Group, LLC.