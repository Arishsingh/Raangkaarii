"use client";

import * as React from "react";

const STORAGE_KEY = "rangkaarii:wishlist";

type WishlistValue = {
  items: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
};

/** Null outside the provider so the storefront header can render without it. */
const WishlistContext = React.createContext<WishlistValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<string[]>([]);

  // Read once on mount: server render has no access to browser storage.
  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setItems(JSON.parse(saved));
    } catch {
      // Storage can be unavailable; an empty wishlist is a fine fallback.
    }
  }, []);

  const toggle = React.useCallback((id: string) => {
    setItems((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Keep the in-memory list even if it cannot be persisted.
      }
      return next;
    });
  }, []);

  const value = React.useMemo<WishlistValue>(
    () => ({ items, toggle, has: (id) => items.includes(id) }),
    [items, toggle],
  );

  return (
    <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
  );
}

export function useWishlist() {
  return React.useContext(WishlistContext);
}
