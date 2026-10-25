import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/lib/cart";
import { basePrice, brl, extrasPrice, validateSelections, type Selections } from "@/lib/pricing";
import { PLACEHOLDER_IMG, type Product } from "@/lib/store";

export function ProductDialog({ product, onClose, suggestions, onPick }: { product: Product | null; onClose: () => void; suggestions: Product[]; onPick: (p: Product) => void }) {
  const { add } = useCart();
  const [sel, setSel] = useState<Selections>({});
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!product) return undefined;
    const init: Selections = {};
    for (const o of product.options) if (o.type === "single" && o.required && o.choices[0]) init[o.name] = [o.choices[0].label];
    setSel(init);
    setQty(1);
    setNotes("");
    setAdded(false);
  }, [product]);

  if (!product) return null;
  const unitBase = basePrice(product);
  const unitExtras = extrasPrice(product.options, sel);
  const total = (unitBase + unitExtras) * qty;

  const toggle = (name: string, label: string, single: boolean) =>
    setSel((s) => {
      const cur = s[name] ?? [];
      if (single) return { ...s, [name]: cur[0] === label ? [] : [label] };
      return { ...s, [name]: cur.includes(label) ? cur.filter((x) => x !== label) : [...cur, label] };
    });

  const submit = () => {
    const err = validateSelections(product.options, sel);
    if (err) return void toast.error(err);
    add({ productId: product.id, name: product.name, image: product.image_url, unitBase, unitExtras, qty, selections: sel, notes: notes.trim() });
    toast.success(`${product.name} adicionado ao carrinho`);
    setAdded(true);
  };

  const recs = suggestions.filter((s) => s.id !== product.id && s.available).slice(0, 3);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-lg">
        <img src={product.image_url || PLACEHOLDER_IMG} alt={product.name} className="aspect-[4/3] w-full object-cover" />
        <div className="space-y-5 p-6">
          <div>
            <DialogTitle className="font-display text-2xl">{product.name}</DialogTitle>
            <DialogDescription className="mt-2">{product.description}</DialogDescription>
            {product.size_label && <p className="mt-1 text-xs text-muted-foreground">{product.size_label}</p>}
          </div>

          {added ? (
            <div className="space-y-4">
              <p className="font-medium">Que tal acompanhar com…</p>
              <div className="grid gap-2">
                {recs.map((r) => (
                  <button key={r.id} onClick={() => onPick(r)} className="flex items-center gap-3 rounded-xl border p-2 text-left hover:bg-secondary">
                    <img src={r.image_url || PLACEHOLDER_IMG} alt="" className="size-12 rounded-lg object-cover" />
                    <span className="flex-1 text-sm font-medium">{r.name}</span>
                    <span className="text-sm text-primary">{brl(basePrice(r))}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={onClose}>Continuar comprando</Button>
                <Button className="flex-1" asChild><a href="/carrinho">Ver carrinho</a></Button>
              </div>
            </div>
          ) : (
            <>
              {product.options.map((o) => (
                <fieldset key={o.name} className="space-y-2">
                  <legend className="text-sm font-semibold">
                    {o.name} {o.required ? <span className="text-xs text-primary">(obrigatório)</span> : <span className="text-xs text-muted-foreground">({o.type === "multi" ? "opcional, vários" : "opcional"})</span>}
                  </legend>
                  <div className="grid gap-2">
                    {o.choices.map((c) => {
                      const on = (sel[o.name] ?? []).includes(c.label);
                      return (
                        <button key={c.label} type="button" onClick={() => toggle(o.name, c.label, o.type === "single")}
                          className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm transition ${on ? "border-primary bg-secondary" : "hover:bg-muted"}`}>
                          <span>{c.label}</span>
                          <span className="text-muted-foreground">{c.price > 0 ? `+ ${brl(c.price)}` : ""}</span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
              <div className="space-y-2">
                <label className="text-sm font-semibold" htmlFor="obs">Observações</label>
                <Textarea id="obs" maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: escrever 'Parabéns' na embalagem" />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-full border">
                  <Button variant="ghost" size="icon" aria-label="Diminuir" onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus /></Button>
                  <span className="w-8 text-center font-semibold">{qty}</span>
                  <Button variant="ghost" size="icon" aria-label="Aumentar" onClick={() => setQty((q) => Math.min(99, q + 1))}><Plus /></Button>
                </div>
                <Button className="h-11 flex-1 rounded-full" disabled={!product.available} onClick={submit}>
                  {product.available ? `Adicionar • ${brl(total)}` : "Esgotado"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
