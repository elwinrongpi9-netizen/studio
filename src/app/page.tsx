
"use client";

import { useState, useMemo, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { DishCard } from "@/components/dish-card";
import { AIRecommendations } from "@/components/ai-recommendations";
import { Button } from "@/components/ui/button";
import { Search, UtensilsCrossed, ChevronDown, MapPin, Star, Clock, Zap } from "lucide-react";
import Image from "next/image";
import { useCollection, useFirestore } from "@/firebase";
import { collection, query, orderBy, setDoc, doc, getDocs } from "firebase/firestore";
import { RESTAURANTS as MOCK_RESTAURANTS } from "@/lib/mock-data";
import { Restaurant, Dish } from "@/lib/types";

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
  const firestore = useFirestore();

  const restaurantsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "restaurants"), orderBy("name"));
  }, [firestore]);

  const { data: restaurants, loading } = useCollection<Restaurant>(restaurantsQuery);

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
        console.warn("Seeding skipped: Client might be offline or initializing.", error);
      }
    };
    seedData();
  }, [firestore, restaurants]);

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
        <section className="py-16 border-b border-border/10 relative overflow-hidden bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 max-w-5xl relative z-10">
            <div className="flex flex-col items-center mb-8">
               <h1 className="text-5xl md:text-7xl font-black mb-6 text-center tracking-tighter italic">
                zomatokarbi<span className="text-primary">.com</span>
              </h1>
              <p className="text-muted-foreground text-center text-xl mb-10 max-w-2xl font-medium">
                Fresh items from <span className="font-bold text-foreground underline decoration-primary/30 underline-offset-4">Rongpi Chinese Wok</span>
              </p>

              <div className="flex flex-col md:flex-row w-full max-w-3xl bg-card rounded-[2rem] border border-border shadow-2xl overflow-hidden ring-1 ring-border/50">
                <div className="flex items-center px-6 py-5 md:border-r border-b md:border-b-0 min-w-[220px] cursor-pointer hover:bg-muted/30 transition-colors">
                  <MapPin className="w-5 h-5 text-primary mr-3" />
                  <span className="text-sm font-black truncate uppercase tracking-widest">Diphu, KA</span>
                  <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground" />
                </div>
                <div className="flex-1 relative">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for items, biryani, or noodles" 
                    className="w-full pl-16 pr-6 py-5 bg-transparent focus:outline-none text-lg font-bold"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-16 max-w-7xl">
          <section className="mb-20">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-4xl font-black italic tracking-tighter">Quick Inspirations</h2>
              <div className="h-1 flex-1 mx-8 bg-border/20 rounded-full" />
            </div>
            <div className="flex gap-8 md:gap-12 overflow-x-auto no-scrollbar pb-6">
              {INSPIRATIONS.map((item) => (
                <div 
                  key={item.name} 
                  className="flex flex-col items-center gap-4 cursor-pointer group flex-shrink-0"
                  onClick={() => setSearchQuery(item.name)}
                >
                  <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden shadow-2xl border-4 border-transparent group-hover:border-primary transition-all">
                    <Image src={item.img} alt={item.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">{item.name}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-9">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
                <h2 className="text-5xl font-black italic tracking-tighter uppercase">
                  {searchQuery ? `Searching "${searchQuery}"` : "The Menu"}
                </h2>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                  {categories.map(cat => (
                    <Button 
                      key={cat}
                      variant={activeCategory === cat ? "default" : "outline"}
                      onClick={() => setActiveCategory(cat)}
                      className={`rounded-2xl font-black uppercase text-[9px] px-6 h-10 tracking-widest ${activeCategory === cat ? 'shadow-xl shadow-primary/20' : 'opacity-60'}`}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>
              
              {filteredDishes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-12">
                  {filteredDishes.map((dish) => (
                    <DishCard key={dish.id} dish={dish} />
                  ))}
                </div>
              ) : !loading ? (
                <div className="text-center py-24 bg-card rounded-[3rem] border border-dashed border-border/50">
                  <UtensilsCrossed className="w-16 h-16 text-muted-foreground mx-auto mb-6 opacity-20" />
                  <p className="text-xl font-bold text-muted-foreground">No dishes found matching your criteria.</p>
                  <Button variant="link" onClick={() => {setSearchQuery(""); setActiveCategory("All");}} className="mt-4 text-primary font-bold">
                    Show full menu
                  </Button>
                </div>
              ) : null}
            </div>
            
            <aside className="lg:col-span-3 space-y-10">
              <AIRecommendations />
              <div className="bg-primary/10 rounded-[2.5rem] p-8 border border-primary/20 shadow-2xl relative overflow-hidden group">
                 <Zap className="absolute -right-4 -bottom-4 w-32 h-32 text-primary opacity-5 group-hover:scale-110 transition-transform" />
                 <h3 className="font-black text-xl italic mb-4">Fastest Delivery</h3>
                 <p className="text-[10px] font-bold text-muted-foreground leading-relaxed uppercase tracking-widest mb-6">Diphu Market area within 20-30 mins guaranteed.</p>
                 <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                   <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">Active Now</span>
                 </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <footer className="bg-card border-t border-border/10 py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 mb-16">
            <div className="flex items-center gap-3">
               <UtensilsCrossed className="w-10 h-10 text-primary" />
               <span className="text-4xl font-black tracking-tighter italic">zomatokarbi.com</span>
            </div>
            <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Diphu • Karbi Anglong • Assam</div>
          </div>
          <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest border-t border-border/10 pt-10">
            © {new Date().getFullYear()} zomatokarbi.com Ltd. All rights reserved. 
          </p>
        </div>
      </footer>
    </>
  );
}
