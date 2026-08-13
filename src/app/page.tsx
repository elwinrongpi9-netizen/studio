
"use client";

import { useState, useMemo } from "react";
import { Navbar } from "@/components/navbar";
import { DishCard } from "@/components/dish-card";
import { AIRecommendations } from "@/components/ai-recommendations";
import { Button } from "@/components/ui/button";
import { Search, ChevronDown, MapPin, Sparkles, Navigation, Plus, Info, Zap } from "lucide-react";
import Image from "next/image";
import { useCollection, useFirestore, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import { Restaurant, Inspiration } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [pincode, setPincode] = useState("");
  
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const userRef = useMemo(() => (user && firestore) ? doc(firestore, "users", user.uid) : null, [user, firestore]);
  const { data: profile } = useDoc<any>(userRef);

  const restaurantsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "restaurants"), orderBy("name"));
  }, [firestore]);

  const inspirationsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "inspirations"), orderBy("name"));
  }, [firestore]);

  const { data: restaurants } = useCollection<Restaurant>(restaurantsQuery);
  const { data: dbInspirations } = useCollection<Inspiration>(inspirationsQuery);

  const isSuperAdmin = user?.email === "junakipi@gmail.com";
  const isRestaurantAdmin = !!profile?.managedRestaurantId;

  const handleUpdateLocation = async (address: string) => {
    if (!user || !firestore) {
      toast({ title: "Please login to save location" });
      return;
    }
    setIsLocationOpen(false);
  };

  const allDishes = useMemo(() => {
    if (!restaurants) return [];
    return restaurants.flatMap(res => 
      (res.dishes || []).map(dish => ({
        ...dish,
        restaurantId: res.id,
        restaurantName: res.name
      }))
    );
  }, [restaurants]);

  const filteredDishes = useMemo(() => {
    return allDishes.filter((dish) => {
      const matchesSearch = 
        dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dish.restaurantName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === "All" || dish.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allDishes, searchQuery, activeCategory]);

  const categories = useMemo(() => {
    const cats = new Set(allDishes.map(d => d.category));
    return ["All", ...Array.from(cats)];
  }, [allDishes]);

  // Premium background: Noodle image at 80% opacity as requested
  const heroBackground = restaurants?.[0]?.image || "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=1920";

  return (
    <>
      <Navbar />
      <main className="flex-1 pb-20 relative min-h-screen">
        <div className="fixed inset-0 z-0">
          <Image 
            src={heroBackground} 
            alt="App Background"
            fill
            className="object-cover opacity-80"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/80 to-primary/5" />
        </div>

        <section className="relative pt-24 pb-32 overflow-hidden min-h-[85vh] flex items-center z-10">
          <div className="container mx-auto px-4 max-w-7xl relative z-10">
            <div className="flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 bg-primary/20 px-4 py-2 rounded-full border border-primary/30 mb-8 animate-in fade-in slide-in-from-top-4 duration-700 backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Official Local Delivery</span>
              </div>
              
              <h1 className="text-6xl md:text-9xl font-black mb-6 tracking-tighter italic uppercase leading-[0.9] drop-shadow-sm text-foreground">
                KARBI<br />
                <span className="text-primary not-italic">ZOMATO</span>
              </h1>
              
              <p className="text-foreground text-xl md:text-2xl mb-12 max-w-3xl font-bold tracking-tight bg-white/40 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/40 shadow-sm">
                Discover the finest authentic flavors in Karbi Anglong, curated for your premium taste.
              </p>

              <div className="flex flex-col md:flex-row w-full max-w-4xl glass-effect rounded-[3rem] shadow-2xl overflow-hidden ring-4 ring-primary/5 transition-all group">
                <Dialog open={isLocationOpen} onOpenChange={setIsLocationOpen}>
                  <DialogTrigger asChild>
                    <div className="flex items-center px-8 py-7 md:border-r border-b md:border-b-0 min-w-[280px] hover:bg-white/50 transition-colors cursor-pointer">
                      <MapPin className="w-6 h-6 text-primary mr-4" />
                      <div className="flex flex-col items-start">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Current Area</span>
                        <span className="text-base font-black truncate uppercase tracking-tighter max-w-[150px]">
                          {profile?.address || "Set Your Location"}
                        </span>
                      </div>
                      <ChevronDown className="w-5 h-5 ml-auto text-muted-foreground opacity-50" />
                    </div>
                  </DialogTrigger>
                  <DialogContent className="rounded-[3rem] p-10 bg-white shadow-2xl border-none">
                    <DialogHeader className="mb-6">
                      <DialogTitle className="text-3xl font-black italic uppercase text-center">Select Delivery Area</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                      <Button onClick={() => handleUpdateLocation("Detected Location")} className="w-full h-14 rounded-2xl bg-primary font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 text-white">
                        <Navigation className="w-5 h-5" /> Detect My Location
                      </Button>
                      <div className="flex gap-3">
                        <Input placeholder="Enter Pincode" type="number" value={pincode} onChange={(e) => setPincode(e.target.value)} className="h-14 rounded-2xl bg-muted/30 border-none font-black px-6" />
                        <Button onClick={() => handleUpdateLocation(`PIN: ${pincode}`)} className="h-14 rounded-2xl bg-foreground text-background font-black uppercase tracking-widest px-8">Apply</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <div className="flex-1 relative bg-white/30">
                  <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground transition-colors" />
                  <input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search dishes or restaurants..." 
                    className="w-full pl-20 pr-8 py-7 bg-transparent focus:outline-none text-xl font-bold placeholder:italic text-foreground"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-20 max-w-7xl relative z-10">
          {dbInspirations && dbInspirations.length > 0 && (
            <section className="mb-24">
              <div className="flex items-center justify-between mb-12">
                <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase text-foreground bg-white/40 backdrop-blur-md px-8 py-4 rounded-full border border-white/20">Signature Inspirations</h2>
                <div className="h-0.5 flex-1 mx-10 bg-gradient-to-r from-border/20 via-primary/20 to-border/20 rounded-full" />
              </div>
              <div className="flex gap-10 md:gap-14 overflow-x-auto no-scrollbar pb-8">
                {dbInspirations.map((item) => (
                  <div key={item.id} className="flex flex-col items-center gap-6 cursor-pointer group flex-shrink-0" onClick={() => setSearchQuery(item.name)}>
                    <div className="relative w-36 h-36 md:w-48 md:h-48 rounded-[3rem] overflow-hidden shadow-xl ring-4 ring-transparent group-hover:ring-primary transition-all duration-500 bg-white/20 backdrop-blur-md border border-white/30">
                      <Image src={item.image} alt={item.name} fill unoptimized className="object-cover group-hover:scale-110 transition-transform duration-700" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground group-hover:text-primary transition-colors bg-white/60 backdrop-blur-md px-4 py-1.5 rounded-full">{item.name}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            <div className="lg:col-span-9">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
                <div className="bg-white/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/20 flex-1">
                  <h2 className="text-6xl font-black italic tracking-tighter uppercase leading-[0.8] mb-4 text-foreground">The Master Menu</h2>
                  <p className="text-muted-foreground font-medium italic">Handpicked premium dishes curated by our expert partners.</p>
                </div>
                {categories.length > 1 && (
                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    {categories.map(cat => (
                      <Button 
                        key={cat}
                        variant={activeCategory === cat ? "default" : "outline"}
                        onClick={() => setActiveCategory(cat)}
                        className={`rounded-[1.2rem] font-black uppercase text-[10px] px-8 h-12 tracking-widest shadow-sm ${activeCategory === cat ? 'bg-primary text-white shadow-xl' : 'bg-white/60 backdrop-blur-md border-white/40 opacity-80'}`}
                      >
                        {cat}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-10 gap-y-16">
                {(isSuperAdmin || isRestaurantAdmin) && !searchQuery && (
                  <Link href={isSuperAdmin ? "/admin" : `/admin?resId=${profile?.managedRestaurantId}`} className="group h-full">
                    <Card className="border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all duration-500 rounded-[3.5rem] overflow-hidden h-full flex flex-col items-center justify-center p-12 text-center min-h-[400px] backdrop-blur-sm">
                      <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-90 transition-all">
                        <Plus className="w-12 h-12 text-primary" />
                      </div>
                      <h3 className="font-black text-3xl italic uppercase tracking-tighter text-primary">Manage Shop</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-4">Expand Your Kitchen</p>
                    </Card>
                  </Link>
                )}
                
                {filteredDishes.length > 0 ? (
                  filteredDishes.map((dish) => (
                    <DishCard key={dish.id} dish={dish} />
                  ))
                ) : (
                  (!isSuperAdmin && !isRestaurantAdmin) && (
                    <div className="col-span-full py-20 text-center bg-white/40 backdrop-blur-md rounded-[3rem] border border-white/20">
                      <Info className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
                      <p className="font-black text-muted-foreground uppercase text-xs tracking-widest">No active items available right now</p>
                      <p className="text-[10px] text-muted-foreground mt-2 font-bold">Check back soon for fresh updates!</p>
                    </div>
                  )
                )}
              </div>
            </div>
            
            <aside className="lg:col-span-3 space-y-12">
              <AIRecommendations />
              <div className="bg-white/60 backdrop-blur-2xl rounded-[3.5rem] p-10 border border-white/30 shadow-2xl relative overflow-hidden group">
                 <Zap className="w-12 h-12 text-primary mb-6" />
                 <h3 className="font-black text-2xl italic mb-4 uppercase tracking-tighter">Elite Delivery</h3>
                 <p className="text-[11px] font-bold text-muted-foreground leading-relaxed uppercase tracking-widest mb-8 opacity-70">Exclusive Diphu market priority. Your meal arrives in peak condition.</p>
                 <div className="flex items-center gap-3 bg-green-500/10 w-fit px-4 py-2 rounded-full border border-green-500/20">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                   <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">System Active</span>
                 </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
