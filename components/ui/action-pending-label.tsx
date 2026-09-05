import { Loader2 } from "lucide-react";

type ActionPendingLabelProps = {
  pending: boolean;
  pendingLabel: string;
  idleLabel: string;
};

/** Compact pending affordance: spinner + clear action label. */
export function ActionPendingLabel({
  pending,
  pendingLabel,
  idleLabel,
}: ActionPendingLabelProps) {
  if (!pending) {
    return <>{idleLabel}</>;
  }

  return (
    <>
      <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
      <span>{pendingLabel}</span>
    </>
  );
}
