"use server";

import { requireBusinessOwnerContext } from "@/lib/auth/require-business-owner";
import { revalidateDocumentPaths } from "@/lib/documents/revalidate";
import {
  DOCUMENTS_BUCKET,
  buildDocumentStorageFileName,
  buildDocumentStoragePath,
  validateDocumentFile,
} from "@/lib/documents/storage";
import {
  documentIdSchema,
  uploadDocumentSchema,
} from "@/lib/validation/documents";
import { createClient } from "@/lib/supabase/server";
import { actionError, actionSuccess, type ActionResult } from "@/types/actions";

type DocumentActionState = ActionResult<{ message?: string }> | null;
type AppSupabase = Awaited<ReturnType<typeof createClient>>;

function getUploadFile(formData: FormData): File | null {
  const value = formData.get("file");
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }
  return value;
}

async function assertVisitForClient(params: {
  supabase: AppSupabase;
  visitId: string;
  clientId: string;
  businessId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: visit, error } = await params.supabase
    .from("visits")
    .select("id, client_id, appointments!inner(business_id)")
    .eq("id", params.visitId)
    .eq("client_id", params.clientId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!visit) {
    return { ok: false, error: "Selected visit was not found for this client." };
  }

  const row = visit as unknown as {
    id: string;
    client_id: string;
    appointments: { business_id: string } | { business_id: string }[] | null;
  };

  const appointment = row.appointments;
  const businessId = Array.isArray(appointment)
    ? appointment[0]?.business_id
    : appointment?.business_id;

  if (businessId !== params.businessId) {
    return {
      ok: false,
      error: "Selected visit does not belong to your business.",
    };
  }

  return { ok: true };
}

export async function uploadClientDocumentAction(
  _prevState: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const auth = await requireBusinessOwnerContext();
  if (!auth.ok) {
    return actionError(auth.error);
  }

  const visitRaw = String(formData.get("visitId") ?? "").trim();
  const parsed = uploadDocumentSchema.safeParse({
    clientId: formData.get("clientId"),
    type: formData.get("type"),
    visitId: visitRaw.length > 0 ? visitRaw : undefined,
  });

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const file = getUploadFile(formData);
  if (!file) {
    return actionError("Choose a file to upload.");
  }

  const fileError = validateDocumentFile(file);
  if (fileError) {
    return actionError(fileError);
  }

  const storageFileName = buildDocumentStorageFileName(file.type);
  if (!storageFileName) {
    return actionError("Use a PDF, JPG, PNG, WebP, or plain text file.");
  }

  const { supabase, business } = auth.ctx;

  const { data: client } = await supabase
    .from("clients")
    .select("id, business_id")
    .eq("id", parsed.data.clientId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!client) {
    return actionError("Client not found.");
  }

  const visitId = parsed.data.visitId ?? null;
  if (visitId) {
    const visitCheck = await assertVisitForClient({
      supabase,
      visitId,
      clientId: client.id,
      businessId: business.id,
    });
    if (!visitCheck.ok) {
      return actionError(visitCheck.error);
    }
  }

  const documentId = crypto.randomUUID();
  const filePath = buildDocumentStoragePath({
    businessId: business.id,
    clientId: client.id,
    documentId,
    storageFileName,
  });

  const displayName =
    file.name.trim().length > 0
      ? file.name.trim().slice(0, 200)
      : storageFileName;

  const { error: insertError } = await supabase.from("documents").insert({
    id: documentId,
    client_id: client.id,
    visit_id: visitId,
    type: parsed.data.type,
    file_path: filePath,
    file_name: displayName,
    mime_type: file.type,
  });

  if (insertError) {
    return actionError(insertError.message);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    await supabase
      .from("documents")
      .delete()
      .eq("id", documentId)
      .eq("client_id", client.id);
    return actionError(`Upload failed: ${uploadError.message}`);
  }

  revalidateDocumentPaths(client.id, visitId);
  return actionSuccess({ message: "Document uploaded." });
}

export async function deleteClientDocumentAction(
  _prevState: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const auth = await requireBusinessOwnerContext();
  if (!auth.ok) {
    return actionError(auth.error);
  }

  const parsedId = documentIdSchema.safeParse(formData.get("documentId"));
  if (!parsedId.success) {
    return actionError(parsedId.error.issues[0]?.message ?? "Invalid document.");
  }

  const { supabase, business } = auth.ctx;

  const { data: document } = await supabase
    .from("documents")
    .select("id, client_id, visit_id, file_path, clients!inner(business_id)")
    .eq("id", parsedId.data)
    .maybeSingle();

  if (!document) {
    return actionError("Document not found.");
  }

  const row = document as unknown as {
    id: string;
    client_id: string;
    visit_id: string | null;
    file_path: string;
    clients: { business_id: string } | { business_id: string }[] | null;
  };

  const clients = row.clients;
  const documentBusinessId = Array.isArray(clients)
    ? clients[0]?.business_id
    : clients?.business_id;

  if (documentBusinessId !== business.id) {
    return actionError("Document not found.");
  }

  const { error: deleteError } = await supabase
    .from("documents")
    .delete()
    .eq("id", row.id)
    .eq("client_id", row.client_id);

  if (deleteError) {
    return actionError(deleteError.message);
  }

  await supabase.storage.from(DOCUMENTS_BUCKET).remove([row.file_path]);

  revalidateDocumentPaths(row.client_id, row.visit_id);
  return actionSuccess({ message: "Document deleted." });
}
