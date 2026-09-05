"use client";

import { useState } from "react";
import type { AppointmentWithBusiness } from "@/actions/appointments";
import { ClientAppointmentCard } from "@/components/appointments/ClientAppointmentCard";
import { Button } from "@/components/ui/button";

type PreviousAppointmentsSectionProps = {
  appointments: AppointmentWithBusiness[];
  showBusinessName: boolean;
};

export function PreviousAppointmentsSection({
  appointments,
  showBusinessName,
}: PreviousAppointmentsSectionProps) {
  const [open, setOpen] = useState(false);

  if (appointments.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-zinc-900">Previous</h2>
        <p className="text-sm text-zinc-600">No previous appointments.</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium text-zinc-900">Previous</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((value) => !value)}
        >
          {open
            ? "Hide previous appointments"
            : `Previous appointments (${appointments.length})`}
        </Button>
      </div>

      {open ? (
        <ul className="space-y-3">
          {appointments.map((appointment) => (
            <ClientAppointmentCard
              key={appointment.id}
              appointment={appointment}
              showBusinessName={showBusinessName}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-600">
          Upcoming appointments stay front and center. Open previous
          appointments when you need history.
        </p>
      )}
    </section>
  );
}
