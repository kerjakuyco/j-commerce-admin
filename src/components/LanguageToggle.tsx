import { useI18n, type Language } from "../context/I18nContext";

const options: Language[] = ["en", "id"];

export function LanguageToggle() {
  const { language, setLanguage, t } = useI18n();
  return (
    <div className="language-toggle" aria-label={t.language.label}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={option === language ? "active" : undefined}
          aria-pressed={option === language}
          onClick={() => setLanguage(option)}
        >
          {option === "en" ? "EN" : "ID"}
        </button>
      ))}
    </div>
  );
}
