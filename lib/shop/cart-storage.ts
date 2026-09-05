import {
  normalizeProductCurrency,
  type ProductCurrency,
} from "@/lib/products/display";

export type ShopCartLine = {
  productId: string;
  name: string;
  price: number | string;
  currency: ProductCurrency;
  imageUrl: string | null;
  quantity: number;
};

export type ShopCartStore = {
  version: 2;
  carts: Record<string, ShopCartLine[]>;
};

export const SHOP_CART_STORAGE_KEY = "clario.shop.cart.v2";

export function emptyShopCartStore(): ShopCartStore {
  return { version: 2, carts: {} };
}

function normalizeCartLine(raw: unknown): ShopCartLine | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const line = raw as Partial<ShopCartLine>;
  if (
    typeof line.productId !== "string" ||
    typeof line.name !== "string" ||
    line.price === undefined ||
    typeof line.quantity !== "number"
  ) {
    return null;
  }
  return {
    productId: line.productId,
    name: line.name,
    price: line.price,
    currency: normalizeProductCurrency(line.currency),
    imageUrl: typeof line.imageUrl === "string" ? line.imageUrl : null,
    quantity: line.quantity,
  };
}

export function readShopCartStore(): ShopCartStore {
  if (typeof window === "undefined") {
    return emptyShopCartStore();
  }
  try {
    const raw = window.localStorage.getItem(SHOP_CART_STORAGE_KEY);
    if (!raw) {
      return emptyShopCartStore();
    }
    const parsed = JSON.parse(raw) as { version?: number; carts?: unknown };
    if (parsed?.version !== 2 || typeof parsed.carts !== "object" || !parsed.carts) {
      return emptyShopCartStore();
    }
    const carts: Record<string, ShopCartLine[]> = {};
    for (const [businessId, lines] of Object.entries(parsed.carts)) {
      if (!Array.isArray(lines)) {
        continue;
      }
      carts[businessId] = lines
        .map(normalizeCartLine)
        .filter((line): line is ShopCartLine => line !== null);
    }
    return { version: 2, carts };
  } catch {
    return emptyShopCartStore();
  }
}

export function writeShopCartStore(store: ShopCartStore) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(SHOP_CART_STORAGE_KEY, JSON.stringify(store));
}

export function getBusinessCart(
  store: ShopCartStore,
  businessId: string,
): ShopCartLine[] {
  return store.carts[businessId] ?? [];
}

export function upsertCartLine(
  lines: ShopCartLine[],
  incoming: Omit<ShopCartLine, "quantity"> & { quantity: number },
): ShopCartLine[] {
  const quantity = Math.min(99, Math.max(0, Math.floor(incoming.quantity)));
  const existingIndex = lines.findIndex(
    (line) => line.productId === incoming.productId,
  );

  if (quantity <= 0) {
    if (existingIndex === -1) {
      return lines;
    }
    return lines.filter((line) => line.productId !== incoming.productId);
  }

  if (existingIndex === -1) {
    return [
      ...lines,
      {
        productId: incoming.productId,
        name: incoming.name,
        price: incoming.price,
        currency: normalizeProductCurrency(incoming.currency),
        imageUrl: incoming.imageUrl,
        quantity,
      },
    ];
  }

  return lines.map((line, index) =>
    index === existingIndex
      ? {
          ...line,
          name: incoming.name,
          price: incoming.price,
          currency: normalizeProductCurrency(incoming.currency),
          imageUrl: incoming.imageUrl,
          quantity,
        }
      : line,
  );
}

export function addToCartLine(
  lines: ShopCartLine[],
  incoming: Omit<ShopCartLine, "quantity"> & { quantity?: number },
): ShopCartLine[] {
  const addBy = Math.min(99, Math.max(1, Math.floor(incoming.quantity ?? 1)));
  const existing = lines.find((line) => line.productId === incoming.productId);
  const nextQuantity = Math.min(99, (existing?.quantity ?? 0) + addBy);
  return upsertCartLine(lines, { ...incoming, quantity: nextQuantity });
}

export function cartItemCount(lines: ShopCartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}
