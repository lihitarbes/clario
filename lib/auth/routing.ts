import {
  isBusinessRoute,
  isClientRoute,
} from "@/lib/routes";
import type { UserRole } from "@/types/database";

export function getHomePathForRole(role: UserRole): string {
  return role === "business_owner" ? "/dashboard" : "/home";
}

/**
 * Returns a safe post-login redirect for the user's role.
 * Ignores cross-role or external paths.
 */
export function getSafeRedirectPath(
  requestedPath: string | null | undefined,
  role: UserRole,
): string {
  const home = getHomePathForRole(role);

  if (!requestedPath || !requestedPath.startsWith("/")) {
    return home;
  }

  if (requestedPath.startsWith("//")) {
    return home;
  }

  if (role === "business_owner" && isBusinessRoute(requestedPath)) {
    return requestedPath;
  }

  if (role === "client" && isClientRoute(requestedPath)) {
    return requestedPath;
  }

  return home;
}
