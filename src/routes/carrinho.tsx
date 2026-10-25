import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Minus, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/lib/cart";
import { brl, isOpenNow, orderTotal, PAYMENT_METHODS } from "@/lib/pricing";
import { catalogQuery, neighborhoodsQuery, settingsQuery, PLACEHOLDER_IMG } from "@/lib/store";
import { checkCoupon, createOrder } from "@/lib/orders.functions";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { title: "Carrinho e finalização — Doce Encanto" },
      { name: "description", content: "Revise seu pedido e finalize com delivery ou retirada na loja." },
      { property: "og:title", content: "Carrinho — Doce Encanto" },
      { property: "og:description", content: "Finalize seu pedido de doces." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(settingsQuery), context.queryClient.ensureQueryData(neighborhoodsQuery)]),
  component: Cart,
});

type Done = { number: number; whatsUrl: string };

function Cart() {
  const cart = useCart();
  const { data: s } = useSuspenseQuery(settingsQuery);
  const { data: hoods } = useSuspenseQuery(neighborhoodsQuery);
  const { data: catalog } = useQuery(catalogQuery);
  const [mode, setMode] = useState<"delivery" | "pickup">("delivery");
  const [f, setF] = useState({ name: "", phone: "", street: "", number: "", hood: "", complement: "", reference: "", pickup: "", notes: "" });
  const [payment, setPayment] = useState("Pix");
  const [change, setChange] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  const isFirst = cart.history.length === 0;
  const hood = hoods.find((h) => h.id === f.hood);
  const fee = mode === "delivery" ? Number(hood?.fee ?? 0) : 0;
  const discount = coupon ? Math.min(coupon.discount, cart.subtotal) : 0;
  const total = orderTotal(cart.subtotal, fee, discount);
  const minOk = mode === "pickup" || cart.subtotal >= Number(s.min_delivery);
  const open = isOpenNow(s.hours, s.open_mode);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  // upsell: offer a drink/sweet not in cart
  const inCart = new Set(cart.items.map((i) => i.productId));
  const offers = (catalog?.products ?? []).filter((p) => p.active && p.available && !inCart.has(p.id) && (p.badge === "promocao" || p.badge === "mais_vendido")).slice(0, 3);

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <CheckCircle2 className="mx-auto size-16 text-success" />
        <h1 className="mt-4 text-3xl">Pedido #{done.number} recebido!</h1>
        <p className="mt-2 text-muted-foreground">Envie a confirmação pelo WhatsApp para agilizar o atendimento.</p>
        <Button asChild size="lg" className="mt-6 rounded-full bg-success text-success-foreground hover:bg-success/90">
          <a href={done.whatsUrl} target="_blank" rel="noreferrer">Enviar pedido pelo WhatsApp</a>
        </Button>
        <div className="mt-4"><Link to="/meus-pedidos" className="text-sm text-primary underline">Acompanhar meus pedidos</Link></div>
      </div>
    );
  }

  if (!cart.items.length) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-3xl">Seu carrinho está vazio</h1>
        <p className="mt-2 text-muted-foreground">Que tal escolher um docinho?</p>
        <Button asChild className="mt-6 rounded-full"><Link to="/cardapio">Ver cardápio</Link></Button>
      </div>
    );
  }

  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    const r = await checkCoupon({ data: { code: couponInput, subtotal: cart.subtotal, isFirstOrder: isFirst } });
    if (r.error) { setCoupon(null); toast.error(r.error); }
    else { setCoupon({ code: r.code, discount: r.discount }); toast.success(`Cupom ${r.code} aplicado!`); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!open) return void toast.error("A loja está fechada no momento.");
    if (f.name.trim().length < 2) return void toast.error("Informe seu nome completo");
    if (f.phone.replace(/\D/g, "").length < 10) return void toast.error("Informe um telefone válido com DDD");
    if (mode === "delivery" && (!f.street || !f.number || !f.hood)) return void toast.error("Preencha rua, número e bairro");
    if (mode === "pickup" && !f.pickup) return void toast.error("Escolha o horário de retirada");
    if (!minOk) return void toast.error(`Pedido mínimo para delivery: ${brl(Number(s.min_delivery))}`);
    setBusy(true);
    try {
      const r = await createOrder({
        data: {
          items: cart.items.map((i) => ({ productId: i.productId, qty: i.qty, selections: i.selections, notes: i.notes })),
          mode,
          customerName: f.name,
          phone: f.phone,
          address: mode === "delivery" ? { street: f.street, number: f.number, neighborhoodId: f.hood, complement: f.complement, reference: f.reference } : null,
          pickupTime: mode === "pickup" ? f.pickup : null,
          payment: payment as "Pix",
          changeFor: payment === "Dinheiro" && change ? Number(change.replace(",", ".")) : null,
          couponCode: coupon?.code ?? null,
          isFirstOrder: isFirst,
          notes: f.notes,
        },
      });
      if (r.error || !r.order) { toast.error(r.error ?? "Erro"); return; }
      const o = r.order;
      const lines = o.lines.map((l) => {
        const opts = Object.entries(l.selections).filter(([, v]) => v.length).map(([k, v]) => `   • ${k}: ${v.join(", ")}`).join("\n");
        return `${l.qty}x ${l.name} — ${brl(l.unit * l.qty)}${opts ? "\n" + opts : ""}${l.notes ? `\n   Obs: ${l.notes}` : ""}`;
      }).join("\n");
      const where = mode === "delivery"
        ? `🛵 *Delivery*\n${f.street}, ${f.number} - ${o.neighborhood}${f.complement ? `\n${f.complement}` : ""}${f.reference ? `\nRef.: ${f.reference}` : ""}`
        : `🏪 *Retirada na loja* às ${f.pickup}`;
      const msg = [
        `🍰 *Pedido #${o.number}* — ${s.name}`,
        `👤 ${f.name} • ${f.phone}`,
        "",
        lines,
        "",
        `Subtotal: ${brl(o.subtotal)}`,
        `Taxa de entrega: ${brl(o.fee)}`,
        o.discount ? `Desconto: -${brl(o.discount)}` : "",
        `*Total: ${brl(o.total)}*`,
        "",
        where,
        `💳 Pagamento: ${payment}${payment === "Dinheiro" && change ? ` (troco para ${brl(Number(change.replace(",", ".")))})` : ""}`,
        f.notes ? `📝 ${f.notes}` : "",
      ].filter((x) => x !== "").join("\n");
      cart.addHistory({ id: o.id, number: o.number, date: o.created_at, total: o.total, items: cart.items });
      cart.clear();
      setDone({ number: o.number, whatsUrl: `https://wa.me/${s.whatsapp}?text=${encodeURIComponent(msg)}` });
    } catch {
      toast.error("Não foi possível enviar o pedido. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_380px]">
      <div className="space-y-8">
        <h1 className="text-4xl">Seu pedido</h1>
        {!open && <p className="rounded-xl bg-muted p-4 text-sm">A loja está fechada agora. Confira nossos horários na página inicial.</p>}
        <ul className="space-y-3">
          {cart.items.map((i) => (
            <li key={i.key} className="flex gap-4 rounded-2xl border bg-card p-3 shadow-soft">
              <img src={i.image || PLACEHOLDER_IMG} alt="" className="size-20 rounded-xl object-cover" />
              <div className="flex-1 text-sm">
                <p className="font-semibold">{i.name}</p>
                {Object.entries(i.selections).filter(([, v]) => v.length).map(([k, v]) => <p key={k} className="text-muted-foreground">{k}: {v.join(", ")}</p>)}
                {i.notes && <p className="text-muted-foreground">Obs: {i.notes}</p>}
                <p className="text-muted-foreground">Unit. {brl(i.unitBase)}{i.unitExtras > 0 && ` + adicionais ${brl(i.unitExtras)}`}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Button type="button" variant="outline" size="icon" className="size-7 rounded-full" aria-label="Diminuir" onClick={() => cart.setQty(i.key, i.qty - 1)}><Minus /></Button>
                  <span className="w-6 text-center">{i.qty}</span>
                  <Button type="button" variant="outline" size="icon" className="size-7 rounded-full" aria-label="Aumentar" onClick={() => cart.setQty(i.key, i.qty + 1)}><Plus /></Button>
                  <Button type="button" variant="ghost" size="icon" className="ml-auto size-7" aria-label="Remover" onClick={() => cart.remove(i.key)}><Trash2 /></Button>
                </div>
              </div>
              <p className="font-semibold text-primary">{brl((i.unitBase + i.unitExtras) * i.qty)}</p>
            </li>
          ))}
        </ul>

        {offers.length > 0 && (
          <div className="rounded-2xl border border-dashed border-gold bg-card p-4">
            <p className="mb-2 text-sm font-semibold">✨ Ofertas especiais para você</p>
            <div className="flex flex-wrap gap-2">
              {offers.map((p) => <Link key={p.id} to="/cardapio" search={{ q: p.name }} className="rounded-full bg-secondary px-3 py-1 text-sm hover:bg-accent">{p.name}</Link>)}
            </div>
          </div>
        )}

        <section className="space-y-4">
          <h2 className="text-2xl">Entrega</h2>
          <div className="grid grid-cols-2 gap-2">
            {(["delivery", "pickup"] as const).map((m) => (
              <button type="button" key={m} onClick={() => setMode(m)} className={`rounded-xl border p-4 text-sm font-medium ${mode === m ? "border-primary bg-secondary" : "bg-card"}`}>
                {m === "delivery" ? "🛵 Delivery" : "🏪 Retirar na loja"}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome completo"><Input required maxLength={100} value={f.name} onChange={set("name")} /></Field>
            <Field label="Telefone / WhatsApp"><Input required maxLength={20} inputMode="tel" placeholder="(11) 99999-9999" value={f.phone} onChange={set("phone")} /></Field>
            {mode === "delivery" ? (
              <>
                <Field label="Rua"><Input maxLength={150} value={f.street} onChange={set("street")} /></Field>
                <Field label="Número"><Input maxLength={20} value={f.number} onChange={set("number")} /></Field>
                <Field label="Bairro">
                  <select className="h-9 w-full rounded-md border bg-card px-3 text-sm" value={f.hood} onChange={set("hood")}>
                    <option value="">Selecione</option>
                    {hoods.filter((h) => h.active).map((h) => <option key={h.id} value={h.id}>{h.name} — {brl(Number(h.fee))}</option>)}
                  </select>
                </Field>
                <Field label="Complemento"><Input maxLength={100} value={f.complement} onChange={set("complement")} /></Field>
                <div className="sm:col-span-2"><Field label="Ponto de referência"><Input maxLength={150} value={f.reference} onChange={set("reference")} /></Field></div>
              </>
            ) : (
              <div className="sm:col-span-2">
                <Field label="Horário de retirada">
                  <div className="flex flex-wrap gap-2">
                    {s.pickup_slots.map((t) => (
                      <button type="button" key={t} onClick={() => setF({ ...f, pickup: t })} className={`rounded-full border px-4 py-1.5 text-sm ${f.pickup === t ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>{t}</button>
                    ))}
                  </div>
                </Field>
              </div>
            )}
            <div className="sm:col-span-2"><Field label="Observações do pedido"><Textarea maxLength={500} value={f.notes} onChange={set("notes")} /></Field></div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl">Pagamento</h2>
          <p className="text-sm text-muted-foreground">Pagamento {mode === "delivery" ? "na entrega" : "na retirada"}.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PAYMENT_METHODS.map((m) => (
              <button type="button" key={m} onClick={() => setPayment(m)} className={`rounded-xl border p-3 text-sm ${payment === m ? "border-primary bg-secondary" : "bg-card"}`}>{m}</button>
            ))}
          </div>
          {payment === "Dinheiro" && <Field label="Troco para quanto? (opcional)"><Input inputMode="decimal" value={change} onChange={(e) => setChange(e.target.value)} placeholder="Ex.: 100" /></Field>}
        </section>
      </div>

      <aside className="h-fit space-y-4 rounded-3xl border bg-card p-6 shadow-soft lg:sticky lg:top-24">
        <h2 className="text-2xl">Resumo</h2>
        <div className="flex gap-2">
          <Input placeholder="Cupom de desconto" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} />
          <Button type="button" variant="outline" onClick={applyCoupon}>Aplicar</Button>
        </div>
        {isFirst && s.first_order_coupon && !coupon && <p className="text-xs text-muted-foreground">Primeira compra? Use <b>{s.first_order_coupon}</b></p>}
        <dl className="space-y-1 text-sm">
          <Row k="Subtotal" v={brl(cart.subtotal)} />
          <Row k="Taxa de entrega" v={mode === "pickup" ? "Grátis" : hood ? brl(fee) : "Selecione o bairro"} />
          {discount > 0 && <Row k={`Desconto (${coupon?.code})`} v={`- ${brl(discount)}`} />}
          <div className="flex justify-between border-t pt-2 text-lg font-semibold"><dt>Total</dt><dd className="text-primary">{brl(total)}</dd></div>
        </dl>
        {!minOk && <p className="text-xs text-destructive">Pedido mínimo para delivery: {brl(Number(s.min_delivery))}</p>}
        <Button type="submit" disabled={busy || !open} className="h-12 w-full rounded-full">{busy ? "Enviando…" : "Finalizar pedido"}</Button>
      </aside>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><dt className="text-muted-foreground">{k}</dt><dd>{v}</dd></div>;
}
