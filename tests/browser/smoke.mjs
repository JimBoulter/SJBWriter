// Browser smoke test: opens the real page and uses each main feature once.
//
// It runs the app from a throwaway copy with a small made-up library, so your
// books are never touched, and it fakes the AI reply, so it spends no credits.
//
// Needs Node and Playwright (optional; the Python tests do not need them):
//   npm install --no-save playwright && npx playwright install chromium
//   node tests/browser/smoke.mjs
// PYTHON picks the Python that has Flask (default: python3).
// PW_EXE points at a Chromium you already have, instead of Playwright's own.

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// require() also finds a Playwright installed elsewhere through NODE_PATH
const { chromium } = createRequire(import.meta.url)("playwright");

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PORT = 5059;
const URL = `http://127.0.0.1:${PORT}/`;

let failures = 0;
const ok = (cond, message) => {
  if (!cond) failures++;
  console.log(`${cond ? "PASS" : "FAIL"} ${message}`);
};

// ----- a throwaway app with a small library -----

const root = fs.mkdtempSync(path.join(os.tmpdir(), "sjb-smoke-"));
const write = (rel, text) => {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), text);
};
const doc = (title, text) => `---\ntitle: ${JSON.stringify(title)}\n---\n\n${text}`;

fs.cpSync(path.join(REPO, "app"), path.join(root, "app"), {
  recursive: true,
  filter: src => !src.includes("__pycache__")
});
write("Global/prompts/continue.md", doc("Continue", "Continue the scene."));
write("Global/system/style.md", doc("Style", "Past tense."));
write("Global/state.json", JSON.stringify({
  prompts: [{ type: "file", filename: "continue.md", title: "Continue" }],
  system: [{ type: "file", filename: "style.md", title: "Style" }],
  last_opened_global: {}
}));
write("Global/app_state.json", JSON.stringify({ current_project: "book", recent_projects: ["book"], aiEnabled: true }));
write("Projects/sample-project/state.json", JSON.stringify({ background: [], writing: [], last_opened_project: {} }));
write("Projects/book/project.json", JSON.stringify({ id: "book", title: "My Book" }));
write("Projects/book/background/cast.md", doc("Cast", "Mara: a thief."));
write("Projects/book/writing/chapter-1.md", doc("Chapter 1", "The rain fell."));
write("Projects/book/state.json", JSON.stringify({
  background: [{ type: "file", filename: "cast.md", title: "Cast" }],
  writing: [{
    type: "folder", id: "part-one", title: "Part One", collapsed: false,
    items: [{ type: "file", filename: "chapter-1.md", title: "Chapter 1" }]
  }],
  last_opened_project: {}
}));

const appDir = path.join(root, "app");
const server = spawn(process.env.PYTHON || "python3", ["-c",
  `import sys; sys.path.insert(0, ${JSON.stringify(appDir)}); import app; app.app.run(port=${PORT}, debug=False)`
], { cwd: appDir, stdio: "ignore" });

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(URL)).ok) return; } catch {}
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error("The app did not start. Is Flask installed for this Python?");
}

