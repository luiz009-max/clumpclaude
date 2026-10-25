import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Hours, ProductOption } from "./pricing";

export type Settings = Omit<Database["public"]["Tables"]["store_settings"]["Row"], "hours"> & { hours: Hours };
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Product = Omit<Database["public"]["Tables"]["products"]["Row"], "options"> & { options: ProductOption[] };
export type Neighborhood = Database["public"]["Tables"]["neighborhoods"]["Row"];
export type Review = Database["public"]["Tables"]["reviews"]["Row"];

export const GROUPS = ["Bolos e fatias", "Doces e sobremesas", "Combos e promoções", "Bebidas"];

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("store_settings").select("*").eq("id", 1).single();
    if (error) throw error;
    return data as unknown as Settings;
  },
});

export const catalogQuery = queryOptions({
  queryKey: ["catalog"],
  queryFn: async () => {
    const [c, p] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("products").select("*").order("sort_order"),
    ]);
    if (c.error) throw c.error;
    if (p.error) throw p.error;
    return { categories: c.data as Category[], products: p.data as unknown as Product[] };
  },
});

export const neighborhoodsQuery = queryOptions({
  queryKey: ["neighborhoods"],
  queryFn: async () => {
    const { data, error } = await supabase.from("neighborhoods").select("*").order("name");
    if (error) throw error;
    return data;
  },
});

export const reviewsQuery = queryOptions({
  queryKey: ["reviews"],
  queryFn: async () => {
    const { data, error } = await supabase.from("reviews").select("*").order("created_at");
    if (error) throw error;
    return data;
  },
});

export const BADGES: Record<string, string> = {
  mais_vendido: "Mais vendido",
  novidade: "Novidade",
  promocao: "Promoção",
};

export const PLACEHOLDER_IMG = "/images/brigadeiro.jpg";
