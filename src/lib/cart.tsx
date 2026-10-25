import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Selections } from "./pricing";

export type CartItem = {
  key: string;
  productId: string;
  name: string;
  image: string | null;
  unitBase: number;
  unitExtras: number;
  qty: number;
  selections: Selections;
  notes: string;
};

export type PastOrder = {
  id: string;
  number: number;
  date: string;
  total: number;
  items: CartItem[];
};

type Ctx = {
  items: CartItem[];
  add: (i: Omit<CartItem, "key">) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  replace: (items: CartItem[]) => void;
  count: number;
  subtotal: number;
  favorites: string[];
  toggleFav: (id: string) => void;
  history: PastOrder[];
  addHistory: (o: PastOrder) => void;
};

const CartCtx = createContext<Ctx | null>(null);

function load<T>(k: string, d: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : d;
  } catch {
    return d;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [favorites, setFav] = useState<string[]>([]);
  const [history, setHistory] = useState<PastOrder[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(load("cart", []));
    setFav(load("favorites", []));
    setHistory(load("orders", []));
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem("cart", JSON.stringify(items)); }, [items, ready]);
  useEffect(() => { if (ready) localStorage.setItem("favorites", JSON.stringify(favorites)); }, [favorites, ready]);
  useEffect(() => { if (ready) localStorage.setItem("orders", JSON.stringify(history)); }, [history, ready]);

  const value: Ctx = {
    items,
    add: (i) =>
      setItems((cur) => {
        const sig = i.productId + JSON.stringify(i.selections) + i.notes;
        const found = cur.find((c) => c.productId + JSON.stringify(c.selections) + c.notes === sig);
        if (found) return cur.map((c) => (c === found ? { ...c, qty: c.qty + i.qty } : c));
        return [...cur, { ...i, key: crypto.randomUUID() }];
      }),
    setQty: (key, qty) => setItems((cur) => cur.map((c) => (c.key === key ? { ...c, qty: Math.max(1, qty) } : c))),
    remove: (key) => setItems((cur) => cur.filter((c) => c.key !== key)),
    clear: () => setItems([]),
    replace: (its) => setItems(its.map((i) => ({ ...i, key: crypto.randomUUID() }))),
    count: items.reduce((s, i) => s + i.qty, 0),
    subtotal: Math.round(items.reduce((s, i) => s + (i.unitBase + i.unitExtras) * i.qty, 0) * 100) / 100,
    favorites,
    toggleFav: (id) => setFav((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id])),
    history,
    addHistory: (o) => setHistory((h) => [o, ...h].slice(0, 30)),
  };
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart outside provider");
  return c;
}
