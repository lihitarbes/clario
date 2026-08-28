import { formatAppointmentTimeRange } from "@/lib/appointments/display";

/** Legacy trigger messages embedded UTC ranges in notification text. */
const LEGACY_UTC_TIME_IN_MESSAGE =
  /\s+on\s+\d{4}-\d{2}-\d{2} \d{2}:\d{2}\s+–\s+\d{4}-\d{2}-\d{2} \d{2}:\d{2}\s+UTC/g;

/** Remove preformatted UTC appointment ranges from stored notification messages. */
export function stripLegacyUtcTimeFromMessage(message: string): string {
  return message.replace(LEGACY_UTC_TIME_IN_MESSAGE, "").trim();
}

export function formatNotificationAppointmentTime(
  startIso: string,
  endIso: string,
): string {
  return formatAppointmentTimeRange(startIso, endIso);
}

/** Relative timestamp for notification list items. */
export function formatNotificationTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 0) {
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) {
    return "Just now";
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return `${diffHr}h ago`;
  }

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) {
    return `${diffDay}d ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}
