"use client";

import { createContext, useContext, useEffect, useState } from "react";

const RATE = 4.75;

interface CurrencyCtx {
  currency: "AUD" | "CNY";
  toggle: () => void;
  fmt: (amount: number) => string;
}

const Ctx = createContext<CurrencyCtx>({
  currency: "AUD",
  toggle: () => {},
  fmt: (n) => `$${n.toFixed(2)}`,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<"AUD" | "CNY">("AUD");

  useEffect(() => {
    const saved = localStorage.getItem("currency") as "AUD" | "CNY" | null;
    if (saved === "AUD" || saved === "CNY") setCurrency(saved);
  }, []);

  function toggle() {
    setCurrency((c) => {
      const next = c === "AUD" ? "CNY" : "AUD";
      localStorage.setItem("currency", next);
      return next;
    });
  }

  function fmt(amount: number): string {
    if (currency === "AUD") return `$${amount.toFixed(2)}`;
    return `¥${(amount * RATE).toFixed(2)}`;
  }

  return <Ctx.Provider value={{ currency, toggle, fmt }}>{children}</Ctx.Provider>;
}

export function useCurrency() {
  return useContext(Ctx);
}
