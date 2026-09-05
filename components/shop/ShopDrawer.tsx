"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ShopDrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  label: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function ShopDrawer({
  open,
  onClose,
  title,
  description,
  label,
  children,
  footer,
}: ShopDrawerProps) {
  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-zinc-900/30 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!open}
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-xl transition-transform",
          open ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!open}
        aria-label={label}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
            {description ? (
              <p className="text-xs text-zinc-500">{description}</p>
            ) : null}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>

        {footer ? (
          <div className="border-t border-zinc-200 px-4 py-4">{footer}</div>
        ) : null}
      </aside>
    </>
  );
}
