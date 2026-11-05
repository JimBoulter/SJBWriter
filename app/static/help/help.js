// Help pages match the app's look: its saved mode and accent color.
// The folder also works on its own (opened as files, or hosted elsewhere):
// then it follows the computer's light/dark setting and hides "Back to the app".
(async () => {
  const ACCENTS = ["blue", "indigo", "teal", "crimson", "amber", "violet"];
  let mode = "system";
  let accent = "blue";
  let fromApp = false;

  if (location.protocol !== "file:") {
    try {
      const res = await fetch("/load");
      if (res.ok) {
        const appState = (await res.json()).app_state || {};
        mode = appState.themeMode || (appState.theme === "dark" ? "dark" : mode);
        if (ACCENTS.includes(appState.accent)) accent = appState.accent;
        fromApp = true;
      }
    } catch (e) {
      // Not served by the app: keep the defaults
    }
  }

  const back = document.getElementById("helpBack");
  if (back && !fromApp) back.hidden = true;

  const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
  const apply = () => {
    const dark = mode === "dark" || (mode === "system" && systemDark.matches);
    document.body.classList.toggle("mode-dark", dark);
  };
  ACCENTS.forEach(a => document.body.classList.toggle(`accent-${a}`, a === accent));
  apply();
  systemDark.addEventListener("change", apply);
})();
