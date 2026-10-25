import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Printer, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { brl, ORDER_STATUSES } from "@/lib/pricing";
import { OrderAddressEditor } from "./OrderAddressEditor";

export type Order = Database["public"]["Tables"]["orders"]["Row"];
type Line = { name: string; qty: number; unit: number; selections: Record<string, string[]>; notes: string };

export function OrdersPanel({ scope = "all", canDelete = false, canEditAddress = false }: { scope?: "all" | "delivery" | "mesa"; canDelete?: boolean; canEditAddress?: boolean }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("ativos");
  const [sel, setSel] = useState<Order | null>(null);

  const load = async () => {
    let q = supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(300);
    if (scope === "mesa") q = q.eq("mode", "mesa");
    if (scope === "delivery") q = q.neq("mode", "mesa");
    const { data } = await q;
    setOrders(data ?? []);
  };
  useEffect(() => {
    load();
    const ch = supabase.channel(`orders-${scope}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (p) => {
      const o = p.new as Order;
      if ((scope === "mesa") !== (o.mode === "mesa") && scope !== "all") return;
      load();
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const setStatus = async (o: Order, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", o.id);
    if (error) return void toast.error("Erro ao atualizar");
    setOrders((cur) => cur.map((x) => (x.id === o.id ? { ...x, status } : x)));
    if (sel?.id === o.id) setSel({ ...o, status });
  };

  const remove = async (o: Order) => {
    if (!confirm(`Excluir o pedido #${o.number}? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from("orders").delete().eq("id", o.id);
    if (error) return void toast.error("Erro ao excluir");
    toast.success("Pedido excluído");
    setOrders((cur) => cur.filter((x) => x.id !== o.id));
    if (sel?.id === o.id) setSel(null);
  };

  const shown = orders.filter((o) => filter === "todos" || (filter === "ativos" ? !["Concluído", "Cancelado"].includes(o.status) : o.status === filter));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <div>
        <div className="mb-4 flex flex-wrap gap-2">
          {["ativos", "todos", ...ORDER_STATUSES].map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`rounded-full border px-3 py-1 text-xs capitalize ${filter === s ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>{s}</button>
          ))}
        </div>
        <ul className="space-y-2">
          {shown.map((o) => (
            <li key={o.id}>
              <button onClick={() => { setSel(o); window.dispatchEvent(new CustomEvent("order-seen", { detail: o.id })); }} className={`flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left text-sm ${sel?.id === o.id ? "border-primary" : ""}`}>
                <span className="font-semibold">#{o.number}</span>
                <span className="flex-1 truncate">{o.customer_name} • {modeLabel(o)}</span>
                <span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{o.status}</span>
                <span className="font-semibold text-primary">{brl(Number(o.total))}</span>
              </button>
            </li>
          ))}
          {!shown.length && <p className="py-10 text-center text-muted-foreground">Nenhum pedido.</p>}
        </ul>
      </div>
      {sel && <OrderDetail o={sel} onStatus={(s) => setStatus(sel, s)} onDelete={canDelete ? () => remove(sel) : undefined} onAddressSaved={canEditAddress ? (updated) => { setOrders((cur) => cur.map((o) => o.id === updated.id ? updated : o)); setSel(updated); } : undefined} />}
    </div>
  );
}

function modeLabel(o: Order) {
  return o.mode === "mesa" ? `Mesa ${o.table_number}` : o.mode === "delivery" ? "Delivery" : `Retirada ${o.pickup_time}`;
}

function OrderDetail({ o, onStatus, onDelete, onAddressSaved }: { o: Order; onStatus: (s: string) => void; onDelete?: (() => void) | undefined; onAddressSaved?: ((order: Order) => void) | undefined }) {
  const lines = o.items as unknown as Line[];
  const addr = o.address as null | { street: string; number: string; neighborhood: string; complement: string; reference: string };
  return (
    <div id="print-order" className="h-fit space-y-3 rounded-2xl border bg-card p-5 text-sm shadow-soft lg:sticky lg:top-24">
      <div className="flex items-center justify-between">
        <h3 className="text-xl">Pedido #{o.number}</h3>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => printOrder(o)}><Printer /> Imprimir</Button>
          {onDelete && <Button size="sm" variant="outline" className="text-destructive" onClick={onDelete} aria-label="Excluir pedido"><Trash2 /></Button>}
        </div>
      </div>
      {o.mode === "mesa" ? <p><b>Mesa {o.table_number}</b> • {o.customer_name}{o.waiter_email ? ` • atendido por ${o.waiter_email}` : ""}</p> : <p>{o.customer_name} • <a className="text-primary" href={`https://wa.me/55${o.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">{o.phone}</a></p>}
      <p className="text-muted-foreground">{o.mode === "mesa" ? "Consumo no local" : o.mode === "delivery" && addr ? `${addr.street}, ${addr.number} - ${addr.neighborhood} ${addr.complement} ${addr.reference ? `(Ref.: ${addr.reference})` : ""}` : `Retirada às ${o.pickup_time}`}</p>
      {o.mode === "delivery" && onAddressSaved && <OrderAddressEditor key={o.id} order={o} onSaved={onAddressSaved} />}
      <ul className="space-y-1 border-y py-2">
        {lines.map((l, i) => (
          <li key={i}>
            <div className="flex justify-between"><span>{l.qty}x {l.name}</span><span>{brl(l.unit * l.qty)}</span></div>
            {Object.entries(l.selections).filter(([, v]) => v.length).map(([k, v]) => <p key={k} className="pl-4 text-xs text-muted-foreground">{k}: {v.join(", ")}</p>)}
            {l.notes && <p className="pl-4 text-xs text-muted-foreground">Obs: {l.notes}</p>}
          </li>
        ))}
      </ul>
      <p>Subtotal {brl(Number(o.subtotal))} • Entrega {brl(Number(o.delivery_fee))} {Number(o.discount) > 0 && `• Desconto ${brl(Number(o.discount))} (${o.coupon_code})`}</p>
      <p className="text-lg font-semibold">Total {brl(Number(o.total))}</p>
      <p>Pagamento: {o.payment_method}{o.change_for ? ` — troco para ${brl(Number(o.change_for))}` : ""}</p>
      {o.notes && <p>Obs.: {o.notes}</p>}
      <div className="flex flex-wrap gap-1.5 pt-2">
        {ORDER_STATUSES.map((s) => (
          <button key={s} onClick={() => onStatus(s)} className={`rounded-full border px-3 py-1 text-xs ${o.status === s ? "border-primary bg-primary text-primary-foreground" : ""}`}>{s}</button>
        ))}
      </div>
    </div>
  );
}

export function printOrder(o: Order) {
  const lines = o.items as unknown as Line[];
  const w = window.open("", "_blank", "width=380,height=600");
  if (!w) return;
  const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));
  w.document.write(`<pre style="font:13px monospace">PEDIDO #${o.number}\n${new Date(o.created_at).toLocaleString("pt-BR")}\n${esc(o.customer_name)} - ${esc(o.phone)}\n${o.mode === "mesa" ? "MESA " + o.table_number : o.mode === "delivery" ? "DELIVERY" : "RETIRADA " + o.pickup_time}\n------------------------\n${lines.map((l) => `${l.qty}x ${esc(l.name)}  ${brl(l.unit * l.qty)}\n${Object.entries(l.selections).filter(([, v]) => v.length).map(([k, v]) => `  ${esc(k)}: ${esc(v.join(", "))}`).join("\n")}${l.notes ? `\n  Obs: ${esc(l.notes)}` : ""}`).join("\n")}\n------------------------\nTOTAL ${brl(Number(o.total))}\nPagamento: ${o.payment_method}</pre>`);
  w.document.close();
  w.print();
}
