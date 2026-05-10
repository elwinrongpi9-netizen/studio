
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
    <Link href={`/restaurant/${restaurant.id}`}>
      <Card className="group overflow-hidden border border-border bg-card shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl">
        <div className="relative aspect-[16/10] overflow-hidden">
          <Image
            src={restaurant.image}
            alt={restaurant.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            data-ai-hint="restaurant food"
          />
          <div className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm border border-border">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            {restaurant.rating}
          </div>
        </div>
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{restaurant.name}</h3>
            <span className="text-xs font-semibold text-muted-foreground">{restaurant.priceRange}</span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{restaurant.cuisine}</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {restaurant.deliveryTime}
            </div>
            <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            <div className="text-green-400">Free Delivery</div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
