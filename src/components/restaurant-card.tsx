
"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Restaurant } from "@/lib/types";

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export function RestaurantCard({ restaurant }: RestaurantCardProps) {
  return (
    <Link href={`/restaurant/${restaurant.id}`} className="block h-full">
      <Card className="group border-none bg-transparent shadow-none hover:bg-card/40 transition-all duration-300 rounded-2xl overflow-hidden h-full">
        <div className="relative aspect-[16/10] overflow-hidden rounded-2xl mb-3 shadow-md">
          <Image
            src={restaurant.image}
            alt={restaurant.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            data-ai-hint="restaurant food"
          />
          <div className="absolute bottom-3 left-3 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
             50% OFF up to ₹100
          </div>
          <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-black px-1.5 py-0.5 rounded-md text-[10px] font-bold">
            {restaurant.deliveryTime}
          </div>
        </div>
        <CardContent className="p-0">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-bold text-lg group-hover:text-primary transition-colors truncate">{restaurant.name}</h3>
            <div className="flex items-center gap-1 bg-green-700 text-white px-1.5 py-0.5 rounded-md text-xs font-bold flex-shrink-0">
              {restaurant.rating} <Star className="w-2.5 h-2.5 fill-white" />
            </div>
          </div>
          <div className="flex justify-between items-center text-sm text-muted-foreground">
             <p className="truncate pr-4">{restaurant.cuisine}</p>
             <p className="flex-shrink-0">₹{restaurant.priceForTwo || 200} for two</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
