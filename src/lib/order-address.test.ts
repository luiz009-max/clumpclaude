import { describe, expect, it } from "vitest";
import { addressValues, mergeOrderAddress } from "./order-address";

describe("Order address editing", () => {
  it("updates the address while preserving stored metadata", () => {
    const fields = { street: "Rua Nova", number: "42", neighborhood: "Centro", complement: "Casa", reference: "Praça" };
    expect(mergeOrderAddress({ street: "Rua Antiga", neighborhoodId: "original-id" }, fields)).toEqual({ ...fields, neighborhoodId: "original-id" });
  });
  it("handles an order without an address", () => {
    expect(addressValues(null)).toEqual({ street: "", number: "", neighborhood: "", complement: "", reference: "" });
  });
});