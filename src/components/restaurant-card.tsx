"use client";

import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Restaurant } from "@/lib/types";

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export function RestaurantCard({ restaurant }: RestaurantCardProps) {
  return (
    <Link href={`/restaurant/${restaurant.id}`} className="block h-full group">
      <Card className="border-none bg-card hover:bg-muted/30 transition-all duration-500 rounded-[2.5rem] overflow-hidden h-full shadow-2xl ring-1 ring-border/20">
        <div className="relative aspect-[16/10] overflow-hidden rounded-[2rem] m-3 shadow-2xl">
          <Image
            src={restaurant.image}
            alt={restaurant.name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-700"
            data-ai-hint="restaurant food"
          />
          <div className="absolute top-4 left-4 bg-primary text-white text-[9px] font-black px-3 py-1.5 rounded-full shadow-2xl uppercase tracking-widest">
             SAVE 50%
          </div>
          <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-md text-foreground px-3 py-1.5 rounded-2xl text-[9px] font-black shadow-2xl border border-border/10">
            {restaurant.deliveryTime}
          </div>
        </div>
        <CardContent className="p-8 pt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-black text-2xl group-hover:text-primary transition-colors truncate tracking-tighter italic">{restaurant.name}</h3>
            <div className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1 rounded-xl text-[10px] font-black shadow-2xl flex-shrink-0">
              {restaurant.rating} <Star className="w-3 h-3 fill-white" />
            </div>
          </div>
          <div className="flex justify-between items-center">
             <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest truncate pr-4">{restaurant.cuisine}</p>
             <p className="flex-shrink-0 font-black text-primary italic text-sm">₹{restaurant.priceForTwo || 200}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
