# Fork changelog

Changes made in [blossomz37/SJBWriter-fork](https://github.com/blossomz37/SJBWriter-fork)
on top of Jim Boulter's [SJBWriter](https://github.com/JimBoulter/SJBWriter).

Each entry says what changed, why, and how it works, in plain words, so any
change can be re-built or cherry-picked on its own. Commit hashes refer to the
fork.

## Overview by area

The dated entries below are newest first. This overview groups them by area;
each line links to its full entry.

**At a glance (from Jim's version to this fork):** 46 entries, each change
tested on a scratch copy before it was merged. Documents moved from JSON to
Markdown. The server went from one 1,844-line file to 12 small files, and
the page script from one 3,863-line file to nine. The fork adds 38 server
tests and a browser smoke test (Jim's version had none).

### Never lose a word

Saving is safe, old text is kept, and deletes can be undone.

- [Safe saving, version history, trash, and name checks](#2026-10-22-safe-saving-version-history-trash-and-name-checks): Saves can no longer leave a broken file; every document keeps its last 50 versions; deletes go to a trash folder; names that could reach outside the data folders are refused.
- [Trash window with Restore](#2026-10-22-trash-window-with-restore): Project ⋯ → Trash… lists deleted documents and projects; Restore puts them back where they were.
- [Documents are Markdown files](#2026-10-22-documents-are-markdown-files): When another program (Obsidian) edits a file, the app keeps that version in history before saving over it, and reloads the open document when you come back.

### Own your files

Your books are plain files you can open anywhere, kept wherever you like.

- [Import documents and folders, with a preview first](#2026-10-22-import-documents-and-folders-with-a-preview-first): Bring in Markdown, text, and Word files or a whole folder, after seeing exactly what will come in.
- [Documents are Markdown files](#2026-10-22-documents-are-markdown-files): Every document is a `.md` file with a title header; a one-time conversion keeps the old JSON files as backups.
- [Books folder: keep your books anywhere](#2026-10-22-books-folder-keep-your-books-anywhere): Settings → Books folder picks any folder (for example in an Obsidian vault), with the Mac folder window.
- [Export to Markdown and Word](#2026-10-22-export-to-markdown-and-word): Export one document, or the whole manuscript, as Markdown or a Word file in standard manuscript format.
- [Personal prompts and system rules stay out of Git](#2026-10-22-personal-prompts-and-system-rules-stay-out-of-git): Your own prompts and rules stay off GitHub; the shipped starters stay.
- [Stray `\n` text removed from five EPBM prompts](#2026-10-22-stray-n-text-removed-from-five-epbm-prompts): Removed typed `\n` text from five EPBM starter prompts.

### Working with the AI

See exactly what is sent, control how it answers, and know what it costs.

- [Labeled AI request, and "What the AI will see"](#2026-10-22-labeled-ai-request-and-what-the-ai-will-see): System files go as real rules; notes, chapters, the open document, and the instruction are each labeled; a window shows the exact text before you send.
- [Max reply length and a cost estimate](#2026-10-22-max-reply-length-and-a-cost-estimate): A reply length limit, and the cost before you send, from OpenRouter's price list (refreshed daily).
- [Temperature, reasoning, and an OpenRouter model check](#2026-10-22-temperature-reasoning-and-an-openrouter-model-check): Temperature and reasoning settings, and a check of your models against OpenRouter (removed or leaving soon).
- [Wishlist batch: windows, AI on/off, web search, duplicate](#2026-10-22-wishlist-batch-windows-ai-onoff-web-search-duplicate): Web search, AI features on/off (a plain editor), duplicate, and windows that close three ways.
- [AI setup panel on the right, with a summary chip](#2026-10-22-ai-setup-panel-on-the-right-with-a-summary-chip): System and Prompts move to a panel on the right, with a summary chip next to Generate.
- [System section above Prompts by default](#2026-10-22-system-section-above-prompts-by-default): System comes first in that panel.
- [AI output marker settings, and a marker placement fix](#2026-10-22-ai-output-marker-settings-and-a-marker-placement-fix): The markers around AI text can be turned off or reworded; AI text now lands inside them.
- [Output markers moved into the AI setup panel](#2026-10-22-output-markers-moved-into-the-ai-setup-panel): Marker settings live in the AI setup panel.
- [Editor minimum width; AI setup tucks away when space runs out](#2026-10-22-editor-minimum-width-ai-setup-tucks-away-when-space-runs-out): The AI panel tucks away when the editor would get too narrow.

### Writing and the editor

A calmer page with the numbers a writer wants.

- [Find and replace, in a document and across the project](#2026-10-22-find-and-replace-in-a-document-and-across-the-project): ⌘F with every match marked, ⌘⇧H to replace, and a project-wide search that lists every match before replacing.
- [Paragraph spacing for one-paragraph-per-line text](#2026-10-22-paragraph-spacing-for-one-paragraph-per-line-text): Each line is a paragraph in the preview, and imports add the missing empty lines.
- [Help pages, and a Help button](#2026-10-22-help-pages-and-a-help-button): Eight help pages with screenshots, opened from the ? button in the top bar.
- [Markdown preview toggle](#2026-10-22-markdown-preview-toggle): Preview the document as formatted text (⌘E).
- [Sidebar toggle, zen mode, status bar, shortcuts, file reveal](#2026-10-22-sidebar-toggle-zen-mode-status-bar-shortcuts-file-reveal): Hide the sidebar, zen mode, a status bar, keyboard shortcuts, and the open file always visible in the sidebar.
- [Dialogue percent in the status bar](#2026-10-22-dialogue-percent-in-the-status-bar): The share of words inside quotes, in the status bar.
- [Word counts without `(?)`, and a clearer token meter](#2026-10-22-word-counts-without--and-a-clearer-token-meter): Word counts everywhere, never `(?)`; a clearer token meter.
- [Close the document; the logo goes home](#2026-10-22-close-the-document-the-logo-goes-home): Close the open document; the logo goes to the empty screen.
- [Empty state when no document is open](#2026-10-22-empty-state-when-no-document-is-open): A friendly empty screen when no document is open.

### Sidebar and organizing

Find, sort, and move documents without fuss.

- [Sidebar: fold, sort, reorder sections, move files between sections](#2026-10-22-sidebar-fold-sort-reorder-sections-move-files-between-sections): Fold sections, sort A–Z or by hand, reorder sections, and move files between sections.
- [Icons for projects, folders, and documents](#2026-10-22-icons-for-projects-folders-and-documents): Icons for projects, folders, and documents.
- [Documents indented clearly under their folders](#2026-10-22-documents-indented-clearly-under-their-folders): Documents indent under their folders.
- [Section contents indented under the section label](#2026-10-22-section-contents-indented-under-the-section-label): Section contents indent under the section label.
- [Project header shows just the name](#2026-10-22-project-header-shows-just-the-name): The project header shows just the name.
- ["ALPHA" project menu label renamed](#2026-10-22-alpha-project-menu-label-renamed): The confusing "ALPHA" label is renamed.
- [New-document buttons show a page with a plus](#2026-10-22-new-document-buttons-show-a-page-with-a-plus): The New document button shows a page with a plus.
- [Resizable sidebar and AI setup panel](#2026-10-22-resizable-sidebar-and-ai-setup-panel): Drag to resize the sidebar and the AI panel.

### Look and layout

One consistent, modern look that works at any window size.

- [UI polish, batch 1 (CSS only)](#2026-10-22-ui-polish-batch-1-css-only): Readable line length, thin scrollbars, a modern UI font, clear zones, quieter headings.
- [UI polish, batch 3: icons, mode + accent themes, toasts](#2026-10-22-ui-polish-batch-3-icons-mode--accent-themes-toasts): Lucide icons with instant tooltips, light/dark × accent colors, and toast messages.
- [Top bar with logo, version, light/dark switch, and settings](#2026-10-22-top-bar-with-logo-version-lightdark-switch-and-settings): A top bar with logo, version, light/dark switch, and settings.
- [Panel toggles in the top bar](#2026-10-22-panel-toggles-in-the-top-bar): Panel buttons in the top bar.
- [Sticky top bar, two layout bugs, and logo first](#2026-10-22-sticky-top-bar-two-layout-bugs-and-logo-first): The top bar stays put; two layout bugs fixed.
- [One consistent 16 px gutter](#2026-10-22-one-consistent-16-px-gutter): One 16 px margin everywhere.
- [Menu text sized like the sidebar](#2026-10-22-menu-text-sized-like-the-sidebar): Menu text matches the sidebar.
- [Toolbar overflow menus, and a clearer token meter](#2026-10-22-toolbar-overflow-menus-and-a-clearer-token-meter): Toolbar buttons that do not fit fold into a ⋯ menu.
- [App question windows instead of browser pop-ups](#2026-10-22-app-question-windows-instead-of-browser-pop-ups): App windows replace every browser pop-up; deletes need a click on a red button.

### Under the hood (for developers)

Easier and safer to change.

- [Housekeeping: tests, requirements, dead code, narrow windows](#2026-10-22-housekeeping-tests-requirements-dead-code-narrow-windows): 38 server tests, `requirements.txt`, dead code removed, and no sideways scroll in narrow windows.
- [Server code split into small files](#2026-10-22-server-code-split-into-small-files): `app.py` (3,342 lines) is now a 44-line start file plus 11 small files in `app/sjb/`.
- [Page script split into nine files, plus a browser smoke test](#2026-10-22-page-script-split-into-nine-files-plus-a-browser-smoke-test): `script.js` (5,842 lines) is now nine files in `app/static/js/`, with a browser smoke test.

---

## 2026-10-22: Find and replace, in a document and across the project

Two commits. **Files:** `app/static/js/editor.js`, `app/static/js/startup.js`,
`app/static/js/projects.js`, `app/static/js/windows.js`, `app/sjb/search.py`
(new), `app/app.py`, `app/static/style.css`, `app/templates/index.html`,
`app/templates/_icons.html` (Lucide `chevron-up`, `case-sensitive`,
`whole-word`, `search`), the help pages, and `tests/test_search.py`.

**Why:** A writer renames a character, fixes a repeated typo, or looks for
every scene at the harbor. Before, the only option was the browser's own ⌘F,
which cannot replace and cannot see other documents.

### 1. Find bar in the open document (`785939e`)

- **Opening and moving around:**
  - **⌘F** opens a bar under the toolbar. Selected text, if it is one short
    line, becomes the search.
  - It shows "3 of 12" and has previous/next buttons (also **⇧↵ / ↵**, and
    **⌘⇧G / ⌘G**).
  - **Esc** closes it. Esc closes the find bar first when the cursor is in
    it, then works as before.
- **Options:**
  - **Match case.**
  - **Whole word:** no letter, digit, or `_` right before or after the
    match, in any language (`\p{L}\p{N}`), so "café" does not find
    "cafés". The search is always taken literally, so a dot means a dot.
- **Replacing:** **⌘⇧H** (or the arrow at the left) shows **Replace** and
  **Replace all** (⌘↵ in the field). Edits go through the text box's own
  typing (`execCommand("insertText")`), so **⌘Z undoes each one**. A Replace
  all is a single undo step.
- **Seeing the matches:**
  - A text box cannot color words, and it hides its selection while the
    cursor is in the find field. So a see-through copy of the text lies
    exactly on top of the editor: the copy's letters are invisible, and only
    the marks behind the matches show.
  - Every match is yellow, and the current one is orange.
  - The copy follows the editor's scrolling, size, and font.
  - The current match scrolls into view. Its position is measured on a
    hidden copy of the text, so this works far down a long chapter.
- **Staying current:** the count follows typing and switching documents.

### 2. Search and replace across the project (`6a8d962`)

- **Where:** Project ⋯ → **Search and replace…**, or **Search all
  documents…** in the find bar, which carries the search and its options
  over.
- **The search** (`POST /search`) uses the same matching rules on the
  server.
- **The results:** every document with matches, in sidebar order:
  - its title and where it sits (section › folders),
  - its number of matches,
  - up to three matches shown in their sentence, with the match marked.
  **Look in** chooses Writing and Background (the default), plus System and
  Prompts if wanted. Only document text is searched, not titles.
- **Replace** (`POST /replace_all`) works on the documents that stay ticked:
  - It asks first ("Replace 14 matches in 3 documents?") and names what the
    text becomes.
  - Each document's current text goes to **Version history first**, then
    the new text is written.
  - The replacement is taken literally (`\1` or `$&` stay as typed).
  - Word counts update, and an open document reloads with its new text.
- **Opening a result:** clicking a title opens that document with the find
  bar on the same search.

**Checked:**
- Six new server tests: sidebar order and snippets, match case and whole
  word (including "café"), sections, replace with Version history,
  literal replacement, and refused targets.
- Browser runs: 19 checks for the find bar (including undo, the marks lining
  up with the text, and a match far down a long chapter) and 17 for project
  search.
- One display bug was found and fixed: the find field showed a double
  border.

---

## 2026-10-22: Paragraph spacing for one-paragraph-per-line text

One commit (`82ecccc`). **Files:** `app/static/js/editor.js`,
`app/sjb/importer.py`, `tests/test_import.py`, and the help pages.

**Why:** Word, Scrivener, and plain-text exports often put one paragraph on
each line, with no empty line between paragraphs. Markdown needs that empty
line, so the preview joined the lines into one paragraph with bare line
breaks, and an imported chapter looked cramped. The app's own Word export
already treated each line as a paragraph, so the same text looked fine in
Word and cramped in the preview.

**How:**

- **Preview:** before drawing, `paragraphPerLine()` puts an empty line between
  lines that are separate paragraphs. Code blocks stay together, and so do
  lines inside one list, quote, or table, and an indented line that continues
  a list item. The file itself is not changed.
- **Import:** the same rule (`add_paragraph_breaks`) runs on Markdown and text
  files, but only when `one_paragraph_per_line` says the file uses that style:
  - at least two prose lines follow each other directly,
  - empty lines between prose lines are no more than half as many,
  - and at least 60% of prose lines end a sentence.
  Text wrapped at a fixed width (emails, Project Gutenberg) breaks lines
  mid-sentence, so it is left alone. The preview list marks those files
  "paragraph spacing added".
- **Checked:** five new tests (one per line, fixed-width wrapping, already
  spaced, lists, quotes, and code, and the import note). A browser check:
  the preview of a one-per-line file shows separate paragraphs and a real
  list, with no forced line breaks.

---

## 2026-10-22: Import documents and folders, with a preview first

One commit (`a6146d8`). **Files:** `app/sjb/importer.py` (new),
`app/sjb/projects.py`, `app/sjb/storage.py`, `app/app.py`,
`app/static/js/projects.js`, `app/static/js/windows.js`,
`app/static/style.css`, `app/templates/index.html`, the help pages,
`tests/test_import.py`, and `tests/fixtures/`.

**Why:** Authors arrive with work they already wrote elsewhere: Word files,
Markdown from Obsidian, plain text, or a whole folder of chapters. There was
no way to bring it in except copying files into the project folders by hand.

**How it works:**

- **Where:** Project ⋯ → **Import…** opens a window with **Choose files…** and
  **Choose a folder…**. The browser sends the chosen files, and for a folder
  each file's path inside it.
- **Preview first** (`POST /import/preview`). Nothing is written yet. The
  window shows:
  - each document's title, path, type, and word count,
  - the skipped files with the reason ("Not a Markdown, text, or Word file";
    for `.doc`: "Old Word format: open it in Word and save it as .docx"),
  - totals ("Found 4 documents, 1 folder, 2 skipped.").
  Hidden files and folders (`.DS_Store`, `.obsidian`) are left out quietly.
- **The author then chooses:**
  - **Import into:** this project, or a new project. The new project is named
    after the folder; a taken name gets a number. This choice resets to "this
    project" each time the window opens, so a project is never made by
    accident.
  - **Section:** Writing or Background.
  - **Keep the folders** as sidebar folders (shown only when there are
    folders). An imported folder stays together inside an existing project,
    under a sidebar folder with its name.
- **Then** `POST /import` writes the documents:
  - Order is natural: Chapter 2 comes before Chapter 10.
  - File names are made fresh from the titles: `chapter-1.md`, or
    `chapter-1-2.md` when taken, so nothing is overwritten.
  - Paths from the browser are only used as titles and folder names, never
    as paths on disk.
  - The original files are never touched.
- **Formats:**
  - **Markdown** keeps its title from the header, plus any other header lines
    (Obsidian tags). `write_doc` gained an `extra_header` option for this.
  - **Text** takes its title from the file name.
  - **Word (.docx)** is read by a built-in reader, with no library needed:
    headings, bold, italic, bold-italic, bullet lists, numbered lists (read
    from Word's numbering definitions), quotes ("Quote", "Quotation", "Block
    Text" styles), and scene breaks. Scene breaks come in whether typed as
    `* * *` or drawn as a line (LibreOffice's "Horizontal Line" style, or the
    `o:hr` rule shape that Word and Pandoc use). The title comes from the
    document properties, or the file name.
- **Shared code:** Create Project and Import now share one `make_project()`
  helper.

**Checked:**
- Eleven new server tests, including two real Word files made by Pandoc and
  LibreOffice (kept in `tests/fixtures/`). Both convert to the expected
  Markdown exactly.
- A browser run imported a folder as a new project, then single files into
  Background.
- One real bug was found and fixed during testing: the "new project" choice
  used to carry over to the next import.
- The help pages have a new Import section with a screenshot.

---

## 2026-10-22: Help pages, and a Help button

One commit (`dcf099e`). **Files:** `app/static/help/` (new),
`app/templates/index.html`, `app/templates/_icons.html` (Lucide
`circle-help`), `app/static/js/windows.js`, and `tests/browser/smoke.mjs`.

**Why:** The app had no help. A new writer had to discover every feature by
clicking around.

**What:**

- **Eight static pages** in `app/static/help/`. The app serves them itself,
  so help works offline:
  - **Start here:** what the app is, how to start it, the screen at a glance,
    first steps, and keyboard shortcuts.
  - **Writing:** opening, saving, the toolbar, preview, zen, and the status
    bar.
  - **Projects and the sidebar.**
  - **Working with AI:** the panel, what the AI sees, the dock, markers,
    settings, and cost.
  - **Models and settings:** OpenRouter, Ollama, and Manage Models.
  - **Keeping your work safe:** safe saves, Version history, the Trash, and
    outside edits.
  - **Your files:** Markdown, the Books folder, Obsidian, and export.
  - **Look and layout.**
- **Easy to move around:** each page has the contents list on the left, an
  "On this page" list, and previous/next links. At phone width, the contents
  list sits above the page.
- **21 screenshots** in `app/static/help/assets/`. They show a made-up demo
  book, *The Lighthouse Keeper*, so no real writing appears. Each one is
  cropped to the part being explained. The overview has numbered markers
  that match a numbered list.
- **The same look as the app.** `help.css` copies the app's color and font
  tokens. `help.js` asks the app (`/load`) for the saved mode and accent
  color. Opened as a plain file, the pages follow the computer's light/dark
  setting.
- **A ? button in the top bar** opens help in a new tab, so the writing
  stays put.

**Portable (`2e86fb4`):** the `help/` folder also works on its own.
You can zip it, open its pages as plain files, or host it anywhere.
- The logo and tab icon live in `help/assets/`, so no link points outside
  the folder.
- When the pages are not served by the app, `help.js` hides "Back to the
  app" and follows the computer's light/dark setting.

**Checked:**
- All pages load, with no errors.
- All images load.
- Every link inside help reaches a real page and section.
- No sideways scroll at phone width.
- The ? button opens help. The smoke test now checks this too.

---

## 2026-10-22: Page script split into nine files, plus a browser smoke test

Two commits: `3510505` (smoke test) and `769a32d` (split). **Files:**
`app/static/js/*.js` (new), `app/static/script.js` (removed),
`app/templates/index.html`, `tests/browser/smoke.mjs`, and `README.md`.

**Why:** `script.js` had grown to 5,842 lines, holding 184 functions. As on
the server, each file now has one job.

**The new map** (`app/static/js/`, in load order):

| File | What it does |
|---|---|
| `core.js` | Shared state and the small helpers every file uses (toasts, icons, preferences, tree lookups). |
| `appearance.js` | Light/dark mode, accent colors, fonts, the Visual layout window. |
| `models.js` | Manage Models, the model pickers, the OpenRouter model check. |
| `sidebar.js` | The document lists: render, tick, sort, fold, drag, move, menus, panel widths. |
| `editor.js` | The open document: open, save, formatting, preview, zen, status bar, toolbars, outside changes. |
| `ai.js` | Setup panel, Generate, markers, generation settings, token meter, cost, request preview. |
| `projects.js` | Project menu and list, loading a project, Trash, Export. |
| `windows.js` | Question windows, closing rules, Version history, Settings, Books folder. |
| `startup.js` | Keyboard shortcuts, the panel-size watcher, the start of the page. |

**Why plain script files and not JavaScript modules:**
- The page has 83 inline `onclick` handlers that call global functions.
- Plain `<script>` files loaded in order share one global scope, exactly like
  the single file did. So those handlers keep working, and no build step is
  needed.
- JavaScript modules would hide the functions from the handlers.

**How it was kept safe:**
- **The smoke test came first.** `tests/browser/smoke.mjs` was committed
  before the split, and it passed on the old file. It is optional, because it
  needs Node and Playwright; the README says how to run it.
  - It runs the app on a throwaway library and fakes the AI reply.
  - It uses each main feature once: open, edit, save with ⌘S, create a new
    document, generate, every window, the Markdown preview, folding the
    sidebar, dark mode, and phone width.
  - It fails on any page error or browser pop-up.
  - A test run with one function renamed on purpose failed, so the test
    really catches breakage.
- **A pure move:** a script cut the file along feature lines, using a
  JavaScript parser. A second check confirmed that all 271 top-level
  statements exist exactly once, word for word.
- **A load-order check.** In plain scripts, a function is only "hoisted"
  inside its own file, so code that runs while a file loads must use names
  from earlier files only. The check proved this holds.
- **One deliberate placement:** the panel-size watcher (`ResizeObserver`)
  went to `startup.js`. It can fire as soon as it is attached, so it must
  load after `ai.js`.
- **Results:** the smoke test passes after the split. The question-window,
  export, and AI-preview browser checks also pass, on a copy of real data.

**Still large:** `sidebar.js` (about 1,600 lines) and `models.js` (about
1,100) each hold one very long function (`renderSection`, about 420 lines,
and `renderModelsManager`, about 390). Splitting those is real rewriting,
not moving, and is left for when a feature needs it.

---

## 2026-10-22: Server code split into small files

One commit (`4d29a4f`). **Files:** `app/app.py` and the new `app/sjb/`
folder (`tests/helpers.py` follows the change).

**Why:** `app.py` had grown to 3,342 lines, holding 48 routes and 131
functions. Every change meant searching one huge file. Now each file has one
job, and you can describe it in one sentence.

**How the split was decided:**
- Code that changes together stays together. For example, everything about
  export is in one file.
- Each file is named after what it does for the writer.
- Dependencies point one way. The low-level files (where things live, safe
  file writes) never depend on the feature files.

**The new map** (`app/sjb/`, lowest layer first):

| File | What it does |
|---|---|
| `paths.py` | Where the app settings and the writer's books live. The Books folder can change while the app runs. |
| `storage.py` | Safe file writes, Markdown documents, outside-change tracking, name checks. |
| `library.py` | Projects, sections, the sidebar lists (trees), free names for copies. |
| `migrate.py` | The one-time JSON-to-Markdown switch, and old `.json` names from open pages. |
| `history.py` | Version history and the Trash, with their routes. |
| `documents.py` | Routes for documents and folders. |
| `projects.py` | Routes for projects. |
| `ai.py` | The labeled AI request, OpenRouter, Ollama, reply limit. |
| `models.py` | The model list and OpenRouter's price list. |
| `export.py` | Markdown and Word export. |
| `settings.py` | API key, app settings, Books folder. |

- **`app.py` is now about 45 lines.** It creates the Flask app and adds the
  three request checks, in the same order as before: convert old documents
  once, map old `.json` names, then refuse unsafe names. It registers one
  Flask Blueprint per feature file, and serves the start page. You still
  start the app with `cd app && python3 app.py`.

**How it was kept safe:**
- **A pure move.** A script cut the file along the existing sections. A
  second script then checked the result:
  - All 132 functions exist exactly once.
  - Their code is unchanged, except for two planned edits. `@app.route`
    became `@bp.route`. And the movable book paths (`PROJECTS_DIR`,
    `GLOBAL_STATE`, and friends) are now read as `paths.PROJECTS_DIR` when
    used, so they follow a Books folder change.
  - The app answers the same 49 routes, with the same methods.
- **One real fix during the move:** `BASE_DIR` now sits one folder deeper,
  in `app/sjb/`, so it was adjusted to still mean the `app/` folder. The
  tests caught this at once.
- **Tests:** all 38 server tests pass. The browser checks for the question
  windows, export, and the AI preview pass against the split app.

---

## 2026-10-22: App question windows instead of browser pop-ups

One commit (`0730d46`). **Files:** `app/static/script.js`,
`app/static/style.css`, `app/templates/index.html`.

**Why:** The app used the browser's own `prompt()` and `confirm()` pop-ups
16 times. They freeze the page, look different in every browser, cannot
show a red "Delete" button, and cannot start with the current name filled
in.

**How it works:**

- **One shared window.** `askText(title, value, options)` and
  `askConfirm(title, message, options)` open one shared window
  (`#askModal`) and return a Promise. `askText` gives the trimmed text, or
  `null` when cancelled or empty. `askConfirm` gives `true` or `false`.
  Options: `placeholder`, `okLabel`, and `danger`.
- **Keys and clicks:** Enter answers. Esc, a click on the backdrop, or
  Cancel cancels. A new question replaces an unanswered one.
- **Every pop-up is replaced:**
  - Create, rename, and delete for documents, folders, and projects.
    Rename now starts with the current name.
  - Delete model.
  - The Books folder questions and the typed-path fallback.
  - Empty trash.
- **Delete questions** show the item's title, a red button, and "It moves to
  the Trash. You can restore it from Project ⋯ → Trash…". Cancel has focus,
  so pressing Enter cannot delete by accident.
- **On top of other windows:** the window sits above other windows, for
  example the Books folder question over Settings. The Esc handler now
  closes the top open window, not the first one in the page.

**How to check:**

1. Click **+** in Writing. An app window asks for the title. Enter creates
   the document.
2. Delete a document. The red **Delete** button needs a click.

---

## 2026-10-22: Housekeeping: tests, requirements, dead code, narrow windows

Five commits.

### 1. A server test suite (`de7aeac`)

- **What:** `tests/` holds 38 tests that use only Python's built-in
  `unittest`. Run them with `python3 -m unittest discover tests`. The README
  says how.
- **How they stay safe:** `tests/helpers.py` copies `app/` into a temporary
  folder, together with a small made-up library: one prompt, one system
  file, and a project with a folder. So real books are never touched. Every
  `requests.get` and `requests.post` fails unless a test fakes it, so no test
  can reach OpenRouter or Ollama or spend credits.
- **What they cover:**
  - Documents: Markdown files, the title header, extra header lines,
    rename, duplicate, and move.
  - Outside edits and the sidebar following the folder.
  - The JSON-to-Markdown conversion, including old pages that still send
    `.json` names.
  - Version history, including JSON-era versions.
  - Trash: restore into the folder, restore to the top level, name clashes,
    projects, and empty.
  - The labeled AI request: Generate sends exactly what the preview shows,
    for both OpenRouter and Ollama.
  - The reply limit and the daily price-list refresh, including offline.
  - Export: Word structure and formatting, and the manuscript order,
    headings, and new pages.
  - The Books folder: the picker, copy, refusals, reset, and a missing
    folder.
  - Path tricks, and a fresh install.
- **Proof that they catch bugs:** two bugs were put back on purpose, one at
  a time: the fresh-install crash, and a skipped outside-edit check. In each
  case, the matching test failed.

### 2. `requirements.txt` (`a04950a`)

`Flask>=3.0` and `requests>=2.31`. The README install step now uses
`python3 -m pip install -r requirements.txt`.

### 3. `.env-example` removed (`7146035`)

The app never read it. The API key is set in Settings and kept in
`Global/config.json`. `.env` stays git-ignored.

### 4. Dead code removed (`048234e`)

- **`app.py`:** the `/test_create`, `/test_load`, and `/test_save` routes sat
  inside a string block, so they never ran.
- **`script.js`:** `saveSectionOrder`, `createProject`, `moveModel`, and
  `addModelRow` had no callers. In total, 139 lines were removed.

### 5. No sideways scroll in narrow windows (`a2876b0`)

- **At 700 px and less:**
  - The sidebar floats over the editor like a drawer, with a soft shadow,
    instead of squeezing the editor to about 215 px. The sidebar button
    still opens and closes it.
  - The status bar drops reading time and the dialogue percent.
  - The token meter uses a short form ("≈ 1k tokens · up to $0.01"). The
    tooltip keeps the full details.
- **At every width:** the status bar's file name shrinks first, and the right
  side can no longer push the page wider. Before this, a 701 px window
  scrolled sideways by 10 px.
- **Measured:** no sideways scroll at 390, 700, 701, 760, 860, 1024, and
  1440 px.

---

## 2026-10-22: Stray `\n` text removed from five EPBM prompts

One commit (`f752d9a`). **Files:** `Global/prompts/epbm-2-characters`,
`epbm-5-chapter-draft`, `epbm-6-chapter-editing-plan`,
`epbm-7-chapter-final`, and `epbm-9-review-refinement` (`.md`; they were
`.json` in the original).

**Why:** These starter prompts held the two characters `\n` as plain text,
29 times in all (16 in EPBM 6). The editor and the AI request showed them as
written, for example "…narrative arc.\n". The same text is in the original
JSON files, as `\\n` in the JSON. It was most likely pasted in from
somewhere that already showed line breaks as `\n`.

**How:** Each `\n` sat just before a real line break, or at the very end of
the text. It was deleted, together with any spaces next to it. No other
text changed, and the line layout stays the same.

**How to check:** Open EPBM 6. No `\n` shows in the text.

---

## 2026-10-22: Export to Markdown and Word

One commit (`1179568`). **Files:** `app/app.py`, `app/static/script.js`,
`app/static/style.css`, `app/templates/index.html`.

**Why:** Authors need to get their words out of the app: one chapter to
send to a reader, or the whole manuscript for an editor, a beta reader, or
a formatting tool. Word (.docx) is what most of those people expect.

**What the author sees:**

- **Document ⋯ menu:** **Export as Markdown** and **Export as Word**. The
  export has the document's title as a heading, then its text. The
  Markdown export has no file header.
- **Project ⋯ menu:** **Export manuscript…** opens a small window with four
  choices:
  - **Format:** Word or Markdown.
  - **Documents:** all of Writing, or only the ticked documents.
  - **Headings:** folder and document titles as headings.
  - **New pages:** each document starts on a new page (Word only).
  The window remembers the last choices.
- **The manuscript itself:**
  - It follows the sidebar order.
  - A folder becomes a heading one level above what it holds, so
    Part → Chapter works.
  - A folder's heading starts the new page, and its first chapter joins it
    on that page.
  - If a document already starts with its own title as a heading, the app
    does not add a second one. It sets that heading to the right level.
- The download is named after the document or the project (for example,
  `my-book-manuscript.docx`).

**How the Word file is made:**

- **Built in, with no library or Pandoc.** The app writes the .docx parts
  itself (`markdown_to_docx`): content types, relationships, styles, the
  document, and core properties (the title).
- **What it understands:**
  - Each non-empty line is a paragraph, as in the editor.
  - `#`–`######` become Heading 1–3.
  - `**bold**`, `*italic*`, `***both***`, `__bold__`, and `_italic_`, where
    underscores only count at word edges, so `snake_case` stays as it is.
  - `-` / `*` / `+` bullets and `1.` numbers.
  - `>` quotes.
  - `* * *`, `***`, `---`, `___`, or a lone `#` become a centered "* * *"
    scene break.
- **The layout:** a standard manuscript format: Times New Roman 12, double
  spaced, first lines indented half an inch, no space between paragraphs,
  1-inch margins on US Letter, and centered bold headings.
- **New pages:** a new page is the paragraph property `pageBreakBefore`.
- **Routes:** `POST /export_document {section, filename, format}` and
  `POST /export_manuscript {format, only, headings, pageBreaks}`. Both
  return the file as a download.

**Checked with:**
- Every XML part parses.
- macOS `textutil` reads the text.
- Pandoc reads the bold, italic, headings, lists, quote, and scene break
  back.
- LibreOffice renders double spacing, the indents, and new pages
  correctly, and keeps curly quotes and em dashes.
- macOS Quick Look previews ignore the spacing and page breaks; that is a
  limit of the preview, not of the file.

**How to check:**

1. Project ⋯ → **Export manuscript…** → Word → **Export**.
2. Open the file in Word, Pages, or LibreOffice.

---

## 2026-10-22: Books folder: keep your books anywhere

One commit (`2915ca0`). **Files:** `app/app.py`, `app/static/script.js`,
`app/static/style.css`, `app/templates/index.html`, `.gitignore`.

**Why:** The books lived inside the app's own folder. With documents now
Markdown files, an author can keep them in an Obsidian vault and work on
the same files in both programs, but only if the app can use a folder of
their choice.

**What moves and what stays:**

- **Books (these move):** `Global/prompts`, `Global/system`, their menu
  `Global/state.json`, and all of `Projects/`. Inside the chosen folder,
  they keep the same layout (`Global/…` and `Projects/…`).
- **App settings (these stay with the app):** `app_state.json`, the API key
  (`config.json`), the model lists, and the OpenRouter price list. The
  shipped sample project also stays, because new projects copy its menu.
- **In the code:** `APP_ROOT` is the app folder. `set_data_root(root)`
  repoints `LIBRARY_DIR`, `GLOBAL_STATE`, and `PROJECTS_DIR`. All routes read
  these at call time, so a switch applies at once, with no restart.

**How the author picks the folder:**

- **The setting:** Settings has a new **Books folder** section. It shows the
  current path and has a **Choose…** button.
- **The picker:** a web page cannot see real paths on the computer, so
  `POST /choose_data_folder` makes the server open the Mac "Choose folder"
  window (`osascript … choose folder`). On a system without `osascript`, it
  answers `no-picker`, and the page asks for a typed path, which
  `POST /folder_info` checks.
- **If the folder has no books yet,** the page asks "Copy your books to … and
  use them from there? The originals stay where they are, as a backup."
- **If it already has books** (a `Projects/` folder or `Global/state.json`),
  the page asks "… already has books. Use them?"
- `POST /set_data_folder {path, copy}` then does the work:
  - It copies the books (not app settings, not temp files) when asked.
  - It saves the choice in `data_folder.json` at the app root. This file is
    git-ignored.
  - It switches the paths.
  - It opens a project that exists in the new place, and trims the recent
    list.
- **Switching back:** "Use the app folder again" switches back to the app
  folder, and removes `data_folder.json`.

**Safety:**

- **Refused folders:** a folder inside the current books (copying into
  itself), a folder that does not exist, a folder the app cannot write to,
  and copying into a folder that already has books.
- **A missing folder at start:** if the chosen folder is missing (for
  example, an unplugged drive), the app uses the app folder and shows
  "Your books folder is missing: …".

**How to check:**

1. Settings → Books folder → **Choose…** → pick an empty folder → confirm.
2. The folder now has `Global/` and `Projects/` with your `.md` files.
3. A document added there in Obsidian appears in the sidebar when you come
   back to the app.

---

## 2026-10-22: Documents are Markdown files

Three commits:
- `9292266`: the code.
- `8aac805`: the shipped starter files.
- `657a2f7`: a separate fix for a crash on a fresh install.

**Files:** `app/app.py`, `app/static/script.js`, `.gitignore`, plus the
starter documents in `Global/prompts`, `Global/system`, and
`Projects/sample-project`.

**Why:** Every document was a JSON file (`{id, title, content, wordCount}`).
That caused three problems:
- Obsidian and other writing tools could not open the chapters.
- Git diffs showed each chapter as one long line.
- Moving your words out of the app was harder than it needs to be.

Now each document is a plain `.md` file.

**The file format:**

- The file starts with a small header that holds the title, then a blank
  line, then the text. Example: `---`, `title: "Chapter One"`, `---`, blank
  line, text.
- The title is written in JSON-string quoting, which is valid YAML, so
  quotes and colons in titles are safe.
- Other header lines that someone adds in another program, for example
  Obsidian `tags:`, are kept when the app saves.
- A `.md` file with no header also works. Its title is the file name.
- One storage layer does all of this: `read_doc`, `write_doc`, `doc_stem`,
  and `doc_name`. Every route that reads or writes a document now goes
  through it: create, save, load, rename, duplicate, move to another
  section, version history, restore, trash, and the AI request. Writes stay
  atomic: a temp file, then a swap.

**The one-time conversion:**

- **When:** at the first request after the server starts.
- **What it converts:** every JSON document in the four section folders,
  in Global and in every project.
- **For each document:**
  - The app writes a `.md` file with the same title and text.
  - The JSON file moves to a hidden `<section>/.json-backup/` folder. It is
    never deleted.
  - The sidebar lists and the "last opened" entries switch to the new names.
- **What it leaves alone:** files that do not look like documents (no
  `content` or `title`).
- **Safe to repeat:** running it again does nothing.
- **Older versions and trash:**
  - Versions in Version history saved before the switch stay JSON. They
    still list and restore. New versions are `.md`.
  - Trash items from before the switch come back as `.md` when restored.
- **Old ticks:** tick-box selections saved in the browser under the old
  `.json` names carry over to the `.md` names.
- **Pages still open from before:** a page opened before the switch still
  sends `.json` names. The server maps them to `.md` for these keys:
  `filename`, `target_filename`, the request lists, and sidebar order.
  Without this, an unsaved edit in an old page would fail to save.

**Working alongside Obsidian:**

- **The folders are the truth.** On each full load, `.md` files added in
  another program appear at the end of their section, and sidebar entries
  whose file is gone drop out. As a bonus, this repairs sidebar lists that
  had drifted from the folders.
- **Outside edits are never overwritten silently.**
  - The server remembers each document's modified time when the app opens
    or saves it.
  - If another program changed the file since then, the save first puts
    that version into Version history, then saves. The page shows "This
    document was also changed in another program. That version is kept in
    Version history."
  - A new route, `POST /file_status`, reports whether the open document
    still exists and whether it changed outside.
- **Coming back to the app:** when the window gets focus, the app refreshes
  the sidebar. If the open document changed outside and has no unsaved
  edits, it reloads ("Reloaded: …"). If it has unsaved edits, the app warns
  instead and keeps the edits.

**Repo changes:**
- The 16 shipped starter documents are now `.md`, with the same titles and
  text. The two tracked menu files point at the new names.
- `.gitignore` ships the `.md` starters and ignores `.json-backup/`.

**Separate fix: fresh install crash (`657a2f7`).** A fresh download has no
saved app state, so it opens a `default` project. That project's folder did
not exist yet, and `ensure_structure` wrote `project.json` into it first, so
the very first page load failed with a server error. Jim's original version
has the same problem. The fix creates the folder first.

**How to check:**

1. Start the app with older JSON data.
2. Each section folder now holds `.md` files, plus a hidden `.json-backup`
   folder.
3. Open a document in Obsidian, change it, and come back to the app. The
   document reloads.
4. Add a new `.md` file in Obsidian. It appears in the sidebar.

---

## 2026-10-22: Max reply length and a cost estimate

One commit (`915c733`). **Files:** `app/app.py`, `app/static/script.js`,
`app/static/style.css`, `app/templates/index.html`.

**Why:** The author could not cap how long a reply runs, and could not see
what a request costs on OpenRouter before sending it.

**How it works:**

- **Max reply length.**
  - A new number field sits under **AI setup → Generation**, below Reasoning.
    Empty means no limit, which was the old behavior.
  - It is saved with the other generation settings in `app_state`.
  - It is sent as `max_tokens` to OpenRouter and as `options.num_predict` to
    Ollama.
  - The server lowers it to the model's own maximum reply size when it knows
    that size. The note under the field shows that maximum ("This model allows
    up to 16,384").
  - Reasoning tokens count toward the limit, and the note says so.
- **Prices come from OpenRouter's public model list.**
  - The "Check OpenRouter" feature already saved a small copy in
    `Global/openrouter_models.json`. That copy now also keeps each model's
    input and output price (dollars per token) and its maximum reply size.
    OpenRouter's own router lists a price of -1, so that is stored as
    "unknown".
  - The list now **refreshes itself once a day.** When the page loads, it asks
    for `GET /openrouter_catalog?auto=1`. The server downloads a new copy only
    in three cases: the copy is missing, it is more than 24 hours old, or it is
    from before prices were kept. If the download fails (no internet), the old
    copy is used and no error shows.
  - The refresh only runs while AI features are on. Turning AI on in Settings
    also triggers it.
  - Some models list cheaper rates at certain hours. The estimate uses the base
    rate.
- **The cost estimate** uses the same token count as the meter, and it runs
  in the browser, with no extra request at each keystroke.
  - **With a length limit, the status bar shows:**
    "AI request ≈ 637 tokens · up to $0.012". That is the input, plus the
    longest allowed reply, plus web search if it is on.
  - **With no limit, it shows:** "· $0.0016 + reply", because the reply length
    is open.
  - **Other cases:** "free" for free models, "local" for Ollama, and
    "price unknown" when the model is not in the list.
  - **Web search** adds $0.007, which is OpenRouter's price for one search
    (up to 10 results). Models with their own built-in search charge the
    provider's price, and the hover text says so.
  - **The full breakdown** shows in the meter's hover text, and on a new
    "Cost:" line in the "What the AI will see" window. It lists the input
    cost, the reply cost at the limit, web search, the total, and the rates
    per million tokens. That window also shows the reply limit after the cap.

**How to check:**

1. Pick a paid OpenRouter model.
2. Type 1000 in **Max reply length**. The status bar changes to
   "up to $…".
3. Hover over the status bar number to see the breakdown.
4. Clear the field. The status bar changes back to "+ reply".

---

## 2026-10-22: Labeled AI request, and "What the AI will see"

One commit (`1cae5df`). **Files:** `app/app.py`, `app/static/script.js`,
`app/static/style.css`, `app/templates/index.html`, `app/templates/_icons.html`
(Lucide `scan-eye`).

**Why:** The app joined everything into one user message with `---` between
the parts: System files, background notes, chapters, the open document, and the
instruction. The model could not tell the author's rules from their notes, or
their notes from the manuscript. The System files were also not sent as a
system message, so models gave them less weight. The author also had no way
to see the text that was sent.

**How it works:**

- **Rules are a system message.** The ticked System files, in sidebar order,
  become the system message: the `system` role for OpenRouter, and the
  `system` field for Ollama. With no System files ticked, no system message is
  sent.
- **Everything else is labeled.** The user message wraps each part in a tag,
  and each document carries its title:
  - `<background>` holds the ticked Background notes, each as
    `<document title="...">`.
  - `<writing>` holds the other ticked Writing documents, in the same way.
  - `<current_document title="...">` holds the open document, from the editor,
    so unsaved text is included.
  - `<instruction>` holds the instruction box.
  - Empty parts and empty documents are left out. A double quote in a title
    becomes a single quote, so the tag stays valid.
- **The open document is sent once.** Before, an open Background note that
  was also ticked went twice: once from disk and once from the editor. Now
  the open document is taken out of its section's list in both Background and
  Writing. System files always stay in the rules.
- **One builder.** A single server function, `build_ai_request`, makes the
  text. Generate and the preview both use it, so the preview is exactly what
  is sent.
- **"What the AI will see" window.**
  - **To open it:** click the new eye-in-a-frame button in the AI dock, or
    click the "AI request ≈ N tokens" meter in the status bar. When space is
    short, the button moves into the dock's **⋯** menu.
  - **What it shows:** the model, the token estimate, a note when web search
    adds results, then the **Rules** box and the **Request** box.
  - **Its buttons:** **Copy** puts both parts on the clipboard. **Generate**
    closes the window and sends.
  - The new route is `POST /preview_request`. It takes the same body as
    `/generate`, without the settings.
- **The token meter matches.** It now counts the same labeled text, so the
  status bar and the window show the same number.
- **Older pages still work.** A page that is still open from before this
  change sends the editor text as the last Writing item. The server still
  accepts that.

**How to check:**

1. Tick a System file, a Background note, and an instruction.
2. Click the token meter. Your System file shows under **Rules**, and the
   rest shows labeled under **Request**.
3. The number in the window equals the number in the status bar.

---

## 2026-10-22: New-document buttons show a page with a plus

One commit (`091d07e`). **File:** `app/templates/index.html`.

**Why:** The "New file" button was a bare **+**. Next to the "New folder"
button (a folder with a plus), it did not say what it makes.

**How:** The four section "New file" buttons (Background, Writing, System,
Prompts) and the empty screen's "New background note" button now use the
Lucide `file-plus` icon, a page with a plus. That icon was already in
`_icons.html`, because the empty screen's "New writing file" button uses it.
No new icon was added.

**How to check:** Look at any section header in the sidebar. The first button
is a page with a plus, and the second is a folder with a plus.

---

## 2026-10-22: Trash window with Restore

One commit (`b8dd00f`). **Files:** `app/app.py`, `app/static/script.js`,
`app/static/style.css`, `app/templates/index.html`.

**Why:** Deletes already went to hidden `.trash` folders, not to nowhere. But
there was no way back in the app. Moving a file back by hand did not help
either, because the sidebar list lives in `state.json`, so the document stayed
invisible.

**How it works:**

- **Where to find it:** the project **⋯** menu has a new item, **Trash…**. It
  opens a window like Version history (× button, Esc, or a backdrop click
  closes it).
- **What it lists:** deleted documents from the open project (Writing and
  Background), deleted AI setup files (System and Prompts), and deleted
  projects. Newest first. Each row shows the title, where it came from, the
  delete date, and a **Restore** button.
- **Restore a document:**
  - The file goes back to its section folder.
  - Its sidebar entry comes back **inside the folder it was in**. If that
    folder is gone, it goes to the top level.
  - If a new document took the same file name, the restored one gets a free
    name (`name-copy.json`), so nothing is overwritten.
  - The word count is filled in again.
- **Restore a project:** the folder goes back to `Projects/`, under a free
  name if the old one is taken, and the project list refreshes.
- **Remembering the folder:** when a document is deleted, the app now writes a
  small note in a hidden `.trash/.index.json` (trash name → original file
  name and folder). Items deleted before this change have no note. They still
  restore, at the top level.
- **Empty trash:** deletes everything the window lists, for good. It asks
  first ("Delete N items forever? You cannot undo this."). The button is off
  when the trash is empty.
- **New routes:** `GET /trash` (the list), `POST /restore_trash`,
  `POST /empty_trash`. Trash names are checked like every other name, so a
  request cannot reach outside the data folders.

**Not covered:** trash from projects other than the open one does not show.
Open that project to see its trash. Version history of a deleted document
stays in `.history` and reconnects when the document comes back under its old
name.

**How to check:**

1. Delete a document that sits inside a folder.
2. Open **⋯ → Trash…**. The document is listed with today's date.
3. Click **Restore**. It is back in the same folder, with its text and word
   count.
4. Delete a project, then restore it from the same window.

---

## 2026-10-22: Wishlist batch: windows, AI on/off, web search, duplicate

Four commits. **Files:** `app/app.py`, `app/static/script.js`,
`app/static/style.css`, `app/templates/index.html`, and
`app/templates/_icons.html` (Lucide `presentation`, `copy`, `globe`).

### 1. Every window closes three ways; Visual layout gets its own window (`30c1985`)

- **Closing windows:**
  - Settings, Visual layout, and Version history each have a **×** button in
    the top-right corner.
  - **Esc** closes whichever window is open. Before, Esc did nothing in
    Settings.
  - A **click on the dark backdrop** also closes it.
  - One `MODAL_CLOSERS` map routes all three to each window's own close
    function, so closing still undoes unsaved changes: Settings cancels, and
    Visual layout reverts its live preview.
- **Visual layout:**
  - It moved out of Settings into its own smaller window (`#visualModal`,
    560 px wide).
  - It opens from a new top-bar button with Lucide's `presentation` icon, a
    board on a stand. Lucide has no "easel" icon.
  - Settings no longer lists it, which declutters that window.

### 2. AI features on/off (`ce9323b`)

- **Settings → AI features → "Use AI features"**, on by default.
- **Off** (`body.ai-off`) turns the app into a plain document editor:
  - hidden: the AI dock (instruction box, chip, model picker, Generate), the
    AI setup panel and its top-bar toggle, and the token meter
  - disabled: ⌘Enter and ⌘⌥\\
  - kept: all AI settings, models, rules, and prompts
- **Saved** as `aiEnabled` in `app_state.json`.

### 3. Web search (`57aaaed`)

- **What the user sees:** the AI setup **Generation** block has a "Search the
  web" checkbox (off by default) and a "Max websites" number (1–10, default
  5). The number is faded while search is off, and saved as it changes.
- **Sending to OpenRouter** (following OpenRouter's web search docs): when on,
  it sends `"plugins": [{"id": "web", "max_results": N}]`.
  - OpenAI, Anthropic, Google, and Perplexity models use their built-in
    search. Other models use Exa.
  - The model is asked to cite its sources as Markdown links, which render in
    Preview.
- **Limits:** the server caps the number at 1–10. Up to 10 results is one
  flat price per search, and more cost extra.
- **Ollama** requests never get the plugin.
- **Cost note:** the block says it costs about $0.007 per search, even on free
  models.

### 4. Duplicate (`e143158`)

- **Documents:** a "Duplicate" item in every document ⋯ menu, in all four
  sections, so System rules and Prompts too.
  - The copy is "*Title* (copy)", with the same text, and sits right after
    the original.
- **Folders:** "Duplicate Folder" copies the folder and every document in it,
  including nested folders.
  - The documents keep their titles but get new files. Only the folder's
    title gets "(copy)".
  - The copy sits right after the original, with a new unique folder ID.
- **Projects:** "Duplicate Project" copies the project folder.
  - Version history, trash, and temp files are skipped, so the copy starts
    clean.
  - The copy is titled "*Project* (copy)". The writer stays in the current
    project, and a notice names the copy.
- **Names never clash:** `name-copy`, then `name-copy-2`, `-3`, and so on, for
  files, folder IDs, and project folders.
- **New routes:** `/duplicate_item`, `/duplicate_folder`, `/duplicate_project`.
- **Tested:** 14 server checks (placement, contents, unique names, a prompt,
  a folder with 5 documents, a project with skipped history, a refused bad
  project name), plus the four menu items in the browser.

---

## 2026-10-22: Temperature, reasoning, and an OpenRouter model check

Two commits. **Files:** `app/app.py`, `app/static/script.js`,
`app/static/style.css`, `app/templates/index.html`, `.gitignore`.

### 1. Temperature and reasoning (`f5c5fe2`)

- **What the user sees:** a foldable **Generation** block in the AI setup
  panel, above Output markers:
  - a **Temperature** slider (0–2, step 0.1, default **0.7**), with a Reset
    link and "Focused / Varied" end labels
  - a **Reasoning** picker: Model default, Off, Low, Medium, High
  - both save as they change (`temperature` and `reasoningEffort` in
    `app_state.json`)
- **Sending to OpenRouter**, following OpenRouter's docs:
  - It sends `temperature`.
  - Reasoning uses OpenRouter's unified field, `"reasoning": {"effort":
    "<level>"}`. OpenRouter maps it onto each model family: OpenAI and Grok
    effort, Anthropic and Gemini thinking budgets.
  - "Model default" sends no reasoning field at all, so each model behaves as
    usual. "Off" sends `effort: "none"`.
- **Sending to Ollama:** `options.temperature`, plus `think: false` for Off or
  `think: true` for any level. Ollama's thinking is on or off. A model that
  cannot think may answer with an error, which then shows as a notice.
- **Server safety:** `generation_options()` caps the temperature to 0–2 and
  ignores unknown effort values. Older clients that send neither field get
  exactly the old request.

### 2. Check models against OpenRouter (`0199fee`)

- **What the user sees:**
  - A **Check OpenRouter** button in Manage Models.
  - A summary: when it checked, how many models OpenRouter has, which of the
    user's models are **no longer on OpenRouter**, and which are **leaving
    soon** (with their date).
  - Rows get a red "Removed from OpenRouter" or an amber "Leaves Oct 31"
    badge.
  - The model picker in the AI dock and Settings adds "(removed from
    OpenRouter)" or "(leaves Oct 31)" to those names.
- **How:**
  - `/check_openrouter_models` fetches OpenRouter's public `GET
    /api/v1/models` (no key needed). It keeps a compact copy in
    `Global/openrouter_models.json`, which is git-ignored: name, context
    length, `expiration_date`, the `reasoning` object, and temperature
    support.
  - It returns a status for each of the user's OpenRouter models: available,
    gone, or leaving.
  - `/openrouter_catalog` serves the saved copy at startup, so badges and
    hints appear without a new check.
- **Reasoning hint:** the note under the Reasoning picker now describes the
  *selected* model, using the saved copy:
  - "This model supports: high, medium, low, none (default: low)."
  - "This model always reasons…, so Off has no effect."
  - "This model does not reason, so this setting is ignored."
  - "This model is no longer on OpenRouter."
  - Ollama models get their own note.
- **Tested with real data:** OpenRouter listed 468 models. Four of the user's
  models were flagged as removed, and one as leaving Oct 31. The hints were
  correct for Grok 4.3, Claude Sonnet 4.6, GPT-4o, and a removed model.

---

## 2026-10-22: Editor minimum width; AI setup tucks away when space runs out

**Commit:** `e263b3b`. **File:** `app/static/script.js`.

- **Why:** on smaller windows, the sidebar plus the AI setup panel could
  squeeze the writing area until it was hard to use.
- **How:**
  - **Minimum width:** `EDITOR_MIN_WIDTH` went from 360 px to **440 px**,
    about 50 characters a line. Both panel drags and the new auto-collapse
    use it.
  - **Auto-collapse:** `keepEditorRoom()` runs from the writing area's
    `ResizeObserver`, so it reacts to window resizes, sidebar drags, and
    sidebar toggles.
    - If the AI panel is open and the editor falls below the minimum, the
      panel hides itself. A short notice explains it, once per session.
    - When the editor has room again (its width minus the panel's last width
      is at least the minimum), the panel returns by itself.
    - Both use `setAiPanelOpen(open, { auto: true })`, which does not
      change the saved open/closed preference.
  - **Opening without room:** `toggleAiPanel()` opens the panel, measures,
    and reverts if the editor would be too narrow. It then shows a notice
    suggesting a wider window or hiding the sidebar (⌘\\).
  - **Closing by hand** clears the "auto-hidden" state, so a panel the writer
    closed never reopens by itself.
- **Tested by resizing the window:**
  - Open at 1440, shrink to 1000: it stays open, with the editor at 460.
  - Shrink to 900: it hides, and the notice appears.
  - Widen to 1300: it returns.
  - At 900, clicking the toggle shows the notice and the panel stays closed.
  - Hiding the sidebar at 900: it returns by itself.
  - Closing it by hand, then widening: it stays closed.

---

## 2026-10-22: Output markers moved into the AI setup panel

**Commit:** `f6a5e38`. **Files:** `app/templates/index.html`,
`app/static/script.js`, `app/static/style.css`.

- **Why:** the markers control how AI output lands in the text, so they
  belong with the other AI setup. Moving them also declutters Settings.
- **How:**
  - A native `<details id="aiMarkers">` block sits at the bottom of the AI
    setup panel, below System and Prompts. Its summary is styled like the
    section labels: an 11 px uppercase label with a chevron that turns when
    folded.
  - It is folded by default. The open state is remembered in `localStorage`
    (`sjb_markers_open`).
  - It holds the same three fields, with the same IDs: the on/off checkbox,
    "Before AI text", and "After AI text".
  - **Saving:** like the rest of the panel, it has no Save button.
    `initMarkersPanel()` saves the checkbox at once, and the two text boxes
    400 ms after typing stops, through the existing `/save_app_state`. The
    stored keys and the generation behavior are unchanged.
  - When markers are off, the text boxes fade to 50 %.
  - **Removed:** the section in the Settings window, its save and load code
    in `saveSettings()` and `loadSettingsIntoUI()`, and its 21 lines of
    now-unused CSS.
- **Tested:** typed text is saved without a Save button and used by the next
  generation; markers off gives plain output; the open state, the checkbox,
  and the text all survive a reload.

---

## 2026-10-22: Resizable sidebar and AI setup panel

**Commit:** `2133d21`. **Files:** `app/templates/index.html`,
`app/static/script.js`, `app/static/style.css`.

- **What the user sees:**
  - Hovering the inner edge of the sidebar (its right edge) or of the AI setup
    panel (its left edge) shows a 2 px line in the current accent color and a
    ↔ cursor.
  - Dragging resizes the panel. Double-clicking the edge resets it to the
    default width.
  - Widths are remembered per browser.
- **Limits:** the sidebar is 200–520 px and the AI panel is 240–520 px. While
  dragging, a panel also stops where the editor would drop below 360 px.
  Both panels also have `max-width: 45vw`, so a width saved on a big screen
  cannot crowd a small window.
- **How:**
  - Each panel holds a `.resize-handle` (`role="separator"`): an 8 px
    absolute strip on its inner edge. Its `::after` is the 2 px line, which
    turns `var(--accent)` on hover or while dragging, after a short delay so
    passing over it does not flicker.
  - `initPanelResize()` uses pointer events with pointer capture. The new
    width is clamped and written to a CSS variable on `<html>`:
    `--sidebar-w`, or the existing `--ai-panel-w`. Without a saved value, each
    panel keeps its previous responsive default.
  - It is saved to `localStorage` (`sjb_sidebar_w`, `sjb_ai_panel_w`) on
    release. Double-click clears it.
  - While dragging, `body.is-resizing` keeps the resize cursor, turns off text
    selection, and turns off the sidebar's width animation, so the panel
    follows the pointer exactly.
  - The toolbars re-fit on their own, because their `ResizeObserver` watches
    the writing area.
- **Tested:**
  - **Drags:** 350 px; the far left clamps at 200; the far right clamps at
    520; the AI panel clamps at 520, with the editor still at 400.
  - **Reload:** the widths stay.
  - **Double-click:** resets the width.
  - **Collapsed sidebar:** still goes to 0.
  - **Hover line:** it matched the accent, `rgb(13, 148, 136)` for teal.

---

## 2026-10-22: Sticky top bar, two layout bugs, and logo first

**Commit:** `3b8b31f`. **Files:** `app/templates/index.html`,
`app/static/style.css`.

### 1. Sticky top bar

The top bar is `position: sticky; top: 0`. It was `relative` before. It
stays in view even if the page itself ever scrolls.

### 2. Bug: the page was 30 px taller than the window

- **Problem:** at every window size, the page could scroll 30 px, and the top
  bar slid partly out of view.
- **Cause:** the project ⋯ button is a `<span>` with a `data-tip` tooltip, but
  it had no positioning. Its invisible tooltip (`::after`, `position:
  absolute`) therefore anchored to the page instead of the button, and sat
  just below the window's bottom edge. Even at `opacity: 0`, it still counts
  toward the page's scrollable height.
- **Fix:** a general `[data-tip] { position: relative; }` rule. Every
  tooltip now anchors to its own element, so a future tooltip cannot cause
  this again. Measured after the fix: page height equals window height at
  1440×900, 1100×600, and 900×420.

### 3. Bug: the zen-mode exit button was off-screen

- **Problem:** `.zen-exit { position: fixed }` was overridden by the later
  `.icon-btn { position: relative }` rule, both single-class selectors, so
  the later one wins. In zen mode, the exit button fell below the window at
  the far left. Esc still worked.
- **Fix:** `#zenExit { position: fixed; }`. The ID selector wins
  regardless of order. Measured after the fix: 12 px from the top and 16 px
  from the right.

### 4. Logo first

The top bar's left side now reads: logo and version (the Home button), then
the sidebar toggle. The logo sits on the 16 px gutter line, in line with the
project icon below it. The old 4 px nudge on the logo was removed.

---

## 2026-10-22: Toolbar overflow menus, and a clearer token meter

**Commit:** `23a25b2`. **Files:** `app/templates/index.html`,
`app/static/script.js`, `app/static/style.css`.

### 1. Toolbars fold into a "⋯" menu instead of spilling

- **Problem:** on narrower windows, the editor toolbar and the AI action row
  ran under the AI setup panel. At 1100 px wide, Undo, Save, and Clear were
  hidden behind it. At 900 px, so were Generate, Preview, and Zen.
- **How:**
  - Each bar has a hidden **⋯** button (`.toolbar-more`).
  - `fitToolbar()` first shows every button. If the bar overflows
    (`scrollWidth > clientWidth`), it hides buttons one by one in a fixed
    "least important first" order, until the bar fits:
    - **Editor toolbar:** bullet list, heading, italic, bold, zen.
      **Preview always stays.**
    - **AI actions:** clear, save, undo, stop. **Generate always stays.**
  - The font and size pickers, the chip, and the model picker shrink before
    any button folds.
  - Clicking ⋯ opens a menu of the hidden buttons, in toolbar order, with
    their icons and labels. Each item calls the original button's `click()`,
    so all behavior is shared. Disabled buttons (Stop, Undo when unused) show
    grayed out.
  - A `ResizeObserver` on the writing area re-fits both bars whenever its
    width changes: a window resize, the sidebar, or the AI panel. The chip's
    text changes also trigger a re-fit.
- **Layout details:**
  - `.footer-actions` is `display: contents`, so the chip, the model picker,
    and the buttons share one flex row that can measure its own overflow.
  - The model picker gets `margin-left: auto` to lead the right-hand group.
  - The chip keeps at least 150 px (34 px under 1000 px wide).
  - On small windows the side panels narrow: the sidebar is
    `clamp(220px, 30%, 440px)` and the AI panel is `--ai-panel-w:
    clamp(240px, 24vw, 320px)`. Wide windows are unchanged.
- **Measured:** nothing spills at 1440, 1100, 900, or 760 px. Using Bold from
  the ⋯ menu wraps the selected text as expected.

### 2. Token meter shows the estimate only

- **Problem:** "AI request ≈ 3,885 / 1M tokens" made the model's limit read
  like the measurement. With a 1M-token model, it looked as if the meter
  always said "1M".
- **How:**
  - The label is now just **"AI request ≈ 3,885 tokens"**.
  - The hover text adds the limit after the breakdown, for example "Rules
    3,239 · This document 28 — 0.4% of this model's 1M limit".
  - The colored dot still turns amber above 70 % and red above 90 %.
  - **Context sizes:** sizes typed in Manage Models are saved as text
    (`"1000000"`), and some are blank. The meter now converts them with
    `Number(...)`. Blank or zero still falls back to 128k.

---

## 2026-10-22: One consistent 16 px gutter

**Commit:** `0f94420`. **Files:** `app/static/style.css`, `app/static/script.js`.

- **Problem:** content sat close to the window edges, and every zone used its
  own spacing, so nothing lined up. Measured at 1440 px wide:
  - **Left edges:** the top bar toggle at 19 px, the project icon at 8 px, the
    section arrows at 14 px, and the status bar text at 12 px.
  - **Right edges:** at 15–21 px.
  - **Editor:** the toolbar started 6 px from the sidebar line, but the title
    started at 16 px.
- **How:**
  - **New tokens:** `--gutter: 16px` is the space between any window or pane
    edge and its content. `--ghost-inset: 7px` is the invisible padding plus
    border of borderless icon buttons.
  - **Padding uses `var(--gutter)`** in the sidebar, the AI panel, the status
    bar, the editor toolbar, the AI dock, and the title row.
  - **Section labels** lost their extra side padding, so they start on the
    gutter line.
  - **Borderless icon buttons:** for the top bar, the title row's ×, the AI
    panel's ×, and the section sort buttons, the *icon* sits on the gutter
    line, not the invisible button box. That uses padding of
    `gutter − ghost-inset`, or a negative right margin.
  - **Result:** every left and right edge measures 16 px from the window or
    pane edge (17 px where a 1 px divider is included).
- **Also fixed:** the token meter's short form shows **1M** instead of
  "1049k" for models with a 1,048,576-token context.

---

## 2026-10-22: Menu text sized like the sidebar

**Commit:** `0f28ad4`. **File:** `app/static/style.css`.

- **Problem:** the pop-up menus had no font size of their own, so they used
  the browser default of 16 px. That covers the file and folder ⋯ menus, the
  project ⋯ menu, and the project switcher. Next to the 13 px sidebar rows,
  they looked oversized.
- **How:**
  - `.file-menu`, the class all those menus share, now uses
    `font-size: var(--sidebar-font-size, 13px)`. The existing **Settings →
    Visual Layout → Sidebar Font Size** setting (Normal 13 px, Larger 15 px)
    now controls the menus too.
  - Menu items got slightly tighter padding (5 px × 10 px), a rounded hover,
    and the menu a soft shadow, so it reads as floating above the page.

---

## 2026-10-22: "ALPHA" project menu label renamed

**Commit:** `ee68f2d`. **File:** `app/static/script.js`.

- **Why:** "ALPHA" (short for "alphabetical") read like a version stage, not
  a list name.
- **How:**
  - The project switcher has up to two groups. **RECENT** appears only with 7
    or more projects. The second group lists the rest from A to Z.
  - That second group is now headed **PROJECTS** when it is the only group,
    and **OTHER PROJECTS** when RECENT appears above it.
  - The change is made in both places that build the list:
    `toggleProjectDropdown()` and `renderProjectList()`.
- **Tested:** with 3 projects the menu shows "PROJECTS". With 8, it shows
  "RECENT" and "OTHER PROJECTS".

---

## 2026-10-22: Project header shows just the name

**Commit:** `8053260`. **Files:** `app/static/script.js`,
`app/static/style.css`, `app/templates/index.html`.

- **Why:** with the book icon in front of it, "Project: " repeated what the
  icon already says.
- **How:**
  - `#currentProjectLabel` is set to the project title alone. The template
    default changed from "Project: Default" to "Default".
  - The header has a **"Switch project"** tooltip (`data-tip`, anchored with
    `position: relative`), so its purpose is still clear.
  - `updateStatusBar()` no longer strips a `Project:` prefix. It reads the
    label as is.

---

## 2026-10-22: Dialogue percent in the status bar

**Commit:** `adfa338`. **Files:** `app/static/script.js`,
`app/static/style.css`, `app/templates/index.html`.

- **Why:** the balance of dialogue and narration is a common pacing check
  for fiction writers.
- **What the user sees:**
  - A new status bar item next to the word count, for example
    **"28 words · 43% dialogue · 1 min read"**.
  - Hovering shows the raw numbers ("12 of 28 words are in quotes").
  - It is hidden when no document is open.
- **How `countDialogueWords(text)` works:**
  - It walks the open document paragraph by paragraph, splitting on newlines.
  - An opening `“` or `"` starts a quote, and a closing `”` or `"` ends it.
    The words collected in between are counted with the same whitespace split
    as the main word count.
  - **Speech that runs on:** a quote still open at the end of a paragraph
    counts to that paragraph's end. Fiction leaves the closing mark off when
    speech continues into the next paragraph.
  - **Single quotes** are not counted, because they cannot be told apart from
    apostrophes ("don't", "Mara's").
  - **Speed:** it runs on every word-count update, in one linear pass.
- **Tested:** eight edge cases: straight and curly quotes, no dialogue, speech
  that runs on, an unclosed quote at the end, apostrophes inside quotes, mixed
  quote styles, and a lone opening mark.

---

## 2026-10-22: Word counts without `(?)`, and a clearer token meter

**Commit:** `0f77014`. **Files:** `app/app.py`, `app/static/script.js`,
`app/static/style.css`, `app/templates/index.html`.

### 1. No more `(?)` in the sidebar

- **Problem:** a file's word count lived only in `state.json`, and was written
  only by `/save_file`. Shipped files (the EPBM prompts, starter system rules)
  and files never edited in the app had none, so they showed `(?)`. A folder
  showed `(?)` as soon as one of its files was unknown.
- **How:**
  - `/load` now runs the new `add_word_counts()` over all four sections. It
    reads each file and sets `wordCount` from its content. The counts are
    always current, even for files edited outside the app.
  - `/create_item` and `/create_item_in_folder` store `wordCount: 0` for new
    files.

### 2. Token meter: same numbers, clearer meaning

- **Finding:** the meter was accurate. Tested against a real request, it
  matched to the token: 3,119 characters ÷ 4 = 779, and the meter said 779.
  But it sat next to the open document's word count, so "113 words · 779
  tokens" looked like a contradiction. In fact, the tokens cover the *whole
  request*: checked rules, notes, and chapters, plus the document and the
  instruction.
- **How:**
  - The meter now reads **"AI request ≈ 779 / 131k tokens"**.
  - Hovering shows where the tokens come from, for example "Rules 23 · This
    document 28 · Instruction 55". Only non-empty parts are listed.
  - `updateTokenMeter()` now builds the same parts, in the same order, as
    `generate()`. It counts only checked files that still exist in the tree,
    through `collectFilenames()`. Before, a checked file that had been deleted
    still added a separator to the estimate.
  - To let the tooltip show above it, the status bar no longer clips its
    contents. Only the left side (project › file) still truncates.
- **Unchanged:** the estimate itself is still characters ÷ 4, the common rule
  of thumb. Real tokenizers differ by model, roughly ±20 %.

---

## 2026-10-22: Section contents indented under the section label

**Commit:** `9c5a9b3`. **File:** `app/static/style.css`.

- **Why:** a section's top-level folders and files started at the same left
  edge as the section label, so the label did not read as their parent.
- **How:**
  - Each section's list (`#promptsList`, `#systemList`, `#backgroundList`,
    `#writingList`) gets `padding-left: calc(var(--tree-indent) + 2px)`.
  - The folder arrows then line up under the section name, right of the
    section's own fold arrow. Measured: fold arrow at x = 14, section name at
    x = 32, folder arrows at x = 31.
  - **AI panel:** it went from 300 px to 320 px, so prompt names do not wrap
    more than before. The toast offset was adjusted to match.

---

## 2026-10-22: Documents indented clearly under their folders

**Commit:** `a1d04f1`. **Files:** `app/static/script.js`, `app/static/style.css`.

- **Problem:** rows were indented by `depth × 16px`. But a folder row starts
  with its arrow, and a file row does not. That arrow used up the indent, so a
  folder's files lined up *under the folder's own checkbox*. They did not look
  nested.
- **How:**
  - Each file row now starts with an empty `.tree-spacer`, exactly as wide as
    a folder's arrow (16 px). Files and folders at the same depth then line up.
  - The indent per level is the new CSS variable `--tree-indent` (18 px). Rows
    use `margin-left: calc(var(--tree-indent) * depth)`, so children sit one
    clear step to the right of their folder.
- **Measured:** a folder's checkbox at x = 37, its files' checkboxes at x = 55,
  and a top-level file at x = 37.

---

## 2026-10-22: Icons for projects, folders, and documents

**Commit:** `264b723`. **Files:** `app/static/script.js`,
`app/static/style.css`, `app/templates/index.html`, and
`app/templates/_icons.html` (Lucide `book`, `folder`, `folder-open`,
`file-text`, `sticky-note`).

- **Why:** projects, folders, and documents looked alike in the lists. Only
  the arrow hinted at a folder.
- **How:**
  - **Project:** a `book` icon in front of "Project: …", and in front of each
    name in the project switcher menu.
  - **Folder:** `folder` when closed and `folder-open` when open, so the icon
    also shows the state.
  - **Document:** `file-text` (a page with lines) in Background and Writing.
    In the AI setup panel, System and Prompts files use `sticky-note`, a memo,
    so AI instructions read differently from manuscript and notes.
    `documentIconName(section)` picks the icon.
  - **Style:** the icons are 14 px and muted, so the names stay the strongest
    element. The open file's icon takes the accent color.
- **Layout detail:**
  - Each row label is now `inline-flex`: icon, then one `.tree-text` span that
    holds both the title and the word count. A long title wraps with its count,
    instead of the count drifting off as its own column.
  - The AI summary chip got `flex-shrink: 0`, so the model picker gives way
    first and "No rules · No prompt" is no longer cut off.

---

## 2026-10-22: Close the document; the logo goes home

**Commit:** `cd8dac0`. **Files:** `app/templates/index.html`,
`app/static/script.js`, `app/static/style.css`.

- **Why:** the empty state only appeared in projects with no files. The app
  always reopened the last file, or the first writing file, so there was no
  way to choose a clean start screen.
- **How:**
  - **Close button:** a × at the right end of the document title row calls the
    new `closeDocument()`.
  - **Logo:** the logo and version in the top bar are now one plain button,
    tooltip "Home". It does the same thing, following the usual "logo = home"
    pattern.
  - **What `closeDocument()` does:**
    - It saves unsaved changes first.
    - It refuses while a generation is running, with a notice.
    - It clears the current file, title, and editor, then re-renders.
    - It sets `sjb_doc_closed_<project>` in `localStorage`.
  - **On startup,** `loadAll()` checks that flag before its usual restore
    chain (last file, project's last file, first writing file). If it is set,
    the empty state stays. The flag is per project, so closing a document in
    one project does not empty the others.
  - Opening any file clears the flag in `openFile()`.
  - Zen mode hides the × button.
- **Note:** ⌘W was not used. Browsers reserve it for closing the tab, and a page
  cannot override it.

**Check:**

1. Open a file, type something, and click ×. The empty state should show, and
   the edit should be saved.
2. Reload. The empty state should stay.
3. Click a file to open it, then click the logo. The empty state should return.

---

## 2026-10-22: Empty state when no document is open

**Commit:** `a2aa0a2`. **Files:** `app/templates/index.html`,
`app/static/script.js`, `app/static/style.css`, and
`app/templates/_icons.html` (Lucide `feather` and `file-plus`).

- **Why:**
  - When no file is open, for example in a new project or after deleting the
    last file, the editor still looked usable. But `saveCurrentFile()` returns
    early when there is no file, so anything typed there was silently lost. AI
    output would land there too.
  - An empty state makes that clear, and gives an obvious next step.
- **How:**
  - A new `#emptyState` block holds:
    - a feather icon in the accent color
    - "No document open"
    - "Choose a file in the sidebar, or start a new one."
    - two buttons, **New writing file** (accent) and **New background note**,
      which call the existing `createNew()`. That function already opens the
      new file.
    - a shortcut hint
  - `updateEmptyState()` sets `body.no-document` when `currentFile.filename` is
    empty. It runs with every status bar update and every sidebar re-render.
    The class hides the title row, formatting bar, editor, preview, AI dock,
    and the status bar's word count and reading time. The token meter stays,
    because the chosen context still counts.
  - **No flash on startup:** an `appReady` flag holds the empty state back
    until startup finishes. The sidebar renders before the last file reopens,
    so without the flag the empty state would blink.

**Check:**

1. Create a new project. The empty state should show.
2. Click New writing file and give it a name. The file should open.
3. Delete it. The empty state should return.

---

## 2026-10-22: Panel toggles in the top bar

**Commit:** `d7cd197`. **Files:** `app/templates/index.html`,
`app/static/script.js`, `app/static/style.css`.

- **Why:** this sets one simple rule for the layout. The top bar holds
  *window* controls (which panels are open, light or dark, settings). The
  editor toolbar holds *document* controls (formatting, preview, zen).
- **How:**
  - The **sidebar toggle** moved from the title row to the left edge of the top
    bar, before the logo. The title row now holds only the title.
  - A new **AI setup toggle** (Lucide `panel-right`) sits in the top bar, left
    of the light/dark switch. It calls the same `toggleAiPanel()` as the
    summary chip and ⌘⌥\\.
  - Both toggles set `aria-pressed`. In the top bar, a pressed toggle shows its
    icon in the accent color, so an open panel is visible at a glance.
    `setAiPanelOpen()` keeps the new toggle in sync.
  - The zen rule that hid `#sidebarToggle` was removed, because zen hides the
    whole top bar.

---

## 2026-10-22: Top bar with logo, version, light/dark switch, and settings

**Commit:** `af6c552`. **Files:** `app/app.py`, `app/templates/index.html`,
`app/static/script.js`, `app/static/style.css`, and
`app/templates/_icons.html` (Lucide `sun` and `moon`).

- **Why:** the "Your Writing Helper" heading took space at the top of the
  sidebar and added nothing once the app is open. App-level controls (settings,
  light/dark) had no natural home.
- **How:**
  - **The bar:** a 40 px `<header class="top-bar">` sits above the main layout.
    The layout height became `100vh − --topbar-h − --statusbar-h`.
    - **Left:** the app icon (`apple-touch-icon.png` at 22 px, with rounded
      corners) and the version, in the muted text color.
    - **Right:** a light/dark switch and the settings gear, which moved here
      from the sidebar.
  - **Light/dark switch:**
    - It shows the mode a click switches to: a moon in light mode, a sun in
      dark mode.
    - It keeps the current accent, saves `themeMode` and `accent` to
      `app_state.json`, and updates its icon and tooltip in `applyAppearance()`.
    - "Match system" stays a choice in Settings → Visual Layout.
  - **The old header:** the `.header-row` markup and its CSS rule are removed.
  - **Version:** the new `APP_VERSION = "0.9.0"` constant in `app.py` is passed
    to the template. Both the top bar and the About view read it, so the
    version lives in one place.
  - **Zen mode** hides the bar.
  - The bar sits above the panes (`z-index: 20`), so tooltips that drop below
    it are not hidden.

## 2026-10-22: Personal prompts and system rules stay out of Git

**Commit:** `5fe1914`. **File:** `.gitignore`.

- **Why:** new prompts or system rules made in the app are saved in
  `Global/prompts/` and `Global/system/`. Those folders were tracked, so
  personal files showed up as untracked and could be committed by accident.
- **How:**
  - `Global/prompts/*` and `Global/system/*` are ignored, with exceptions for
    the shipped starters: `epbm-*.json`, `plan.json`,
    `always-on-instructions-from-cv-to-be-edited.json`, and `em-dashes.json`.
    This is the same pattern as `Projects/*` with its sample-project exception.
  - Starter files that are already tracked stay tracked. New starters must
    match the exceptions to be added.
  - **Local-only note:** in this fork's own copy, `Global/modelList.json` also
    has `git update-index --skip-worktree` set, because it records the user's
    own model choices. This is not part of the repository.

---

## 2026-10-22: AI setup panel on the right, with a summary chip

**Commit:** `9a73855`. **Files:** `app/templates/index.html`,
`app/static/script.js`, `app/static/style.css`, and
`app/templates/_icons.html` (3 more Lucide icons: `x`, `panel-right`,
`sliders-horizontal`).

- **Why:** the left sidebar mixed two kinds of things. Project and Writing are
  what a writer moves through all the time. System and Prompts are AI setup:
  chosen once, then mostly left alone. Splitting them follows the familiar
  "files on the left, inspector on the right" pattern, and it gives the
  project files the full sidebar height.
- **How:**
  - **The panel:** System and Prompts moved into a new
    `<aside id="aiPanel" class="ai-panel">`, after the writing area. It is
    300 px wide, with a header ("AI setup") and a close button.
    - It is **closed by default**. A `body.ai-panel-open` class shows it, and
      `localStorage` (`sjb_ai_panel_open`) remembers the state.
    - Zen mode hides it.
  - **The summary chip:** the AI dock, left of the model picker, has a chip
    that always shows what the AI will receive, for example
    **"1 rule · Prompt: EPBM 3 - Outline"** or "No rules · No prompt". It
    counts only System files that are checked and still exist.
    - The chip takes the accent color while anything is active, and it is
      tinted while the panel is open.
    - Clicking the chip opens or closes the panel.
    - It updates whenever the selections are saved or the lists re-render.
    - This is the safeguard for a hidden panel: you can always see that a rule
      is on.
  - **Shortcut:** **⌘⌥\\** (Ctrl+Alt+\\) toggles the panel. It checks
    `e.code === "Backslash"`, because with Option held, `e.key` returns a
    different character on a Mac.
  - **Left sidebar:** it now holds the app header and the project group
    (Background, Writing).
  - **Unchanged features:** folding, sorting, section reorder, and dragging
    files between sections work across both sides. For example, a Background
    note can be dragged onto the System label in the panel.
  - **Toasts** move left of the panel while it is open.

**Check:**

1. The panel should be closed on first load, with the chip reading
   "No rules · No prompt".
2. Click the chip, check a System rule, and pick a prompt. The chip should
   update.
3. Press ⌘⌥\\ to close the panel. The chip should still show what is active.

---

## 2026-10-22: System section above Prompts by default

**Commit:** `76f7525`. **File:** `app/templates/index.html`.

- **Why:** System files are standing rules that apply to every request.
  Prompts are the per-request instruction. Rules first, then the instruction,
  reads in the same order the context is built.
- **How:** in the first sidebar group, the System `.section` block now comes
  before the Prompts block. A reader's own drag order, saved in
  `localStorage` as `sjb_section_order`, still overrides this default.

---

## 2026-10-22: Sidebar: fold, sort, reorder sections, move files between sections

**Commit:** `b953ad2`. **Files:** `app/app.py`, `app/static/script.js`,
`app/static/style.css`, `app/templates/index.html`, and
`app/templates/_icons.html` (3 more Lucide icons: `arrow-up-down`,
`arrow-down-a-z`, `arrow-down-z-a`).

Each section header (`<h3>`) now has `class="section-header"`,
`draggable="true"`, and `data-section`. It holds a fold button that wraps a
chevron and the label, the existing new-file and new-folder buttons, and a sort
button on the right.

### 1. Fold a section

- **Why:** the four sections share a fixed height. With 10 prompts, the
  Prompts list was cut off.
- **How:**
  - Click the section label. A `folded` class hides the list, turns the
    chevron, and sets the section to `flex: 0 0 auto`, so the other sections
    in the group grow.
  - If every section in a group is folded, the group shrinks too, through a
    `:has()` rule.
  - The folded sections are remembered in `localStorage`
    (`sjb_folded_sections`).

### 2. Sort toggle per section

- **How:**
  - The button cycles **My order → A–Z → Z–A**. The icon and tooltip change
    with it, and the button takes the accent color while the list is sorted.
  - `sortForView()` sorts only what is shown. Folders come first, then files,
    by title, with numbers in natural order (2 before 10), at every folder
    level.
  - The saved order in `state.json` is never changed, so "My order" always
    brings back the hand-made order.
  - Dragging inside a sorted list still works: it places the file next to the
    target in the saved order.
  - The sort mode per section is in `localStorage` (`sjb_sort`).

### 3. Reorder sections

- **How:**
  - Drag a section label above or below another. A 2 px accent line shows the
    drop spot.
  - Sections move only inside their group (Prompts/System, or
    Background/Writing), because one group is shared by all projects and the
    other belongs to one project. A drop across groups shows a short notice
    instead.
  - The order is in `localStorage` (`sjb_section_order`) and is applied on
    load by re-appending the section elements.

### 4. Move a file to another section

- **Why:** a note that becomes a chapter, or a prompt that should be a system
  rule, could not change section.
- **Where to drop a file from another section:**
  - on a section label (it goes to the top level)
  - on a folder (it goes into the folder)
  - on a file (it goes before or after that file)
  - on empty space in the list (it goes to the end)
- **Server:** the new route `/move_file_section` (`from_section`, `section`,
  `filename`, and optional `folder_id`, `target_filename`, `position`):
  - moves the file on disk, and its `.history` folder with it
  - takes the item out of the source list, keeping its title and word count
  - reloads the target state (both lists can share one `state.json`) and
    inserts the item with the new `insert_into_tree()` helper
  - refuses a move when the target section already has a file with that name,
    and leaves the file where it was
- **Client:** `moveFileToSection()`:
  - saves first if the moved file is open with unsaved changes
  - clears its checkbox or prompt selection, because selections belong to a
    section
  - re-points the "last opened" record if the file was open
  - reloads, then shows "Moved to Writing." (for example)
- **Not included:** folders move only within their own section. A cross-section
  folder drop shows a notice.

### 5. Bug fix: one drop ran the move many times

- **Problem:** `renderSection()` added the list's `dragover` and `drop`
  listeners on every refresh, and the list element survives refreshes. After
  six refreshes, one drop on empty list space ran the move handler **8 times**.
- **How:** the listeners are now added once. A `data-drop-ready` flag on the
  list marks them. The same drop now runs the handler once.
- **Refactor:** `remove_file_from_tree()` moved out of the delete route to the
  module level, so the move route can use it too.

**Check:**

1. Fold Prompts. System should take the space.
2. Click the Writing sort button twice: A–Z, then Z–A.
3. Drag the System label above Prompts.
4. Drag a Background file onto the Writing label. It should move, and a
   "Moved to Writing." notice should appear.

---

## 2026-10-22: UI polish, batch 3: icons, mode + accent themes, toasts

Three commits. **Files:** `app/templates/index.html`, the new
`app/templates/_icons.html`, `app/static/script.js`, and
`app/static/style.css`.

### 1. Lucide icons and instant tooltips (`109e823`)

- **Why:** the controls mixed emoji (⚙️ 📁 ⏹ ↩ ⏳ ▶ ▼ ⋯), which look different
  on every operating system, with text buttons such as "ClearPrompt".
- **The icon file:**
  - 20 icons from Lucide v0.460.0 (ISC license) are bundled as an inline SVG
    sprite in `templates/_icons.html`.
  - `index.html` pulls the sprite in with
    `{% include "_icons.html" %}` right after `<body>`.
  - Each icon is `<svg class="icon"><use href="#i-NAME"/></svg>`. Icons work
    offline and take the text color.
  - Inside JavaScript, `iconSvg(name)` returns the same markup. It is used for
    the folder arrows and the ⋯ menu buttons.
- **Buttons that became icon-only:**
  - Settings
  - New file and new folder (each sidebar section)
  - Bold, italic, heading, and bullet list
  - Generate (in the accent color), Stop, Undo, Save, and Clear instruction
  - The project dropdown arrow and the ⋯ menus
  - The sidebar, preview, and zen toggles moved to the sprite too.
- **Tooltips:**
  - Each button has `aria-label` and `data-tip`. A CSS `::after` tooltip shows
    `data-tip` after 0.15 s. The native `title` tooltip waits about a second.
  - Helper classes: `tip-up` (tooltip above, used in the footer), `tip-end`
    (aligned to the right edge, so tooltips near the window or sidebar edge are
    not clipped), and `tip-start`.
  - Tooltips include the shortcut where there is one, for example
    "Generate (⌘↵)".
- **Generate button:** `generate()` used to replace the button's text with
  "Generating…", which would erase the icon. It now adds an `is-busy` class,
  which makes the icon pulse, and the button is found by its new
  `#generateBtn` ID.
- **Thinking indicator:** it uses a spinning loader icon.

### 2. Mode × accent appearance (`581b8e8`)

- **Why:** the five themes (Light, Dark, Crimson, Dark Stellar, Light Stellar)
  only changed tints. The accent color was barely used.
- **How:**
  - **Tokens:** two neutral palettes. Light is the default on `body`, and dark
    comes from `body.mode-dark`. They cover background, panel, surface,
    border, hover, text, inputs, scrollbars, and the select chevron.
  - **Accents:** six classes set a light-mode and a dark-mode shade, `--accent-light`
    and `--accent-dark`: blue, indigo, teal, crimson, amber, and violet. The
    mode then picks one as `--accent`.
  - **Derived colors:** `--accent-contrast` (white in light mode, near-black in
    dark mode) colors text on accent buttons. The selection tint `--active` is
    `color-mix()` of the accent and the background.
  - `color-scheme: light` / `dark` makes native checkboxes, radios, and menus
    match the mode.
  - **"Match system" mode** follows `prefers-color-scheme`, including live
    changes while the app is open.
- **Settings → Visual Layout:**
  - The old Theme list is replaced by a **Mode** picker (Light / Dark / Match
    system) and six round **Accent color** swatches. The picked swatch shows a
    ring.
  - Changes preview live. Back or Cancel restores the saved look, and Save
    stores `themeMode` and `accent` in `app_state.json`.
- **Old settings:** an old `theme` value keeps working through a lookup table:
  - light → light + blue
  - dark → dark + blue
  - crimson → dark + crimson
  - dark-stellar → dark + blue
  - light-stellar → light + blue
  - `setTheme(oldName)` still works too.

### 3. Toasts instead of `alert()` (`bfd3881`)

- **Why:** 28 `alert()` pop-ups blocked the whole page, even for "Nothing to
  undo."
- **How:**
  - `showToast(message, kind)` adds a small card to a stack at the top right,
    below the toolbar. That spot keeps it clear of the AI buttons at the bottom.
  - **Errors** (red edge) stay for 7 seconds. **Notices** (accent edge, `"info"`)
    stay for 3.5 seconds. Click a toast to close it.
  - Errors use `role="alert"`, and the stack is an `aria-live` region.
  - All 28 `alert()` calls now use it. Seven plain notices pass `"info"`.
  - `confirm()` and `prompt()` are unchanged, because they need an answer.

**Check:**

1. Hover over any toolbar or footer button for its tooltip.
2. In Settings → Visual Layout, try Dark + Teal, then Back. The look should
   return to the saved one.
3. Press ⌘Enter with no model selected. A toast should appear, not a pop-up.

---

## 2026-10-22: Safe saving, version history, trash, and name checks

**Commit:** `fbe4ae3`. **Files:** `app/app.py`, `app/static/script.js`,
`app/static/style.css`, `app/templates/index.html`, `.gitignore`.

### 1. Saves can no longer leave a broken file

- **Problem:** files were opened with `"w"` and rewritten in place. A crash,
  full disk, or power cut during a save could leave an empty or half-written
  chapter. The next load then returned nothing, and the next save wrote that
  over the file.
- **How:**
  - `save_json()` writes to a temporary file (`.tmp-*.json`) in the same
    folder.
  - It flushes and fsyncs the file, sets the mode to 0644, then swaps it into
    place with `os.replace()`. That swap is atomic: the file is either the old
    version or the new one, never half of each.
  - On any error, the temp file is removed.
  - Every server write now goes through `save_json()`: file saves, new files,
    state files, the initial global state, and the Ollama model order file.

### 2. Automatic version history

- **Why:** there was no way to get back yesterday's text.
- **How:**
  - When `/save_file` is about to overwrite a file whose text changed, it first
    copies the current file to `<section folder>/.history/<file name>/<YYYYMMDD-HHMMSS>.json`.
  - At most one version is kept per file every 5 minutes, and the newest 50
    are kept. Both limits are constants at the top of the new section.
  - A version is skipped when its text matches the newest kept version.
  - Versions made in the same second get a `-2`, `-3`… suffix instead of
    overwriting each other.
  - Renaming a file renames its history folder too.
- **New routes:**
  - `/file_history` lists the versions, newest first, with time, title, and
    word count.
  - `/file_version` returns one version's text.
  - `/restore_version` restores a version. It first keeps the current text as
    a version (forced, ignoring the 5-minute limit), so a restore can always
    be undone.
- **UI:**
  - The file ⋯ menu has a new **Version history…** item.
  - It opens a window with the versions on the left (date, words, "x min ago")
    and a plain-text preview on the right, in the editor's font.
  - **Restore this version** puts the text back. If the file is open, the
    editor updates in place.
  - Esc closes the window. Unsaved changes are saved before the window opens.

### 3. Deleted files and projects go to a trash folder

- **Why:** delete was permanent, for both files and whole projects.
- **How:**
  - Deleting a file moves it to `<section folder>/.trash/<timestamp>-<name>`.
  - Deleting a project moves the whole folder to
    `Projects/.trash/<timestamp>-<project>`.
  - Same-second name clashes get a `-2` suffix.
  - The project list and the "last project" check skip hidden folders, so
    `.trash` never appears as a project.
  - Sidebar folders need no trash: they exist only in `state.json`, and the
    app deletes them only when they are empty.
  - Restoring from the trash is manual for now: move the file back and
    re-add it.

### 4. Names that could reach outside the data folders are refused

- **Problem:** `section`, `filename`, and `project` came from the browser and
  went straight into `os.path.join()`. A crafted request could read, overwrite,
  or delete files elsewhere. For example, `delete_project` with `../Global`
  would remove the global folder.
- **How:**
  - One `@app.before_request` hook checks every JSON request. `section` must
    be one of `prompts`, `system`, `background`, or `writing`. `filename`,
    `project`, and `current_project` must be single names: no `/` or `\`, no
    `..`, and no leading dot.
  - As a second line of defense, `get_project_dir()` falls back to `default`
    if the saved current project is not a safe name, and
    `load_file_content()` (used by `/generate`) returns nothing for unsafe
    names.
- **Note:** names the app creates (slugified titles) always pass, so normal
  use is unchanged.

### 5. Git

`.history/`, `.trash/`, and `.tmp-*` are ignored everywhere. The rules sit at
the end of `.gitignore`, so they win over the `!Projects/sample-project/**`
exception.

**Check:**

1. Edit a file and save it. Open ⋯ → Version history, and the old text should
   be listed.
2. Restore it, then open Version history again. Your edited text should now be
   a version too.
3. Delete a file, then look in that section's `.trash` folder.

---

## 2026-10-22: AI output marker settings, and a marker placement fix

**Commit:** `c90d290`. **Files:** `app/templates/index.html`,
`app/static/script.js`, `app/static/style.css`. No server changes: the existing
`/save_app_state` route stores the new keys.

### 1. Markers can be turned off or reworded

- **Why:** every generation inserted
  `********` / `New generated content below` / `********` before the AI text,
  and a matching "End of generated content above" block when the AI wrote into
  the start or middle of the text. Some writers find this breaks their flow.
- **How:**
  - A new **AI Output Markers** section in the main Settings view has a
    checkbox ("Mark where AI text begins and ends") and two small text boxes,
    **Before AI text** and **After AI text**. Both boxes start with the
    original marker text.
  - The values are saved to `app_state.json` as `showOutputMarkers`,
    `outputMarkerBefore`, and `outputMarkerAfter`. If a key is missing, the
    original behavior applies: markers on, with the original text. Existing
    users therefore see no change until they edit the setting.
  - An empty box skips that marker.
  - With markers off, the AI text is still set off by a blank line (a new
    paragraph), as before. Only the marker lines disappear.
  - The old `formatOutput()` was replaced by `getOutputWrappers(mode)`. It
    returns the text to put before and after the AI output for each cursor
    position: empty document, start, end, or middle.

### 2. Bug fix: AI text landed after the closing marker

- **Problem:** at the start or in the middle of a document, the app inserted
  the whole wrapper first: opening marker, blank, closing marker. It then
  moved the insertion point past all of it. The AI text therefore streamed in
  *after* "End of generated content above", not between the markers. At the
  end of a document there is no closing marker, so that common case was not
  affected.
- **How:**
  - The opening text is inserted and the insertion point moves past it.
  - The closing text is inserted *after* the insertion point, without moving
    it.
  - Streamed chunks then land between the two markers.

**Check:** with a model selected, put the cursor in the middle of a paragraph
and generate. The AI text should sit between the two markers. Then uncheck the
setting, save, and generate at the end of the text. Only a blank line should
separate the AI text from yours.

---

## 2026-10-22: Sidebar toggle, zen mode, status bar, shortcuts, file reveal

**Commit:** `99ed60b`. **Files:** `app/templates/index.html`,
`app/static/script.js`, `app/static/style.css`. The icons are inline SVGs from
Lucide (ISC license).

### 1. Collapsible sidebar

- **Why:** the sidebar always took 30% of the window, even while you write.
- **How:**
  - A panel icon sits to the left of the title. A new `.title-row` wraps the
    toggle and the title input. **⌘\\** (Ctrl+\\) also toggles the sidebar.
  - A `sidebar-collapsed` class on `body` sets the sidebar's width and side
    padding to 0, with a short width transition.
  - The writing area changed from `width: 70%` to `flex: 1`, so it fills the
    freed space.
  - The state is saved in `localStorage` (`sjb_sidebar_collapsed`) and restored
    on load.

### 2. Zen mode

- **Why:** a distraction-free space to write or read.
- **How:**
  - A toolbar button (next to the preview eye), or **⌘⇧F**, adds a `zen` class
    to `body`.
  - That class hides the sidebar, formatting bar, AI dock, status bar, and
    sidebar toggle. It centers the title and lets the writing area take the
    full window height.
  - **Esc** exits. So does a faint button in the top-right corner, which
    appears only in zen and brightens on hover.
  - Zen combines with preview (⌘E) for a clean reading view.
  - Zen is not remembered: every session starts in normal view.

### 3. Status bar

- **Why:** the document stats shared a row with the AI buttons, and nothing
  showed whether the file was saved.
- **How:**
  - A 26 px bar spans the bottom of the window. The main layout height
    became `100vh − --statusbar-h`.
  - **Left side:** "Project › File title", then the save state:
    - "Unsaved" (accent color) while there are unsaved changes.
    - "Saved · just now / 45s ago / 3 min ago / 2:14 PM" after a save from
      this session.
    - "Saved" right after opening a file.
  - **Right side:** words, reading time (words ÷ 230, rounded, at least
    1 min), and the context meter.
  - **Context meter:** it now reads "1,473 / 128,000 tokens", with a small
    CSS dot instead of the 🟢🟡🔴 emoji. The dot is green, amber above 70%,
    and red above 90%, set through a `data-level` attribute.
  - **Updates:** the bar updates on every word-count update and every 2
    seconds. The timer keeps "x min ago" current and also catches title edits.
  - **Kept IDs:** the old `.footer-status` wrapper was removed, but the
    `#wordCount` and `#tokenMeter` elements kept their IDs, so existing code
    still finds them.

### 4. Keyboard shortcuts

These use ⌘ on Mac and Ctrl elsewhere, through one shared `keydown` listener:

- **⌘S** saves the current file and blocks the browser's "Save page" dialog.
- **⌘Enter** generates, unless a generation is already running.
- **Esc** stops a running generation. If nothing is running, it leaves zen.
- **⌘E** (preview), **⌘\\** (sidebar), and **⌘⇧F** (zen) are as above.
- Shortcuts are ignored while the Settings window is open.
- The tooltips on the new buttons show their shortcuts.

### 5. The open file is always visible in the sidebar

- **Why:** when the app reopened the last file at startup, the file's folder
  could be collapsed. Nothing in the sidebar then showed which file was open.
- **How:**
  - After a file opens, a new `revealActiveFile()` walks that section's
    folder tree.
  - It expands every collapsed folder that contains the file, and saves that
    through the existing `/update_folder_state` route, the same as a manual
    click.
  - It then re-renders and scrolls the highlighted row into view.
  - Startup restore goes through the same `openFile()` path, so both cases
    are covered.

**Check:**

1. Reload the app. The open file's folder should be expanded and the file
   highlighted.
2. Type something. The status bar should show "Unsaved". Press ⌘S, and it
   should change to "Saved · just now".
3. Press ⌘\\ twice, then ⌘⇧F, then Esc.

---

## 2026-10-22: Markdown preview toggle

**Commit:** `09c7f9e`. **Files:** `app/templates/index.html`,
`app/static/script.js`, `app/static/style.css`, and the new
`app/static/vendor/marked.min.js` and `app/static/vendor/purify.min.js`.

- **Why:** the editor shows raw Markdown (`#`, `**`, `|`), so headings, lists,
  and tables are hard to read. Writers want to see the finished page without
  leaving the app.
- **What the user sees:**
  - An eye button at the right end of the formatting bar.
  - **⌘E** (Ctrl+E on Windows) does the same thing. It is the same key as
    Obsidian's preview toggle.
  - Preview replaces the editor with a rendered page: headings, bullet and
    numbered lists (nested too), tables (with column alignment), block quotes,
    inline code and code blocks, links, and images.
  - The button turns the accent color while preview is on.
  - The B, I, H2, and bullet buttons are disabled in preview, because they edit
    raw text.
  - Double-click the preview to go back to editing.
  - Preview mode is remembered after a reload.
- **How it works:**
  - **Libraries:** two small libraries are stored in the app, with no CDN, so
    preview works offline. `marked` 12.0.2 (MIT) turns Markdown into HTML.
    `DOMPurify` 3.1.6 (Apache-2.0 / MPL-2.0) then removes scripts and event
    handlers. This matters because the text can come from an AI model. The
    rendered HTML is never inserted without that cleaning step.
  - **Markdown options:** GitHub-style Markdown with `breaks: true`. A single
    line break in the text stays a line break, which matches what the writer
    sees while typing, for dialogue and poetry.
  - **Clean-up after rendering:** every link gets `target="_blank"` and
    `rel="noopener noreferrer"`, so clicking one never navigates the app away
    from unsaved work. A plain link whose address ends in an image extension
    (png, jpg, jpeg, gif, webp, svg, avif) is also shown as the image. The
    standard `![alt](url)` form works as usual.
  - **Layout:** the preview copies the editor's chosen font and size. It uses
    the same centered text column (`--editor-measure`) and theme colors as the
    editor, so switching modes does not make the page jump.
  - **Staying current:** the preview re-renders when the text changes (typing,
    opening a file, undo, and streaming AI output). It renders at most once per
    animation frame, so long generations stay smooth. The hook is the existing
    word-count update, plus the three places that clear the editor.
  - **Nothing saved changes:** the editor textarea stays the single source of
    text. Preview only reads from it, and never writes to it.
- **Note:** images from the web load from their own servers when the preview
  is shown.

**Check:** paste a heading, a list, a table, and
`[pic](https://…/image.jpg)` into a file. Press ⌘E. All four should render, and
the image should show. Press ⌘E again, or double-click, to return to the raw
text.

---

## 2026-10-22: UI polish, batch 1 (CSS only)

**Commit:** `b8df8d5`. **File:** `app/static/style.css`. No HTML, JavaScript,
or Python changes.

### 1. Dropdown carets no longer touch the edge

- **Why:** the browser's own arrow sat against the right border of every
  dropdown (font, size, model, theme, model source).
- **How:** every `select` turns off the native look (`appearance: none`) and
  gets a small chevron icon as a background image, placed 10 px from the right
  edge, with 30 px of right padding (26 px in the formatting bar). The chevron
  is an inline SVG held in a CSS variable. Light themes use a dark stroke and
  dark themes a light one.

### 2. Thin scrollbars in every theme

- **Why:** the scrollbars were 10 px wide with a solid track, and they were
  only styled in the three dark themes. The two light themes showed the default
  OS bar.
- **How:** one shared rule for all themes. It uses `scrollbar-width: thin` and
  a transparent track, plus the webkit equivalent: an 8 px bar with a rounded
  thumb inset by 2 px. Each theme now only sets two colors, `--scrollbar` and
  `--scrollbar-hover`, using the same colors as before. This replaced four
  copies of the scrollbar rules.

### 3. Form-field colors come from the theme

- **Why:** each dark theme repeated its own input, textarea, and select rules,
  and the light themes had none.
- **How:** new theme variables `--input-bg`, `--input-text`, `--input-border`,
  and `--placeholder`, set in every theme. Dark themes keep the exact colors
  they had before. One shared rule applies them to text fields, textareas, and
  selects. Checkboxes and radios are left alone.

### 4. A modern UI font

- **Why:** the interface used Arial, and textareas fell back to the browser's
  monospace font (the instruction box and the model description).
- **How:** the body uses the system UI font stack (San Francisco on Mac,
  Segoe UI on Windows). Fields and buttons inherit it. The manuscript editor is
  not affected, because its font is still set from the font picker. Model IDs
  stay monospace on purpose.

### 5. A readable line length in the editor

- **Why:** the editor was a 900 px box centered in the writing area. Lines
  ran to about 120 characters, and the scrollbar floated in the middle of the
  screen.
- **How:** the editor now fills the whole writing area, so the scrollbar sits
  at the window edge. Its left and right padding is
  `max(24px, (100% − 70ch) / 2)`, which centers a text column about 70
  characters wide in the chosen font. The width is one variable,
  `--editor-measure`.

### 6. Clear zones instead of boxes

- **Why:** the sidebar was two bordered cards inside a padded frame, and the
  editor, instruction box, and footer blended together.
- **How:**
  - The outer frame padding is gone.
  - **Sidebar:** the `--panel` background fills the full height. The two groups
    are separated by a single 1 px line instead of card borders, and the last
    section in each group has no bottom line, so lines never double.
  - **Writing area:** the `--bg` background.
  - **AI dock** (the instruction box and controls): the `--panel` background
    with a 1 px top border. This also replaces a hard-coded `#ccc` border that
    ignored the theme.

### 7. Quieter sidebar headings

- **Why:** the section headings (Prompts, System, Background, Writing) were
  16 px bold, the same weight as the file names, so the eye had nowhere to rest.
- **How:**
  - The headings are 11 px, uppercase, with wider letter spacing, in the muted
    text color.
  - Their `+` and folder buttons are borderless and slightly faded until hover.
  - The panel titles ("Your Writing Helper", "Project: …") went from 18 px to
    15 px, semibold.

### 8. The instruction box looks like a field

- **Why:** it was a bare area with only a bottom line, set in monospace.
- **How:** a 1 px border with 8 px rounded corners, 15 px UI font, and a border
  that turns the theme's `--accent` color when the box is focused.

**Check:** load the app in each of the 5 themes. Open Settings → Visual Layout
and Settings → Manage Models. All dropdowns should show a chevron with space on
its right. The editor text should sit in a centered column.
