"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getCart } from "@/services/cart.service";
import { useAuth } from "@/features/auth/auth-context";

interface CartContextValue {
  count: number;
  refreshCount: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const refreshCount = useCallback(() => {
    if (!user || user.role !== "CLIENT") {
      setCount(0);
      return;
    }
    getCart()
      .then((cart) => setCount(cart.items.reduce((sum, i) => sum + i.quantity, 0)))
      .catch(() => setCount(0));
  }, [user]);

  useEffect(refreshCount, [refreshCount]);

  return <CartContext.Provider value={{ count, refreshCount }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart doit être utilisé dans un CartProvider.");
  return ctx;
}