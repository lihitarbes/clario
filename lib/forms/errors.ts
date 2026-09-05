export function mapFormError(message: string): string {
  if (message.includes("forms_renewal_interval_months_positive")) {
    return "Renewal interval must be a positive number of months.";
  }

  return message;
}
