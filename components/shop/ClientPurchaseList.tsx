"use client";

import { useActionState, useEffect } from "react";
import { cancelClientPurchaseAction } from "@/actions/purchases";
import { ActionPendingLabel } from "@/components/ui/action-pending-label";
import { Button } from "@/components/ui/button";
import {
  formatPurchaseTotal,
  purchaseStatusClassName,
  purchaseStatusLabel,
} from "@/lib/products/display";
import { cn } from "@/lib/utils";
import type { PurchaseStatus } from "@/types/database";

export type ClientPurchaseListItem = {
  id: string;
  status: PurchaseStatus;
  total_amount: number | string;
  created_at: string;
  businesses: { name: string } | null;
  purchase_items:
    | {
        id: string;
        quantity: number;
        unit_price: number | string;
        products: { name: string; currency?: string | null } | null;
      }[]
    | null;
};

type ClientPurchaseListProps = {
  purchases: ClientPurchaseListItem[];
  focusPurchaseId?: string | null;
};

function CancelButton({ purchaseId }: { purchaseId: string }) {
  const [state, action, pending] = useActionState(
    cancelClientPurchaseAction,
    null,
  );

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="purchaseId" value={purchaseId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        <ActionPendingLabel
          pending={pending}
          pendingLabel="Cancelling…"
          idleLabel="Cancel request"
        />
      </Button>
      {state && !state.success ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function ClientPurchaseList({
  purchases,
  focusPurchaseId = null,
}: ClientPurchaseListProps) {
  useEffect(() => {
    if (!focusPurchaseId) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(`client-purchase-${focusPurchaseId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusPurchaseId]);

  if (purchases.length === 0) {
    return (
      <p className="text-sm text-zinc-600">You have not placed any orders yet.</p>
    );
  }

  return (
    <ul className="space-y-4">
      {purchases.map((purchase) => {
        const items = purchase.purchase_items ?? [];
        const isFocused = focusPurchaseId === purchase.id;
        return (
          <li
            key={purchase.id}
            id={`client-purchase-${purchase.id}`}
            className={cn(
              "space-y-3 rounded-md border border-zinc-200 p-4",
              isFocused && "ring-2 ring-zinc-900 ring-offset-2",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-900">
                  {purchase.businesses?.name ?? "Business"}
                </p>
                <p className="text-xs text-zinc-500">
                  {new Date(purchase.created_at).toLocaleString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  purchaseStatusClassName(purchase.status),
                )}
              >
                {purchaseStatusLabel(purchase.status)}
              </span>
            </div>

            <ul className="space-y-1 text-sm text-zinc-700">
              {items.map((item) => (
                <li key={item.id}>
                  {item.quantity}× {item.products?.name ?? "Product"}
                </li>
              ))}
            </ul>

            <p className="text-sm font-medium text-zinc-900">
              Total{" "}
              {formatPurchaseTotal(
                purchase.total_amount,
                items.map((item) => item.products?.currency),
              )}
            </p>

            {purchase.status === "pending" ? (
              <CancelButton purchaseId={purchase.id} />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
