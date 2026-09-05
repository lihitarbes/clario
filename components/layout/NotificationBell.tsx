"use client";

import Link from "next/link";
import { useActionState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/actions/notifications";
import { ActionPendingLabel } from "@/components/ui/action-pending-label";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  formatNotificationAppointmentTime,
  formatNotificationTimestamp,
  stripLegacyUtcTimeFromMessage,
} from "@/lib/notifications/display";
import { notificationHref } from "@/lib/notifications/links";
import type { NotificationViewerRole } from "@/lib/notifications/links";
import type { NotificationWithAppointment } from "@/lib/notifications/queries";
import { cn } from "@/lib/utils";
import { Bell } from "lucide-react";

type NotificationBellProps = {
  notifications: NotificationWithAppointment[];
  unreadCount: number;
  viewerRole: NotificationViewerRole;
};

function OpenNotificationButton({
  href,
  notificationId,
  isUnread,
}: {
  href: string;
  notificationId: string;
  isUnread: boolean;
}) {
  const [, startTransition] = useTransition();

  return (
    <Button asChild variant="outline" size="sm">
      <Link
        href={href}
        onClick={() => {
          if (!isUnread) {
            return;
          }
          startTransition(() => {
            const formData = new FormData();
            formData.set("notificationId", notificationId);
            void markNotificationReadAction(null, formData);
          });
        }}
      >
        Open
      </Link>
    </Button>
  );
}

function MarkAllReadSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="ghost"
      size="sm"
      className="h-8 px-2 text-xs"
      disabled={pending}
    >
      <ActionPendingLabel
        pending={pending}
        pendingLabel="Marking…"
        idleLabel="Mark all as read"
      />
    </Button>
  );
}

function NotificationItem({
  notification,
  viewerRole,
}: {
  notification: NotificationWithAppointment;
  viewerRole: NotificationViewerRole;
}) {
  const isUnread = notification.read_at === null;
  const [state, action, pending] = useActionState(markNotificationReadAction, null);
  const messageText = stripLegacyUtcTimeFromMessage(notification.message);
  const appointmentTime =
    notification.appointments?.start_time && notification.appointments?.end_time
      ? formatNotificationAppointmentTime(
          notification.appointments.start_time,
          notification.appointments.end_time,
        )
      : null;
  const href = notificationHref(notification, viewerRole);

  return (
    <div
      className={cn(
        "border-b border-zinc-100 px-3 py-3 last:border-b-0",
        isUnread ? "bg-zinc-50" : "bg-white",
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "mt-1.5 h-2 w-2 shrink-0 rounded-full",
            isUnread ? "bg-zinc-900" : "bg-transparent",
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm",
              isUnread ? "font-semibold text-zinc-900" : "font-medium text-zinc-700",
            )}
          >
            {notification.title}
          </p>
          <p className="mt-0.5 text-sm text-zinc-600">{messageText}</p>
          {appointmentTime ? (
            <p className="mt-0.5 text-sm text-zinc-600">{appointmentTime}</p>
          ) : null}
          <p className="mt-1 text-xs text-zinc-500">
            {formatNotificationTimestamp(notification.created_at)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {href ? (
              <OpenNotificationButton
                href={href}
                notificationId={notification.id}
                isUnread={isUnread}
              />
            ) : null}
            {isUnread ? (
              <form action={action}>
                <input type="hidden" name="notificationId" value={notification.id} />
                <Button type="submit" variant="ghost" size="sm" disabled={pending}>
                  <ActionPendingLabel
                    pending={pending}
                    pendingLabel="Marking…"
                    idleLabel="Mark as read"
                  />
                </Button>
              </form>
            ) : null}
          </div>
          {state && !state.success ? (
            <p className="mt-1 text-xs text-red-600" role="alert">{state.error}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function NotificationBell({
  notifications,
  unreadCount,
  viewerRole,
}: NotificationBellProps) {
  const badgeLabel =
    unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "relative flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 bg-white",
          "hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
        )}
        aria-label={
          unreadCount > 0
            ? `${unreadCount} unread notifications`
            : "Notifications"
        }
      >
        <Bell className="h-4 w-4 text-zinc-700" aria-hidden />
        {badgeLabel ? (
          <span
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-900 px-1 text-[10px] font-semibold text-white"
          >
            {badgeLabel}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2">
          <p className="text-sm font-semibold text-zinc-900">Notifications</p>
          {unreadCount > 0 ? (
            <form action={markAllNotificationsReadAction}>
              <MarkAllReadSubmitButton />
            </form>
          ) : null}
        </div>
        {notifications.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-zinc-500">
            No notifications yet.
          </p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                viewerRole={viewerRole}
              />
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
