import { describe, expect, it } from "vitest";
import { orderTone, paymentTone } from "../components/Badge";
import { isAssetUrl, normalizeAssetUrl } from "./asset-url";
import {
  formatWholeNumberInput,
  money,
  parseWholeNumberInput,
  readError,
  readFormError,
  slugify,
  toNumber,
} from "./format";

describe("format utilities", () => {
  it("formats money as IDR without decimals", () => {
    expect(money(125000)).toBe("Rp125.000");
  });

  it("normalizes numeric inputs and fallbacks", () => {
    expect(toNumber("42")).toBe(42);
    expect(toNumber(null)).toBe(0);
  });

  it("slugifies catalog names", () => {
    expect(slugify("Sepatu Nike Air Max")).toBe("sepatu-nike-air-max");
  });

  it("reads safe error messages", () => {
    expect(readError(new Error("failed"))).toBe("failed");
    expect(readError("failed")).toBe("Something went wrong");
  });

  it("formats whole-number inputs by admin language", () => {
    expect(formatWholeNumberInput("1250000", "en")).toBe("1,250,000");
    expect(formatWholeNumberInput("1250000", "id")).toBe("1.250.000");
  });

  it("parses formatted whole-number input", () => {
    expect(parseWholeNumberInput("1,250,000")).toBe("1250000");
    expect(parseWholeNumberInput("1.250.000")).toBe("1250000");
  });

  it("humanizes technical form errors", () => {
    expect(readFormError("Invalid input: expected number, received NaN")).toBe(
      "Enter a valid number",
    );
    expect(
      readFormError("Too small: expected string to have >=3 characters"),
    ).toBe("Enter at least 3 characters");
  });

  it("humanizes technical form errors in Indonesian", () => {
    expect(
      readFormError("Invalid input: expected number, received NaN", "id"),
    ).toBe("Masukkan angka yang valid");
  });
});

describe("status badge tones", () => {
  it("keeps order and payment tones aligned with API statuses", () => {
    expect(orderTone("PAID")).toBe("good");
    expect(orderTone("PENDING")).toBe("warn");
    expect(orderTone("CANCELLED")).toBe("danger");
    expect(paymentTone("UNPAID")).toBe("warn");
    expect(paymentTone("FAILED")).toBe("danger");
    expect(paymentTone("REFUNDED")).toBe("neutral");
  });
});

describe("asset URL validation", () => {
  it("accepts API upload paths and safe remote URLs", () => {
    expect(isAssetUrl("/uploads/banner.webp")).toBe(true);
    expect(isAssetUrl("https://cdn.example.com/banner.webp")).toBe(true);
    expect(isAssetUrl("http://localhost:3000/uploads/banner.webp")).toBe(true);
  });

  it("rejects insecure non-local remote URLs", () => {
    expect(isAssetUrl("http://example.com/banner.webp")).toBe(false);
  });

  it("normalizes upload paths to the API origin", () => {
    expect(normalizeAssetUrl("/uploads/banner.webp")).toBe(
      "http://localhost:3000/uploads/banner.webp",
    );
  });
});
