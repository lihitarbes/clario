import { revalidatePath } from "next/cache";

const AUTHENTICATED_LAYOUT_PATHS = [
  "/dashboard",
  "/clients",
  "/calendar",
  "/products",
  "/forms",
  "/settings",
  "/home",
  "/appointments",
  "/visits",
  "/shop",
  "/my-forms",
  "/profile",
] as const;

/** Revalidate layouts that render the notification bell. */
export function revalidateNotificationLayouts() {
  for (const path of AUTHENTICATED_LAYOUT_PATHS) {
    revalidatePath(path, "layout");
  }
}
