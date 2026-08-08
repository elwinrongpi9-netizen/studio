
"use client";

import Image from "next/image";
import { Plus, Minus, Settings, CheckCircle2, Sparkles, Ban } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dish } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { useMemo } from "react";
import { useUser } from "@/firebase";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface DishCardProps {
  dish: Dish & { restaurantId: string; restaurantName: string };
}

export function DishCard({ dish }: DishCardProps) {
  const { cart, addToCart, removeFromCart } = useAppStore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const isAdmin = user?.email === "junakipi@gmail.com";
  const inStock = dish.inStock !== false;

  const cartItem = useMemo(() => 
    cart.find(i => i.id === dish.id && i.restaurantId === dish.restaurantId),
  [cart, dish.id, dish.restaurantId]);

  const quantity = cartItem?.quantity || 0;

  const handleAdd = (e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!inStock) return;

    addToCart({ ...dish, quantity: 1 });
    if (quantity === 0) {
      toast({ title: "Item Reserved! 🍱", description: `${dish.name} added to your selection.` });
    }
  };

  return (
    <Card 
      className={`border-none bg-card hover:bg-muted/10 transition-all duration-500 rounded-[3.5rem] overflow-hidden group shadow-[0_20px_50px_rgba(0,0,0,0.15)] ring-2 ring-border/20 cursor-pointer active:scale-[0.98] relative ${!inStock ? 'grayscale-[0.5] opacity-80' : ''}`}
    >
      <div className="relative aspect-square overflow-hidden rounded-[2.5rem] m-5 shadow-2xl">
        <Image src={dish.image} alt={dish.name} fill unoptimized className="object-cover scale-105 group-hover:scale-110 transition-transform duration-1000" />
        
        {isAdmin && (
          <Link href={`/admin?resId=${dish.restaurantId}`} className="absolute top-4 right-4 z-40" onClick={(e) => e.stopPropagation()}>
            <Button size="icon" variant="ghost" className="bg-black/40 backdrop-blur-xl border border-white/20 text-white rounded-full hover:bg-primary transition-all">
              <Settings className="w-5 h-5" />
            </Button>
          </Link>
        )}

        <div className="absolute top-5 left-5">
          <div className="bg-primary/90 backdrop-blur-md text-white text-[9px] font-black px-4 py-2 rounded-full shadow-2xl uppercase tracking-[0.2em] flex items-center gap-2 border border-white/10">
            <Sparkles className="w-3.5 h-3.5" /> Signature Choice
          </div>
        </div>
        
        <div className="absolute bottom-5 right-5 bg-black/80 backdrop-blur-xl text-white px-6 py-3 rounded-[1.5rem] text-xl font-black shadow-2xl italic tracking-tighter">
          Rs. {dish.price.toFixed(0)}
        </div>
        
        {!inStock && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[4px] flex flex-col items-center justify-center gap-4">
             <Ban className="w-16 h-16 text-white opacity-60" />
             <Badge className="bg-white text-black rounded-full font-black uppercase text-xs px-6 py-2">Out of Stock</Badge>
          </div>
        )}
      </div>
      
      <CardContent className="p-10 pt-2">
        <div className="flex flex-col gap-2 mb-6">
          <div className="flex justify-between items-start gap-4">
            <h3 className="font-black text-3xl group-hover:text-primary transition-colors truncate tracking-tighter italic uppercase leading-none">{dish.name}</h3>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 italic font-medium opacity-70 leading-relaxed">{dish.description}</p>
        </div>

        <div className="mb-6 flex items-center justify-between">
          {inStock ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
              <span className="text-[10px] font-black uppercase text-green-500 tracking-widest">In Stock</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-zinc-500" />
              <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Sold Out</span>
            </div>
          )}
          <span className="text-xl font-black text-primary italic">Rs. {dish.price}</span>
        </div>

        <div className="flex items-center gap-4">
          {quantity === 0 ? (
            <Button 
              onClick={handleAdd}
              disabled={!inStock}
              className={`w-full rounded-[1.5rem] h-16 font-black uppercase tracking-widest text-[11px] shadow-2xl transition-all ${
                inStock ? 'bg-primary hover:bg-primary/90' : 'bg-muted text-muted-foreground'
              }`}
            >
              <Plus className="w-5 h-5 mr-3" /> {inStock ? 'Add to Order' : 'Unavailable'}
            </Button>
          ) : (
            <div className="flex items-center w-full bg-primary/10 rounded-[1.5rem] h-16 border-2 border-primary/20 overflow-hidden shadow-2xl">
              <button onClick={(e) => { e.stopPropagation(); removeFromCart(dish.id); }} className="flex-1 h-full flex items-center justify-center hover:bg-primary/20 transition-all text-primary">
                <Minus className="w-5 h-5" />
              </button>
              <div className="px-6 font-black text-2xl text-primary italic">{quantity}</div>
              <button onClick={handleAdd} className="flex-1 h-full flex items-center justify-center hover:bg-primary/20 transition-all text-primary">
                <Plus className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
