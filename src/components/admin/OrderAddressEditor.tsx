import { useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { addressFields, addressValues, deliveryAddressSchema, mergeOrderAddress } from "@/lib/order-address";

type Order = Database["public"]["Tables"]["orders"]["Row"];

export function OrderAddressEditor({ order, onSaved }: { order: Order; onSaved: (order: Order) => void }) {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState(() => addressValues(order.address));
  const [saving, setSaving] = useState(false);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const parsed = deliveryAddressSchema.safeParse(fields);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Confira o endereço"); return; }
    setSaving(true);
    try {
      const address = mergeOrderAddress(order.address, parsed.data) as Order["address"];
      const { data, error } = await supabase.from("orders").update({ address }).eq("id", order.id).eq("mode", "delivery").select("*").single();
      if (error || !data) throw new Error("Não foi possível salvar o endereço");
      onSaved(data);
      setOpen(false);
      toast.success("Endereço atualizado");
    } catch {
      toast.error("Não foi possível salvar o endereço. Tente novamente.");
    } finally { setSaving(false); }
  };

  return <Dialog open={open} onOpenChange={(next) => { if (!saving) setOpen(next); }}>
    <Button size="sm" variant="outline" onClick={() => { setFields(addressValues(order.address)); setOpen(true); }}><Pencil /> Editar endereço</Button>
    <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto" aria-describedby={undefined}>
      <DialogHeader><DialogTitle>Endereço do pedido #{order.number}</DialogTitle></DialogHeader>
      <form onSubmit={save} className="space-y-4">
        {addressFields.map(({ key, label, required }) => <div key={key} className="space-y-1.5">
          <Label htmlFor={`order-address-${key}`}>{label}</Label>
          <Input id={`order-address-${key}`} required={required} disabled={saving} value={fields[key]} onChange={(event) => setFields((current) => ({ ...current, [key]: event.target.value }))} />
        </div>)}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar endereço"}</Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}