// Pure pricing/business rules shared by browser and server.

export type OptionChoice = { label: string; price: number };
export type ProductOption = {
  name: string;
  type: "single" | "multi";
  required: boolean;
  choices: OptionChoice[];
};
export type Selections = Record<string, string[]>;

export type Coupon = {
  code: string;
  kind: string; // percent | fixed
  value: number;
  min_order: number;
  first_order_only: boolean;
  active: boolean;
  expires_at: string | null;
};

export type Hours = { day: number; open: string; close: string; closed: boolean }[];

export const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

export const basePrice = (p: { price: number; promo_price: number | null }) =>
  p.promo_price != null && p.promo_price > 0 && p.promo_price < p.price ? Number(p.promo_price) : Number(p.price);

export function extrasPrice(options: ProductOption[], sel: Selections) {
  let total = 0;
  for (const opt of options) {
    const chosen = sel[opt.name] ?? [];
    for (const label of chosen) {
      const c = opt.choices.find((x) => x.label === label);
      if (c) total += Number(c.price) || 0;
    }
  }
  return round(total);
}

export function validateSelections(options: ProductOption[], sel: Selections): string | null {
  for (const opt of options) {
    const chosen = sel[opt.name] ?? [];
    if (opt.required && chosen.length === 0) return `Escolha uma opção em "${opt.name}"`;
    if (opt.type === "single" && chosen.length > 1) return `Escolha apenas uma opção em "${opt.name}"`;
    for (const l of chosen) if (!opt.choices.some((c) => c.label === l)) return `Opção inválida em "${opt.name}"`;
  }
  return null;
}

export function couponDiscount(coupon: Coupon | null, subtotal: number, isFirstOrder: boolean, now = new Date()) {
  if (!coupon || !coupon.active) return { discount: 0, error: "Cupom inválido" };
  if (coupon.expires_at && new Date(coupon.expires_at) < now) return { discount: 0, error: "Cupom expirado" };
  if (coupon.first_order_only && !isFirstOrder) return { discount: 0, error: "Cupom válido apenas na primeira compra" };
  if (subtotal < Number(coupon.min_order)) return { discount: 0, error: `Pedido mínimo de ${brl(Number(coupon.min_order))} para este cupom` };
  const d = coupon.kind === "percent" ? (subtotal * Number(coupon.value)) / 100 : Number(coupon.value);
  return { discount: round(Math.min(d, subtotal)), error: null as string | null };
}

export function orderTotal(subtotal: number, deliveryFee: number, discount: number) {
  return round(Math.max(0, subtotal - discount) + deliveryFee);
}

// Store hours are in Brasília time regardless of where the code runs.
function spParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { day, mins: (Number(get("hour")) % 24) * 60 + Number(get("minute")) };
}

export function isOpenNow(hours: Hours, mode: string, now = new Date()) {
  if (mode === "open") return true;
  if (mode === "closed") return false;
  const { day, mins } = spParts(now);
  const h = hours.find((x) => x.day === day);
  if (!h || h.closed) return false;
  const [oh = 0, om = 0] = h.open.split(":").map(Number);
  const [ch = 0, cm = 0] = h.close.split(":").map(Number);
  return mins >= oh * 60 + om && mins < ch * 60 + cm;
}

export const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const ORDER_STATUSES = ["Recebido", "Em preparo", "Pronto", "Saiu para entrega", "Concluído", "Cancelado"];
export const PAYMENT_METHODS = ["Pix", "Dinheiro", "Cartão de crédito", "Cartão de débito"];

function round(n: number) {
  return Math.round(n * 100) / 100;
}
