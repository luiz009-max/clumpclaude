import { describe, it, expect } from "vitest";
import { extrasPrice, couponDiscount, orderTotal, validateSelections, isOpenNow, basePrice } from "./pricing";

const opts = [
  { name: "Tamanho", type: "single" as const, required: true, choices: [{ label: "P", price: 0 }, { label: "G", price: 6 }] },
  { name: "Adicionais", type: "multi" as const, required: false, choices: [{ label: "Nutella", price: 4 }, { label: "Morango", price: 3 }] },
];
const coupon = { code: "X", kind: "percent", value: 10, min_order: 0, first_order_only: true, active: true, expires_at: null };

describe("pricing", () => {
  it("adds selected extras", () => {
    expect(extrasPrice(opts, { Tamanho: ["G"], Adicionais: ["Nutella", "Morango"] })).toBe(13);
  });
  it("requires required options", () => {
    expect(validateSelections(opts, {})).not.toBeNull();
  });
  it("uses promo price when lower", () => {
    expect(basePrice({ price: 59.9, promo_price: 49.9 })).toBe(49.9);
  });
  it("first-order coupon rejected for returning customer", () => {
    expect(couponDiscount(coupon, 100, false).discount).toBe(0);
  });
  it("percent coupon gives 10% off", () => {
    expect(couponDiscount(coupon, 100, true).discount).toBe(10);
  });
  it("fixed coupon respects min order", () => {
    const c = { ...coupon, kind: "fixed", value: 5, min_order: 40, first_order_only: false };
    expect(couponDiscount(c, 30, true).discount).toBe(0);
    expect(couponDiscount(c, 50, true).discount).toBe(5);
  });
  it("total = subtotal - discount + delivery", () => {
    expect(orderTotal(100, 7, 10)).toBe(97);
  });
  it("closed when day is closed", () => {
    const monday = new Date("2026-10-19T15:00:00Z");
    expect(isOpenNow([{ day: 1, open: "10:00", close: "20:00", closed: true }], "auto", monday)).toBe(false);
    expect(isOpenNow([{ day: 1, open: "10:00", close: "20:00", closed: false }], "auto", monday)).toBe(true);
  });
});
