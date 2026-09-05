export function mapSubmitFormRpcError(error: {
  message?: string;
  code?: string;
}): string {
  const message = error.message?.toLowerCase() ?? "";
  const code = error.code ?? "";

  if (
    message.includes("assignment_not_pending") ||
    message.includes("invalid_assignment")
  ) {
    return "This form is no longer available to submit.";
  }

  if (message.includes("assignment_not_found") || code === "P0002") {
    return "Form assignment not found.";
  }

  if (
    message.includes("not_authorized") ||
    code === "42501"
  ) {
    return "You are not authorized to submit this form.";
  }

  if (message.includes("form_archived")) {
    return "This form template is no longer available.";
  }

  if (message.includes("invalid_answers")) {
    return "Invalid form answers.";
  }

  if (message.includes("duplicate key") || message.includes("unique")) {
    return "This form has already been submitted.";
  }

  return "Something went wrong. Please try again.";
}

export function mapAssignFormError(message: string): string {
  if (
    message.includes("form_assignments_one_pending_per_form_client") ||
    message.includes("duplicate key")
  ) {
    return "This form is already waiting for this client.";
  }

  return message;
}
