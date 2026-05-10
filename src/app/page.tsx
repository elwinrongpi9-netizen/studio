
"use client";

import { useState, useMemo, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { RestaurantCard } from "@/components/restaurant-card";
import { AIRecommendations } from "@/components/ai-recommendations";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal, UtensilsCrossed, ChevronDown, MapPin, Star, Clock, ChevronRight, Loader2 } from "lucide-react";
import Image from "next/image";
import { useCollection, useFirestore } from "@/firebase";
import { collection, query, orderBy, setDoc, doc, getDocs } from "firebase/firestore";
import { RESTAURANTS as MOCK_RESTAURANTS } from "@/lib/mock-data";
import { Restaurant } from "@/lib/types";

const INSPIRATIONS = [
  { name: "Biryani", img: "https://picsum.photos/seed/biryani/200/200" },
  { name: "Pizza", img: "https://picsum.photos/seed/pizza/200/200" },
  { name: "Burgers", img: "https://picsum.photos/seed/burger/200/200" },
  { name: "Cakes", img: "https://picsum.photos/seed/cake/200/200" },
  { name: "North Indian", img: "https://picsum.photos/seed/curry/200/200" },
  { name: "Chinese", img: "https://picsum.photos/seed/chinese/200/200" },
];

const LOCALITIES = [
  { name: "Diphu Market", count: "120 places" },
  { name: "Sarihajan", count: "45 places" },
  { name: "Bakalia", count: "30 places" },
  { name: "Howraghat", count: "25 places" },
  { name: "Dokmoka", count: "15 places" },
  { name: "Bokajan", count: "50 places" },
];

