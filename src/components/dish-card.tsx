
"use client";

import Image from "next/image";
import { Plus, Star, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dish } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

interface DishCardProps {
  dish: Dish & { restaurantId: string; restaurantName: string };
}

export function DishCard({ dish }: DishCardProps) {
  const { addToCart } = useAppStore();
  const { toast } = useToast();

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    addToCart({
      ...dish,
      quantity: 1,
    });
    toast({
      title: "Added to cart!",
      description: `${dish.name} added from ${dish.restaurantName}`,
    });
  };

  return (
    <Card className="border-none bg-card hover:bg-muted/30 transition-all duration-500 rounded-[2.5rem] overflow-hidden group shadow-2xl ring-1 ring-border/20">
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
        <Button 
          onClick={handleAdd}
          className="w-full rounded-2xl h-12 font-black uppercase tracking-widest text-[10px] bg-primary shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform"
        >
          <Plus className="w-4 h-4 mr-2" /> Add to Order
        </Button>
      </CardContent>
    </Card>
  );
}
