
"use client";

import { useState, useMemo } from "react";
import { Navbar } from "@/components/navbar";
import { DishCard } from "@/components/dish-card";
import { AIRecommendations } from "@/components/ai-recommendations";
import { Button } from "@/components/ui/button";
import { Search, ChevronDown, MapPin, Sparkles, Navigation, Plus, Zap } from "lucide-react";
import Image from "next/image";
import { useCollection, useFirestore, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import { Restaurant } from "@/lib/types";
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

  const { data: restaurants } = useCollection<Restaurant>(restaurantsQuery);

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

  // Premium background
  const heroBackground = "https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&q=80&w=1920";

  return (
    <>
      <Navbar />
      <main className="flex-1 pb-20 relative min-h-screen">
        <div className="fixed inset-0 z-0">
          <Image src={heroBackground} alt="Bg" fill className="object-cover opacity-80" priority unoptimized />
          <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/80 to-primary/5" />
        </div>

        <section className="relative pt-24 pb-20 z-10">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 bg-primary/20 px-4 py-2 rounded-full border border-primary/30 mb-8 animate-in fade-in slide-in-from-top-4 duration-700 backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Karbi Anglong Official</span>
              </div>
              
              <h1 className="text-6xl md:text-9xl font-black mb-6 tracking-tighter italic uppercase leading-[0.9] text-foreground">
                KARBI<br /><span className="text-primary not-italic">ZOMATO</span>
              </h1>
              
              <p className="text-foreground text-xl md:text-2xl mb-12 max-w-3xl font-bold italic bg-white/40 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/40 shadow-sm">
                Local favorites delivered to your doorstep.
              </p>

              <div className="flex flex-col md:flex-row w-full max-w-4xl glass-effect rounded-[3rem] shadow-2xl overflow-hidden ring-4 ring-primary/5">
                <Dialog open={isLocationOpen} onOpenChange={setIsLocationOpen}>
                  <DialogTrigger asChild>
                    <div className="flex items-center px-8 py-7 md:border-r border-b md:border-b-0 min-w-[280px] hover:bg-white/50 cursor-pointer">
                      <MapPin className="w-6 h-6 text-primary mr-4" />
                      <div className="flex flex-col items-start">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Area</span>
                        <span className="text-base font-black truncate uppercase tracking-tighter max-w-[150px]">{profile?.address || "Set Location"}</span>
                      </div>
                      <ChevronDown className="w-5 h-5 ml-auto text-muted-foreground opacity-50" />
                    </div>
                  </DialogTrigger>
                  <DialogContent className="rounded-[3rem] p-10 bg-white">
                    <DialogHeader className="mb-6">
                      <DialogTitle className="text-3xl font-black italic uppercase text-center">Select Area</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                      <Button onClick={() => handleUpdateLocation("Detected")} className="w-full h-14 rounded-2xl bg-primary font-black uppercase shadow-xl text-white"><Navigation className="w-5 h-5 mr-3" /> Detect Location</Button>
                      <div className="flex gap-3">
                        <Input placeholder="Pincode" type="number" value={pincode} onChange={(e) => setPincode(e.target.value)} className="h-14 rounded-2xl bg-muted/30 border-none font-black px-6" />
                        <Button onClick={() => handleUpdateLocation(`PIN: ${pincode}`)} className="h-14 rounded-2xl bg-foreground text-background font-black uppercase px-8">Apply</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <div className="flex-1 relative bg-white/30">
                  <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
                  <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search dishes..." className="w-full pl-20 pr-8 py-7 bg-transparent focus:outline-none text-xl font-bold placeholder:italic text-foreground" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-10 max-w-7xl z-10 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            <div className="lg:col-span-9">
              {categories.length > 1 && (
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-8 mb-8">
                  {categories.map(cat => (
                    <Button key={cat} variant={activeCategory === cat ? "default" : "outline"} onClick={() => setActiveCategory(cat)} className={`rounded-[1.2rem] font-black uppercase text-[10px] px-8 h-12 ${activeCategory === cat ? 'bg-primary text-white shadow-xl' : 'bg-white/60 backdrop-blur-md opacity-80'}`}>
                      {cat}
                    </Button>
                  ))}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-10 gap-y-16">
                {(isSuperAdmin || isRestaurantAdmin) && (
                  <Link href={isSuperAdmin ? "/admin" : `/admin?resId=${profile?.managedRestaurantId}`} className="group h-full">
                    <Card className="border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all rounded-[3.5rem] flex flex-col items-center justify-center p-12 text-center min-h-[400px] backdrop-blur-sm">
                      <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-90 transition-all"><Plus className="w-12 h-12 text-primary" /></div>
                      <h3 className="font-black text-3xl italic uppercase tracking-tighter text-primary">Manage Shop</h3>
                    </Card>
                  </Link>
                )}
                
                {filteredDishes.length > 0 && filteredDishes.map((dish) => (
                  <DishCard key={dish.id} dish={dish} />
                ))}
              </div>
            </div>
            
            <aside className="lg:col-span-3 space-y-12">
              <AIRecommendations />
              <div className="bg-white/60 backdrop-blur-2xl rounded-[3.5rem] p-10 border border-white/30 shadow-2xl relative overflow-hidden">
                 <Zap className="w-12 h-12 text-primary mb-6" />
                 <h3 className="font-black text-2xl italic mb-4 uppercase tracking-tighter">Elite Delivery</h3>
                 <p className="text-[11px] font-bold text-muted-foreground leading-relaxed uppercase tracking-widest opacity-70">Official Karbi Anglong priority logistics.</p>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
