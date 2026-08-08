
"use client";

import Image from "next/image";
import { Plus, Minus, Settings, CheckCircle2, Sparkles, Ban, CheckCircle } from "lucide-react";
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
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!inStock) {
      toast({
        title: "Out of Stock",
        description: "Sorry, this item is currently unavailable.",
        variant: "destructive"
      });
      return;
    }

    addToCart({
      ...dish,
      quantity: 1,
    });

    if (quantity === 0) {
      toast({
        title: "Item Reserved! 🍱",
        description: `${dish.name} added from Rongpi Wok`,
      });
    }
  };

  return (
    <Card 
      className={`border-none bg-card hover:bg-muted/10 transition-all duration-500 rounded-[3.5rem] overflow-hidden group shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:shadow-primary/5 ring-2 ring-border/20 cursor-pointer active:scale-[0.98] touch-manipulation relative ${!inStock ? 'grayscale-[0.5] opacity-80' : ''}`}
    >
      <div className="relative aspect-square overflow-hidden rounded-[2.5rem] m-5 shadow-2xl border border-white/5">
        <Image
          src={dish.image}
          alt={dish.name}
          fill
          unoptimized
          className="object-cover scale-105 group-hover:scale-110 transition-transform duration-1000"
          data-ai-hint="premium dish"
        />
        
        {/* Admin Quick Edit Button */}
        {isAdmin && (
          <Link href={`/admin?resId=${dish.restaurantId}`} className="absolute top-4 right-4 z-40" onClick={(e) => e.stopPropagation()}>
            <Button size="icon" variant="ghost" className="bg-black/40 backdrop-blur-xl border border-white/20 text-white rounded-full hover:bg-primary transition-all">
              <Settings className="w-5 h-5" />
            </Button>
          </Link>
        )}

        <div className="absolute top-5 left-5 flex flex-col gap-2">
          {inStock ? (
            <div className="bg-green-600/90 backdrop-blur-md text-white text-[9px] font-black px-4 py-2 rounded-full shadow-2xl uppercase tracking-[0.2em] flex items-center gap-2 border border-green-400/30">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
              In Stock
            </div>
          ) : (
             <div className="bg-zinc-800/90 backdrop-blur-md text-zinc-400 text-[9px] font-black px-4 py-2 rounded-full shadow-2xl uppercase tracking-[0.2em] flex items-center gap-2 border border-zinc-700/30">
               <Ban className="w-3.5 h-3.5" /> Sold Out
             </div>
          )}
          <div className="bg-primary/90 backdrop-blur-md text-white text-[9px] font-black px-4 py-2 rounded-full shadow-2xl uppercase tracking-[0.2em] flex items-center gap-2 border border-white/10">
            <Sparkles className="w-3.5 h-3.5" /> Chef's Special
          </div>
        </div>
        
        <div className="absolute bottom-5 right-5 bg-black/80 backdrop-blur-xl text-white px-6 py-3 rounded-[1.5rem] text-xl font-black shadow-2xl border border-white/10 italic tracking-tighter">
          Rs. {dish.price.toFixed(0)}
        </div>
        
        {quantity > 0 && (
          <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in zoom-in duration-300">
            <div className="bg-white p-6 rounded-full shadow-[0_0_50px_rgba(255,255,255,0.4)] animate-bounce">
              <CheckCircle2 className="w-16 h-16 text-primary" />
            </div>
          </div>
        )}

        {!inStock && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[4px] flex flex-col items-center justify-center gap-4">
             <div className="bg-white/10 p-6 rounded-full border-2 border-white/20">
               <Ban className="w-16 h-16 text-white opacity-60" />
             </div>
             <Badge className="bg-white text-black rounded-full font-black uppercase text-xs px-6 py-2">Out of Stock</Badge>
          </div>
        )}
      </div>
      
      <CardContent className="p-10 pt-2">
        <div className="flex flex-col gap-2 mb-6">
          <div className="flex justify-between items-start gap-4">
            <h3 className="font-black text-3xl group-hover:text-primary transition-colors truncate tracking-tighter italic uppercase leading-none">{dish.name}</h3>
            <span className="text-xl font-black text-primary italic whitespace-nowrap">Rs. {dish.price}</span>
          </div>
          <div className="flex items-center gap-3">
             <span className="text-[9px] font-black uppercase text-primary tracking-[0.3em]">Signature Dish</span>
             <div className="h-1 w-1 bg-muted-foreground rounded-full opacity-30" />
             <span className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.3em]">{dish.category}</span>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground line-clamp-2 mb-10 font-medium italic opacity-70 leading-relaxed">
          {dish.description}
        </p>

        <div className="flex items-center gap-4">
          {quantity === 0 ? (
            <Button 
              onClick={handleAdd}
              disabled={!inStock}
              className={`w-full rounded-[1.5rem] h-16 font-black uppercase tracking-widest text-[11px] shadow-2xl transition-all ${
                inStock 
                  ? 'bg-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]' 
                  : 'bg-muted text-muted-foreground cursor-not-allowed border-2 border-dashed border-border'
              }`}
            >
              {inStock ? (
                <>
                  <Plus className="w-5 h-5 mr-3" /> Add to Order
                </>
              ) : (
                <>
                  <Ban className="w-5 h-5 mr-3" /> Currently Unavailable
                </>
              )}
            </Button>
          ) : (
            <div className="flex items-center w-full bg-primary/10 rounded-[1.5rem] h-16 border-2 border-primary/20 overflow-hidden shadow-2xl backdrop-blur-sm">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromCart(dish.id); 
                }}
                className="flex-1 h-full flex items-center justify-center hover:bg-primary/20 transition-all text-primary"
              >
                <Minus className="w-5 h-5" />
              </button>
              <div className="px-6 font-black text-2xl text-primary flex items-center justify-center min-w-[4rem] italic">
                {quantity}
              </div>
              <button 
                onClick={handleAdd}
                disabled={!inStock}
                className="flex-1 h-full flex items-center justify-center hover:bg-primary/20 transition-all text-primary"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
