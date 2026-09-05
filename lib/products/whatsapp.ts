import { phoneDigitsForWhatsApp } from "@/lib/validation/profile";
import { formatProductPrice } from "@/lib/products/display";

export function buildWhatsAppPurchaseUrl(params: {
  phone: string | null | undefined;
  clientName: string;
  totalAmount: number | string;
  currency?: string | null;
  createdAt: string;
}): string | null {
  const digits = phoneDigitsForWhatsApp(params.phone);
  if (!digits) {
    return null;
  }

  const when = new Date(params.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const message =
    `Hi ${params.clientName}, this is about your purchase request from ${when} ` +
    `(total ${formatProductPrice(params.totalAmount, params.currency)}).`;

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
