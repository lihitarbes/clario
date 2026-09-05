import { describe, expect, it } from "vitest";
import { buildWhatsAppPurchaseUrl } from "@/lib/products/whatsapp";

describe("buildWhatsAppPurchaseUrl", () => {
  it("builds a valid wa.me URL from an Israeli local number", () => {
    const href = buildWhatsAppPurchaseUrl({
      phone: "0501234567",
      clientName: "Ada",
      totalAmount: 100,
      currency: "ILS",
      createdAt: "2026-09-05T10:00:00.000Z",
    });

    expect(href).not.toBeNull();
    expect(href).toMatch(/^https:\/\/wa\.me\/972501234567\?text=/);
    const text = new URL(href!).searchParams.get("text");
    expect(text).toContain("Ada");
    expect(text).toContain("purchase request");
  });

  it("returns null when the phone cannot be normalized", () => {
    expect(
      buildWhatsAppPurchaseUrl({
        phone: null,
        clientName: "Ada",
        totalAmount: 100,
        createdAt: "2026-09-05T10:00:00.000Z",
      }),
    ).toBeNull();
  });
});
