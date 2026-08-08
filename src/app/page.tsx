
"use client";

import { useState, useMemo, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { DishCard } from "@/components/dish-card";
import { AIRecommendations } from "@/components/ai-recommendations";
import { Button } from "@/components/ui/button";
import { Search, UtensilsCrossed, ChevronDown, MapPin, Star, Clock, Zap, Flame, Sparkles, Navigation, Plus } from "lucide-react";
import Image from "next/image";
import { useCollection, useFirestore, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, setDoc, doc, getDocs } from "firebase/firestore";
import { RESTAURANTS as MOCK_RESTAURANTS } from "@/lib/mock-data";
import { Restaurant } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";
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

const INSPIRATIONS = [
  { 
    name: "Biryani", 
    img: PlaceHolderImages.find(img => img.id === "biryani")?.imageUrl || "https://picsum.photos/seed/biry/400/300", 
    hint: "chicken biryani" 
  },
  { 
    name: "Chilli", 
    img: PlaceHolderImages.find(img => img.id === "chilli-chicken")?.imageUrl || "https://picsum.photos/seed/chilli/400/300", 
    hint: "chilli chicken" 
  },
  { 
    name: "Noodles", 
    img: PlaceHolderImages.find(img => img.id === "noodles")?.imageUrl || "https://picsum.photos/seed/cn/400/300", 
    hint: "chinese noodles" 
  },
  { 
    name: "Chicken 65", 
    img: PlaceHolderImages.find(img => img.id === "chicken-65")?.imageUrl || "https://picsum.photos/seed/c65/400/300", 
    hint: "fried chicken" 
  },
  { 
    name: "Fried Rice", 
    img: PlaceHolderImages.find(img => img.id === "fried-rice")?.imageUrl || "https://picsum.photos/seed/cfr/400/300", 
    hint: "fried rice" 
  },
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
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

  useEffect(() => {
    const seedData = async () => {
      if (!firestore || (restaurants && restaurants.length > 0)) return;
      try {
        const snapshot = await getDocs(collection(firestore, "restaurants"));
        if (snapshot.empty) {
          MOCK_RESTAURANTS.forEach(res => {
            setDoc(doc(firestore, "restaurants", res.id), res, { merge: true });
          });
        }
      } catch (error) {
        console.warn("Seeding skipped", error);
      }
    };
    seedData();
  }, [firestore, restaurants]);

  const handleUpdateLocation = async (address: string) => {
    if (!user || !firestore) {
      toast({ title: "Please login to save location" });
      return;
    }
    try {
      await setDoc(doc(firestore, "users", user.uid), {
        address: address
      }, { merge: true });
      setIsLocationOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Failed to update location" });
    }
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

  return (
    <>
      <Navbar />
      <main className="flex-1 pb-20 bg-background">
        <section className="relative pt-24 pb-32 overflow-hidden border-b border-border/10 min-h-[85vh] flex items-center">
          <div className="absolute inset-0 z-0">
            <Image 
              src="https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=1920" 
              alt="Background"
              fill
              className="object-cover opacity-60"
              priority
              unoptimized
              data-ai-hint="noodles chinese"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/60 to-primary/5" />
          </div>

          <div className="container mx-auto px-4 max-w-7xl relative z-10">
            <div className="flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 bg-primary/20 px-4 py-2 rounded-full border border-primary/30 mb-8 animate-in fade-in slide-in-from-top-4 duration-700 backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Original Karbi Flavors</span>
              </div>
              
              <h1 className="text-6xl md:text-9xl font-black mb-6 tracking-tighter italic uppercase leading-[0.9] drop-shadow-sm">
                KARBI<br />
                <span className="text-primary not-italic">ZOMATO</span>
              </h1>
              
              <p className="text-foreground text-xl md:text-2xl mb-12 max-w-3xl font-bold tracking-tight bg-white/40 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/40">
                Experience premium authentic flavors from <span className="text-primary font-black italic">Karbi Anglong's Master of the Wok</span>.
              </p>

              <div className="flex flex-col md:flex-row w-full max-w-4xl glass-effect rounded-[3rem] shadow-2xl overflow-hidden ring-4 ring-primary/5 transition-all group">
                <Dialog open={isLocationOpen} onOpenChange={setIsLocationOpen}>
                  <DialogTrigger asChild>
                    <div className="flex items-center px-8 py-7 md:border-r border-b md:border-b-0 min-w-[280px] hover:bg-white/50 transition-colors cursor-pointer">
                      <MapPin className="w-6 h-6 text-primary mr-4" />
                      <div className="flex flex-col items-start">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Current Area</span>
                        <span className="text-base font-black truncate uppercase tracking-tighter max-w-[150px]">
                          {profile?.address || "Diphu, Karbi Anglong"}
                        </span>
                      </div>
                      <ChevronDown className="w-5 h-5 ml-auto text-muted-foreground opacity-50" />
                    </div>
                  </DialogTrigger>
                  <DialogContent className="rounded-[3rem] p-10 bg-white shadow-2xl">
                    <DialogHeader className="mb-6">
                      <DialogTitle className="text-3xl font-black italic uppercase text-center">Select Delivery Area</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                      <Button onClick={() => handleUpdateLocation("Detected Location (GPS)")} className="w-full h-14 rounded-2xl bg-primary font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3">
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
                    placeholder="Search signature dishes, appetizers..." 
                    className="w-full pl-20 pr-8 py-7 bg-transparent focus:outline-none text-xl font-bold placeholder:italic"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-20 max-w-7xl">
          <section className="mb-24">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase">Signature Inspirations</h2>
              <div className="h-0.5 flex-1 mx-10 bg-gradient-to-r from-border/20 via-primary/20 to-border/20 rounded-full" />
            </div>
            <div className="flex gap-10 md:gap-14 overflow-x-auto no-scrollbar pb-8">
              {INSPIRATIONS.map((item) => (
                <div key={item.name} className="flex flex-col items-center gap-6 cursor-pointer group flex-shrink-0" onClick={() => setSearchQuery(item.name)}>
                  <div className="relative w-36 h-36 md:w-48 md:h-48 rounded-[3rem] overflow-hidden shadow-xl ring-4 ring-transparent group-hover:ring-primary transition-all duration-500">
                    <Image src={item.img} alt={item.name} fill unoptimized data-ai-hint={item.hint} className="object-cover group-hover:scale-110 transition-transform duration-700" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground group-hover:text-primary transition-colors">{item.name}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            <div className="lg:col-span-9">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
                <div>
                  <h2 className="text-6xl font-black italic tracking-tighter uppercase leading-[0.8] mb-4">The Master Menu</h2>
                  <p className="text-muted-foreground font-medium italic">Handpicked premium dishes for the finest taste in Diphu.</p>
                </div>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                  {categories.map(cat => (
                    <Button 
                      key={cat}
                      variant={activeCategory === cat ? "default" : "outline"}
                      onClick={() => setActiveCategory(cat)}
                      className={`rounded-[1.2rem] font-black uppercase text-[10px] px-8 h-12 tracking-widest ${activeCategory === cat ? 'bg-primary shadow-xl' : 'opacity-60'}`}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-10 gap-y-16">
                {(isSuperAdmin || isRestaurantAdmin) && !searchQuery && (
                  <Link href={isSuperAdmin ? "/admin" : `/admin?resId=${profile?.managedRestaurantId}`} className="group h-full">
                    <Card className="border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all duration-500 rounded-[3.5rem] overflow-hidden h-full flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
                      <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-90 transition-all">
                        <Plus className="w-12 h-12 text-primary" />
                      </div>
                      <h3 className="font-black text-3xl italic uppercase tracking-tighter text-primary">Add Item</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-4">Expand the Gallery</p>
                    </Card>
                  </Link>
                )}
                
                {filteredDishes.map((dish) => (
                  <DishCard key={dish.id} dish={dish} />
                ))}
              </div>
            </div>
            
            <aside className="lg:col-span-3 space-y-12">
              <AIRecommendations />
              <div className="bg-gradient-to-br from-white to-background rounded-[3.5rem] p-10 border-2 border-primary/10 shadow-xl relative overflow-hidden group">
                 <Zap className="w-12 h-12 text-primary mb-6" />
                 <h3 className="font-black text-2xl italic mb-4 uppercase tracking-tighter">Elite Delivery</h3>
                 <p className="text-[11px] font-bold text-muted-foreground leading-relaxed uppercase tracking-widest mb-8 opacity-70">Exclusive Diphu market priority. Your meal arrives in peak condition.</p>
                 <div className="flex items-center gap-3 bg-green-500/10 w-fit px-4 py-2 rounded-full border border-green-500/20">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                   <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Now Delivering</span>
                 </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
