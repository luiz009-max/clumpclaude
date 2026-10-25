import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Clock, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { settingsQuery } from "@/lib/store";
import { brl } from "@/lib/pricing";
import { TableOrderForm } from "./ExtraPanels";
import type { Order } from "./OrdersPanel";

const CLOSED = ["Concluído", "Cancelado"];
type Line = { name: string; qty: number; unit: number; notes: string };

export function TablesBoard({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const { data: s } = useQuery(settingsQuery);
  const [orders, setOrders] = useState<Order[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [count, setCount] = useState("");
  const total = s?.table_count ?? 20;

  const load = async () => {
    const { data } = await supabase.from("orders").select("*").eq("mode", "mesa").not("status", "in", `(${CLOSED.map((x) => `"${x}"`).join(",")})`).order("created_at");
    setOrders(data ?? []);
  };
  useEffect(() => {
    load();
    const ch = supabase.channel("tables-board").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const byTable = (t: string) => orders.filter((o) => o.table_number === t);
  const tables = Array.from({ length: total }, (_, i) => String(i + 1));
  const busy = tables.filter((t) => byTable(t).length).length;

  const closeTable = async (t: string) => {
    if (!confirm(`Fechar a Mesa ${t}? Os pedidos serão marcados como concluídos.`)) return;
    const ids = byTable(t).map((o) => o.id);
    const { error } = await supabase.from("orders").update({ status: "Concluído" }).in("id", ids);
    if (error) return void toast.error("Erro ao fechar mesa");
    toast.success(`Mesa ${t} liberada`);
    setOpen(null); load();
  };

  const saveCount = async () => {
    const n = Math.min(200, Math.max(1, Number(count) || 0));
    const { error } = await supabase.from("store_settings").update({ table_count: n }).eq("id", 1);
    if (error) return void toast.error("Erro ao salvar");
    setCount(""); qc.invalidateQueries({ queryKey: ["settings"] });
  };

  const sel = open ? byTable(open) : [];
  const selTotal = sel.reduce((a, o) => a + Number(o.total), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full border border-primary/40 px-3 py-1">Mesas <b>{total}</b></span>
        <span className="rounded-full bg-secondary px-3 py-1">Ocupadas <b>{busy}</b></span>
        <span className="rounded-full bg-secondary px-3 py-1">Livres <b>{total - busy}</b></span>
        {isAdmin && (
          <form className="ml-auto flex gap-2" onSubmit={(e) => { e.preventDefault(); saveCount(); }}>
            <Input className="h-8 w-28" type="number" min={1} max={200} placeholder={`Qtd. (${total})`} value={count} onChange={(e) => setCount(e.target.value)} />
            <Button size="sm" variant="outline">Alterar nº de mesas</Button>
          </form>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {tables.map((t) => {
          const os = byTable(t);
          const occ = os.length > 0;
          const sum = os.reduce((a, o) => a + Number(o.total), 0);
          const mins = occ ? Math.round((Date.now() - new Date(os[0]!.created_at).getTime()) / 60000) : 0;
          return (
            <button key={t} onClick={() => { setOpen(t); os.forEach((o) => window.dispatchEvent(new CustomEvent("order-seen", { detail: o.id }))); }}
              className={`flex min-h-24 flex-col items-start rounded-2xl border-2 p-3 text-left transition hover:shadow-soft ${occ ? "border-accent-foreground/40 bg-accent" : "border-primary/30 bg-card"}`}>
              <span className={`flex items-center gap-1 text-xs ${occ ? "text-accent-foreground" : "text-primary"}`}>
                {occ ? <><Clock className="size-3" /> Ocupada • {mins} min</> : <><Check className="size-3" /> Livre</>}
              </span>
              <span className="mt-1 font-display text-xl">Mesa {t}</span>
              {occ && <span className="mt-auto text-sm font-semibold">{brl(sum)} <span className="font-normal text-muted-foreground">• {os.length} pedido(s)</span></span>}
            </button>
          );
        })}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4" onClick={() => setOpen(null)}>
          <div className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-t-3xl bg-background p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-2xl">Mesa {open}</h2>
              <Button size="icon" variant="ghost" onClick={() => setOpen(null)} aria-label="Fechar"><X /></Button>
            </div>
            {sel.length > 0 && (
              <div className="mb-4 space-y-2 rounded-2xl border bg-card p-4 text-sm">
                {sel.map((o) => (
                  <div key={o.id} className="border-b pb-2 last:border-0">
                    <div className="flex justify-between font-semibold"><span>#{o.number} • {o.status}</span><span>{brl(Number(o.total))}</span></div>
                    {(o.items as unknown as Line[]).map((l, i) => <p key={i} className="text-muted-foreground">{l.qty}x {l.name}</p>)}
                    {o.notes && <p className="text-xs">Obs.: {o.notes}</p>}
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1">
                  <b className="text-lg">Conta {brl(selTotal)}</b>
                  <Button onClick={() => closeTable(open)}>Fechar mesa</Button>
                </div>
              </div>
            )}
            <TableOrderForm fixedTable={open} onDone={load} />
          </div>
        </div>
      )}
    </div>
  );
}
