"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { updateOwnerPurchaseStatusAction } from "@/actions/purchases";
import { ActionPendingLabel } from "@/components/ui/action-pending-label";
import { Button } from "@/components/ui/button";
import {
  formatProductPrice,
  formatPurchaseTotal,
  purchaseStatusClassName,
  purchaseStatusLabel,
  sharedProductCurrency,
} from "@/lib/products/display";
import { buildWhatsAppPurchaseUrl } from "@/lib/products/whatsapp";
import { cn } from "@/lib/utils";
import type { PurchaseStatus } from "@/types/database";

export type OwnerPurchaseListItem = {
  id: string;
  status: PurchaseStatus;
  total_amount: number | string;
  created_at: string;
  clients: {
    full_name: string;
    email: string;
    phone: string | null;
  } | null;
  purchase_items:
    | {
        id: string;
        quantity: number;
        unit_price: number | string;
        products: { name: string; currency?: string | null } | null;
      }[]
    | null;
};

type OwnerPurchaseListProps = {
  purchases: OwnerPurchaseListItem[];
  focusPurchaseId?: string | null;
};

function PurchaseStatusSubmitButton({
  idleLabel,
  pendingLabel,
  variant = "default",
}: {
  idleLabel: string;
  pendingLabel: string;
  variant?: "default" | "outline";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant={variant} disabled={pending}>
      <ActionPendingLabel
        pending={pending}
        pendingLabel={pendingLabel}
        idleLabel={idleLabel}
      />
    </Button>
  );
}

function PurchaseActions({
  purchaseId,
  status,
}: {
  purchaseId: string;
  status: PurchaseStatus;
}) {
  const [state, action] = useActionState(
    updateOwnerPurchaseStatusAction,
    null,
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === "pending" ? (
          <>
            <form action={action}>
              <input type="hidden" name="purchaseId" value={purchaseId} />
              <input type="hidden" name="status" value="confirmed" />
              <PurchaseStatusSubmitButton
                idleLabel="Confirm"
                pendingLabel="Confirming…"
              />
            </form>
            <form action={action}>
              <input type="hidden" name="purchaseId" value={purchaseId} />
              <input type="hidden" name="status" value="cancelled" />
              <PurchaseStatusSubmitButton
                idleLabel="Cancel"
                pendingLabel="Cancelling…"
                variant="outline"
              />
            </form>
          </>
        ) : null}
        {status === "confirmed" ? (
          <>
            <form action={action}>
              <input type="hidden" name="purchaseId" value={purchaseId} />
              <input type="hidden" name="status" value="completed" />
              <PurchaseStatusSubmitButton
                idleLabel="Mark as completed"
                pendingLabel="Updating…"
              />
            </form>
            <form action={action}>
              <input type="hidden" name="purchaseId" value={purchaseId} />
              <input type="hidden" name="status" value="cancelled" />
              <PurchaseStatusSubmitButton
                idleLabel="Cancel"
                pendingLabel="Cancelling…"
                variant="outline"
              />
            </form>
          </>
        ) : null}
      </div>
      {state && !state.success ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="text-sm text-green-700" role="status">
          {state.data?.message}
        </p>
      ) : null}
    </div>
  );
}

function WhatsAppContact({
  purchase,
}: {
  purchase: OwnerPurchaseListItem;
}) {
  const clientName = purchase.clients?.full_name ?? "there";
  const currency = sharedProductCurrency(
    (purchase.purchase_items ?? []).map((item) => item.products?.currency),
  );
  const href = buildWhatsAppPurchaseUrl({
    phone: purchase.clients?.phone,
    clientName,
    totalAmount: purchase.total_amount,
    currency,
    createdAt: purchase.created_at,
  });

  if (href) {
    return (
      <Button asChild variant="outline" size="sm">
        <a href={href} target="_blank" rel="noopener noreferrer">
          Contact on WhatsApp
        </a>
      </Button>
    );
  }

  return (
    <p className="text-sm text-zinc-600">
      This client has no phone number yet. Ask them to add one in their profile.
    </p>
  );
}

export function OwnerPurchaseList({
  purchases,
  focusPurchaseId = null,
}: OwnerPurchaseListProps) {
  useEffect(() => {
    if (!focusPurchaseId) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(`owner-purchase-${focusPurchaseId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusPurchaseId]);

  if (purchases.length === 0) {
    return (
      <p className="text-sm text-zinc-600">No purchase requests yet.</p>
    );
  }

  return (
    <ul className="space-y-4">
      {purchases.map((purchase) => {
        const items = purchase.purchase_items ?? [];
        const showActions =
          purchase.status === "pending" || purchase.status === "confirmed";
        const isFocused = focusPurchaseId === purchase.id;

        return (
          <li
            key={purchase.id}
            id={`owner-purchase-${purchase.id}`}
            className={cn(
              "space-y-3 rounded-md border border-zinc-200 p-4",
              isFocused && "ring-2 ring-zinc-900 ring-offset-2",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-900">
                  {purchase.clients?.full_name ?? "Client"}
                </p>
                <p className="text-sm text-zinc-600">
                  {purchase.clients?.email ?? ""}
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
                  {item.quantity}× {item.products?.name ?? "Product"} —{" "}
                  {formatProductPrice(
                    toUnitTotal(item.unit_price, item.quantity),
                    item.products?.currency,
                  )}
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

            <WhatsAppContact purchase={purchase} />

            {showActions ? (
              <PurchaseActions
                purchaseId={purchase.id}
                status={purchase.status}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function toUnitTotal(unitPrice: number | string, quantity: number): number {
  const unit = typeof unitPrice === "number" ? unitPrice : Number(unitPrice);
  return (Number.isFinite(unit) ? unit : 0) * quantity;
}
