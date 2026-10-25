import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";
import { settingsQuery } from "@/lib/store";
import { isOpenNow } from "@/lib/pricing";
import { useHydrated } from "@/lib/useHydrated";

export function SiteHeader() {
  const { data: s } = useQuery(settingsQuery);
  const { count } = useCart();
  const hydrated = useHydrated();
  const open = s && hydrated ? isOpenNow(s.hours, s.open_mode) : null;
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2">
          {s?.logo_url ? <img src={s.logo_url} alt="" className="size-9 rounded-full object-cover" /> : <span className="flex size-9 items-center justify-center rounded-full bg-gold-gradient font-display text-lg text-gold-foreground">{s?.name?.[0] ?? "D"}</span>}
          <span className="font-display text-xl font-semibold">{s?.name ?? "Doceria"}</span>
        </Link>
        {open !== null && (
          <span className={`hidden rounded-full px-2.5 py-0.5 text-xs font-medium sm:inline ${open ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}`}>
            {open ? "Aberto agora" : "Fechado"}
          </span>
        )}
        <nav className="ml-auto flex items-center gap-1 text-sm sm:gap-4">
          <Link to="/cardapio" className="px-2 py-1 hover:text-primary" activeProps={{ className: "text-primary" }}>Cardápio</Link>
          <Link to="/meus-pedidos" className="hidden px-2 py-1 hover:text-primary sm:inline" activeProps={{ className: "text-primary" }}>Meus pedidos</Link>
          <Link to="/carrinho" className="relative rounded-full bg-primary p-2.5 text-primary-foreground" aria-label="Carrinho">
            <ShoppingBag className="size-5" />
            {hydrated && count > 0 && <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-gold text-xs font-bold text-gold-foreground">{count}</span>}
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { data: s } = useQuery(settingsQuery);
  return (
    <footer className="mt-20 border-t bg-secondary/50">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm sm:grid-cols-3">
        <div>
          <p className="font-display text-lg">{s?.name}</p>
          <p className="text-muted-foreground">{s?.slogan}</p>
        </div>
        <div className="text-muted-foreground">
          <p>{s?.address}</p>
          <p>{s?.phone}</p>
        </div>
        <div className="flex flex-col gap-1 sm:items-end">
          {s?.instagram && <a className="hover:text-primary" href={`https://instagram.com/${s.instagram}`} target="_blank" rel="noreferrer">Instagram @{s.instagram}</a>}
          <Link to="/meus-pedidos" className="hover:text-primary">Meus pedidos e favoritos</Link>
          <Link to="/admin" className="text-muted-foreground hover:text-primary">Área do proprietário</Link>
        </div>
      </div>
    </footer>
  );
}

export function WhatsFab() {
  const { data: s } = useQuery(settingsQuery);
  if (!s?.whatsapp) return null;
  return (
    <a href={`https://wa.me/${s.whatsapp}`} target="_blank" rel="noreferrer" aria-label="Falar no WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-full bg-success text-success-foreground shadow-lift transition hover:scale-110">
      <svg viewBox="0 0 24 24" className="size-7 fill-current"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.3-.8-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3Z"/></svg>
    </a>
  );
}
