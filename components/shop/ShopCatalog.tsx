"use client";

import { useEffect, useMemo, useState } from "react";
import { BuyAgainSection } from "@/components/shop/BuyAgainSection";
import type { BuyAgainDisplayItem } from "@/components/shop/BuyAgainSection";
import type { ClientPurchaseListItem } from "@/components/shop/ClientPurchaseList";
import { ShopCartPanel } from "@/components/shop/ShopCartPanel";
import { ShopOrdersPanel } from "@/components/shop/ShopOrdersPanel";
import { useShopCart } from "@/components/shop/use-shop-cart";
import { ProductImage } from "@/components/products/ProductImage";
import { Button } from "@/components/ui/button";
import { cartItemCount } from "@/lib/shop/cart-storage";
import { formatProductPrice } from "@/lib/products/display";
import type { Product } from "@/types/database";
import { cn } from "@/lib/utils";

export type ShopProduct = Product & {
  imageUrl: string | null;
};

export type ShopBusinessGroup = {
  businessId: string;
  businessName: string;
  clientId: string;
  products: ShopProduct[];
};

type ShopCatalogProps = {
  groups: ShopBusinessGroup[];
  buyAgainItems: BuyAgainDisplayItem[];
  purchases: ClientPurchaseListItem[];
  purchasesError?: string | null;
  focusProductId?: string | null;
  focusPurchaseId?: string | null;
  openOrdersInitially?: boolean;
  showOrderedMessage?: boolean;
};

function initialBusinessId(
  groups: ShopBusinessGroup[],
  focusProductId: string | null | undefined,
) {
  if (focusProductId) {
    const match = groups.find((group) =>
      group.products.some((product) => product.id === focusProductId),
    );
    if (match) {
      return match.businessId;
    }
  }
  return groups[0]?.businessId ?? "";
}

function CatalogProductCard({
  product,
  highlighted,
  onAdd,
}: {
  product: ShopProduct;
  highlighted: boolean;
  onAdd: (product: ShopProduct, quantity: number) => void;
}) {
  const [quantity, setQuantity] = useState(1);

  return (
    <li
      id={`shop-product-${product.id}`}
      className={cn(
        "flex flex-col overflow-hidden rounded-md border border-zinc-200 bg-white",
        highlighted && "ring-2 ring-zinc-900 ring-offset-2",
      )}
    >
      <ProductImage
        src={product.imageUrl}
        alt={product.name}
        size="tile"
        className="rounded-none border-0 border-b border-zinc-200"
      />
      <div className="flex flex-1 flex-col gap-3 p-3">
        <div className="min-w-0 space-y-1">
          <p className="line-clamp-2 text-sm font-medium text-zinc-900">
            {product.name}
          </p>
          {product.description ? (
            <p className="line-clamp-2 text-xs text-zinc-600">
              {product.description}
            </p>
          ) : null}
          <p className="text-sm font-medium text-zinc-800">
            {formatProductPrice(product.price, product.currency)}
          </p>
        </div>

        <div className="mt-auto space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 w-8 px-0"
              onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              disabled={quantity <= 1}
            >
              −
            </Button>
            <span className="w-8 text-center text-sm font-medium text-zinc-900">
              {quantity}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 w-8 px-0"
              onClick={() =>
                setQuantity((current) => Math.min(99, current + 1))
              }
              disabled={quantity >= 99}
            >
              +
            </Button>
          </div>
          <Button
            type="button"
            size="sm"
            className="w-full"
            onClick={() => onAdd(product, quantity)}
          >
            Add to cart
          </Button>
        </div>
      </div>
    </li>
  );
}

