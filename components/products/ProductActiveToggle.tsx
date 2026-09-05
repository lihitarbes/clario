"use client";

import { useActionState } from "react";
import { setProductActiveAction } from "@/actions/products";
import { ActionPendingLabel } from "@/components/ui/action-pending-label";
import { Button } from "@/components/ui/button";

type ProductActiveToggleProps = {
  productId: string;
  isActive: boolean;
};

export function ProductActiveToggle({
  productId,
  isActive,
}: ProductActiveToggleProps) {
  const [state, action, pending] = useActionState(setProductActiveAction, null);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="isActive" value={isActive ? "false" : "true"} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        <ActionPendingLabel
          pending={pending}
          pendingLabel="Updating…"
          idleLabel={isActive ? "Deactivate" : "Activate"}
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
