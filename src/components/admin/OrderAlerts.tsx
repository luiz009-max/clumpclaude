import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { printOrder, type Order } from "./OrdersPanel";

const KEY = "order-alerts";
type Prefs = { sound: boolean; autoPrint: boolean };

let ctx: AudioContext | null = null;
export function playChime() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const t0 = ctx.currentTime;
    [880, 1175, 1568, 880, 1175, 1568].forEach((f, i) => {
      const o = ctx!.createOscillator(), g = ctx!.createGain();
      o.type = "sine"; o.frequency.value = f;
      const t = t0 + i * 0.18 + (i >= 3 ? 0.35 : 0);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g).connect(ctx!.destination);
      o.start(t); o.stop(t + 0.4);
    });
  } catch { /* audio not available */ }
}

export function OrderAlerts({ staffOnly }: { staffOnly: boolean }) {
  const [prefs, setPrefs] = useState<Prefs>({ sound: true, autoPrint: false });
  const ref = useRef(prefs);
  const [pending, setPending] = useState<Order[]>([]);
  // Keep ringing until every new order has been viewed.
  useEffect(() => {
    if (!pending.length || !prefs.sound) return;
    const t = setInterval(playChime, 4000);
    return () => clearInterval(t);
  }, [pending.length, prefs.sound]);
  useEffect(() => {
    const seen = (e: Event) => { const id = (e as CustomEvent<string>).detail; setPending((c) => c.filter((x) => x.id !== id)); };
    window.addEventListener("order-seen", seen);
    return () => window.removeEventListener("order-seen", seen);
  }, []);
  useEffect(() => {
    try { const v = localStorage.getItem(KEY); if (v) setPrefs({ ...prefs, ...JSON.parse(v) }); } catch {}
    // Browsers only allow sound after a tap/click on the page.
    const unlock = () => { ctx ??= new AudioContext(); void ctx.resume(); };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);
  useEffect(() => { ref.current = prefs; localStorage.setItem(KEY, JSON.stringify(prefs)); }, [prefs]);

  useEffect(() => {
    const ch = supabase.channel("order-alerts").on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (p) => {
      const o = p.new as Order;
      if (staffOnly && o.mode !== "mesa") return;
      const where = o.mode === "mesa" ? `Mesa ${o.table_number}` : o.mode === "delivery" ? "Delivery" : "Retirada";
      toast(`Novo pedido #${o.number} — ${where}`, { description: o.customer_name, icon: <Bell className="size-4" />, duration: 10000 });
      setPending((c) => [...c, o]);
      if (ref.current.sound) playChime();
      if (ref.current.autoPrint) printOrder(o);
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [staffOnly]);

  return (
    <>
    {pending.length > 0 && (
      <div className="sticky top-2 z-40 mb-3 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-primary bg-primary p-3 text-primary-foreground shadow-soft animate-pulse">
        <Bell className="size-5" />
        <span className="flex-1 font-semibold">{pending.length} pedido(s) novo(s) aguardando: {pending.map((o) => `#${o.number}`).join(", ")}</span>
        <button className="rounded-full bg-background px-4 py-1.5 text-sm font-semibold text-foreground" onClick={() => setPending([])}>Visualizei</button>
      </div>
    )}
    <div className="mb-4 flex flex-wrap items-center gap-4 rounded-2xl border bg-card px-4 py-2 text-sm">
      <label className="flex items-center gap-2">
        {prefs.sound ? <Bell className="size-4 text-primary" /> : <BellOff className="size-4 text-muted-foreground" />}
        <Switch checked={prefs.sound} onCheckedChange={(v) => { setPrefs({ ...prefs, sound: v }); if (v) playChime(); }} /> Som de novo pedido
      </label>
      <label className="flex items-center gap-2">
        <Printer className="size-4 text-primary" />
        <Switch checked={prefs.autoPrint} onCheckedChange={(v) => setPrefs({ ...prefs, autoPrint: v })} /> Imprimir automaticamente
      </label>
      <button className="text-xs text-primary underline" onClick={playChime}>Testar som</button>
    </div>
    </>
  );
}
