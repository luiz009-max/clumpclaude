import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { ProductDialog } from "@/components/ProductDialog";
import { useCart } from "@/lib/cart";
import { brl } from "@/lib/pricing";
import { catalogQuery, type Product } from "@/lib/store";
import { getOrderStatus } from "@/lib/orders.functions";

export const Route = createFileRoute("/meus-pedidos")({
  head: () => ({
    meta: [
      { title: "Meus pedidos e favoritos — Doce Encanto" },
      { name: "description", content: "Acompanhe seus pedidos, repita compras e veja seus doces favoritos." },
      { property: "og:title", content: "Meus pedidos — Doce Encanto" },
      { property: "og:description", content: "Histórico de pedidos e favoritos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MyOrders,
});

function MyOrders() {
  const { history, favorites, replace } = useCart();
  const { data } = useQuery(catalogQuery);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<Product | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    history.slice(0, 10).forEach(async (o) => {
      const r = await getOrderStatus({ data: { id: o.id } }).catch(() => null);
      if (r) setStatuses((s) => ({ ...s, [o.id]: r.status }));
    });
  }, [history]);

  const favs = (data?.products ?? []).filter((p) => favorites.includes(p.id));

  return (
    <div className="mx-auto max-w-4xl space-y-12 px-4 py-10">
      <section>
        <h1 className="text-4xl">Meus pedidos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Salvos neste aparelho.</p>
        {history.length === 0 ? (
          <p className="mt-6 text-muted-foreground">Você ainda não fez pedidos. <Link to="/cardapio" className="text-primary underline">Ver cardápio</Link></p>
        ) : (
          <ul className="mt-6 space-y-3">
            {history.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4 shadow-soft">
                <div className="flex-1">
                  <p className="font-semibold">Pedido #{o.number} <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs">{statuses[o.id] ?? "…"}</span></p>
                  <p className="text-sm text-muted-foreground">{new Date(o.date).toLocaleString("pt-BR")} • {o.items.map((i) => `${i.qty}x ${i.name}`).join(", ")}</p>
                </div>
                <span className="font-semibold text-primary">{brl(o.total)}</span>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => { replace(o.items); navigate({ to: "/carrinho" }); }}>Repetir pedido</Button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="text-3xl">Favoritos</h2>
        {favs.length === 0 ? <p className="mt-4 text-muted-foreground">Toque no coração dos produtos para salvá-los aqui.</p> : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">{favs.map((p) => <ProductCard key={p.id} product={p} onOpen={setOpen} />)}</div>
        )}
      </section>
      {open && <ProductDialog product={open} onClose={() => setOpen(null)} onPick={setOpen} suggestions={[]} />}
    </div>
  );
}
