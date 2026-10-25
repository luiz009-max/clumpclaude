import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrdersPanel } from "@/components/admin/OrdersPanel";
import { ProductsPanel } from "@/components/admin/ProductsPanel";
import { FinancePanel } from "@/components/admin/FinancePanel";
import { SettingsPanel } from "@/components/admin/SettingsPanel";
import { OrderAlerts } from "@/components/admin/OrderAlerts";
import { TablesBoard } from "@/components/admin/TablesBoard";
import { CompanyPanel, PrintersPanel, TeamPanel, UsersPanel } from "@/components/admin/ExtraPanels";
import { loginEmail } from "@/lib/staff-login";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel administrativo — Doce Encanto" },
      { name: "description", content: "Gestão de pedidos, produtos, financeiro e configurações da doceria." },
      { property: "og:title", content: "Painel — Doce Encanto" },
      { property: "og:description", content: "Área exclusiva do proprietário." },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<"admin" | "staff" | "none" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setRole(null); return; }
    supabase.from("user_roles").select("role").eq("user_id", session.user.id)
      .then(({ data }) => setRole(data?.some((r) => r.role === "admin") ? "admin" : data?.some((r) => r.role === "staff") ? "staff" : "none"));
  }, [session]);

  if (loading) return <p className="py-20 text-center text-muted-foreground">Carregando…</p>;
  if (!session) return <Login />;
  if (role === null) return <p className="py-20 text-center text-muted-foreground">Verificando acesso…</p>;
  if (role === "none")
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-2xl">Sem permissão</h1>
        <p className="mt-2 text-sm text-muted-foreground">Esta conta ({session.user.email}) não tem acesso ao painel. Peça ao proprietário para liberar.</p>
        <Button className="mt-6" variant="outline" onClick={() => supabase.auth.signOut()}>Sair</Button>
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <OrderAlerts staffOnly={role === "staff"} />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl">Painel</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="hidden sm:inline">{session.user.email}</span>
          <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>Sair</Button>
        </div>
      </div>
      {role === "staff" ? (
        <Tabs defaultValue="mesa">
          <TabsList className="mb-6"><TabsTrigger value="mesa">Pedidos de mesa</TabsTrigger></TabsList>
          <TabsContent value="mesa"><TablesBoard isAdmin={false} /></TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue="all">
          <TabsList className="mb-6 flex h-auto w-full flex-wrap justify-start">
            <TabsTrigger value="all">Todos os pedidos</TabsTrigger>
            <TabsTrigger value="delivery">Entrega e retirada</TabsTrigger>
            <TabsTrigger value="mesa">Mesas</TabsTrigger>
            <TabsTrigger value="products">Produtos</TabsTrigger>
            <TabsTrigger value="finance">Financeiro</TabsTrigger>
            <TabsTrigger value="company">Empresa</TabsTrigger>
            <TabsTrigger value="printers">Impressoras</TabsTrigger>
            <TabsTrigger value="team">Funcionários</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>
          <TabsContent value="all"><OrdersPanel scope="all" canDelete canEditAddress /></TabsContent>
          <TabsContent value="delivery"><OrdersPanel scope="delivery" canDelete canEditAddress /></TabsContent>
          <TabsContent value="mesa"><TablesBoard isAdmin /></TabsContent>
          <TabsContent value="products"><ProductsPanel /></TabsContent>
          <TabsContent value="finance"><FinancePanel /></TabsContent>
          <TabsContent value="company"><CompanyPanel /></TabsContent>
          <TabsContent value="printers"><PrintersPanel /></TabsContent>
          <TabsContent value="team"><TeamPanel /></TabsContent>
          <TabsContent value="users"><UsersPanel /></TabsContent>
          <TabsContent value="settings"><SettingsPanel /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = mode === "in"
      ? await supabase.auth.signInWithPassword({ email: loginEmail(email), password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
    setBusy(false);
    if (error) return void toast.error(error.message === "Invalid login credentials" ? "Usuário ou senha incorretos" : error.message);
    if (mode === "up") toast.success("Conta criada! Confirme pelo link enviado ao seu e-mail.");
  };
  return (
    <form onSubmit={submit} className="mx-auto my-16 max-w-sm space-y-4 rounded-3xl border bg-card p-8 shadow-soft">
      <h1 className="text-2xl">{mode === "in" ? "Entrar no painel" : "Criar conta do proprietário"}</h1>
      <p className="text-xs text-muted-foreground">{mode === "in" ? "Funcionários: use o nome de funcionário e a senha recebidos do proprietário." : "A primeira conta criada vira automaticamente administradora."}</p>
      <div className="space-y-1.5"><Label>{mode === "in" ? "Nome de funcionário ou e-mail" : "E-mail"}</Label><Input type={mode === "in" ? "text" : "email"} autoCapitalize="none" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Senha</Label><Input type="password" required minLength={mode === "in" ? 6 : 8} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      <Button className="w-full" disabled={busy}>{mode === "in" ? "Entrar" : "Criar conta"}</Button>
      <button type="button" className="w-full text-sm text-primary" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "Primeiro acesso do proprietário? Criar conta" : "Já tenho conta"}
      </button>
    </form>
  );
}
