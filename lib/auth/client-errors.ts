/** Maps client-related database errors to user-facing messages. */
export function mapClientError(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("clients_business_active_email_unique") ||
    (normalized.includes("duplicate key") && normalized.includes("email"))
  ) {
    return "An active client with this email already exists in your business.";
  }

  return "Something went wrong. Please try again.";
}
