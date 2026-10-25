import { supabase } from "@/integrations/supabase/client";

// Bucket is private; we store a long-lived signed URL.
export async function uploadImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Envie uma imagem");
  if (file.size > 5 * 1024 * 1024) throw new Error("Imagem até 5MB");
  const path = `${crypto.randomUUID()}.${file.name.split(".").pop() || "jpg"}`;
  const { error } = await supabase.storage.from("images").upload(path, file, { contentType: file.type });
  if (error) throw error;
  const { data, error: e2 } = await supabase.storage.from("images").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (e2 || !data) throw e2 ?? new Error("Falha no upload");
  return data.signedUrl;
}