export function ShopCatalog({
  groups,
  buyAgainItems,
  purchases,
  purchasesError = null,
  focusProductId = null,
  focusPurchaseId = null,
  openOrdersInitially = false,
  showOrderedMessage = false,
}: ShopCatalogProps) {
  const [selectedBusinessId, setSelectedBusinessId] = useState(() =>
    initialBusinessId(groups, focusProductId),
  );
  const [highlightedId, setHighlightedId] = useState<string | null>(
    focusProductId ?? null,
  );
  const [cartOpen, setCartOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(
    () => openOrdersInitially || Boolean(focusPurchaseId),
  );
  const [addedNotice, setAddedNotice] = useState<string | null>(null);
  const cart = useShopCart();

  useEffect(() => {
    if (openOrdersInitially || focusPurchaseId) {
      setCartOpen(false);
      setOrdersOpen(true);
    }
  }, [openOrdersInitially, focusPurchaseId]);

  useEffect(() => {
    if (!showOrderedMessage || !cart.ready) {
      return;
    }
    cart.clearAll();
  }, [showOrderedMessage, cart.ready, cart.clearAll]);

  useEffect(() => {
    if (!focusProductId) {
      return;
    }
    const match = groups.find((group) =>
      group.products.some((product) => product.id === focusProductId),
    );
    if (!match) {
      return;
    }
    setSelectedBusinessId(match.businessId);
    setHighlightedId(focusProductId);
    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(`shop-product-${focusProductId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusProductId, groups]);

  useEffect(() => {
    if (!addedNotice) {
      return;
    }
    const timeout = window.setTimeout(() => setAddedNotice(null), 2000);
    return () => window.clearTimeout(timeout);
  }, [addedNotice]);

  const activeGroup =
    groups.find((group) => group.businessId === selectedBusinessId) ??
    groups[0] ??
    null;

  const businessBuyAgain = useMemo(() => {
    if (!activeGroup) {
      return [];
    }
    return buyAgainItems.filter(
      (item) => item.businessId === activeGroup.businessId,
    );
  }, [activeGroup, buyAgainItems]);

  const cartLines = activeGroup
    ? cart.linesFor(activeGroup.businessId)
    : [];
  const itemCount = cartItemCount(cartLines);

  function openCart() {
    setOrdersOpen(false);
    setCartOpen(true);
  }

  function openOrders() {
    setCartOpen(false);
    setOrdersOpen(true);
  }

  function handleAddProduct(product: ShopProduct, quantity: number) {
    if (!activeGroup) {
      return;
    }
    cart.addItem(activeGroup.businessId, {
      productId: product.id,
      name: product.name,
      price: product.price,
      currency: product.currency,
      imageUrl: product.imageUrl,
      quantity,
    });
    setAddedNotice(`${product.name} added to cart`);
  }

  function handleBuyAgain(item: BuyAgainDisplayItem) {
    cart.addItem(item.businessId, {
      productId: item.productId,
      name: item.name,
      price: item.price,
      currency: item.currency,
      imageUrl: item.imageUrl,
      quantity: 1,
    });
    if (item.businessId !== selectedBusinessId) {
      setSelectedBusinessId(item.businessId);
    }
    setAddedNotice(`${item.name} added to cart`);
    openCart();
  }

  const headerActions = (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={openCart}
        disabled={!activeGroup}
      >
        Cart
        {itemCount > 0 ? (
          <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-zinc-900 px-1.5 text-xs font-medium text-white">
            {itemCount}
          </span>
        ) : null}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={openOrders}>
        My Orders
      </Button>
    </div>
  );

  if (groups.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Shop</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Browse products from your practitioners and request a purchase.
              Payment is handled offline.
            </p>
          </div>
          {headerActions}
        </div>
        <p className="text-sm text-zinc-600">
          No products are available from your linked practitioners yet.
        </p>
        <ShopOrdersPanel
          open={ordersOpen}
          onClose={() => setOrdersOpen(false)}
          purchases={purchases}
          loadError={purchasesError}
          focusPurchaseId={focusPurchaseId}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Shop</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Browse products from your practitioners and request a purchase.
            Payment is handled offline.
          </p>
        </div>
        {headerActions}
      </div>

      {showOrderedMessage ? (
        <p
          className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          role="status"
        >
          Your purchase request was submitted.
        </p>
      ) : null}

      {groups.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {groups.map((group) => (
            <Button
              key={group.businessId}
              type="button"
              size="sm"
              variant={
                group.businessId === activeGroup?.businessId
                  ? "default"
                  : "outline"
              }
              onClick={() => setSelectedBusinessId(group.businessId)}
            >
              {group.businessName}
            </Button>
          ))}
        </div>
      ) : activeGroup ? (
        <p className="text-sm text-zinc-600">{activeGroup.businessName}</p>
      ) : null}

      {addedNotice ? (
        <p
          className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
          role="status"
        >
          {addedNotice}
        </p>
      ) : null}

      <BuyAgainSection items={businessBuyAgain} onAddToCart={handleBuyAgain} />

      {activeGroup ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-medium text-zinc-900">All products</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Add items to your cart, then request a purchase. No payment is
              taken online.
            </p>
          </div>

          {activeGroup.products.length === 0 ? (
            <p className="text-sm text-zinc-600">
              No active products for this business yet.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {activeGroup.products.map((product) => (
                <CatalogProductCard
                  key={product.id}
                  product={product}
                  highlighted={highlightedId === product.id}
                  onAdd={handleAddProduct}
                />
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {activeGroup ? (
        <ShopCartPanel
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          businessId={activeGroup.businessId}
          businessName={activeGroup.businessName}
          clientId={activeGroup.clientId}
          lines={cartLines}
          onSetQuantity={(line, quantity) =>
            cart.setItemQuantity(activeGroup.businessId, {
              ...line,
              quantity,
            })
          }
          onRemove={(productId) =>
            cart.removeItem(activeGroup.businessId, productId)
          }
        />
      ) : null}

      <ShopOrdersPanel
        open={ordersOpen}
        onClose={() => setOrdersOpen(false)}
        purchases={purchases}
        loadError={purchasesError}
        focusPurchaseId={focusPurchaseId}
      />
    </div>
  );
}
