import type { NotificationType } from "@/types/database";

export type NotificationViewerRole = "business_owner" | "client";

/** Deep-link path for a notification, when one can be derived. */
export function notificationHref(
  notification: {
    type: NotificationType;
    form_assignment_id: string | null;
    client_id: string | null;
    appointment_id: string | null;
    purchase_id: string | null;
    visit_id: string | null;
  },
  viewerRole?: NotificationViewerRole,
): string | null {
  switch (notification.type) {
    case "form_assigned":
    case "form_update_requested":
      return notification.form_assignment_id
        ? `/my-forms/${notification.form_assignment_id}`
        : "/my-forms";

    case "form_submitted":
      if (notification.client_id && notification.form_assignment_id) {
        return `/clients/${notification.client_id}/forms/${notification.form_assignment_id}`;
      }
      return notification.client_id
        ? `/clients/${notification.client_id}`
        : "/clients";

    case "appointment_request":
    case "appointment_cancelled_by_client":
      return notification.appointment_id
        ? `/calendar/${notification.appointment_id}`
        : "/calendar";

    case "appointment_approved":
    case "appointment_declined":
      return "/appointments";

    case "purchase_requested":
      return notification.purchase_id
        ? `/products?purchase=${notification.purchase_id}`
        : "/products";

    case "purchase_confirmed":
    case "purchase_completed":
      return notification.purchase_id
        ? `/shop?orders=1&purchase=${notification.purchase_id}`
        : "/shop?orders=1";

    case "purchase_cancelled":
      if (viewerRole === "business_owner") {
        return notification.purchase_id
          ? `/products?purchase=${notification.purchase_id}`
          : "/products";
      }
      return notification.purchase_id
        ? `/shop?orders=1&purchase=${notification.purchase_id}`
        : "/shop?orders=1";

    case "visit_published":
      return notification.visit_id
        ? `/visits/${notification.visit_id}`
        : "/visits";

    default:
      return null;
  }
}
