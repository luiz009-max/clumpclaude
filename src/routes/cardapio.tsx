import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/ProductCard";
import { ProductDialog } from "@/components/ProductDialog";
import { catalogQuery, GROUPS, type Product } from "@/lib/store";

export const Route = createFileRoute("/cardapio")({
  validateSearch: z.object({ q: z.string().optional(), grupo: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Cardápio — Doce Encanto" },
      { name: "description", content: "Veja todos os bolos, doces, combos e bebidas e faça seu pedido online." },
      { property: "og:title", content: "Cardápio — Doce Encanto" },
      { property: "og:description", content: "Bolos, brigadeiros, combos e bebidas com pedido online." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  component: Menu,
});

function Menu() {
  const search = Route.useSearch();
  const { data: { categories, products } } = useSuspenseQuery(catalogQuery);
  const [q, setQ] = useState(search.q ?? "");
  const [group, setGroup] = useState(search.grupo ?? "Todos");
  const [open, setOpen] = useState<Product | null>(null);

  const cats = categories.filter((c) => c.active && (group === "Todos" || c.group_name === group));
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products.filter((p) => p.active && (!t || p.name.toLowerCase().includes(t) || p.description.toLowerCase().includes(t)));
  }, [products, q]);

  const groupOf = (p: Product) => categories.find((c) => c.id === p.category_id)?.group_name;
  const suggestions = products.filter((p) => p.active && ["Bebidas", "Doces e sobremesas"].includes(groupOf(p) ?? ""));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-4xl font-semibold">Cardápio</h1>
      <div className="sticky top-16 z-30 -mx-4 mt-6 space-y-3 bg-background/90 px-4 py-3 backdrop-blur">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar produtos" className="h-11 rounded-full bg-card pl-10" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["Todos", ...GROUPS].map((g) => (
            <button key={g} onClick={() => setGroup(g)} className={`shrink-0 rounded-full border px-4 py-1.5 text-sm transition ${group === g ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary"}`}>{g}</button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-12">
        {cats.map((c) => {
          const items = filtered.filter((p) => p.category_id === c.id);
          if (!items.length) return null;
          return (
            <section key={c.id}>
              <h2 className="mb-4 text-2xl">{c.name}</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {items.map((p) => <ProductCard key={p.id} product={p} onOpen={setOpen} />)}
              </div>
            </section>
          );
        })}
        {cats.every((c) => !filtered.some((p) => p.category_id === c.id)) && (
          <p className="py-20 text-center text-muted-foreground">Nenhum produto encontrado.</p>
        )}
      </div>
      {open && <ProductDialog product={open} onClose={() => setOpen(null)} onPick={setOpen} suggestions={suggestions} />}
    </div>
  );
}
