import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Acesso negado");
}

const roleSchema = z.enum(["admin", "staff"]);

export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    return (roles ?? []).map((r) => ({ id: r.user_id, role: r.role as "admin" | "staff", email: users.users.find((u) => u.id === r.user_id)?.email ?? "?" }));
  });

export const listAllUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    return users.users.map((u) => ({
      id: u.id,
      email: u.email ?? "?",
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at ?? null,
      roles: (roles ?? []).filter((r) => r.user_id === u.id).map((r) => r.role as string),
    }));
  });

export const setRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ email: z.string().email(), role: roleSchema, grant: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    const u = users.users.find((x) => x.email?.toLowerCase() === data.email.toLowerCase());
    if (!u) return { error: "Usuário não encontrado. Peça para ele criar a conta em /admin primeiro." };
    if (u.id === context.userId && data.role === "admin" && !data.grant) return { error: "Você não pode remover seu próprio acesso." };
    if (data.grant) await supabaseAdmin.from("user_roles").upsert({ user_id: u.id, role: data.role }, { onConflict: "user_id,role" });
    else await supabaseAdmin.from("user_roles").delete().eq("user_id", u.id).eq("role", data.role);
    return { error: null };
  });

export const createStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ username: z.string().min(1).max(40), password: z.string().min(6).max(72) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { normalizeUsername, isValidUsername, STAFF_DOMAIN } = await import("./staff-login");
    const username = normalizeUsername(data.username);
    if (!isValidUsername(username)) return { error: "Use de 3 a 30 letras minúsculas, números, ponto, hífen ou _ (sem espaços)." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({ email: `${username}@${STAFF_DOMAIN}`, password: data.password, email_confirm: true });
    if (error || !created.user) {
      console.error("[createStaff] createUser failed:", error?.message, JSON.stringify(error));
      const code = (error as { code?: string } | null)?.code;
      if (code === "weak_password") return { error: "Essa senha é muito fraca ou já vazou na internet. Escolha uma senha mais forte (misture letras e números, sem sequências óbvias)." };
      if (error?.message?.includes("already")) return { error: "Esse nome de funcionário já existe." };
      return { error: `Não foi possível criar o funcionário (${error?.message ?? "erro desconhecido"}).` };
    }
    await supabaseAdmin.from("user_roles").upsert({ user_id: created.user.id, role: "staff" }, { onConflict: "user_id,role" });
    return { error: null };
  });
