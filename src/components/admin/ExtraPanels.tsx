import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Minus, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { catalogQuery, settingsQuery } from "@/lib/store";
import { basePrice, brl } from "@/lib/pricing";
import { createStaff, listAllUsers, listTeam, setRole } from "@/lib/admin.functions";
import { displayLogin } from "@/lib/staff-login";
import { createTableOrder } from "@/lib/orders.functions";
import { uploadImage } from "./upload";
import { F } from "./SettingsPanel";

const card = "space-y-4 rounded-2xl border bg-card p-5 shadow-soft";

export function CompanyPanel() {
  const qc = useQueryClient();
  const { data: s } = useQuery(settingsQuery);
  const [name, setName] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  useEffect(() => { if (s) { setName(s.name); setLogo(s.logo_url); } }, [s]);
  const save = async () => {
    if (!name.trim()) return void toast.error("Informe o nome da empresa");
    const { error } = await supabase.from("store_settings").update({ name: name.trim(), logo_url: logo, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) return void toast.error("Erro ao salvar");
    toast.success("Empresa atualizada");
    qc.invalidateQueries({ queryKey: ["settings"] });
  };
  return (
    <section className={`${card} max-w-xl`}>
      <h2 className="text-2xl">Empresa</h2>
      <F label="Nome da empresa"><Input value={name} onChange={(e) => setName(e.target.value)} /></F>
      <F label="Logotipo">
        <div className="flex items-center gap-3">
          {logo ? <img src={logo} alt="Logotipo" className="size-16 rounded-full border object-cover" /> : <div className="size-16 rounded-full border bg-muted" />}
          <Input type="file" accept="image/*" onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return;
            try { setLogo(await uploadImage(f)); toast.success("Logo enviada — clique em Salvar"); } catch (err) { toast.error((err as Error).message); }
          }} />
          {logo && <Button variant="ghost" size="sm" onClick={() => setLogo(null)}>Remover</Button>}
        </div>
      </F>
      <Button onClick={save}>Salvar</Button>
    </section>
  );
}

type PrinterRow = Database["public"]["Tables"]["printers"]["Row"];
const CONNS = [
  { v: "Navegador", t: "Impressora do computador", d: "Já instalada no Windows/Mac. Mais simples." },
  { v: "Rede (IP)", t: "Wi‑Fi / cabo de rede", d: "Precisa do IP (aparece na folha de teste da impressora)." },
  { v: "USB", t: "Cabo USB", d: "Ligada direto no computador do caixa." },
  { v: "Bluetooth", t: "Bluetooth", d: "Impressoras portáteis de bobina." },
];
const SECTORS = ["Cozinha", "Balcão", "Caixa", "Bar"];
const PAPERS = [{ v: "58mm", t: "Bobina pequena (58mm)" }, { v: "80mm", t: "Bobina grande (80mm)" }, { v: "A4", t: "Folha A4" }];

function Chip({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`rounded-xl border-2 px-4 py-2 text-sm ${on ? "border-primary bg-primary text-primary-foreground" : "bg-card"}`}>{children}</button>;
}

function testPrint(name: string, paper: string) {
  const w = window.open("", "_blank", "width=380,height=500");
  if (!w) return;
  const width = paper === "58mm" ? "48mm" : paper === "80mm" ? "72mm" : "auto";
  w.document.write(`<pre style="font:13px monospace;width:${width}">*** TESTE DE IMPRESSÃO ***\n${name.replace(/[<>&]/g, "")}\n${new Date().toLocaleString("pt-BR")}\n\nSe você está lendo isto,\na impressora está funcionando!</pre>`);
  w.document.close(); w.print();
}

