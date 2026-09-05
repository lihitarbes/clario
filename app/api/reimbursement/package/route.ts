import JSZip from "jszip";
import { NextResponse } from "next/server";
import { requireClientContext } from "@/lib/auth/require-client";
import {
  buildZipEntryFileName,
  reimbursementZipDownloadName,
} from "@/lib/documents/reimbursement";
import { DOCUMENTS_BUCKET } from "@/lib/documents/storage";
import { reimbursementPackageSchema } from "@/lib/validation/reimbursement";
import type { Document } from "@/types/database";

export const runtime = "nodejs";

function unauthorizedResponse() {
  return NextResponse.json(
    { error: "You do not have access to this package." },
    { status: 403 },
  );
}

export async function POST(request: Request) {
  const auth = await requireClientContext();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = reimbursementPackageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const { visitId, documentIds } = parsed.data;
  const uniqueIds = [...new Set(documentIds)];
  if (uniqueIds.length !== documentIds.length) {
    return NextResponse.json(
      { error: "Duplicate document selection is not allowed." },
      { status: 400 },
    );
  }

  const { supabase } = auth.ctx;

  // Published + linked only (client_visits). Draft/unowned visits → not found.
  const { data: visit } = await supabase
    .from("client_visits")
    .select("id, client_id")
    .eq("id", visitId)
    .maybeSingle();

  if (!visit) {
    return unauthorizedResponse();
  }

  const { data: documentsRaw, error: documentsError } = await supabase
    .from("documents")
    .select("id, client_id, visit_id, type, file_name, file_path, mime_type")
    .eq("visit_id", visitId)
    .eq("client_id", visit.client_id)
    .in("id", uniqueIds);

  if (documentsError) {
    return NextResponse.json(
      { error: "Could not prepare the reimbursement package." },
      { status: 500 },
    );
  }

  const documents = (documentsRaw ?? []) as Pick<
    Document,
    | "id"
    | "client_id"
    | "visit_id"
    | "type"
    | "file_name"
    | "file_path"
    | "mime_type"
  >[];

  if (documents.length !== uniqueIds.length) {
    return unauthorizedResponse();
  }

  const byId = new Map(documents.map((document) => [document.id, document]));
  const ordered = uniqueIds.map((id) => byId.get(id)!);

  const zip = new JSZip();
  const usedNames = new Set<string>();

  for (const document of ordered) {
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .download(document.file_path);

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: "Could not download one of the selected files." },
        { status: 500 },
      );
    }

    const entryName = buildZipEntryFileName(document, usedNames);
    const buffer = Buffer.from(await fileData.arrayBuffer());
    zip.file(entryName, buffer);
  }

  const zipBytes = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const filename = reimbursementZipDownloadName();

  return new NextResponse(Buffer.from(zipBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
