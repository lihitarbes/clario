import { describe, expect, it } from "vitest";
import { phoneDigitsForWhatsApp } from "@/lib/validation/profile";

describe("phoneDigitsForWhatsApp", () => {
  it("converts Israeli local mobile 050… to 972…", () => {
    expect(phoneDigitsForWhatsApp("0501234567")).toBe("972501234567");
  });

  it("strips hyphens before converting local 0… numbers", () => {
    expect(phoneDigitsForWhatsApp("050-123-4567")).toBe("972501234567");
  });

  it("strips + from already-international Israeli numbers", () => {
    expect(phoneDigitsForWhatsApp("+972501234567")).toBe("972501234567");
  });

  it("leaves bare 972… numbers unchanged", () => {
    expect(phoneDigitsForWhatsApp("972501234567")).toBe("972501234567");
  });

  it("strips spaces and hyphens from +972 numbers", () => {
    expect(phoneDigitsForWhatsApp("+972 50-123-4567")).toBe("972501234567");
  });

  it("does not corrupt other international numbers", () => {
    expect(phoneDigitsForWhatsApp("+447911123456")).toBe("447911123456");
  });

  it("returns null for missing or invalid values", () => {
    expect(phoneDigitsForWhatsApp(null)).toBeNull();
    expect(phoneDigitsForWhatsApp(undefined)).toBeNull();
    expect(phoneDigitsForWhatsApp("")).toBeNull();
    expect(phoneDigitsForWhatsApp("   ")).toBeNull();
    expect(phoneDigitsForWhatsApp("123")).toBeNull();
    expect(phoneDigitsForWhatsApp("abc")).toBeNull();
  });
});