export function PrintersPanel() {
  const [list, setList] = useState<PrinterRow[]>([]);
  const [adding, setAdding] = useState(false);
  const [sector, setSector] = useState("Cozinha");
  const [conn, setConn] = useState("Navegador");
  const [paper, setPaper] = useState("80mm");
  const [address, setAddress] = useState("");
  const load = () => supabase.from("printers").select("*").order("created_at").then(({ data }) => setList(data ?? []));
  useEffect(() => { load(); }, []);
  const save = async () => {
    if (conn === "Rede (IP)" && !address.trim()) return void toast.error("Informe o IP da impressora");
    const name = `Impressora ${sector}`;
    const { error } = await supabase.from("printers").insert({ name, sector, connection: conn, address: address.trim(), paper_width: paper, copies: 1 });
    if (error) return void toast.error("Erro ao cadastrar");
    toast.success(`${name} cadastrada!`);
    setAdding(false); setAddress(""); load();
  };
  return (
    <section className={card}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl">Impressoras</h2>
        {!adding && <Button onClick={() => setAdding(true)}><Plus /> Adicionar impressora</Button>}
      </div>
      {adding && (
        <div className="space-y-5 rounded-2xl border-2 border-dashed border-primary/40 p-4">
          <div><p className="mb-2 font-semibold">1. Onde ela fica?</p><div className="flex flex-wrap gap-2">{SECTORS.map((x) => <Chip key={x} on={sector === x} onClick={() => setSector(x)}>{x}</Chip>)}</div></div>
          <div>
            <p className="mb-2 font-semibold">2. Como ela está ligada?</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {CONNS.map((c) => (
                <button key={c.v} type="button" onClick={() => setConn(c.v)} className={`rounded-xl border-2 p-3 text-left text-sm ${conn === c.v ? "border-primary bg-primary/10" : "bg-card"}`}>
                  <b>{c.t}</b><p className="text-xs text-muted-foreground">{c.d}</p>
                </button>
              ))}
            </div>
            {conn === "Rede (IP)" && <Input className="mt-2 max-w-xs" placeholder="Ex.: 192.168.0.50" value={address} onChange={(e) => setAddress(e.target.value)} />}
          </div>
          <div><p className="mb-2 font-semibold">3. Qual o papel?</p><div className="flex flex-wrap gap-2">{PAPERS.map((x) => <Chip key={x.v} on={paper === x.v} onClick={() => setPaper(x.v)}>{x.t}</Chip>)}</div></div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => testPrint(`Impressora ${sector}`, paper)}>Imprimir teste</Button>
            <Button onClick={save}>Salvar impressora</Button>
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancelar</Button>
          </div>
        </div>
      )}
      <ul className="grid gap-2 sm:grid-cols-2">
        {list.map((x) => (
          <li key={x.id} className="flex items-center gap-3 rounded-xl border p-3 text-sm">
            <div className="flex-1"><b>{x.name}</b><p className="text-xs text-muted-foreground">{x.connection}{x.address ? ` • ${x.address}` : ""} • {x.paper_width}</p></div>
            <Button size="sm" variant="outline" onClick={() => testPrint(x.name, x.paper_width)}>Teste</Button>
            <Switch checked={x.active} onCheckedChange={async (v) => { await supabase.from("printers").update({ active: v }).eq("id", x.id); load(); }} aria-label="Ativa" />
            <Button size="icon" variant="ghost" aria-label="Excluir" onClick={async () => { await supabase.from("printers").delete().eq("id", x.id); load(); }}><Trash2 /></Button>
          </li>
        ))}
        {!list.length && !adding && <p className="py-4 text-muted-foreground">Nenhuma impressora ainda. Clique em “Adicionar impressora”.</p>}
      </ul>
    </section>
  );
}

