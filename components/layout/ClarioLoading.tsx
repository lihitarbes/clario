import { Loader2 } from "lucide-react";

/** Compact branded loading state for route transitions. */
export function ClarioLoading() {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <Loader2
        className="size-6 animate-spin text-zinc-500"
        aria-hidden
      />
      <p className="text-sm font-semibold tracking-tight text-zinc-800">
        Clario
      </p>
    </div>
  );
}
