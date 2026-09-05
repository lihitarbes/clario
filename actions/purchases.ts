"use server";

import { getLinkedClients } from "@/lib/auth/permissions";
import { requireBusinessOwnerContext } from "@/lib/auth/require-business-owner";
import {
  toProductPriceNumber,
  canOwnerTransitionPurchaseStatus,
} from "@/lib/products/display";
import { revalidatePurchasePaths } from "@/lib/products/revalidate";
import {
  createPurchaseSchema,
  parsePurchaseItemsJson,
  purchaseIdSchema,
  purchaseStatusSchema,
} from "@/lib/validation/purchases";
import { createClient } from "@/lib/supabase/server";
import { actionError, actionSuccess, type ActionResult } from "@/types/actions";
import { redirect } from "next/navigation";

type PurchaseActionState = ActionResult<{ message?: string }> | null;

export async function createClientPurchaseAction(
  _prevState: PurchaseActionState,
  formData: FormData,
): Promise<PurchaseActionState> {
  const parsed = createPurchaseSchema.safeParse({
    businessId: formData.get("businessId"),
    clientId: formData.get("clientId"),
    itemsJson: formData.get("itemsJson"),
  });

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid order.");
  }

  const itemsParsed = parsePurchaseItemsJson(parsed.data.itemsJson);
  if (!itemsParsed.success) {
    return actionError(itemsParsed.error.issues[0]?.message ?? "Invalid items.");
  }

  const linkedClients = await getLinkedClients();
  const client = linkedClients.find((row) => row.id === parsed.data.clientId);
  if (!client) {
    return actionError("You are not linked to this client record.");
  }

  if (client.business_id !== parsed.data.businessId) {
    return actionError("This order does not match your linked business.");
  }

  const supabase = await createClient();
  const productIds = itemsParsed.data.map((item) => item.productId);

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, business_id, price, is_active, name")
    .in("id", productIds)
    .eq("business_id", parsed.data.businessId)
    .eq("is_active", true);

  if (productsError) {
    return actionError(productsError.message);
  }

  if (!products || products.length !== productIds.length) {
    return actionError("One or more products are unavailable.");
  }

  const productById = new Map(products.map((product) => [product.id, product]));
  let total = 0;
  const lineItems: {
    product_id: string;
    quantity: number;
    unit_price: number;
  }[] = [];

  for (const item of itemsParsed.data) {
    const product = productById.get(item.productId);
    if (!product) {
      return actionError("One or more products are unavailable.");
    }
    const unitPrice = toProductPriceNumber(product.price);
    total += unitPrice * item.quantity;
    lineItems.push({
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: unitPrice,
    });
  }

  const purchaseId = crypto.randomUUID();
  const { error: purchaseError } = await supabase.from("purchases").insert({
    id: purchaseId,
    business_id: parsed.data.businessId,
    client_id: parsed.data.clientId,
    status: "pending",
    total_amount: Number(total.toFixed(2)),
  });

  if (purchaseError) {
    return actionError(purchaseError.message);
  }

  const { error: itemsError } = await supabase.from("purchase_items").insert(
    lineItems.map((item) => ({
      id: crypto.randomUUID(),
      purchase_id: purchaseId,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
    })),
  );

  if (itemsError) {
    await supabase
      .from("purchases")
      .update({ status: "cancelled" })
      .eq("id", purchaseId)
      .eq("client_id", parsed.data.clientId);
    return actionError(itemsError.message);
  }

  revalidatePurchasePaths();
  redirect("/shop?ordered=1");
}

export async function updateOwnerPurchaseStatusAction(
  _prevState: PurchaseActionState,
  formData: FormData,
): Promise<PurchaseActionState> {
  const auth = await requireBusinessOwnerContext();
  if (!auth.ok) {
    return actionError(auth.error);
  }

  const parsedId = purchaseIdSchema.safeParse(formData.get("purchaseId"));
  const parsedStatus = purchaseStatusSchema.safeParse(formData.get("status"));

  if (!parsedId.success || !parsedStatus.success) {
    return actionError("Invalid purchase update.");
  }

  if (parsedStatus.data === "pending") {
    return actionError("Invalid status.");
  }

  const { supabase, business } = auth.ctx;

  const { data: purchase } = await supabase
    .from("purchases")
    .select("id, status")
    .eq("id", parsedId.data)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!purchase) {
    return actionError("Purchase not found.");
  }

  if (
    !canOwnerTransitionPurchaseStatus(purchase.status, parsedStatus.data)
  ) {
    return actionError("That status change is not allowed.");
  }

  const { error } = await supabase
    .from("purchases")
    .update({ status: parsedStatus.data })
    .eq("id", parsedId.data)
    .eq("business_id", business.id)
    .eq("status", purchase.status);

  if (error) {
    return actionError(error.message);
  }

  revalidatePurchasePaths();

  const message =
    parsedStatus.data === "confirmed"
      ? "Purchase confirmed."
      : parsedStatus.data === "completed"
        ? "Purchase marked as completed."
        : "Purchase cancelled.";

  return actionSuccess({ message });
}

export async function cancelClientPurchaseAction(
  _prevState: PurchaseActionState,
  formData: FormData,
): Promise<PurchaseActionState> {
  const parsedId = purchaseIdSchema.safeParse(formData.get("purchaseId"));
  if (!parsedId.success) {
    return actionError(parsedId.error.issues[0]?.message ?? "Invalid purchase.");
  }

  const linkedClients = await getLinkedClients();
  const linkedIds = linkedClients.map((client) => client.id);
  if (linkedIds.length === 0) {
    return actionError("No linked client record found.");
  }

  const supabase = await createClient();
  const { data: purchase } = await supabase
    .from("purchases")
    .select("id, status, client_id")
    .eq("id", parsedId.data)
    .in("client_id", linkedIds)
    .maybeSingle();

  if (!purchase) {
    return actionError("Purchase not found.");
  }

  if (purchase.status !== "pending") {
    return actionError("Only pending purchases can be cancelled.");
  }

  const { error } = await supabase
    .from("purchases")
    .update({ status: "cancelled" })
    .eq("id", parsedId.data)
    .eq("client_id", purchase.client_id)
    .eq("status", "pending");

  if (error) {
    return actionError(error.message);
  }

  revalidatePurchasePaths();
  return actionSuccess({ message: "Purchase cancelled." });
}
