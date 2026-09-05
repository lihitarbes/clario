import { describe, expect, it } from "vitest";
import {
  canOwnerTransitionPurchaseStatus,
  formatProductPrice,
  formatPurchaseTotal,
  normalizeProductCurrency,
} from "@/lib/products/display";

describe("product currency helpers", () => {
  it("normalizes known currencies and falls back to ILS", () => {
    expect(normalizeProductCurrency("USD")).toBe("USD");
    expect(normalizeProductCurrency("ILS")).toBe("ILS");
    expect(normalizeProductCurrency("EUR")).toBe("ILS");
    expect(normalizeProductCurrency(null)).toBe("ILS");
  });

  it("formats ILS and USD prices", () => {
    const ils = formatProductPrice(12.5, "ILS");
    const usd = formatProductPrice("20", "USD");
    expect(ils).toMatch(/12\.50/);
    expect(ils).toMatch(/₪|ILS/);
    expect(usd).toMatch(/20\.00/);
    expect(usd).toMatch(/\$|USD/);
  });

  it("formats shared-currency totals and mixed-currency totals", () => {
    expect(formatPurchaseTotal(30, ["ILS", "ILS"])).toBe(
      formatProductPrice(30, "ILS"),
    );
    expect(formatPurchaseTotal(30, ["ILS", "USD"])).toBe(
      "30.00 (mixed currencies)",
    );
  });
});

describe("canOwnerTransitionPurchaseStatus", () => {
  it("allows valid owner transitions", () => {
    expect(canOwnerTransitionPurchaseStatus("pending", "confirmed")).toBe(true);
    expect(canOwnerTransitionPurchaseStatus("pending", "cancelled")).toBe(true);
    expect(canOwnerTransitionPurchaseStatus("confirmed", "completed")).toBe(
      true,
    );
    expect(canOwnerTransitionPurchaseStatus("confirmed", "cancelled")).toBe(
      true,
    );
  });

  it("rejects invalid transitions", () => {
    expect(canOwnerTransitionPurchaseStatus("pending", "completed")).toBe(
      false,
    );
    expect(canOwnerTransitionPurchaseStatus("completed", "pending")).toBe(
      false,
    );
    expect(canOwnerTransitionPurchaseStatus("cancelled", "confirmed")).toBe(
      false,
    );
  });
});
