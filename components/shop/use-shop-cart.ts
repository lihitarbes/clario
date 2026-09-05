"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addToCartLine,
  emptyShopCartStore,
  getBusinessCart,
  readShopCartStore,
  upsertCartLine,
  writeShopCartStore,
  type ShopCartLine,
  type ShopCartStore,
} from "@/lib/shop/cart-storage";

export function useShopCart() {
  const [store, setStore] = useState<ShopCartStore>(emptyShopCartStore);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setStore(readShopCartStore());
    setReady(true);
  }, []);

  const persist = useCallback((next: ShopCartStore) => {
    setStore(next);
    writeShopCartStore(next);
  }, []);

  const linesFor = useCallback(
    (businessId: string) => getBusinessCart(store, businessId),
    [store],
  );

  const addItem = useCallback(
    (
      businessId: string,
      item: Omit<ShopCartLine, "quantity"> & { quantity?: number },
    ) => {
      const nextLines = addToCartLine(getBusinessCart(store, businessId), item);
      persist({
        ...store,
        carts: { ...store.carts, [businessId]: nextLines },
      });
    },
    [persist, store],
  );

  const setItemQuantity = useCallback(
    (
      businessId: string,
      item: Omit<ShopCartLine, "quantity"> & { quantity: number },
    ) => {
      const nextLines = upsertCartLine(getBusinessCart(store, businessId), item);
      persist({
        ...store,
        carts: { ...store.carts, [businessId]: nextLines },
      });
    },
    [persist, store],
  );

  const removeItem = useCallback(
    (businessId: string, productId: string) => {
      const nextLines = getBusinessCart(store, businessId).filter(
        (line) => line.productId !== productId,
      );
      persist({
        ...store,
        carts: { ...store.carts, [businessId]: nextLines },
      });
    },
    [persist, store],
  );

  const clearBusiness = useCallback(
    (businessId: string) => {
      const nextCarts = { ...store.carts };
      delete nextCarts[businessId];
      persist({ ...store, carts: nextCarts });
    },
    [persist, store],
  );

  const clearAll = useCallback(() => {
    persist(emptyShopCartStore());
  }, [persist]);

  return {
    ready,
    linesFor,
    addItem,
    setItemQuantity,
    removeItem,
    clearBusiness,
    clearAll,
  };
}
