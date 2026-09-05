import type { AppointmentStatus } from "@/types/database";

export function formatTimeDisplay(time: string): string {
  return time.slice(0, 5);
}

export function formatAppointmentDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatAppointmentTimeRange(
  startIso: string,
  endIso: string,
): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const datePart = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeFmt: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  };
  return `${datePart}, ${start.toLocaleTimeString(undefined, timeFmt)} – ${end.toLocaleTimeString(undefined, timeFmt)}`;
}

export function appointmentStatusLabel(status: AppointmentStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "scheduled":
      return "Booked";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
  }
}

/** Compact calendar-card label (same wording as badges for consistency). */
export function appointmentCalendarStatusLabel(
  status: AppointmentStatus,
): string {
  return appointmentStatusLabel(status);
}

export function appointmentStatusClassName(status: AppointmentStatus): string {
  switch (status) {
    case "pending":
      return "bg-amber-50 text-amber-900 border-amber-300";
    case "scheduled":
      return "bg-blue-50 text-blue-900 border-blue-300";
    case "completed":
      return "bg-green-50 text-green-900 border-green-300";
    case "cancelled":
      return "bg-red-50 text-red-800 border-red-200";
  }
}

export const availabilityCalendarClassName =
  "border border-dashed border-emerald-200/80 bg-emerald-50/50 text-emerald-900/80";


export function computeDurationMinutes(
  startIso: string,
  endIso: string,
): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return Math.round((end - start) / 60_000);
}
