/** Public routes that do not require authentication. */
export const PUBLIC_ROUTES = ["/", "/login", "/signup"] as const;

/** Business-owner routes (authentication required; role checked in server layer). */
export const BUSINESS_ROUTE_PREFIXES = [
  "/dashboard",
  "/clients",
  "/calendar",
  "/products",
  "/forms",
  "/settings",
] as const;

/** Client routes (authentication required; role checked in server layer). */
export const CLIENT_ROUTE_PREFIXES = [
  "/home",
  "/appointments",
  "/visits",
  "/shop",
  "/my-forms",
  "/profile",
] as const;

export const AUTH_ROUTE_PREFIXES = ["/login", "/signup"] as const;

export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTE_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function isBusinessRoute(pathname: string): boolean {
  return BUSINESS_ROUTE_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function isClientRoute(pathname: string): boolean {
  return CLIENT_ROUTE_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function isProtectedRoute(pathname: string): boolean {
  return isBusinessRoute(pathname) || isClientRoute(pathname);
}
