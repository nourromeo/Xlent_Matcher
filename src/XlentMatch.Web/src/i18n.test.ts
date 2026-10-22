import { beforeEach, describe, expect, it } from "vitest";
import { translations, translateStatic } from "./i18n";
import { validateDocumentFile } from "./services/fileValidation";

describe("translation coverage", () => {
  it("contains identical keys and nonempty values for English, Swedish and Spanish", () => {
    const keys = Object.keys(translations.en).sort();
    for (const locale of ["sv", "es"] as const) {
      expect(Object.keys(translations[locale]).sort()).toEqual(keys);
    }
    for (const locale of ["en", "sv", "es"] as const) {
      for (const value of Object.values(translations[locale])) {
        expect(typeof value).toBe("string");
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe("non-React message localization", () => {
  beforeEach(() => localStorage.removeItem("xlent-match-locale"));

  it("translates file validation feedback according to the selected locale", () => {
    const invalid = new File(["x"], "test.doc", { type: "application/msword" });
    expect(validateDocumentFile(invalid)).toBe(translations.en.file_unsupported);
    localStorage.setItem("xlent-match-locale", "sv");
    expect(validateDocumentFile(invalid)).toBe(translations.sv.file_unsupported);
    localStorage.setItem("xlent-match-locale", "es");
    expect(validateDocumentFile(invalid)).toBe(translations.es.file_unsupported);
  });

  it("uses English if the stored locale is unsupported", () => {
    localStorage.setItem("xlent-match-locale", "invalid");
    expect(translateStatic("api_network")).toBe(translations.en.api_network);
  });
});
