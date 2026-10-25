import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { basePrice, couponDiscount, extrasPrice, orderTotal, validateSelections, isOpenNow, type ProductOption, type Hours, type Coupon } from "./pricing";

const itemSchema = z.object({
  productId: z.string().uuid(),
  qty: z.number().int().min(1).max(99),
  selections: z.record(z.array(z.string().max(100)).max(20)),
  notes: z.string().max(300).default(""),
});

const orderSchema = z.object({
  items: z.array(itemSchema).min(1).max(50),
  mode: z.enum(["delivery", "pickup"]),
  customerName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(10).max(20),
  address: z
    .object({
      street: z.string().trim().min(2).max(150),
      number: z.string().trim().min(1).max(20),
      neighborhoodId: z.string().uuid(),
      complement: z.string().max(100).default(""),
      reference: z.string().max(150).default(""),
    })
    .nullable(),
  pickupTime: z.string().max(10).nullable(),
  payment: z.enum(["Pix", "Dinheiro", "Cartão de crédito", "Cartão de débito"]),
  changeFor: z.number().min(0).max(10000).nullable(),
  couponCode: z.string().max(40).nullable(),
  isFirstOrder: z.boolean(),
  notes: z.string().max(500).default(""),
});

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const checkCoupon = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ code: z.string().trim().min(1).max(40), subtotal: z.number(), isFirstOrder: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: c } = await sb.from("coupons").select("*").ilike("code", data.code).maybeSingle();
    const r = couponDiscount(c as Coupon | null, data.subtotal, data.isFirstOrder);
    return { code: c?.code ?? data.code.toUpperCase(), discount: r.discount, error: r.error };
  });

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => orderSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: settings } = await sb.from("store_settings").select("*").eq("id", 1).single();
    if (!settings) throw new Error("Loja indisponível");
    if (!isOpenNow(settings.hours as unknown as Hours, settings.open_mode)) {
      return { error: "A loja está fechada no momento." } as const;
    }

    const ids = [...new Set(data.items.map((i) => i.productId))];
    const { data: products } = await sb.from("products").select("*").in("id", ids);
    const lines = [];
    let subtotal = 0;
    for (const it of data.items) {
      const p = products?.find((x) => x.id === it.productId);
      if (!p || !p.active || !p.available) return { error: `Produto indisponível: ${p?.name ?? "item"}` } as const;
      const opts = (p.options ?? []) as unknown as ProductOption[];
      const err = validateSelections(opts, it.selections);
      if (err) return { error: `${p.name}: ${err}` } as const;
      const unit = basePrice(p) + extrasPrice(opts, it.selections);
      subtotal += unit * it.qty;
      lines.push({ productId: p.id, name: p.name, qty: it.qty, unit, extras: extrasPrice(opts, it.selections), selections: it.selections, notes: it.notes });
    }
    subtotal = Math.round(subtotal * 100) / 100;

    let fee = 0;
    let neighborhood: string | null = null;
    if (data.mode === "delivery") {
      if (!data.address) return { error: "Informe o endereço" } as const;
      const { data: n } = await sb.from("neighborhoods").select("*").eq("id", data.address.neighborhoodId).eq("active", true).maybeSingle();
      if (!n) return { error: "Bairro não atendido" } as const;
      fee = Number(n.fee);
      neighborhood = n.name;
      if (subtotal < Number(settings.min_delivery)) return { error: `Pedido mínimo para delivery é R$ ${Number(settings.min_delivery).toFixed(2)}` } as const;
    } else if (!data.pickupTime) {
      return { error: "Escolha o horário de retirada" } as const;
    }

    let discount = 0;
    let couponCode: string | null = null;
    if (data.couponCode) {
      const { data: c } = await sb.from("coupons").select("*").ilike("code", data.couponCode).maybeSingle();
      const r = couponDiscount(c as Coupon | null, subtotal, data.isFirstOrder);
      if (r.error) return { error: r.error } as const;
      discount = r.discount;
      couponCode = c!.code;
    }
    const total = orderTotal(subtotal, fee, discount);

    const { data: order, error } = await sb
      .from("orders")
      .insert({
        customer_name: data.customerName,
        phone: data.phone,
        mode: data.mode,
        address: data.address ? { ...data.address, neighborhood } : null,
        pickup_time: data.pickupTime,
        items: lines,
        subtotal,
        delivery_fee: fee,
        discount,
        total,
        payment_method: data.payment,
        change_for: data.changeFor,
        coupon_code: couponCode,
        notes: data.notes,
      })
      .select("id, number, created_at")
      .single();
    if (error || !order) throw new Error("Não foi possível registrar o pedido");

    for (const l of lines) {
      const p = products!.find((x) => x.id === l.productId)!;
      await sb.from("products").update({ sales_count: p.sales_count + l.qty }).eq("id", p.id);
    }

    return { error: null, order: { ...order, subtotal, fee, discount, total, lines, neighborhood } } as const;
  });

export const getOrderStatus = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: o } = await sb.from("orders").select("id, number, status, total, created_at").eq("id", data.id).maybeSingle();
    return o;
  });

const tableOrderSchema = z.object({
  tableNumber: z.string().trim().min(1).max(10),
  customerName: z.string().trim().max(100).default(""),
  items: z.array(z.object({ productId: z.string().uuid(), qty: z.number().int().min(1).max(99), notes: z.string().max(300).default("") })).min(1).max(50),
  notes: z.string().max(500).default(""),
});

export const createTableOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tableOrderSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (!roles?.some((r) => r.role === "admin" || r.role === "staff")) throw new Error("Acesso negado");
    const sb = await admin();
    const ids = [...new Set(data.items.map((i) => i.productId))];
    const { data: products } = await sb.from("products").select("*").in("id", ids);
    const lines = [];
    let subtotal = 0;
    for (const it of data.items) {
      const p = products?.find((x) => x.id === it.productId);
      if (!p || !p.active || !p.available) return { error: `Produto indisponível: ${p?.name ?? "item"}` } as const;
      const unit = basePrice(p);
      subtotal += unit * it.qty;
      lines.push({ productId: p.id, name: p.name, qty: it.qty, unit, extras: 0, selections: {}, notes: it.notes });
    }
    subtotal = Math.round(subtotal * 100) / 100;
    const { data: order, error } = await sb.from("orders").insert({
      customer_name: data.customerName || `Mesa ${data.tableNumber}`,
      phone: "-",
      mode: "mesa",
      table_number: data.tableNumber,
      waiter_email: (context.claims as { email?: string }).email ?? null,
      items: lines,
      subtotal,
      delivery_fee: 0,
      discount: 0,
      total: orderTotal(subtotal, 0, 0),
      payment_method: "Na mesa",
      notes: data.notes,
    }).select("id, number").single();
    if (error || !order) throw new Error("Não foi possível registrar o pedido");
    return { error: null, order } as const;
  });