const browser = await chromium.launch(process.env.PW_EXE ? { executablePath: process.env.PW_EXE } : {});
try {
  await waitForServer();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  let browserPopups = 0;
  page.on("pageerror", e => errors.push(e.message));
  page.on("dialog", d => { browserPopups++; d.dismiss(); });
  // A fake AI reply: no network, no credits
  await page.route("**/generate", r => r.fulfill({ status: 200, contentType: "text/plain", body: "And then she stopped." }));

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const windowOpen = id => page.locator(`#${id}:not(.hidden)`).count();
  const closeWithEsc = async id => { await page.keyboard.press("Escape"); await page.waitForTimeout(200); return (await windowOpen(id)) === 0; };

  ok(await page.locator(".file-row", { hasText: "Cast" }).count() === 1, "sidebar lists the library");

  // Open, edit, save
  await page.locator(".file-row", { hasText: "Chapter 1" }).click();
  await page.waitForTimeout(400);
  ok((await page.inputValue("#editor")).startsWith("The rain fell."), "a document opens");
  await page.fill("#editor", "The rain fell. Smoke test edit.");
  await page.keyboard.press(process.platform === "darwin" ? "Meta+s" : "Control+s");
  await page.waitForTimeout(500);
  ok(fs.readFileSync(path.join(root, "Projects/book/writing/chapter-1.md"), "utf8").includes("Smoke test edit."), "⌘S saves to the .md file");

  // New document through the question window
  await page.locator('button.icon-btn[onclick="createNew(\'writing\')"]').click();
  await page.waitForTimeout(200);
  await page.keyboard.type("Chapter 2");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(600);
  ok(fs.existsSync(path.join(root, "Projects/book/writing/chapter-2.md")), "a new document is created");

  // Generate with the fake reply
  await page.locator(".file-row", { hasText: "Chapter 1" }).click();
  await page.waitForTimeout(300);
  await page.evaluate(() => { settings.modelName = "test/model"; settings.modelSource = "openrouter"; });
  await page.click("#generateBtn");
  await page.waitForTimeout(800);
  ok((await page.inputValue("#editor")).includes("And then she stopped."), "Generate inserts the reply");

  // Each window opens and closes
  await page.click("#previewRequestBtn"); await page.waitForTimeout(300);
  ok(await windowOpen("requestModal") === 1 && await closeWithEsc("requestModal"), "AI request preview opens and closes");
  await page.click(".menu-btn[data-tip='Project actions']"); await page.click(".file-menu >> text=Trash…"); await page.waitForTimeout(300);
  ok(await windowOpen("trashModal") === 1 && await closeWithEsc("trashModal"), "Trash opens and closes");
  await page.click(".menu-btn[data-tip='Project actions']"); await page.click(".file-menu >> text=Export manuscript…"); await page.waitForTimeout(300);
  ok(await windowOpen("exportModal") === 1 && await closeWithEsc("exportModal"), "Export opens and closes");
  const row = page.locator(".file-row", { hasText: "Chapter 1" });
  await row.hover(); await row.locator(".menu-btn").click(); await page.click(".file-menu >> text=Version history…"); await page.waitForTimeout(400);
  ok(await windowOpen("historyModal") === 1 && await closeWithEsc("historyModal"), "Version history opens and closes");
  await page.click("#visualToggle"); await page.waitForTimeout(300);
  ok(await windowOpen("visualModal") === 1 && await closeWithEsc("visualModal"), "Visual layout opens and closes");
  await page.click("button[aria-label='Settings']"); await page.waitForTimeout(500);
  ok(await windowOpen("settingsModal") === 1 && await closeWithEsc("settingsModal"), "Settings opens and closes");

  // Panels and modes
  await page.click("#previewToggle"); await page.waitForTimeout(300);
  ok(await page.locator("#preview:visible").count() === 1, "Markdown preview shows");
  await page.click("#previewToggle");
  await page.click("#sidebarToggle"); await page.waitForTimeout(300);
  ok(await page.evaluate(() => document.body.classList.contains("sidebar-collapsed")), "sidebar folds away");
  await page.click("#sidebarToggle");
  await page.click("#modeToggle"); await page.waitForTimeout(200);
  await page.setViewportSize({ width: 390, height: 800 }); await page.waitForTimeout(400);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "no sideways scroll at phone width");

  // Help opens in its own tab
  await page.setViewportSize({ width: 1440, height: 900 });
  const [helpTab] = await Promise.all([page.context().waitForEvent("page"), page.click("#helpBtn")]);
  await helpTab.waitForLoadState();
  ok(await helpTab.locator("h1").textContent() === "Welcome to SJB Writer", "? opens the help pages");
  await helpTab.close();

  ok(browserPopups === 0, "no browser pop-ups");
  ok(errors.length === 0, "no page errors" + (errors.length ? `: ${errors.join(" | ")}` : ""));
} catch (e) {
  failures++;
  console.log(`FAIL ${e.message}`);
} finally {
  await browser.close();
  server.kill();
  fs.rmSync(root, { recursive: true, force: true });
}

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
