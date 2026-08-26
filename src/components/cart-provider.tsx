"use client";

import * as React from "react";

const STORAGE_KEY = "rangkaarii:cart";

export type CartLine = { id: string; size: string; qty: number };

type CartValue = {
  lines: CartLine[];
  count: number;
  add: (id: string, size: string) => void;
  setQty: (id: string, size: string, qty: number) => void;
  remove: (id: string, size: string) => void;
  clear: () => void;
};

/** Null outside the provider so the storefront header can render without it. */
const CartContext = React.createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = React.useState<CartLine[]>([]);

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setLines(JSON.parse(saved));
    } catch {
      // Storage unavailable; start with an empty cart.
    }
  }, []);

  const persist = React.useCallback((next: CartLine[]) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Keep the in-memory cart even if it cannot be saved.
    }
    return next;
  }, []);

  const add = React.useCallback(
    (id: string, size: string) => {
      setLines((current) => {
        const existing = current.find(
          (line) => line.id === id && line.size === size,
        );
        const next = existing
          ? current.map((line) =>
              line === existing ? { ...line, qty: line.qty + 1 } : line,
            )
          : [...current, { id, size, qty: 1 }];
        return persist(next);
      });
    },
    [persist],
  );

  const setQty = React.useCallback(
    (id: string, size: string, qty: number) => {
      setLines((current) =>
        persist(
          qty <= 0
            ? current.filter((line) => !(line.id === id && line.size === size))
            : current.map((line) =>
                line.id === id && line.size === size ? { ...line, qty } : line,
              ),
        ),
      );
    },
    [persist],
  );

  const remove = React.useCallback(
    (id: string, size: string) => {
      setLines((current) =>
        persist(current.filter((line) => !(line.id === id && line.size === size))),
      );
    },
    [persist],
  );

  const clear = React.useCallback(() => setLines(() => persist([])), [persist]);

  const value = React.useMemo<CartValue>(
    () => ({
      lines,
      count: lines.reduce((total, line) => total + line.qty, 0),
      add,
      setQty,
      remove,
      clear,
    }),
    [add, clear, lines, remove, setQty],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return React.useContext(CartContext);
}
