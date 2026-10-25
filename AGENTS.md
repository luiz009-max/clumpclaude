<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Pricing, coupon, and opening-hours rules live in src/lib/pricing.ts and are recomputed server-side in src/lib/orders.functions.ts — never trust client totals.
- Orders are inserted only via the createOrder server function (admin client); the orders table has no public insert policy.
- Images bucket is private (workspace blocks public buckets); uploads store a long-lived signed URL.
- First account to sign up becomes admin (DB trigger); further admins and staff (role 'staff') are granted in the panel. Staff only see/update mode='mesa' orders (RLS) and create them via createTableOrder.
- Store hours are evaluated in America/Sao_Paulo time.
- Admin delivery-address corrections use the authenticated browser client under existing order RLS; update only address JSON and preserve other order data to avoid changing pricing during a correction.
