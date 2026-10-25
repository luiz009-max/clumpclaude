# Doce Encanto — cardápio digital

TanStack Start + React + Supabase (Tailwind v4, shadcn/ui).

## Rodar localmente

```sh
cp .env.example .env   # preencha as variáveis
bun install            # ou npm install
bun run dev
```

## Deploy na Vercel

1. Suba o projeto no GitHub e importe em vercel.com/new (preset: TanStack Start, já fixado em `vercel.json`).
2. Em **Settings → Environment Variables** cadastre (Production e Preview):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (segredo — sem prefixo `VITE_`)
3. Faça **Redeploy** (variáveis `VITE_*` só entram no build).
4. No Supabase: **Authentication → URL Configuration** → coloque o domínio da Vercel em *Site URL* e *Redirect URLs* (`https://SEU-DOMINIO/**`), senão o login/confirmação de e-mail do `/admin` falha.

## Regras do projeto

Veja `AGENTS.md` (preços/cupons/horários em `src/lib/pricing.ts`, recalculados no servidor em `src/lib/orders.functions.ts`).
