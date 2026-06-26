import { describe, expect, it } from "vitest";
import { getTranslations, normalizeLanguage } from "./I18nContext";

describe("admin i18n", () => {
  it("defaults unknown values to English", () => {
    expect(normalizeLanguage(null)).toBe("en");
    expect(normalizeLanguage("fr")).toBe("en");
  });

  it("provides English and Indonesian shell copy", () => {
    expect(getTranslations("en").shell.operationsConsole).toBe("Operations console");
    expect(getTranslations("id").shell.operationsConsole).toBe("Operations console");
  });

  it("localizes dashboard order status labels in Indonesian", () => {
    expect(getTranslations("en").dashboard.statusLabels.PENDING).toBe("Pending");
    expect(getTranslations("en").dashboard.statusLabels.PAID).toBe("Paid");
    expect(getTranslations("id").dashboard.statusLabels.PENDING).toBe("Menunggu");
    expect(getTranslations("id").dashboard.statusLabels.PAID).toBe("Dibayar");
    expect(getTranslations("id").dashboard.statusLabels.PACKED).toBe("Dikemas");
    expect(getTranslations("id").dashboard.statusLabels.SHIPPED).toBe("Dikirim");
    expect(getTranslations("id").dashboard.statusLabels.DELIVERED).toBe("Selesai");
    expect(getTranslations("id").dashboard.statusLabels.CANCELLED).toBe("Dibatalkan");
  });
});
