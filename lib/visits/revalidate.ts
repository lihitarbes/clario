import { revalidatePath } from "next/cache";

export function revalidateVisitPaths(visitId: string, appointmentId?: string) {
  revalidatePath("/calendar");
  revalidatePath("/visits");
  revalidatePath(`/calendar/visits/${visitId}`);
  revalidatePath(`/visits/${visitId}`);
  if (appointmentId) {
    revalidatePath(`/calendar/${appointmentId}`);
  }
}
