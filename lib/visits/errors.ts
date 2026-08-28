export function mapVisitError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("duplicate key") && normalized.includes("appointment")) {
    return "A visit record already exists for this appointment.";
  }

  return "Something went wrong. Please try again.";
}

export function isUniqueViolation(message: string): boolean {
  return message.toLowerCase().includes("duplicate key");
}
