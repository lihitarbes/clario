"use client";

import { useCallback, useSyncExternalStore } from "react";
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

const SERVER_SNAPSHOT = emptyShopCartStore();
let clientSnapshot: ShopCartStore = SERVER_SNAPSHOT;
let hasClientSnapshot = false;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function getClientSnapshot(): ShopCartStore {
  if (!hasClientSnapshot) {
    clientSnapshot = readShopCartStore();
    hasClientSnapshot = true;
  }
  return clientSnapshot;
}

function getServerSnapshot(): ShopCartStore {
  return SERVER_SNAPSHOT;
}

function persistStore(next: ShopCartStore) {
  clientSnapshot = next;
  hasClientSnapshot = true;
  writeShopCartStore(next);
  emitChange();
}

function subscribeIsClient() {
  return () => {};
}

function getIsClientSnapshot() {
  return true;
}

function getIsClientServerSnapshot() {
  return false;
}

export function useShopCart() {
  const store = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  const ready = useSyncExternalStore(
    subscribeIsClient,
    getIsClientSnapshot,
    getIsClientServerSnapshot,
  );

  const persist = useCallback((next: ShopCartStore) => {
    persistStore(next);
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
