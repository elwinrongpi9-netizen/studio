
"use client";

import { use, useState } from "react";
import Image from "next/image";
import { Navbar } from "@/components/navbar";
import { RESTAURANTS } from "@/lib/mock-data";
import { Star, Clock, Info, Search, Plus, ShoppingCart, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Dish } from "@/lib/types";

export default function RestaurantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const restaurant = RESTAURANTS.find(r => r.id === id);
  const { addToCart } = useAppStore();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState("All");

  if (!restaurant) return <div>Restaurant not found</div>;

  const categories = ["All", ...Array.from(new Set(restaurant.dishes.map(d => d.category)))];

  const handleAddToCart = (dish: Dish) => {
    addToCart({
      ...dish,
      quantity: 1,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name
    });
    toast({
      title: "Added to cart!",
      description: `${dish.name} has been added to your bag.`,
    });
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 pb-24">
        {/* Hero Section */}
        <div className="relative h-64 md:h-80 w-full">
          <Image 
            src={restaurant.image} 
            alt={restaurant.name} 
            fill 
            className="object-cover" 
            priority
          />
          <div className="absolute inset-0 bg-black/60 flex items-end">
            <div className="container mx-auto px-4 py-8">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 mb-4 rounded-full">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              </Link>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="text-white">
                  <h1 className="text-3xl md:text-5xl font-bold mb-2">{restaurant.name}</h1>
                  <p className="text-white/80 font-medium mb-2">{restaurant.cuisine}</p>
                  <div className="flex items-center gap-4 text-sm font-bold">
                    <div className="flex items-center gap-1.5 bg-green-600 px-2 py-0.5 rounded shadow-sm">
                      <Star className="w-3.5 h-3.5 fill-white text-white" />
                      {restaurant.rating}
                    </div>
                    <div className="flex items-center gap-1.5 opacity-90">
                      <Clock className="w-4 h-4" />
                      {restaurant.deliveryTime}
                    </div>
                    <div className="flex items-center gap-1.5 opacity-90">
                      <span className="text-lg leading-none">₹</span>
                      <span>200 for two</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                   <Button className="bg-white text-black hover:bg-white/90 font-bold rounded-xl shadow-lg px-6">
                      <Info className="w-4 h-4 mr-2" /> More Info
                   </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <aside className="lg:col-span-3">
              <div className="sticky top-24 space-y-4">
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    placeholder="Search menu..." 
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-2 mb-2">Categories</h3>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`w-full text-left px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        activeCategory === cat ? "bg-primary text-white shadow-md" : "hover:bg-primary/10 hover:text-primary"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <div className="lg:col-span-9">
              <div className="space-y-12">
                {categories.filter(c => c !== "All" && (activeCategory === "All" || activeCategory === c)).map((cat) => (
                  <div key={cat}>
                    <h2 className="text-2xl font-bold mb-6 border-b border-border pb-2">{cat}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {restaurant.dishes.filter(d => d.category === cat).map((dish) => (
                        <div key={dish.id} className="bg-card rounded-2xl p-4 shadow-sm border border-border flex gap-4 group hover:shadow-md transition-shadow">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                               <div className="w-3 h-3 border-2 border-green-500 flex items-center justify-center p-0.5">
                                  <div className="w-full h-full bg-green-500 rounded-full" />
                               </div>
                               <h4 className="font-bold text-lg group-hover:text-primary transition-colors">{dish.name}</h4>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{dish.description}</p>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-lg">₹{dish.price * 80}</span>
                              <Button 
                                size="sm" 
                                className="rounded-xl font-bold shadow-sm"
                                onClick={() => handleAddToCart(dish)}
                              >
                                <Plus className="w-4 h-4 mr-1" /> Add
                              </Button>
                            </div>
                          </div>
                          <div className="relative w-28 h-28 rounded-xl overflow-hidden shadow-inner flex-shrink-0">
                            <Image 
                              src={dish.image} 
                              alt={dish.name} 
                              fill 
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                              data-ai-hint="food dish"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Cart for Mobile/Tablets */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-40">
        <Link href="/cart">
          <Button className="w-full py-6 rounded-2xl shadow-2xl bg-primary hover:bg-primary/95 text-white font-bold text-lg flex justify-between px-8">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <span>View Cart</span>
            </div>
            <span>→</span>
          </Button>
        </Link>
      </div>
    </>
  );
}
