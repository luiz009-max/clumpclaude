import { z } from "zod";

export const addressFields = [
  { key: "street", label: "Rua", required: true },
  { key: "number", label: "Número", required: true },
  { key: "neighborhood", label: "Bairro", required: true },
  { key: "complement", label: "Complemento", required: false },
  { key: "reference", label: "Ponto de referência", required: false },
] as const;

export const deliveryAddressSchema = z.object({
  street: z.string().trim().min(1, "Informe a rua"),
  number: z.string().trim().min(1, "Informe o número"),
  neighborhood: z.string().trim().min(1, "Informe o bairro"),
  complement: z.string().trim(),
  reference: z.string().trim(),
});

export type DeliveryAddress = z.infer<typeof deliveryAddressSchema>;

export function addressValues(value: unknown): DeliveryAddress {
  const record = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return Object.fromEntries(addressFields.map(({ key }) => [key, typeof record[key] === "string" ? record[key] : ""])) as DeliveryAddress;
}

export function mergeOrderAddress(value: unknown, fields: DeliveryAddress) {
  const record = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return { ...record, ...deliveryAddressSchema.parse(fields) };
}