export function mapCompleteAppointmentRpcError(error: {
  message?: string;
  code?: string;
  details?: string;
}): string {
  const message = error.message?.toLowerCase() ?? "";
  const code = error.code ?? "";

  if (
    message.includes("invalid_status") ||
    code === "P0001" ||
    message.includes("p0001")
  ) {
    return "Only scheduled appointments can be completed.";
  }

  if (
    message.includes("appointment_not_found") ||
    code === "P0002" ||
    message.includes("p0002")
  ) {
    return "Appointment not found.";
  }

  if (
    message.includes("not_authorized") ||
    code === "42501" ||
    message.includes("42501")
  ) {
    return "You are not authorized to complete this appointment.";
  }

  if (
    message.includes("visit_create_failed") ||
    code === "P0003" ||
    message.includes("p0003")
  ) {
    return "Unable to create visit record.";
  }

  return "Something went wrong. Please try again.";
}
