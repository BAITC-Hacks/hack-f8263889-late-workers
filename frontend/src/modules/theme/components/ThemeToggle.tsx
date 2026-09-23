import { Button } from "@/common/components/ui";
import { Theme, useThemeStore } from "@/modules/theme";
import { Monitor, Moon, Sun } from "lucide-react";

const nextTheme: Record<Theme, Theme> = {
  light: "dark",
  dark: "system",
  system: "light",
};

const iconByTheme: Record<Theme, React.ReactNode> = {
  light: <Sun className="h-4 w-4" />,
  dark: <Moon className="h-4 w-4" />,
  system: <Monitor className="h-4 w-4" />,
};

export const ThemeToggle = () => {
  const { theme, setTheme } = useThemeStore();

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={`Theme: ${theme}`}
      onClick={() => setTheme(nextTheme[theme])}
    >
      {iconByTheme[theme]}
    </Button>
  );
};
