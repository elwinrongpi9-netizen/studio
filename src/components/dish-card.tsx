"use client";

import Image from "next/image";
import { Plus, Minus, Zap, CheckCircle2, ShoppingBag, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dish } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface DishCardProps {
  dish: Dish & { restaurantId: string; restaurantName: string };
}

export function DishCard({ dish }: DishCardProps) {
  const { cart, addToCart, removeFromCart } = useAppStore();
  const { toast } = useToast();
  
  const cartItem = useMemo(() => 
    cart.find(i => i.id === dish.id && i.restaurantId === dish.restaurantId),
  [cart, dish.id, dish.restaurantId]);

  const quantity = cartItem?.quantity || 0;

  const handleAdd = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
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
      className="border-none bg-card hover:bg-muted/10 transition-all duration-500 rounded-[3.5rem] overflow-hidden group shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:shadow-primary/5 ring-2 ring-border/20 cursor-pointer active:scale-[0.98] touch-manipulation relative"
    >
      <div className="relative aspect-square overflow-hidden rounded-[2.5rem] m-5 shadow-2xl border border-white/5">
        <Image
          src={dish.image}
          alt={dish.name}
          fill
          className="object-cover scale-105 group-hover:scale-110 transition-transform duration-1000"
          data-ai-hint="premium dish"
        />
        <div className="absolute top-5 left-5 bg-primary text-white text-[9px] font-black px-4 py-2 rounded-full shadow-2xl uppercase tracking-[0.2em] flex items-center gap-2 backdrop-blur-sm">
          <Sparkles className="w-3.5 h-3.5" /> Chef's Special
        </div>
        
        <div className="absolute bottom-5 right-5 bg-black/80 backdrop-blur-xl text-white px-6 py-3 rounded-[1.5rem] text-xl font-black shadow-2xl border border-white/10 italic tracking-tighter">
          ₹{dish.price * 80}
        </div>
        
        {quantity > 0 && (
          <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in zoom-in duration-300">
            <div className="bg-white p-6 rounded-full shadow-[0_0_50px_rgba(255,255,255,0.4)] animate-bounce">
              <CheckCircle2 className="w-16 h-16 text-primary" />
            </div>
          </div>
        )}
      </div>
      
      <CardContent className="p-10 pt-2">
        <div className="flex flex-col gap-2 mb-6">
          <h3 className="font-black text-3xl group-hover:text-primary transition-colors truncate tracking-tighter italic uppercase leading-none">{dish.name}</h3>
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
              className="w-full rounded-[1.5rem] h-16 font-black uppercase tracking-widest text-[11px] shadow-2xl bg-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Plus className="w-5 h-5 mr-3" /> Add to Order
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
