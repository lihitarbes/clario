/** Maps appointment-related database errors to user-facing messages. */
export function mapAppointmentError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("duplicate key")) {
    return "This appointment conflicts with an existing booking.";
  }

  return "Something went wrong. Please try again.";
}