export function TeamPanel() {
  const [list, setList] = useState<{ id: string; email: string; role: "admin" | "staff" }[]>([]);
  const [email, setEmail] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const load = () => listTeam().then(setList).catch(() => {});
  useEffect(() => { load(); }, []);
  const act = async (e: string, r: "admin" | "staff", grant: boolean) => {
    const res = await setRole({ data: { email: e, role: r, grant } });
    if (res.error) toast.error(res.error); else { toast.success("Permissões atualizadas"); setEmail(""); load(); }
  };
  const addStaff = async () => {
    if (pass.length < 6) return void toast.error("A senha precisa de pelo menos 6 caracteres");
    const res = await createStaff({ data: { username: user, password: pass } });
    if (res.error) toast.error(res.error); else { toast.success(`Funcionário "${user.trim().toLowerCase()}" criado`); setUser(""); setPass(""); load(); }
  };
  return (
    <section className={card}>
      <h2 className="text-2xl">Equipe e funcionários</h2>
      <div className="space-y-2 rounded-xl border p-4">
        <p className="font-semibold">Novo funcionário</p>
        <p className="text-sm text-muted-foreground">O funcionário entra em /admin com este nome e senha. Ele só lança e acompanha pedidos de mesa.</p>
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); addStaff(); }}>
          <Input className="max-w-[200px]" required placeholder="Nome (ex.: joao)" value={user} onChange={(e) => setUser(e.target.value)} />
          <Input className="max-w-[200px]" required type="password" placeholder="Senha" value={pass} onChange={(e) => setPass(e.target.value)} />
          <Button type="submit">Criar funcionário</Button>
        </form>
      </div>
      <div className="space-y-2 rounded-xl border p-4">
        <p className="font-semibold">Novo administrador</p>
        <p className="text-sm text-muted-foreground">A pessoa cria a conta com e-mail em /admin e depois você libera aqui.</p>
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); act(email, "admin", true); }}>
          <Input className="max-w-xs" type="email" required placeholder="email@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" variant="outline">Liberar como administrador</Button>
        </form>
      </div>
      <ul className="divide-y text-sm">
        {list.map((a) => (
          <li key={a.id + a.role} className="flex items-center justify-between gap-2 py-2">
            <span className="flex-1">{displayLogin(a.email)}</span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{a.role === "admin" ? "Administrador" : "Funcionário"}</span>
            <Button size="sm" variant="ghost" onClick={() => act(a.email, a.role, false)}>Remover</Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TableOrderForm({ fixedTable, onDone }: { fixedTable?: string; onDone?: () => void } = {}) {
  const { data } = useQuery(catalogQuery);
  const [table, setTable] = useState(fixedTable ?? "");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const products = (data?.products ?? []).filter((p) => p.active && p.available);
  const total = Object.entries(cart).reduce((s, [id, q]) => { const p = products.find((x) => x.id === id); return s + (p ? basePrice(p) * q : 0); }, 0);
  const add = (id: string, d: number) => setCart((c) => { const n = Math.max(0, (c[id] ?? 0) + d); const r = { ...c, [id]: n }; if (!n) delete r[id]; return r; });
  const send = async () => {
    if (!table.trim()) return void toast.error("Informe o número da mesa");
    const items = Object.entries(cart).map(([productId, qty]) => ({ productId, qty, notes: "" }));
    if (!items.length) return void toast.error("Adicione itens");
    setBusy(true);
    try {
      const r = await createTableOrder({ data: { tableNumber: table.trim(), customerName: name.trim(), items, notes } });
      if (r.error) toast.error(r.error); else { toast.success(`Pedido #${r.order.number} enviado — mesa ${table}`); setCart({}); setNotes(""); setName(""); onDone?.(); }
    } catch { toast.error("Erro ao enviar pedido"); } finally { setBusy(false); }
  };
  return (
    <section className={`${card} mb-6`}>
      <h2 className="text-2xl">{fixedTable ? "Adicionar itens" : "Novo pedido de mesa"}</h2>
      <div className="flex flex-wrap gap-2">
        {!fixedTable && <Input className="w-28" placeholder="Mesa nº" value={table} onChange={(e) => setTable(e.target.value)} />}
        <Input className="max-w-xs" placeholder="Nome do cliente (opcional)" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <ul className="grid max-h-80 gap-1 overflow-auto sm:grid-cols-2">
        {products.map((p) => (
          <li key={p.id} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
            <span className="flex-1 truncate">{p.name}<span className="ml-1 text-muted-foreground">{brl(basePrice(p))}</span></span>
            <Button type="button" size="icon" variant="ghost" className="size-7" onClick={() => add(p.id, -1)} aria-label="Remover"><Minus /></Button>
            <span className="w-5 text-center">{cart[p.id] ?? 0}</span>
            <Button type="button" size="icon" variant="ghost" className="size-7" onClick={() => add(p.id, 1)} aria-label="Adicionar"><Plus /></Button>
          </li>
        ))}
      </ul>
      <Input placeholder="Observações (sabores, sem açúcar, etc.)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex items-center justify-between">
        <b className="text-lg">Total {brl(total)}</b>
        <Button onClick={send} disabled={busy}>Enviar para a cozinha</Button>
      </div>
    </section>
  );
}

export function UsersPanel() {
  const [list, setList] = useState<Awaited<ReturnType<typeof listAllUsers>>>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    listAllUsers().catch(() => new Promise((r) => setTimeout(r, 1500)).then(() => listAllUsers())).then(setList)
      .catch((e) => toast.error(String(e?.message ?? "").includes("Acesso negado") ? "Sua conta não é administradora. Entre novamente após liberar o acesso." : "Erro ao carregar usuários. Tente atualizar."))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  const fmt = (d: string | null) => d ? new Date(d).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "Nunca";
  const shown = list.filter((u) => displayLogin(u.email).toLowerCase().includes(q.toLowerCase()));
  return (
    <section className={card}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl">Usuários cadastrados ({list.length})</h2>
        <div className="flex gap-2">
          <Input className="max-w-xs" placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button variant="outline" onClick={load}>Atualizar</Button>
        </div>
      </div>
      {loading ? <p className="text-muted-foreground">Carregando…</p> : (
        <ul className="divide-y text-sm">
          {shown.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-2 py-2">
              <span className="flex-1 font-medium">{displayLogin(u.email)}</span>
              <span className="text-xs text-muted-foreground">Criado: {fmt(u.createdAt)} • Último acesso: {fmt(u.lastSignIn)}</span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                {u.roles.includes("admin") ? "Administrador" : u.roles.includes("staff") ? "Funcionário" : "Sem acesso"}
              </span>
            </li>
          ))}
          {!shown.length && <p className="py-4 text-muted-foreground">Nenhum usuário encontrado.</p>}
        </ul>
      )}
    </section>
  );
}
