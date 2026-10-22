function isDark(theme?: string): boolean {
  if (theme === "dark") return true;
  if (theme === "default") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(theme?: string) {
  const dark = isDark(theme);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function watchDevtoolsTheme() {
  applyTheme(chrome.devtools?.panels?.themeName);
  chrome.devtools?.panels?.setThemeChangeHandler?.(applyTheme);
}
