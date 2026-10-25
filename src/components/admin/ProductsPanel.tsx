import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { catalogQuery, GROUPS, BADGES, PLACEHOLDER_IMG, type Product, type Category } from "@/lib/store";
import { brl, type ProductOption } from "@/lib/pricing";
import { uploadImage } from "./upload";

export function ProductsPanel() {
  const qc = useQueryClient();
  const { data } = useQuery(catalogQuery);
  const [edit, setEdit] = useState<Partial<Product> | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["catalog"] });
  if (!data) return null;
  const { products, categories } = data;

  const patch = async (id: string, v: Partial<Product>) => {
    const { error } = await supabase.from("products").update(v as never).eq("id", id);
    if (error) toast.error("Erro ao salvar"); else refresh();
  };

  return (
    <div className="space-y-10">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-2xl">Produtos</h2>
          <Button onClick={() => setEdit({ name: "", description: "", price: 0, options: [], available: true, active: true, category_id: categories[0]?.id ?? null })}><Plus /> Novo produto</Button>
        </div>
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs"><tr><th className="p-3">Produto</th><th>Categoria</th><th>Preço</th><th>Disponível</th><th>Promoção</th><th>Ativo</th><th /></tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="flex items-center gap-2 p-2"><img src={p.image_url || PLACEHOLDER_IMG} alt="" className="size-10 rounded-lg object-cover" />{p.name}</td>
                  <td className="text-muted-foreground">{categories.find((c) => c.id === p.category_id)?.name}</td>
                  <td>{brl(Number(p.price))}{p.promo_price ? <span className="ml-1 text-primary">→ {brl(Number(p.promo_price))}</span> : null}</td>
                  <td><Switch checked={p.available} onCheckedChange={(v) => patch(p.id, { available: v })} aria-label="Disponível" /></td>
                  <td><Switch checked={p.badge === "promocao"} onCheckedChange={(v) => patch(p.id, { badge: v ? "promocao" : null })} aria-label="Promoção" /></td>
                  <td><Switch checked={p.active} onCheckedChange={(v) => patch(p.id, { active: v })} aria-label="Ativo" /></td>
                  <td className="pr-2 text-right">
                    <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => setEdit(p)}><Pencil /></Button>
                    <Button size="icon" variant="ghost" aria-label="Excluir" onClick={async () => { if (confirm(`Excluir ${p.name}?`)) { await supabase.from("products").delete().eq("id", p.id); refresh(); } }}><Trash2 /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <CategoriesEditor categories={categories} refresh={refresh} />
      {edit && <ProductForm initial={edit} categories={categories} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); refresh(); }} />}
    </div>
  );
}

