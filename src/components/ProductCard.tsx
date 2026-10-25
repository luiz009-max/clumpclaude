import { Heart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { basePrice, brl } from "@/lib/pricing";
import { BADGES, PLACEHOLDER_IMG, type Product } from "@/lib/store";

export function ProductCard({ product, onOpen }: { product: Product; onOpen: (p: Product) => void }) {
  const { favorites, toggleFav } = useCart();
  const fav = favorites.includes(product.id);
  const price = basePrice(product);
  const hasPromo = price < Number(product.price);
  return (
    <article
      className="group animate-rise flex flex-col overflow-hidden rounded-2xl border bg-card shadow-soft transition hover:-translate-y-1 hover:shadow-lift"
    >
      <button type="button" onClick={() => onOpen(product)} className="relative aspect-square overflow-hidden bg-muted text-left">
        <img src={product.image_url || PLACEHOLDER_IMG} alt={product.name} loading="lazy" width={800} height={800} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        {product.badge && BADGES[product.badge] && (
          <span className="absolute left-3 top-3 rounded-full bg-gold-gradient px-3 py-1 text-xs font-semibold text-gold-foreground shadow">
            {BADGES[product.badge]}
          </span>
        )}
        {!product.available && (
          <span className="absolute inset-0 flex items-center justify-center bg-background/70 font-display text-xl">Esgotado</span>
        )}
      </button>
      <button
        type="button"
        aria-label={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        onClick={() => toggleFav(product.id)}
        className="absolute m-3 self-end rounded-full bg-card/90 p-2 shadow"
      >
        <Heart className={fav ? "size-4 fill-primary text-primary" : "size-4 text-muted-foreground"} />
      </button>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold leading-tight">{product.name}</h3>
          {product.size_label && <span className="shrink-0 text-xs text-muted-foreground">{product.size_label}</span>}
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            {hasPromo && <div className="text-xs text-muted-foreground line-through">{brl(Number(product.price))}</div>}
            <div className="font-display text-xl font-semibold text-primary">{brl(price)}</div>
          </div>
          <Button size="sm" disabled={!product.available} onClick={() => onOpen(product)} className="rounded-full">
            <Plus /> Adicionar
          </Button>
        </div>
      </div>
    </article>
  );
}
