import { Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "../context/I18nContext";
import { useTheme, type AdminTheme } from "../context/ThemeContext";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const options: Array<{ value: AdminTheme; label: string; icon: ReactNode }> = [
    { value: "light", label: t.theme.light, icon: <Sun size={13} /> },
    { value: "dark", label: t.theme.dark, icon: <Moon size={13} /> },
  ];

  return (
    <div className="theme-toggle" role="group" aria-label={t.theme.label}>
      {options.map((option) => {
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            className={active ? "active" : undefined}
            aria-pressed={active}
            onClick={() => setTheme(option.value)}
          >
            <span className="theme-toggle-icon" aria-hidden="true">
              {option.icon}
            </span>
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
