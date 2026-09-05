"use client";

import { useState } from "react";
import { AvailabilitySettings } from "@/components/availability/AvailabilitySettings";
import { Button } from "@/components/ui/button";
import type { BusinessAvailability } from "@/types/database";

type CollapsibleAvailabilityEditorProps = {
  slots: BusinessAvailability[];
};

export function CollapsibleAvailabilityEditor({
  slots,
}: CollapsibleAvailabilityEditorProps) {
  const [open, setOpen] = useState(false);
  const weeklyCount = slots.filter(
    (slot) => slot.specific_date == null && slot.day_of_week != null,
  ).length;
  const dateCount = slots.filter((slot) => Boolean(slot.specific_date)).length;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-zinc-900">Bookable slots</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Appointment slots clients can book. They appear on the calendar
            above.
            {weeklyCount === 0 && dateCount === 0
              ? " No slots opened yet."
              : ` ${weeklyCount} recurring · ${dateCount} one-time.`}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Hide editor" : "Manage slots"}
        </Button>
      </div>

      {open ? <AvailabilitySettings slots={slots} /> : null}
    </section>
  );
}
