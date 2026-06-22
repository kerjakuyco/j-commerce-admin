import { describe, expect, it } from "vitest";
import { getTranslations, normalizeLanguage } from "./I18nContext";

describe("admin i18n", () => {
  it("defaults unknown values to English", () => {
    expect(normalizeLanguage(null)).toBe("en");
    expect(normalizeLanguage("fr")).toBe("en");
  });

  it("provides English and Indonesian shell copy", () => {
    expect(getTranslations("en").shell.operationsConsole).toBe("Operations console");
    expect(getTranslations("id").shell.operationsConsole).toBe("Konsol operasional");
  });
});
