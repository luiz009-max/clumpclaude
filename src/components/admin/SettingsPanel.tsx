import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { neighborhoodsQuery, settingsQuery, type Settings } from "@/lib/store";
import { DAYS } from "@/lib/pricing";
import { uploadImage } from "./upload";

type CouponRow = Database["public"]["Tables"]["coupons"]["Row"];

export function SettingsPanel() {
  const qc = useQueryClient();
  const { data: s } = useQuery(settingsQuery);
  const [form, setForm] = useState<Settings | null>(null);
  useEffect(() => { if (s) setForm(s); }, [s]);
  if (!form) return null;
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setForm({ ...form, [k]: v });

  const save = async () => {
    const { id: _id, updated_at: _u, ...rest } = form;
    const { error } = await supabase.from("store_settings").update({ ...rest, hours: rest.hours as never, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) return void toast.error("Erro ao salvar");
    toast.success("Configurações salvas");
    qc.invalidateQueries({ queryKey: ["settings"] });
  };
  const img = async (k: "logo_url" | "banner_url", f?: File) => {
    if (!f) return;
    try { set(k, await uploadImage(f)); toast.success("Imagem enviada — clique em Salvar"); } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-10">
      <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-soft">
        <h2 className="text-2xl">Loja</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <F label="Frase de destaque"><Input value={form.slogan} onChange={(e) => set("slogan", e.target.value)} /></F>
          <F label="WhatsApp (com DDI e DDD, só números)"><Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value.replace(/\D/g, ""))} /></F>
          <F label="Instagram (sem @)"><Input value={form.instagram ?? ""} onChange={(e) => set("instagram", e.target.value)} /></F>
          <F label="Endereço"><Input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} /></F>
          <F label="Telefone"><Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></F>
          <F label="Banner principal"><div className="flex items-center gap-2">{form.banner_url && <img src={form.banner_url} alt="" className="h-10 w-16 rounded object-cover" />}<Input type="file" accept="image/*" onChange={(e) => img("banner_url", e.target.files?.[0])} /></div></F>
          <F label="Faixa de promoção"><Input value={form.promo_banner ?? ""} onChange={(e) => set("promo_banner", e.target.value)} /></F>
          <F label="Promoção termina em"><Input type="datetime-local" value={form.promo_ends_at ? form.promo_ends_at.slice(0, 16) : ""} onChange={(e) => set("promo_ends_at", e.target.value ? new Date(e.target.value).toISOString() : null)} /></F>
          <F label="Cupom de primeira compra (exibido no site)"><Input value={form.first_order_coupon ?? ""} onChange={(e) => set("first_order_coupon", e.target.value.toUpperCase())} /></F>
          <F label="Pedido mínimo para delivery (R$)"><Input type="number" step="0.01" value={form.min_delivery} onChange={(e) => set("min_delivery", Number(e.target.value))} /></F>
        </div>

        <h3 className="pt-4 text-xl">Funcionamento</h3>
        <div className="flex gap-2 text-sm">
          {[["auto", "Pelos horários"], ["open", "Forçar aberto"], ["closed", "Forçar fechado"]].map(([v, l]) => (
            <button key={v} onClick={() => set("open_mode", v!)} className={`rounded-full border px-3 py-1 ${form.open_mode === v ? "border-primary bg-primary text-primary-foreground" : ""}`}>{l}</button>
          ))}
        </div>
        <div className="grid gap-2">
          {form.hours.map((h, i) => (
            <div key={h.day} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="w-20">{DAYS[h.day]}</span>
              <Input type="time" className="h-8 w-28" value={h.open} onChange={(e) => set("hours", form.hours.map((x, j) => j === i ? { ...x, open: e.target.value } : x))} />
              <Input type="time" className="h-8 w-28" value={h.close} onChange={(e) => set("hours", form.hours.map((x, j) => j === i ? { ...x, close: e.target.value } : x))} />
              <label className="flex items-center gap-1"><Switch checked={!h.closed} onCheckedChange={(v) => set("hours", form.hours.map((x, j) => j === i ? { ...x, closed: !v } : x))} /> Aberto</label>
            </div>
          ))}
        </div>
        <F label="Horários de retirada (separados por vírgula)"><Input value={form.pickup_slots.join(", ")} onChange={(e) => set("pickup_slots", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} /></F>
        <Button onClick={save}>Salvar configurações</Button>
      </section>
      <Neighborhoods />
      <Coupons />
    </div>
  );
}

