import { revalidatePath } from "next/cache";

export function revalidateFormPaths(formId?: string) {
  revalidatePath("/forms");
  revalidatePath("/my-forms");
  if (formId) {
    revalidatePath(`/forms/${formId}`);
  }
}

export function revalidateClientFormPaths(clientId: string) {
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/my-forms");
}
