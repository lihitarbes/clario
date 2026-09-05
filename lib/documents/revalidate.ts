import { revalidatePath } from "next/cache";

export function revalidateDocumentPaths(
  clientId: string,
  visitId?: string | null,
) {
  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/documents`);
  revalidatePath("/clients");
  if (visitId) {
    revalidatePath(`/calendar/visits/${visitId}`);
  }
}
