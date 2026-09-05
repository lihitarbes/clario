"use client";

import { useActionState } from "react";
import { createClientPurchaseAction } from "@/actions/purchases";
import { ProductImage } from "@/components/products/ProductImage";
import { ActionPendingLabel } from "@/components/ui/action-pending-label";
import { Button } from "@/components/ui/button";
import { ShopDrawer } from "@/components/shop/ShopDrawer";
import {
  formatProductPrice,
  normalizeProductCurrency,
  sharedProductCurrency,
  toProductPriceNumber,
} from "@/lib/products/display";
import type { ShopCartLine } from "@/lib/shop/cart-storage";

type ShopCartPanelProps = {
  open: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
  clientId: string;
  lines: ShopCartLine[];
  onSetQuantity: (line: ShopCartLine, quantity: number) => void;
  onRemove: (productId: string) => void;
};

function formatCartTotal(lines: ShopCartLine[]): string {
  const shared = sharedProductCurrency(lines.map((line) => line.currency));
  if (shared) {
    const total = lines.reduce(
      (sum, line) =>
        sum + toProductPriceNumber(line.price) * line.quantity,
      0,
    );
    return formatProductPrice(total, shared);
  }

  const byCurrency = new Map<string, number>();
  for (const line of lines) {
    const currency = normalizeProductCurrency(line.currency);
    const amount = toProductPriceNumber(line.price) * line.quantity;
    byCurrency.set(currency, (byCurrency.get(currency) ?? 0) + amount);
  }

  return [...byCurrency.entries()]
    .map(([currency, total]) => formatProductPrice(total, currency))
    .join(" · ");
}

export function ShopCartPanel({
  open,
  onClose,
  businessId,
  businessName,
  clientId,
  lines,
  onSetQuantity,
  onRemove,
}: ShopCartPanelProps) {
  const [state, formAction, pending] = useActionState(
    createClientPurchaseAction,
    null,
  );

  const itemsJson = JSON.stringify(
    lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
    })),
  );

  return (
    <ShopDrawer
      open={open}
      onClose={onClose}
      title="Cart"
      description={businessName}
      label="Shopping cart"
      footer={
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="businessId" value={businessId} />
          <input type="hidden" name="clientId" value={clientId} />
          <input type="hidden" name="itemsJson" value={itemsJson} />
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-600">Total</span>
            <span className="font-semibold text-zinc-900">
              {formatCartTotal(lines)}
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            No payment is taken online. Your practitioner will confirm the
            request.
          </p>
          <Button
            type="submit"
            className="w-full"
            disabled={pending || lines.length === 0}
          >
            <ActionPendingLabel
              pending={pending}
              pendingLabel="Requesting…"
              idleLabel="Request purchase"
            />
          </Button>
          {state && !state.success ? (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          ) : null}
        </form>
      }
    >
      {lines.length === 0 ? (
        <p className="text-sm text-zinc-600">
          Your cart is empty. Add products from the catalog.
        </p>
      ) : (
        <ul className="space-y-3">
          {lines.map((line) => {
            const lineTotal =
              toProductPriceNumber(line.price) * line.quantity;
            return (
              <li
                key={line.productId}
                className="flex gap-3 rounded-md border border-zinc-200 p-3"
              >
                <ProductImage
                  src={line.imageUrl}
                  alt={line.name}
                  size="thumb"
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900">
                        {line.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatProductPrice(line.price, line.currency)} each
                      </p>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline"
                      onClick={() => onRemove(line.productId)}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 px-0"
                        onClick={() =>
                          onSetQuantity(line, line.quantity - 1)
                        }
                      >
                        −
                      </Button>
                      <span className="w-8 text-center text-sm tabular-nums">
                        {line.quantity}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 px-0"
                        onClick={() =>
                          onSetQuantity(line, line.quantity + 1)
                        }
                      >
                        +
                      </Button>
                    </div>
                    <p className="text-sm font-medium text-zinc-900">
                      {formatProductPrice(lineTotal, line.currency)}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ShopDrawer>
  );
}
