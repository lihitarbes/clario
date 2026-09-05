"use client";

import { ClientPurchaseList } from "@/components/shop/ClientPurchaseList";
import type { ClientPurchaseListItem } from "@/components/shop/ClientPurchaseList";
import { ShopDrawer } from "@/components/shop/ShopDrawer";

type ShopOrdersPanelProps = {
  open: boolean;
  onClose: () => void;
  purchases: ClientPurchaseListItem[];
  loadError?: string | null;
  focusPurchaseId?: string | null;
};

export function ShopOrdersPanel({
  open,
  onClose,
  purchases,
  loadError = null,
  focusPurchaseId = null,
}: ShopOrdersPanelProps) {
  return (
    <ShopDrawer
      open={open}
      onClose={onClose}
      title="My Orders"
      description="Your purchase requests and order history."
      label="My orders"
    >
      {loadError ? (
        <p className="text-sm text-red-600" role="alert">
          {loadError}
        </p>
      ) : (
        <ClientPurchaseList
          purchases={purchases}
          focusPurchaseId={open ? focusPurchaseId : null}
        />
      )}
    </ShopDrawer>
  );
}
