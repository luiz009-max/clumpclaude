import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Search, Star, Clock, MapPin, Sparkles } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/ProductCard";
import { ProductDialog } from "@/components/ProductDialog";
import { catalogQuery, settingsQuery, GROUPS, type Product } from "@/lib/store";
import { DAYS } from "@/lib/pricing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Doce Encanto — Um pedacinho de felicidade em cada doce" },
      { name: "description", content: "Bolos, brigadeiros gourmet, morango do amor e kits presente. Peça online com delivery ou retirada." },
      { property: "og:title", content: "Doce Encanto — Doceria artesanal" },
      { property: "og:description", content: "Cardápio digital com pedidos online, delivery e retirada na loja." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(settingsQuery),
      context.queryClient.ensureQueryData(catalogQuery),
    ]),
  component: Index,
});

function useCountdown(end: string | null) {
  const [left, setLeft] = useState("");
  useEffect(() => {
    if (!end) return;
    const tick = () => {
      const ms = new Date(end).getTime() - Date.now();
      if (ms <= 0) return setLeft("");
      const h = Math.floor(ms / 3.6e6), m = Math.floor((ms % 3.6e6) / 6e4), s = Math.floor((ms % 6e4) / 1000);
      setLeft(`${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [end]);
  return left;
}

function Index() {
  const { data: s } = useSuspenseQuery(settingsQuery);
  const { data: { categories, products } } = useSuspenseQuery(catalogQuery);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Product | null>(null);
  const [url, setUrl] = useState("");
  const navigate = useNavigate();
  const countdown = useCountdown(s.promo_ends_at);
  useEffect(() => setUrl(window.location.origin + "/cardapio"), []);

  const active = products.filter((p) => p.active);
  const best = [...active].sort((a, b) => b.sales_count - a.sales_count).slice(0, 4);
  const news = active.filter((p) => p.badge === "novidade").slice(0, 4);
  const promos = active.filter((p) => p.badge === "promocao" || (p.promo_price && p.promo_price < p.price)).slice(0, 4);
  const drinks = active.filter((p) => categories.find((c) => c.id === p.category_id)?.group_name === "Bebidas");
  const sweets = active.filter((p) => categories.find((c) => c.id === p.category_id)?.group_name === "Doces e sobremesas");

  return (
    <div>
      <section className="relative overflow-hidden">
        <img src={s.banner_url || "/images/hero.jpg"} alt="Bolos e doces da casa" width={1600} height={912} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-hero-fade" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-32">
          <div className="max-w-xl animate-rise">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-card/80 px-3 py-1 text-xs font-medium text-gold-foreground"><Sparkles className="size-3.5 text-gold" /> Confeitaria artesanal</p>
            <h1 className="text-4xl font-semibold leading-tight sm:text-6xl">{s.slogan}</h1>
            <p className="mt-4 text-muted-foreground">Doces feitos à mão todos os dias, com ingredientes selecionados. Delivery ou retirada na loja.</p>
            <form className="mt-6 flex gap-2" onSubmit={(e) => { e.preventDefault(); navigate({ to: "/cardapio", search: { q } }); }}>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar brigadeiro, bolo…" className="h-12 rounded-full bg-card pl-10" />
              </div>
              <Button type="submit" variant="outline" className="h-12 rounded-full">Buscar</Button>
            </form>
            <Button asChild size="lg" className="mt-4 h-12 rounded-full px-8 shadow-lift"><Link to="/cardapio">Fazer meu pedido</Link></Button>
          </div>
        </div>
      </section>

      {s.promo_banner && (
        <div className="bg-gold-gradient text-gold-foreground">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-3 text-sm font-medium">
            <span>🎉 {s.promo_banner}</span>
            {countdown && <span className="rounded-full bg-card/60 px-3 py-0.5">Termina em {countdown}</span>}
            {s.first_order_coupon && <span>Primeira compra? Use <b>{s.first_order_coupon}</b></span>}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl space-y-16 px-4 pt-12">
        <section>
          <SectionTitle title="Categorias" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {GROUPS.map((g) => (
              <Link key={g} to="/cardapio" search={{ grupo: g }} className="rounded-2xl border bg-card p-5 text-center shadow-soft transition hover:-translate-y-1 hover:border-primary">
                <p className="font-display text-lg">{g}</p>
                <p className="text-xs text-muted-foreground">{categories.filter((c) => c.group_name === g && c.active).length} categorias</p>
              </Link>
            ))}
          </div>
        </section>
        <Grid title="Mais vendidos" items={best} onOpen={setOpen} />
        {news.length > 0 && <Grid title="Lançamentos" items={news} onOpen={setOpen} />}
        {promos.length > 0 && <Grid title="Promoções e combos" items={promos} onOpen={setOpen} />}

        <section className="grid gap-6 rounded-3xl border bg-card p-8 shadow-soft md:grid-cols-3">
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-xl"><Clock className="size-5 text-primary" /> Funcionamento</h3>
            <ul className="space-y-1 text-sm">
              {s.hours.map((h) => (
                <li key={h.day} className="flex justify-between"><span>{DAYS[h.day]}</span><span className="text-muted-foreground">{h.closed ? "Fechado" : `${h.open} – ${h.close}`}</span></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-xl"><MapPin className="size-5 text-primary" /> Onde estamos</h3>
            <p className="text-sm">{s.address}</p>
            <p className="text-sm text-muted-foreground">{s.phone}</p>
            <p className="mt-2 text-sm text-muted-foreground">Pedido mínimo para delivery: R$ {Number(s.min_delivery).toFixed(2).replace(".", ",")}</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            {url && <QRCodeSVG value={url} size={120} />}
            <Button variant="outline" size="sm" className="rounded-full" onClick={async () => {
              if (navigator.share) await navigator.share({ title: s.name, url }).catch(() => {});
              else { await navigator.clipboard.writeText(url); toast.success("Link do cardápio copiado!"); }
            }}>Compartilhar cardápio</Button>
          </div>
        </section>
      </div>

      {open && <ProductDialog product={open} onClose={() => setOpen(null)} onPick={setOpen} suggestions={[...drinks, ...sweets]} />}
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="mb-6 text-3xl font-semibold">{title}<span className="ml-3 inline-block h-0.5 w-12 align-middle bg-gold" /></h2>;
}

function Grid({ title, items, onOpen }: { title: string; items: Product[]; onOpen: (p: Product) => void }) {
  return (
    <section>
      <SectionTitle title={title} />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((p) => <ProductCard key={p.id} product={p} onOpen={onOpen} />)}
      </div>
    </section>
  );
}
