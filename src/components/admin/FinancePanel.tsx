import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Pie, PieChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/pricing";
import type { Order } from "./OrdersPanel";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export function FinancePanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => {
    const since = new Date(Date.now() - 31 * 864e5).toISOString();
    supabase.from("orders").select("*").gte("created_at", since).neq("status", "Cancelado").then(({ data }) => setOrders(data ?? []));
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sum = (from: number) => orders.filter((o) => new Date(o.created_at).getTime() >= from).reduce((s, o) => s + Number(o.total), 0);
    const daily = Array.from({ length: 14 }).map((_, i) => {
      const d = new Date(startDay - (13 - i) * 864e5);
      const next = d.getTime() + 864e5;
      return { dia: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), total: orders.filter((o) => { const t = new Date(o.created_at).getTime(); return t >= d.getTime() && t < next; }).reduce((s, o) => s + Number(o.total), 0) };
    });
    const pay: Record<string, number> = {};
    const prod: Record<string, number> = {};
    for (const o of orders) {
      pay[o.payment_method] = (pay[o.payment_method] ?? 0) + Number(o.total);
      for (const l of o.items as unknown as { name: string; qty: number }[]) prod[l.name] = (prod[l.name] ?? 0) + l.qty;
    }
    const total = orders.reduce((s, o) => s + Number(o.total), 0);
    return {
      day: sum(startDay), week: sum(startDay - 6 * 864e5), month: sum(startDay - 29 * 864e5),
      count: orders.length, ticket: orders.length ? total / orders.length : 0, daily,
      pay: Object.entries(pay).map(([name, value]) => ({ name, value })),
      top: Object.entries(prod).sort((a, b) => b[1] - a[1]).slice(0, 8),
    };
  }, [orders]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[["Hoje", brl(stats.day)], ["7 dias", brl(stats.week)], ["30 dias", brl(stats.month)], ["Pedidos (30d)", String(stats.count)], ["Ticket médio", brl(stats.ticket)]].map(([k, v]) => (
          <div key={k} className="rounded-2xl border bg-card p-4 shadow-soft"><p className="text-xs text-muted-foreground">{k}</p><p className="font-display text-2xl">{v}</p></div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border bg-card p-4 shadow-soft">
          <p className="mb-2 font-semibold">Faturamento diário (14 dias)</p>
          <div className="h-64"><ResponsiveContainer><BarChart data={stats.daily}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="dia" fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={(v: number) => brl(v)} /><Bar dataKey="total" fill="var(--chart-1)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-soft">
          <p className="mb-2 font-semibold">Por forma de pagamento</p>
          <div className="h-48"><ResponsiveContainer><PieChart><Pie data={stats.pay} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70}>{stats.pay.map((_, i) => <Cell key={i} fill={COLORS[i % 5]} />)}</Pie><Tooltip formatter={(v: number) => brl(v)} /></PieChart></ResponsiveContainer></div>
          <ul className="text-sm">{stats.pay.map((p, i) => <li key={p.name} className="flex justify-between"><span><span className="mr-2 inline-block size-2 rounded-full" style={{ background: COLORS[i % 5] }} />{p.name}</span><span>{brl(p.value)}</span></li>)}</ul>
        </div>
      </div>
      <div className="rounded-2xl border bg-card p-4 shadow-soft">
        <p className="mb-2 font-semibold">Produtos mais vendidos (30 dias)</p>
        {stats.top.length ? <ol className="space-y-1 text-sm">{stats.top.map(([n, q], i) => <li key={n} className="flex justify-between"><span>{i + 1}. {n}</span><span>{q} un.</span></li>)}</ol> : <p className="text-sm text-muted-foreground">Sem vendas no período.</p>}
      </div>
    </div>
  );
}
