
"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, MoreVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Restaurant } from "@/lib/types";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { useMemo } from "react";
import { doc } from "firebase/firestore";
import { Button } from "@/components/ui/button";

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export function RestaurantCard({ restaurant }: RestaurantCardProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  
  const userRef = useMemo(() => (user && firestore) ? doc(firestore, "users", user.uid) : null, [user, firestore]);
  const { data: profile } = useDoc<any>(userRef);

  const isSuperAdmin = user?.email === "junakipi@gmail.com";
  const isManagedAdmin = profile?.managedRestaurantId === restaurant.id;
  const canManage = isSuperAdmin || isManagedAdmin;

  return (
    <div className="relative group">
      <Link href={`/restaurant/${restaurant.id}`} className="block h-full">
        <Card className="border-none bg-card hover:bg-muted/30 transition-all duration-500 rounded-[2.5rem] overflow-hidden h-full shadow-2xl ring-1 ring-border/20">
          <div className="relative aspect-[16/10] overflow-hidden rounded-[2rem] m-3 shadow-2xl">
            <Image
              src={restaurant.image}
              alt={restaurant.name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-700"
              unoptimized
            />
            
            <div className="absolute top-4 left-4 bg-primary text-white text-[9px] font-black px-3 py-1.5 rounded-full shadow-2xl uppercase tracking-widest">
               OFFICIAL PARTNER
            </div>
            <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-md text-foreground px-3 py-1.5 rounded-2xl text-[9px] font-black shadow-2xl border border-border/10">
              {restaurant.deliveryTime}
            </div>
          </div>
          <CardContent className="p-8 pt-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-2xl group-hover:text-primary transition-colors truncate tracking-tighter italic uppercase">{restaurant.name}</h3>
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

      {/* Admin Edit Overlay - 3 Dots Style */}
      {canManage && (
        <Link href={`/admin?resId=${restaurant.id}`} className="absolute top-6 right-6 z-40">
          <Button size="icon" variant="ghost" className="bg-black/60 backdrop-blur-xl border border-white/20 text-white rounded-full hover:bg-primary transition-all h-10 w-10 shadow-2xl">
            <MoreVertical className="w-6 h-6" />
          </Button>
        </Link>
      )}
    </div>
  );
}
