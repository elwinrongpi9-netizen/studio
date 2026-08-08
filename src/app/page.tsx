
"use client";

import { useState, useMemo, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { DishCard } from "@/components/dish-card";
import { AIRecommendations } from "@/components/ai-recommendations";
import { Button } from "@/components/ui/button";
import { Search, UtensilsCrossed, ChevronDown, MapPin, Star, Clock, Zap, Flame, Sparkles, Navigation, Loader2, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { useCollection, useFirestore, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, setDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { RESTAURANTS as MOCK_RESTAURANTS } from "@/lib/mock-data";
import { Restaurant, Dish } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const INSPIRATIONS = [
  { name: "Biryani", img: "https://picsum.photos/seed/biryani/200/200" },
  { name: "Chilli", img: "https://picsum.photos/seed/chilli/200/200" },
  { name: "Noodles", img: "https://picsum.photos/seed/noodles/200/200" },
  { name: "Lollipop", img: "https://picsum.photos/seed/lolly/200/200" },
  { name: "Rice", img: "https://picsum.photos/seed/rice/200/200" },
  { name: "Soup", img: "https://picsum.photos/seed/soup/200/200" },
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  
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
        console.warn("Seeding skipped: Client might be offline.", error);
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
      // Use setDoc with merge to ensure doc exists
      await setDoc(doc(firestore, "users", user.uid), {
        address: address
      }, { merge: true });
      
      toast({ title: "Location Updated! 📍", description: address });
      setIsLocationOpen(false);
      setManualAddress("");
    } catch (e) {
      toast({ variant: "destructive", title: "Failed to update location" });
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "Geolocation not supported by your browser" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const mockAddress = `Area near ${position.coords.latitude.toFixed(2)}, ${position.coords.longitude.toFixed(2)}`;
        await handleUpdateLocation(mockAddress);
      },
      (error) => {
        toast({ variant: "destructive", title: "Location access denied" });
      }
    );
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
    return allDishes
      .filter((dish) => {
        const matchesSearch = 
          dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          dish.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          dish.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          dish.restaurantName.toLowerCase().includes(searchQuery.toLowerCase());
          
        const matchesCategory = activeCategory === "All" || dish.category === activeCategory;
        
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allDishes, searchQuery, activeCategory]);

  const categories = useMemo(() => {
    const cats = new Set(allDishes.map(d => d.category));
    return ["All", ...Array.from(cats)];
  }, [allDishes]);

  return (
    <>
      <Navbar />
      <main className="flex-1 pb-20 bg-background text-foreground">
        <section className="relative pt-24 pb-32 overflow-hidden border-b border-border/10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background opacity-50" />
          <div className="container mx-auto px-4 max-w-7xl relative z-10">
            <div className="flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full border border-primary/20 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">The Art of Chinese Cuisine</span>
              </div>
              
              <h1 className="text-6xl md:text-9xl font-black mb-6 tracking-tighter italic uppercase leading-[0.9]">
                RONGPI<br />
                <span className="text-primary not-italic">CHINESE WOK</span>
              </h1>
              
              <p className="text-muted-foreground text-xl md:text-2xl mb-12 max-w-3xl font-medium tracking-tight">
                Experience premium authentic flavors from <span className="text-foreground font-black italic">Diphu's Original Master of the Wok</span>.
              </p>

              <div className="flex flex-col md:flex-row w-full max-w-4xl bg-card rounded-[3rem] border-2 border-border/50 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden ring-4 ring-primary/5 transition-all hover:ring-primary/10 group">
                
                <Dialog open={isLocationOpen} onOpenChange={setIsLocationOpen}>
                  <DialogTrigger asChild>
                    <div className="flex items-center px-8 py-7 md:border-r-2 border-b md:border-b-0 min-w-[280px] bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer">
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
                  <DialogContent className="rounded-[3rem] p-10 bg-card border-none shadow-2xl sm:max-w-[450px]">
                    <DialogHeader className="mb-8">
                      <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-center">Select Delivery Area</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                      <Button 
                        onClick={detectLocation}
                        className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-3"
                      >
                        <Navigation className="w-5 h-5" />
                        Detect My Location (GPS)
                      </Button>
                      
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/50"></span></div>
                        <div className="relative flex justify-center text-[10px] uppercase font-black"><span className="bg-card px-4 text-muted-foreground tracking-[0.5em]">OR MANUAL</span></div>
                      </div>

                      <div className="space-y-4">
                        <div className="relative">
                          <Input 
                            placeholder="Enter area or building..." 
                            value={manualAddress}
                            onChange={(e) => setManualAddress(e.target.value)}
                            className="h-16 rounded-2xl bg-muted/30 border-none ring-2 ring-border focus:ring-primary font-bold px-6"
                          />
                        </div>
                        <Button 
                          onClick={() => handleUpdateLocation(manualAddress)}
                          disabled={!manualAddress}
                          className="w-full h-14 rounded-2xl bg-foreground text-background hover:bg-foreground/90 font-black uppercase tracking-widest"
                        >
                          Apply Manually
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <div className="flex-1 relative bg-muted/10">
                  <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search premium starters, main course or biryani..." 
                    className="w-full pl-20 pr-8 py-7 bg-transparent focus:outline-none text-xl font-bold placeholder:italic placeholder:font-medium"
                  />
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-10 mt-16 opacity-40">
                <div className="flex items-center gap-2"><Flame className="w-4 h-4" /> <span className="text-[9px] font-black uppercase tracking-widest">Freshly Cooked</span></div>
                <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> <span className="text-[9px] font-black uppercase tracking-widest">Fast Delivery</span></div>
                <div className="flex items-center gap-2"><Star className="w-4 h-4" /> <span className="text-[9px] font-black uppercase tracking-widest">Top Rated</span></div>
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
            <div className="flex gap-10 md:gap-14 overflow-x-auto no-scrollbar pb-8 px-2">
              {INSPIRATIONS.map((item) => (
                <div 
                  key={item.name} 
                  className="flex flex-col items-center gap-6 cursor-pointer group flex-shrink-0"
                  onClick={() => setSearchQuery(item.name)}
                >
                  <div className="relative w-36 h-36 md:w-48 md:h-48 rounded-[3rem] overflow-hidden shadow-2xl ring-4 ring-transparent group-hover:ring-primary group-hover:-translate-y-2 transition-all duration-500">
                    <Image src={item.img} alt={item.name} fill className="object-cover scale-105 group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-6">
                      <span className="text-white font-black uppercase text-[10px] tracking-widest">Explore</span>
                    </div>
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
                  <h2 className="text-6xl font-black italic tracking-tighter uppercase leading-[0.8] mb-4">
                    {searchQuery ? `Searching "${searchQuery}"` : "The Signature Menu"}
                  </h2>
                  <p className="text-muted-foreground font-medium italic">Handpicked premium dishes for the finest taste.</p>
                </div>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                  {categories.map(cat => (
                    <Button 
                      key={cat}
                      variant={activeCategory === cat ? "default" : "outline"}
                      onClick={() => setActiveCategory(cat)}
                      className={`rounded-[1.2rem] font-black uppercase text-[10px] px-8 h-12 tracking-widest transition-all ${activeCategory === cat ? 'bg-primary shadow-2xl shadow-primary/30' : 'opacity-60 hover:opacity-100'}`}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-10 gap-y-16">
                {filteredDishes.length > 0 ? (
                  filteredDishes.map((dish) => (
                    <DishCard key={dish.id} dish={dish} />
                  ))
                ) : (
                  <div className="col-span-full text-center py-32 bg-muted/5 rounded-[4rem] border-2 border-dashed border-border/50">
                    <UtensilsCrossed className="w-20 h-20 text-muted-foreground mx-auto mb-8 opacity-20" />
                    <p className="text-2xl font-black italic text-muted-foreground uppercase tracking-tighter">Seeking excellence...</p>
                    <Button variant="link" onClick={() => {setSearchQuery(""); setActiveCategory("All");}} className="mt-6 text-primary font-black uppercase tracking-widest text-[11px]">
                      View Full Menu
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            <aside className="lg:col-span-3 space-y-12">
              <AIRecommendations />
              <div className="bg-gradient-to-br from-card to-background rounded-[3.5rem] p-10 border-2 border-primary/10 shadow-2xl relative overflow-hidden group">
                 <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-primary/10 rounded-full blur-[60px] group-hover:scale-150 transition-transform duration-700" />
                 <Zap className="w-12 h-12 text-primary mb-6" />
                 <h3 className="font-black text-2xl italic mb-4 uppercase tracking-tighter">Elite Delivery</h3>
                 <p className="text-[11px] font-bold text-muted-foreground leading-relaxed uppercase tracking-widest mb-8 opacity-70">Exclusive Diphu market priority. Your meal arrives in peak condition within 25 minutes.</p>
                 <div className="flex items-center gap-3 bg-green-500/10 w-fit px-4 py-2 rounded-full border border-green-500/20">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                   <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Now Delivering</span>
                 </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
      
      <footer className="bg-card border-t-4 border-primary/20 py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-30" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-16 mb-20">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                 <UtensilsCrossed className="w-12 h-12 text-primary" />
                 <span className="text-4xl font-black tracking-tighter italic uppercase">Rongpi Chinese Wok</span>
              </div>
              <p className="text-muted-foreground font-medium max-w-sm italic">The pinnacle of authentic flavors in Karbi Anglong. Premium quality, every single time.</p>
            </div>
            <div className="flex flex-col md:items-end gap-2">
              <span className="text-11px font-black uppercase text-foreground tracking-[0.4em]">Establishment</span>
              <span className="text-sm font-bold text-muted-foreground">Diphu • Karbi Anglong • Assam</span>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 border-t-2 border-border/10 pt-16">
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.5em]">
              © {new Date().getFullYear()} Rongpi Chinese Wok. All Rights Reserved.
            </p>
            <div className="flex gap-10 opacity-40">
              <span className="text-[10px] font-black uppercase tracking-widest cursor-pointer hover:text-primary transition-colors">Instagram</span>
              <span className="text-[10px] font-black uppercase tracking-widest cursor-pointer hover:text-primary transition-colors">Facebook</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
