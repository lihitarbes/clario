import type { UserRole } from "@/types/database";

export function roleLabel(role: UserRole): string {
  switch (role) {
    case "business_owner":
      return "Business Owner";
    case "client":
      return "Client";
  }
}

/** First letters of full name for avatar placeholder (max 2 chars). */
export function profileInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
