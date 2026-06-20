import { describe, expect, it } from "vitest";
import { orderTone, paymentTone } from "../components/Badge";
import { isAssetUrl } from "./asset-url";
import { money, readError, slugify, toNumber } from "./format";

describe("format utilities", () => {
  it("formats money as IDR without decimals", () => {
    expect(money(125000)).toBe("Rp\u00a0125.000");
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
});
