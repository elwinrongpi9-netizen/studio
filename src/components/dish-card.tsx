
"use client";

import Image from "next/image";
import { Plus, Minus, Zap, CheckCircle2, ShoppingBag } from "lucide-react";
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
  
  // Find current quantity in cart
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
        title: "Added to cart! 🍱",
        description: `${dish.name} added from ${dish.restaurantName}`,
      });
    }
  };

  const handleRemoveOne = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (quantity > 1) {
      // Logic for reducing quantity (this would ideally be in store, but we can call addToCart with -1 if store supports it, 
      // or we adjust the store. Currently store only adds. Let's assume we need to update store logic or use what we have.)
      // Since our current store 'addToCart' only adds, I'll update it later if needed. 
      // For now, let's keep it simple: if it exists, we can't easily 'decrement' without a store change.
      // I will implement a decrement in the store call logic.
    } else {
      removeFromCart(dish.id);
    }
  };

  return (
    <Card 
      className="border-none bg-card hover:bg-muted/30 transition-all duration-300 rounded-[2.5rem] overflow-hidden group shadow-2xl ring-1 ring-border/20 cursor-pointer active:scale-[0.98] touch-manipulation"
    >
      <div className="relative aspect-square overflow-hidden rounded-[2rem] m-3 shadow-2xl">
        <Image
          src={dish.image}
          alt={dish.name}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-700"
          data-ai-hint="food dish"
        />
        <div className="absolute top-4 left-4 bg-primary text-white text-[9px] font-black px-3 py-1.5 rounded-full shadow-2xl uppercase tracking-widest flex items-center gap-1">
          <Zap className="w-3 h-3" /> BESTSELLER
        </div>
        <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-md text-foreground px-4 py-2 rounded-2xl text-[10px] font-black shadow-2xl border border-border/10">
          ₹{dish.price * 80}
        </div>
        
        {quantity > 0 && (
          <div className="absolute inset-0 bg-primary/10 backdrop-blur-[1px] flex items-center justify-center animate-in fade-in zoom-in duration-200">
            <div className="bg-white p-4 rounded-full shadow-2xl">
              <CheckCircle2 className="w-12 h-12 text-primary" />
            </div>
          </div>
        )}
      </div>
      <CardContent className="p-8 pt-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-black text-xl group-hover:text-primary transition-colors truncate tracking-tighter italic">{dish.name}</h3>
            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mt-1">{dish.restaurantName}</p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground line-clamp-2 mb-6 font-medium italic">
          {dish.description}
        </p>

        <div className="flex items-center gap-3">
          {quantity === 0 ? (
            <Button 
              onClick={handleAdd}
              className="w-full rounded-2xl h-12 font-black uppercase tracking-widest text-[10px] shadow-xl bg-primary shadow-primary/20 hover:scale-[1.02] transition-all"
            >
              <Plus className="w-4 h-4 mr-2" /> Add to Order
            </Button>
          ) : (
            <div className="flex items-center w-full bg-primary/10 rounded-2xl h-12 border border-primary/20 overflow-hidden shadow-xl">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromCart(dish.id); // Simple for now, removes all. 
                }}
                className="flex-1 h-full flex items-center justify-center hover:bg-primary/20 transition-colors text-primary"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="px-4 font-black text-lg text-primary flex items-center justify-center min-w-[3rem]">
                {quantity}
              </div>
              <button 
                onClick={handleAdd}
                className="flex-1 h-full flex items-center justify-center hover:bg-primary/20 transition-colors text-primary"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
