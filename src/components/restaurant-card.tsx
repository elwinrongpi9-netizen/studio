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
    <Link href={`/restaurant/${restaurant.id}`} className="block h-full">
      <Card className="group border-none bg-transparent shadow-none hover:bg-white transition-all duration-300 rounded-2xl overflow-hidden h-full">
        <div className="relative aspect-[16/10] overflow-hidden rounded-2xl mb-4 shadow-md group-hover:shadow-xl transition-all">
          <Image
            src={restaurant.image}
            alt={restaurant.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            data-ai-hint="restaurant food"
          />
          <div className="absolute bottom-4 left-4 bg-accent text-white text-[11px] font-black px-2 py-1 rounded shadow-lg uppercase tracking-wider">
             50% OFF up to ₹100
          </div>
          <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-md text-foreground px-2 py-1 rounded-lg text-[11px] font-black shadow-lg">
            {restaurant.deliveryTime}
          </div>
        </div>
        <CardContent className="p-1 px-2">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-black text-xl group-hover:text-primary transition-colors truncate tracking-tight">{restaurant.name}</h3>
            <div className="flex items-center gap-1 bg-green-600 text-white px-2 py-0.5 rounded-lg text-xs font-black shadow-sm flex-shrink-0">
              {restaurant.rating} <Star className="w-2.5 h-2.5 fill-white" />
            </div>
          </div>
          <div className="flex justify-between items-center text-sm font-medium text-muted-foreground">
             <p className="truncate pr-4">{restaurant.cuisine}</p>
             <p className="flex-shrink-0 font-bold text-foreground">₹{restaurant.priceForTwo || 200} for two</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}