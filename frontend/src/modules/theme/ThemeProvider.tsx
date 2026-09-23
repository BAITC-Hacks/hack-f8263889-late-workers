import { useEffect } from "react";

import { useThemeStore } from "./stores/useThemeStore";

const applyTheme = (isDark: boolean) => {
  const root = document.documentElement;
  root.classList.toggle("dark", isDark);
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    if (theme === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(media.matches);
      const onChange = (e: MediaQueryListEvent) => applyTheme(e.matches);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    }

    applyTheme(theme === "dark");
  }, [theme]);

  return <>{children}</>;
};
