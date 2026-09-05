import { redirect } from "next/navigation";
import type { BuyAgainDisplayItem } from "@/components/shop/BuyAgainSection";
import type { ClientPurchaseListItem } from "@/components/shop/ClientPurchaseList";
import { ShopCatalog } from "@/components/shop/ShopCatalog";
import type { ShopBusinessGroup, ShopProduct } from "@/components/shop/ShopCatalog";
import { getCurrentProfile, getLinkedClients } from "@/lib/auth/permissions";
import {
  BUY_AGAIN_PURCHASE_STATUSES,
  buildBuyAgainItems,
  type BuyAgainPurchaseRow,
} from "@/lib/products/buy-again";
import { signProductImagePaths } from "@/lib/products/storage";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ClientShopPage({
  searchParams,
}: PageProps<"/shop">) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  const linkedClients = await getLinkedClients();
  const {
    ordered,
    product: focusProductParam,
    orders: ordersParam,
    purchase: focusPurchaseParam,
  } = await searchParams;
  const showOrderedMessage = ordered === "1";
  const openOrdersInitially = ordersParam === "1";
  const focusProductId =
    typeof focusProductParam === "string" && focusProductParam.length > 0
      ? focusProductParam
      : null;
  const focusPurchaseId =
    typeof focusPurchaseParam === "string" && focusPurchaseParam.length > 0
      ? focusPurchaseParam
      : null;

  if (linkedClients.length === 0) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Shop</h1>
        <p className="text-sm text-zinc-600">
          No linked client records found for your account yet.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const businessIds = [...new Set(linkedClients.map((client) => client.business_id))];
  const linkedIds = linkedClients.map((client) => client.id);

  const [
    businessesResult,
    productsResult,
    purchasesResult,
    buyAgainPurchasesResult,
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, name")
      .in("id", businessIds),
    supabase
      .from("products")
      .select("*")
      .in("business_id", businessIds)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("purchases")
      .select(
        "id, status, total_amount, created_at, businesses(name), purchase_items(id, quantity, unit_price, products(name, currency))",
      )
      .in("client_id", linkedIds)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("purchases")
      .select(
        "id, status, created_at, business_id, client_id, businesses(name), purchase_items(product_id, quantity, products(id, name, price, currency, is_active, business_id, image_path))",
      )
      .in("client_id", linkedIds)
      .in("status", BUY_AGAIN_PURCHASE_STATUSES)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const businessNameById = new Map(
    (businessesResult.data ?? []).map((business) => [business.id, business.name]),
  );

  const clientByBusinessId = new Map(
    linkedClients.map((client) => [client.business_id, client.id]),
  );

  const products = (productsResult.data ?? []) as Product[];
  const imageUrls = productsResult.error
    ? new Map<string, string | null>()
    : await signProductImagePaths(supabase, products);

  const productsByBusiness = new Map<string, ShopProduct[]>();
  for (const product of products) {
    const list = productsByBusiness.get(product.business_id) ?? [];
    list.push({
      ...product,
      imageUrl: imageUrls.get(product.id) ?? null,
    });
    productsByBusiness.set(product.business_id, list);
  }

  const groups: ShopBusinessGroup[] = businessIds
    .map((businessId) => {
      const clientId = clientByBusinessId.get(businessId);
      if (!clientId) {
        return null;
      }
      return {
        businessId,
        businessName: businessNameById.get(businessId) ?? "Business",
        clientId,
        products: productsByBusiness.get(businessId) ?? [],
      };
    })
    .filter((group): group is ShopBusinessGroup => Boolean(group))
    .filter((group) => group.products.length > 0);

  const buyAgainItems = buyAgainPurchasesResult.error
    ? []
    : buildBuyAgainItems(
        (buyAgainPurchasesResult.data ?? []) as BuyAgainPurchaseRow[],
      );

  const buyAgainImageUrls =
    buyAgainItems.length === 0
      ? new Map<string, string | null>()
      : await signProductImagePaths(
          supabase,
          buyAgainItems.map((item) => ({
            id: item.productId,
            image_path: item.imagePath,
          })),
        );

  const buyAgainDisplay: BuyAgainDisplayItem[] = buyAgainItems.map((item) => ({
    productId: item.productId,
    businessId: item.businessId,
    clientId: item.clientId,
    businessName: item.businessName,
    name: item.name,
    price: item.price,
    currency: item.currency,
    imageUrl: buyAgainImageUrls.get(item.productId) ?? null,
    lastPurchasedAt: item.lastPurchasedAt,
  }));

  const purchases = (purchasesResult.data ?? []) as ClientPurchaseListItem[];
  const purchasesError = purchasesResult.error
    ? "Could not load your orders. Please try again."
    : null;

  if (productsResult.error || businessesResult.error) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Shop</h1>
        <p
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          Could not load the shop. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <ShopCatalog
        groups={groups}
        buyAgainItems={
          buyAgainPurchasesResult.error ? [] : buyAgainDisplay
        }
        purchases={purchases}
        purchasesError={purchasesError}
        focusProductId={focusProductId}
        focusPurchaseId={focusPurchaseId}
        openOrdersInitially={openOrdersInitially}
        showOrderedMessage={showOrderedMessage}
      />
    </div>
  );
}
