import type { ProductCurrency } from "@/types/database";

export type { ProductCurrency };

export const PRODUCT_CURRENCIES: ProductCurrency[] = ["ILS", "USD"];

export const DEFAULT_PRODUCT_CURRENCY: ProductCurrency = "ILS";

export function isProductCurrency(value: unknown): value is ProductCurrency {
  return value === "ILS" || value === "USD";
}

export function normalizeProductCurrency(
  value: string | null | undefined,
): ProductCurrency {
  return isProductCurrency(value) ? value : DEFAULT_PRODUCT_CURRENCY;
}

export function formatProductPrice(
  price: number | string,
  currency: string | null | undefined = DEFAULT_PRODUCT_CURRENCY,
): string {
  const value = typeof price === "number" ? price : Number(price);
  if (Number.isNaN(value)) {
    return "—";
  }

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: normalizeProductCurrency(currency),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Shared currency across items, or null when mixed/empty. */
export function sharedProductCurrency(
  currencies: Array<string | null | undefined>,
): ProductCurrency | null {
  if (currencies.length === 0) {
    return null;
  }
  const normalized = currencies.map(normalizeProductCurrency);
  const first = normalized[0];
  return normalized.every((currency) => currency === first) ? first : null;
}

/** Formats a purchase/cart total; avoids a false single currency when mixed. */
export function formatPurchaseTotal(
  amount: number | string,
  currencies: Array<string | null | undefined>,
): string {
  const shared = sharedProductCurrency(currencies);
  if (shared) {
    return formatProductPrice(amount, shared);
  }
  if (currencies.length === 0) {
    return formatProductPrice(amount);
  }
  const value = typeof amount === "number" ? amount : Number(amount);
  if (Number.isNaN(value)) {
    return "—";
  }
  return `${value.toFixed(2)} (mixed currencies)`;
}

export function toProductPriceNumber(price: number | string): number {
  const value = typeof price === "number" ? price : Number(price);
  return Number.isFinite(value) ? value : 0;
}

export function purchaseStatusLabel(
  status: "pending" | "confirmed" | "completed" | "cancelled",
): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "confirmed":
      return "Confirmed";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
  }
}

export function purchaseStatusClassName(
  status: "pending" | "confirmed" | "completed" | "cancelled",
): string {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-900";
    case "confirmed":
      return "bg-sky-100 text-sky-900";
    case "completed":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-zinc-100 text-zinc-600";
  }
}

/** Allowed owner transitions for purchase status. */
export function canOwnerTransitionPurchaseStatus(
  from: "pending" | "confirmed" | "completed" | "cancelled",
  to: "pending" | "confirmed" | "completed" | "cancelled",
): boolean {
  if (from === "pending" && (to === "confirmed" || to === "cancelled")) {
    return true;
  }
  if (from === "confirmed" && (to === "completed" || to === "cancelled")) {
    return true;
  }
  return false;
}