function Neighborhoods() {
  const qc = useQueryClient();
  const { data = [] } = useQuery(neighborhoodsQuery);
  const [name, setName] = useState("");
  const [fee, setFee] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["neighborhoods"] });
  return (
    <section className="space-y-3 rounded-2xl border bg-card p-5 shadow-soft">
      <h2 className="text-2xl">Bairros e taxas de entrega</h2>
      <form className="flex flex-wrap gap-2" onSubmit={async (e) => { e.preventDefault(); if (!name.trim()) return; await supabase.from("neighborhoods").insert({ name: name.trim(), fee: Number(fee) || 0 }); setName(""); setFee(""); refresh(); }}>
        <Input className="max-w-xs" placeholder="Bairro" value={name} onChange={(e) => setName(e.target.value)} />
        <Input className="w-28" type="number" step="0.01" placeholder="Taxa" value={fee} onChange={(e) => setFee(e.target.value)} />
        <Button type="submit"><Plus /> Adicionar</Button>
      </form>
      <ul className="divide-y text-sm">
        {data.map((n) => (
          <li key={n.id} className="flex items-center gap-2 py-2">
            <span className="flex-1">{n.name}</span>
            <Input className="h-8 w-28" type="number" step="0.01" defaultValue={n.fee} onBlur={async (e) => { await supabase.from("neighborhoods").update({ fee: Number(e.target.value) }).eq("id", n.id); refresh(); }} />
            <Switch checked={n.active} onCheckedChange={async (v) => { await supabase.from("neighborhoods").update({ active: v }).eq("id", n.id); refresh(); }} aria-label="Ativo" />
            <Button size="icon" variant="ghost" aria-label="Excluir" onClick={async () => { await supabase.from("neighborhoods").delete().eq("id", n.id); refresh(); }}><Trash2 /></Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Coupons() {
  const [list, setList] = useState<CouponRow[]>([]);
  const [c, setC] = useState({ code: "", kind: "percent", value: "", min_order: "", first_order_only: false, expires_at: "" });
  const load = () => supabase.from("coupons").select("*").order("created_at").then(({ data }) => setList(data ?? []));
  useEffect(() => { load(); }, []);
  return (
    <section className="space-y-3 rounded-2xl border bg-card p-5 shadow-soft">
      <h2 className="text-2xl">Cupons de desconto</h2>
      <form className="flex flex-wrap items-end gap-2 text-sm" onSubmit={async (e) => {
        e.preventDefault();
        if (!c.code.trim() || !Number(c.value)) return void toast.error("Informe código e valor");
        const { error } = await supabase.from("coupons").insert({ code: c.code.trim().toUpperCase(), kind: c.kind, value: Number(c.value), min_order: Number(c.min_order) || 0, first_order_only: c.first_order_only, expires_at: c.expires_at ? new Date(c.expires_at).toISOString() : null });
        if (error) return void toast.error(error.message.includes("duplicate") ? "Código já existe" : "Erro");
        setC({ code: "", kind: "percent", value: "", min_order: "", first_order_only: false, expires_at: "" }); load();
      }}>
        <Input className="w-36" placeholder="CÓDIGO" value={c.code} onChange={(e) => setC({ ...c, code: e.target.value })} />
        <select className="h-9 rounded-md border bg-card px-2" value={c.kind} onChange={(e) => setC({ ...c, kind: e.target.value })}><option value="percent">%</option><option value="fixed">R$</option></select>
        <Input className="w-24" type="number" placeholder="Valor" value={c.value} onChange={(e) => setC({ ...c, value: e.target.value })} />
        <Input className="w-32" type="number" placeholder="Pedido mín." value={c.min_order} onChange={(e) => setC({ ...c, min_order: e.target.value })} />
        <Input className="w-48" type="datetime-local" value={c.expires_at} onChange={(e) => setC({ ...c, expires_at: e.target.value })} />
        <label className="flex items-center gap-1"><Switch checked={c.first_order_only} onCheckedChange={(v) => setC({ ...c, first_order_only: v })} /> 1ª compra</label>
        <Button type="submit"><Plus /> Criar</Button>
      </form>
      <ul className="divide-y text-sm">
        {list.map((x) => (
          <li key={x.id} className="flex items-center gap-3 py-2">
            <b className="w-32">{x.code}</b>
            <span className="flex-1 text-muted-foreground">{x.kind === "percent" ? `${x.value}%` : `R$ ${x.value}`} • mín. R$ {x.min_order}{x.first_order_only ? " • 1ª compra" : ""}{x.expires_at ? ` • até ${new Date(x.expires_at).toLocaleDateString("pt-BR")}` : ""}</span>
            <Switch checked={x.active} onCheckedChange={async (v) => { await supabase.from("coupons").update({ active: v }).eq("id", x.id); load(); }} aria-label="Ativo" />
            <Button size="icon" variant="ghost" aria-label="Excluir" onClick={async () => { await supabase.from("coupons").delete().eq("id", x.id); load(); }}><Trash2 /></Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