function CategoriesEditor({ categories, refresh }: { categories: Category[]; refresh: () => void }) {
  const [name, setName] = useState("");
  const [group, setGroup] = useState<string>(GROUPS[0]!);
  const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order);
  const move = async (i: number, d: number) => {
    const a = sorted[i], b = sorted[i + d];
    if (!a || !b) return;
    await Promise.all([
      supabase.from("categories").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("categories").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    refresh();
  };
  return (
    <section>
      <h2 className="mb-3 text-2xl">Categorias</h2>
      <form className="mb-3 flex flex-wrap gap-2" onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        await supabase.from("categories").insert({ name: name.trim(), group_name: group ?? "Doces e sobremesas", sort_order: (sorted.at(-1)?.sort_order ?? 0) + 1 });
        setName(""); refresh();
      }}>
        <Input className="max-w-xs" placeholder="Nova categoria" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="rounded-md border bg-card px-3 text-sm" value={group} onChange={(e) => setGroup(e.target.value)}>{GROUPS.map((g) => <option key={g}>{g}</option>)}</select>
        <Button type="submit"><Plus /> Adicionar</Button>
      </form>
      <ul className="divide-y rounded-2xl border bg-card">
        {sorted.map((c, i) => (
          <li key={c.id} className="flex items-center gap-2 p-2 text-sm">
            <Input className="h-8 max-w-xs" defaultValue={c.name} onBlur={async (e) => { if (e.target.value !== c.name) { await supabase.from("categories").update({ name: e.target.value }).eq("id", c.id); refresh(); } }} />
            <select className="h-8 rounded-md border bg-card px-2 text-xs" defaultValue={c.group_name} onChange={async (e) => { await supabase.from("categories").update({ group_name: e.target.value }).eq("id", c.id); refresh(); }}>{GROUPS.map((g) => <option key={g}>{g}</option>)}</select>
            <Switch checked={c.active} onCheckedChange={async (v) => { await supabase.from("categories").update({ active: v }).eq("id", c.id); refresh(); }} aria-label="Ativa" />
            <div className="ml-auto flex">
              <Button size="icon" variant="ghost" aria-label="Subir" onClick={() => move(i, -1)}><ArrowUp /></Button>
              <Button size="icon" variant="ghost" aria-label="Descer" onClick={() => move(i, 1)}><ArrowDown /></Button>
              <Button size="icon" variant="ghost" aria-label="Excluir" onClick={async () => { if (confirm(`Excluir ${c.name}?`)) { await supabase.from("categories").delete().eq("id", c.id); refresh(); } }}><Trash2 /></Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProductForm({ initial, categories, onClose, onSaved }: { initial: Partial<Product>; categories: Category[]; onClose: () => void; onSaved: () => void }) {
  const [p, setP] = useState<Partial<Product>>(initial);
  const [busy, setBusy] = useState(false);
  const opts = (p.options ?? []) as ProductOption[];
  const setOpts = (o: ProductOption[]) => setP({ ...p, options: o });

  const save = async () => {
    if (!p.name?.trim()) return void toast.error("Informe o nome");
    if (Number(p.price) < 0) return void toast.error("Preço inválido");
    setBusy(true);
    const row = {
      name: p.name.trim(), description: p.description ?? "", price: Number(p.price) || 0,
      promo_price: p.promo_price ? Number(p.promo_price) : null, size_label: p.size_label || null,
      image_url: p.image_url || null, badge: p.badge || null, category_id: p.category_id || null,
      available: p.available ?? true, active: p.active ?? true, featured: p.featured ?? false,
      options: opts.filter((o) => o.name.trim()) as never,
    };
    const { error } = p.id ? await supabase.from("products").update(row).eq("id", p.id) : await supabase.from("products").insert(row);
    setBusy(false);
    if (error) return void toast.error("Erro ao salvar: " + error.message);
    toast.success("Produto salvo");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogTitle className="text-2xl">{p.id ? "Editar produto" : "Novo produto"}</DialogTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2 flex items-center gap-3">
            <img src={p.image_url || PLACEHOLDER_IMG} alt="" className="size-20 rounded-xl object-cover" />
            <Input type="file" accept="image/*" onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return;
              try { const url = await uploadImage(f); setP((x) => ({ ...x, image_url: url })); toast.success("Foto enviada"); } catch (err) { toast.error((err as Error).message); }
            }} />
          </div>
          <L label="Nome"><Input value={p.name ?? ""} onChange={(e) => setP({ ...p, name: e.target.value })} /></L>
          <L label="Categoria"><select className="h-9 w-full rounded-md border bg-card px-3 text-sm" value={p.category_id ?? ""} onChange={(e) => setP({ ...p, category_id: e.target.value })}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></L>
          <div className="sm:col-span-2"><L label="Descrição / ingredientes"><Textarea value={p.description ?? ""} onChange={(e) => setP({ ...p, description: e.target.value })} /></L></div>
          <L label="Preço (R$)"><Input type="number" step="0.01" min="0" value={p.price ?? 0} onChange={(e) => setP({ ...p, price: Number(e.target.value) })} /></L>
          <L label="Preço promocional (opcional)"><Input type="number" step="0.01" min="0" value={p.promo_price ?? ""} onChange={(e) => setP({ ...p, promo_price: e.target.value ? Number(e.target.value) : null })} /></L>
          <L label="Peso / tamanho"><Input value={p.size_label ?? ""} onChange={(e) => setP({ ...p, size_label: e.target.value })} /></L>
          <L label="Selo"><select className="h-9 w-full rounded-md border bg-card px-3 text-sm" value={p.badge ?? ""} onChange={(e) => setP({ ...p, badge: e.target.value || null })}><option value="">Nenhum</option>{Object.entries(BADGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></L>
          <div className="flex gap-6 sm:col-span-2 text-sm">
            <label className="flex items-center gap-2"><Switch checked={p.available ?? true} onCheckedChange={(v) => setP({ ...p, available: v })} /> Disponível</label>
            <label className="flex items-center gap-2"><Switch checked={p.featured ?? false} onCheckedChange={(v) => setP({ ...p, featured: v })} /> Destaque</label>
            <label className="flex items-center gap-2"><Switch checked={p.active ?? true} onCheckedChange={(v) => setP({ ...p, active: v })} /> Ativo</label>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between"><p className="font-semibold">Opções e adicionais</p><Button size="sm" variant="outline" onClick={() => setOpts([...opts, { name: "", type: "multi", required: false, choices: [] }])}><Plus /> Grupo</Button></div>
          {opts.map((o, i) => (
            <div key={i} className="space-y-2 rounded-xl border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Input className="h-8 max-w-[200px]" placeholder="Ex.: Tamanho" value={o.name} onChange={(e) => setOpts(opts.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                <select className="h-8 rounded-md border bg-card px-2 text-xs" value={o.type} onChange={(e) => setOpts(opts.map((x, j) => j === i ? { ...x, type: e.target.value as "single" } : x))}><option value="single">Escolha única</option><option value="multi">Múltipla escolha</option></select>
                <label className="flex items-center gap-1 text-xs"><Switch checked={o.required} onCheckedChange={(v) => setOpts(opts.map((x, j) => j === i ? { ...x, required: v } : x))} /> Obrigatório</label>
                <Button size="icon" variant="ghost" className="ml-auto" aria-label="Remover grupo" onClick={() => setOpts(opts.filter((_, j) => j !== i))}><Trash2 /></Button>
              </div>
              {o.choices.map((c, k) => (
                <div key={k} className="flex gap-2 pl-4">
                  <Input className="h-8" placeholder="Opção" value={c.label} onChange={(e) => setOpts(opts.map((x, j) => j === i ? { ...x, choices: x.choices.map((y, m) => m === k ? { ...y, label: e.target.value } : y) } : x))} />
                  <Input className="h-8 w-28" type="number" step="0.01" placeholder="+R$" value={c.price} onChange={(e) => setOpts(opts.map((x, j) => j === i ? { ...x, choices: x.choices.map((y, m) => m === k ? { ...y, price: Number(e.target.value) } : y) } : x))} />
                  <Button size="icon" variant="ghost" aria-label="Remover opção" onClick={() => setOpts(opts.map((x, j) => j === i ? { ...x, choices: x.choices.filter((_, m) => m !== k) } : x))}><Trash2 /></Button>
                </div>
              ))}
              <Button size="sm" variant="ghost" className="ml-4" onClick={() => setOpts(opts.map((x, j) => j === i ? { ...x, choices: [...x.choices, { label: "", price: 0 }] } : x))}><Plus /> Opção</Button>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancelar</Button><Button disabled={busy} onClick={save}>Salvar</Button></div>
      </DialogContent>
    </Dialog>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
