import { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_THEME_ID, THEMES, getThemeById } from "../utils/themes.js";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeId, setThemeIdState] = useState(
    () => localStorage.getItem("smartspendr_theme") || DEFAULT_THEME_ID
  );

  useEffect(() => {
    const theme = getThemeById(themeId);
    const root = document.documentElement;
    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--accent-hover", theme.accentHover);
    root.style.setProperty("--accent-soft", theme.accentSoft);
    root.style.setProperty("--on-accent", theme.onAccent);
    root.style.setProperty("--bg", theme.bg);
    root.style.setProperty("--surface", theme.surface);
    root.style.setProperty("--text", theme.text);
    root.style.setProperty("--text-muted", theme.textMuted);
    root.style.setProperty("--border", theme.border);
    root.style.colorScheme = theme.mode;
    localStorage.setItem("smartspendr_theme", themeId);
  }, [themeId]);

  function setThemeId(id) {
    if (getThemeById(id).id === id) setThemeIdState(id);
  }

  return (
    <ThemeContext.Provider value={{ themeId, theme: getThemeById(themeId), themes: THEMES, setThemeId }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
