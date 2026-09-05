import { describe, expect, it } from "vitest";
import {
  getHomePathForRole,
  getSafeRedirectPath,
} from "@/lib/auth/routing";
import {
  isAuthRoute,
  isBusinessRoute,
  isClientRoute,
  isProtectedRoute,
} from "@/lib/routes";

describe("getHomePathForRole", () => {
  it("sends business owners to the dashboard", () => {
    expect(getHomePathForRole("business_owner")).toBe("/dashboard");
  });

  it("sends clients to home", () => {
    expect(getHomePathForRole("client")).toBe("/home");
  });
});

describe("getSafeRedirectPath", () => {
  it("allows same-role business redirects", () => {
    expect(getSafeRedirectPath("/calendar/new", "business_owner")).toBe(
      "/calendar/new",
    );
  });

  it("allows same-role client redirects", () => {
    expect(getSafeRedirectPath("/appointments/book", "client")).toBe(
      "/appointments/book",
    );
  });

  it("rejects cross-role redirects", () => {
    expect(getSafeRedirectPath("/dashboard", "client")).toBe("/home");
    expect(getSafeRedirectPath("/shop", "business_owner")).toBe("/dashboard");
  });

  it("rejects protocol-relative and missing paths", () => {
    expect(getSafeRedirectPath("//evil.example", "client")).toBe("/home");
    expect(getSafeRedirectPath(null, "business_owner")).toBe("/dashboard");
    expect(getSafeRedirectPath("https://evil.example", "client")).toBe("/home");
  });
});

describe("route classification", () => {
  it("classifies business, client, auth, and protected routes", () => {
    expect(isBusinessRoute("/clients/abc")).toBe(true);
    expect(isClientRoute("/visits/abc")).toBe(true);
    expect(isAuthRoute("/login")).toBe(true);
    expect(isProtectedRoute("/forms")).toBe(true);
    expect(isProtectedRoute("/")).toBe(false);
    expect(isBusinessRoute("/home")).toBe(false);
    expect(isClientRoute("/dashboard")).toBe(false);
  });
});
