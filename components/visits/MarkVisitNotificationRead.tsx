"use client";

import { useEffect, useRef } from "react";
import { markVisitPublishedNotificationReadAction } from "@/actions/notifications";

type MarkVisitNotificationReadProps = {
  visitId: string;
};

/**
 * Marks unread visit_published notifications for this visit as read after mount.
 * Failures are ignored so visit content is never blocked.
 */
export function MarkVisitNotificationRead({
  visitId,
}: MarkVisitNotificationReadProps) {
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;
    void markVisitPublishedNotificationReadAction(visitId);
  }, [visitId]);

  return null;
}