export default function Home() {
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Delivery");
  const firestore = useFirestore();

  const restaurantsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "restaurants"), orderBy("name"));
  }, [firestore]);

  const { data: restaurants, loading } = useCollection<Restaurant>(restaurantsQuery);

  // Auto-seed data if the collection is empty
  useEffect(() => {
    const seedData = async () => {
      if (!firestore || loading || (restaurants && restaurants.length > 0)) return;
      const snapshot = await getDocs(collection(firestore, "restaurants"));
      if (snapshot.empty) {
        MOCK_RESTAURANTS.forEach(res => {
          setDoc(doc(firestore, "restaurants", res.id), res);
        });
      }
    };
    seedData();
  }, [firestore, loading, restaurants]);

  const filteredRestaurants = useMemo(() => {
    if (!restaurants) return [];
    return restaurants.filter((res) => {
      const matchesSearch = 
        res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res.cuisine.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res.dishes?.some(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()));
        
      return matchesSearch;
    });
  }, [restaurants, searchQuery]);

  return (
    <>
      <Navbar />
      <main className="flex-1 pb-20">
        <section className="bg-card py-16 border-b relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
             <Image src="https://picsum.photos/seed/foodbg/1920/400" alt="background" fill className="object-cover" />
           </div>
          <div className="container mx-auto px-4 max-w-5xl relative z-10">
            <div className="flex flex-col items-center mb-8">
               <h1 className="text-5xl md:text-6xl font-black mb-6 text-center">
                Karbi <span className="text-primary italic">Zomato</span>
              </h1>
              <p className="text-muted-foreground text-center text-xl mb-10 max-w-2xl">
                Discover the best food & drinks in <span className="font-bold text-foreground">Diphu, Karbi Anglong</span>
              </p>

              <div className="flex flex-col md:flex-row w-full max-w-3xl bg-background rounded-2xl border shadow-2xl overflow-hidden ring-1 ring-border">
                <div className="flex items-center px-5 py-5 md:border-r border-b md:border-b-0 min-w-[200px] cursor-pointer hover:bg-muted/50 transition-colors">
                  <MapPin className="w-5 h-5 text-primary mr-3" />
                  <span className="text-sm font-bold truncate">Diphu, Assam</span>
                  <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground" />
                </div>
                <div className="flex-1 relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for restaurant, cuisine or a dish" 
                    className="w-full pl-14 pr-5 py-5 bg-transparent focus:outline-none text-lg"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-10 md:gap-16 mt-8">
              {["Delivery", "Dining Out", "Nightlife"].map((tab) => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex flex-col items-center gap-3 transition-all group ${
                    activeTab === tab ? "opacity-100" : "opacity-50 grayscale hover:opacity-80"
                  }`}
                >
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                    activeTab === tab ? "bg-primary/10 ring-2 ring-primary ring-offset-4 ring-offset-background" : "bg-muted"
                  }`}>
                    {tab === "Delivery" && <Clock className={`w-7 h-7 ${activeTab === tab ? "text-primary" : ""}`} />}
                    {tab === "Dining Out" && <UtensilsCrossed className={`w-7 h-7 ${activeTab === tab ? "text-primary" : ""}`} />}
                    {tab === "Nightlife" && <Star className={`w-7 h-7 ${activeTab === tab ? "text-primary" : ""}`} />}
                  </div>
                  <span className={`text-base font-black ${activeTab === tab ? "text-primary" : ""}`}>{tab}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-16 max-w-6xl">
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-8">Inspiration for your first order</h2>
            <div className="flex gap-8 md:gap-12 overflow-x-auto no-scrollbar pb-4">
              {INSPIRATIONS.map((item) => (
                <div 
                  key={item.name} 
                  className="flex flex-col items-center gap-4 cursor-pointer group flex-shrink-0"
                  onClick={() => setSearchQuery(item.name)}
                >
                  <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden shadow-xl border-4 border-transparent group-hover:border-primary transition-all">
                    <Image src={item.img} alt={item.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <span className="text-base font-bold text-muted-foreground group-hover:text-primary transition-colors">{item.name}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-8">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-3xl font-bold">
                  {searchQuery ? `Results for "${searchQuery}"` : `Best ${activeTab} Restaurants in Diphu`}
                </h2>
              </div>
              
              {loading ? (
                <div className="flex flex-col items-center py-24 gap-4">
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                  <p className="font-bold text-muted-foreground">Finding restaurants...</p>
                </div>
              ) : filteredRestaurants.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12">
                  {filteredRestaurants.map((res) => (
                    <RestaurantCard key={res.id} restaurant={res} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-24 bg-card rounded-3xl border border-dashed border-border/50">
                  <UtensilsCrossed className="w-16 h-16 text-muted-foreground mx-auto mb-6 opacity-20" />
                  <p className="text-xl font-bold text-muted-foreground">No restaurants found matching your criteria.</p>
                  <Button variant="link" onClick={() => setSearchQuery("")} className="mt-4 text-primary font-bold">
                    Show all restaurants
                  </Button>
                </div>
              )}

              <section className="mt-20">
                <h2 className="text-3xl font-bold mb-8">Popular localities in and around Diphu</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {LOCALITIES.map((loc) => (
                    <div key={loc.name} className="p-4 bg-card border rounded-xl flex items-center justify-between group cursor-pointer hover:shadow-md transition-shadow">
                      <div>
                        <h4 className="font-bold text-lg">{loc.name}</h4>
                        <p className="text-sm text-muted-foreground">{loc.count}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  ))}
                </div>
              </section>
            </div>
            
            <aside className="lg:col-span-4 space-y-10">
              <AIRecommendations />
              <div className="bg-card p-8 rounded-3xl shadow-lg border space-y-6">
                <h3 className="text-xl font-bold">Exclusive Collections</h3>
                <div className="relative rounded-2xl overflow-hidden h-48 group cursor-pointer shadow-md">
                  <Image src="https://picsum.photos/seed/coll1/600/300" alt="New in Town" fill className="object-cover transition-transform group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-6">
                    <p className="text-white text-lg font-black">New in Town</p>
                    <p className="text-white/80 text-sm font-bold">9 Places <ChevronRight className="w-4 h-4 inline" /></p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <footer className="bg-card border-t py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 mb-16">
            <div className="flex items-center gap-3">
               <UtensilsCrossed className="w-10 h-10 text-primary" />
               <span className="text-3xl font-black tracking-tighter">Karbi Zomato</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground/50 border-t border-border/50 pt-10">
            © {new Date().getFullYear()} Karbi Zomato™ Ltd. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}
