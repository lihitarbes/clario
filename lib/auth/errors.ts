/** Maps Supabase Auth errors to safe user-facing messages. */
export function mapAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid email or password")
  ) {
    return "Incorrect email or password.";
  }

  if (normalized.includes("user already registered")) {
    return "An account with this email already exists. Try logging in instead.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Please confirm your email address before logging in.";
  }

  if (
    normalized.includes("password") &&
    normalized.includes("weak")
  ) {
    return "Choose a stronger password (at least 8 characters).";
  }

  if (normalized.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (normalized.includes("signup is disabled")) {
    return "Sign up is currently unavailable. Please contact support.";
  }

  return "Something went wrong. Please try again.";
}

/** Maps generic database errors to safe user-facing messages. */
export function mapDatabaseError(message: string): string {
  if (message.includes("businesses_owner_id_key")) {
    return "You already have a business workspace.";
  }

  return "Something went wrong. Please try again.";
}
