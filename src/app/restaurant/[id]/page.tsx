
"use client";

import { use, useState, useMemo } from "react";
import Image from "next/image";
import { Navbar } from "@/components/navbar";
import { Star, Clock, Info, Search, Plus, ShoppingCart, ArrowLeft, Loader2, Sparkles, Flame, ShieldCheck, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Dish, Restaurant } from "@/lib/types";
import { useDoc, useFirestore, useUser } from "@/firebase";
import { doc } from "firebase/firestore";

export default function RestaurantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const firestore = useFirestore();
  const { user } = useUser();
  const { addToCart, cart } = useAppStore();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState("All");

  const isAdmin = user?.email === "junakipi@gmail.com";

  const restaurantRef = useMemo(() => {
    if (!firestore || !id) return null;
    return doc(firestore, "restaurants", id);
  }, [firestore, id]);

  const { data: restaurant, loading } = useDoc<Restaurant>(restaurantRef);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  if (!restaurant && !loading) return (
    <>
      <Navbar />
      <div className="text-center py-32 flex flex-col items-center gap-6">
        <Info className="w-16 h-16 text-muted-foreground opacity-20" />
        <p className="text-2xl font-black italic uppercase tracking-tighter">Premium Lounge Unavailable</p>
        <Link href="/"><Button className="rounded-2xl px-10 h-14 font-black">Return to Main Menu</Button></Link>
      </div>
    </>
  );

  const categories = restaurant?.dishes ? ["All", ...Array.from(new Set(restaurant.dishes.map(d => d.category)))] : ["All"];

  const handleAddToCart = (dish: Dish) => {
    if (!restaurant) return;
    addToCart({
      ...dish,
      quantity: 1,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name
    });
    toast({
      title: "Selection Added! 🍱",
      description: `${dish.name} reserved for you.`,
    });
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 pb-32">
        {restaurant && (
          <>
            <div className="relative h-[50vh] min-h-[500px] w-full border-b-8 border-primary/20">
              <Image 
                src={restaurant.image} 
                alt={restaurant.name} 
                fill 
                unoptimized
                className="object-cover" 
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex items-end">
                <div className="container mx-auto px-4 py-16 max-w-7xl">
                  <div className="flex flex-col gap-8">
                    <Link href="/">
                      <Button variant="ghost" size="sm" className="text-white bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full px-8 h-12 font-black uppercase tracking-widest text-[10px]">
                        <ArrowLeft className="w-4 h-4 mr-3" /> Discover More
                      </Button>
                    </Link>
                    
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
                      <div className="text-white space-y-4">
                        <div className="inline-flex items-center gap-3 bg-primary px-4 py-1.5 rounded-full shadow-2xl animate-pulse">
                          <Sparkles className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Premium Selection</span>
                        </div>
                        <h1 className="text-5xl md:text-8xl font-black tracking-tighter italic uppercase leading-[0.8] drop-shadow-2xl">{restaurant.name}</h1>
                        <p className="text-white/70 text-2xl font-medium tracking-tight italic max-w-2xl">{restaurant.cuisine}</p>
                        
                        <div className="flex wrap items-center gap-8 pt-4">
                          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20">
                            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                            <span className="text-xl font-black">{restaurant.rating}</span>
                            <span className="text-[9px] font-black uppercase opacity-60 ml-2 tracking-widest">Rating</span>
                          </div>
                          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20">
                            <Clock className="w-5 h-5 text-primary" />
                            <span className="text-xl font-black">{restaurant.deliveryTime}</span>
                            <span className="text-[9px] font-black uppercase opacity-60 ml-2 tracking-widest">Time</span>
                          </div>
                          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20">
                            <ShieldCheck className="w-5 h-5 text-green-400" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-green-400">Verified Kitchen</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="container mx-auto px-4 py-20 max-w-7xl">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                <aside className="lg:col-span-3">
                  <div className="sticky top-32 space-y-8 bg-card rounded-[3rem] p-8 shadow-2xl border border-border/50">
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary px-4 mb-6 leading-none">Categories</h3>
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setActiveCategory(cat)}
                          className={`w-full text-left px-6 py-4 rounded-[1.2rem] text-sm font-black uppercase tracking-widest transition-all duration-300 ${
                            activeCategory === cat ? "bg-primary text-white shadow-xl shadow-primary/20 scale-105" : "hover:bg-primary/5 hover:text-primary opacity-60 hover:opacity-100"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </aside>

                <div className="lg:col-span-9">
                  <div className="space-y-24">
                    {restaurant.dishes && categories.filter(c => c !== "All" && (activeCategory === "All" || activeCategory === c)).map((cat) => (
                      <div key={cat} className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="flex items-center gap-6 mb-12">
                          <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none whitespace-nowrap">{cat}</h2>
                          <div className="h-0.5 w-full bg-gradient-to-r from-primary/30 to-transparent" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          {restaurant.dishes.filter(d => d.category === cat).map((dish) => (
                            <div key={dish.id} className="bg-card rounded-[3rem] p-6 shadow-2xl border-2 border-border/50 flex flex-col sm:flex-row gap-6 group hover:shadow-primary/5 hover:border-primary/20 transition-all duration-500 relative overflow-hidden">
                              <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
                              <div className="relative w-full sm:w-40 h-40 rounded-[2rem] overflow-hidden flex-shrink-0 shadow-xl">
                                <Image src={dish.image} alt={dish.name} fill unoptimized className="object-cover group-hover:scale-110 transition-transform duration-700" />
                                
                                {/* Admin Edit Overlay */}
                                {isAdmin && (
                                  <Link href={`/admin?resId=${id}`} className="absolute top-2 right-2 z-40">
                                    <Button size="icon" variant="ghost" className="bg-black/60 backdrop-blur-md border border-white/20 text-white rounded-xl hover:bg-primary h-8 w-8">
                                      <Settings className="w-4 h-4" />
                                    </Button>
                                  </Link>
                                )}

                                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                                  Rs. {dish.price.toFixed(0)}
                                </div>
                              </div>
                              <div className="flex-1 flex flex-col justify-between py-2 relative z-10">
                                <div>
                                  <div className="flex justify-between items-start gap-2 mb-2">
                                    <h4 className="font-black text-2xl group-hover:text-primary transition-colors uppercase italic tracking-tighter leading-none">{dish.name}</h4>
                                    <span className="font-black text-primary text-xl italic whitespace-nowrap">Rs. {dish.price}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mb-6 line-clamp-2 italic font-medium opacity-60">{dish.description}</p>
                                </div>
                                <div className="flex items-center justify-between mt-auto">
                                  <div className="flex items-center gap-2">
                                     <Flame className="w-3.5 h-3.5 text-orange-500" />
                                     <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">High Fire Wok</span>
                                  </div>
                                  <Button 
                                    size="sm" 
                                    className="rounded-[1.2rem] font-black px-8 h-12 shadow-xl hover:scale-105 active:scale-95 transition-all uppercase text-[10px] tracking-widest"
                                    onClick={() => handleAddToCart(dish)}
                                  >
                                    <Plus className="w-4 h-4 mr-2" /> Select
                                  </Button>
                                </div>
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
          </>
        )}
      </main>

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-md px-6 z-[90]">
        <Link href="/cart">
          <Button className="w-full h-20 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.4)] bg-primary hover:bg-primary/95 text-white font-black text-xl flex justify-between px-12 group hover:scale-[1.05] transition-all active:scale-95">
            <div className="flex items-center gap-4">
              <div className="relative">
                <ShoppingCart className="w-7 h-7 group-hover:rotate-12 transition-transform" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-white text-primary text-[10px] w-6 h-6 rounded-full flex items-center justify-center font-black shadow-2xl ring-4 ring-background">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="uppercase italic tracking-tighter">Review Order</span>
            </div>
            <ArrowLeft className="w-6 h-6 rotate-180" />
          </Button>
        </Link>
      </div>
    </>
  );
}
