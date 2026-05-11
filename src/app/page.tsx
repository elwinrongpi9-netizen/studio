
"use client";

import { useState, useMemo, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { RestaurantCard } from "@/components/restaurant-card";
import { AIRecommendations } from "@/components/ai-recommendations";
import { Button } from "@/components/ui/button";
import { Search, UtensilsCrossed, ChevronDown, MapPin, Star, Clock, ChevronRight, Loader2 } from "lucide-react";
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

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Delivery");
  const firestore = useFirestore();

  const restaurantsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "restaurants"), orderBy("name"));
  }, [firestore]);

  const { data: restaurants, loading } = useCollection<Restaurant>(restaurantsQuery);

  useEffect(() => {
    const seedData = async () => {
      if (!firestore || loading || (restaurants && restaurants.length > 0)) return;
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
  }, [firestore, loading, restaurants]);

  const filteredRestaurants = useMemo(() => {
    if (!restaurants) return [];
    return restaurants
      .filter((res) => {
        const matchesSearch = 
          res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          res.cuisine.toLowerCase().includes(searchQuery.toLowerCase()) ||
          res.dishes?.some(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()));
          
        return matchesSearch;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [restaurants, searchQuery]);

  return (
    <>
      <Navbar />
      <main className="flex-1 pb-20">
        <section className="bg-white py-16 border-b relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none bg-gradient-to-br from-primary/20 to-accent/20">
             <Image src="https://picsum.photos/seed/foodbg/1920/400" alt="background" fill className="object-cover grayscale" />
           </div>
          <div className="container mx-auto px-4 max-w-5xl relative z-10">
            <div className="flex flex-col items-center mb-8">
               <h1 className="text-5xl md:text-6xl font-black mb-6 text-center tracking-tight">
                zomatokarbi<span className="text-primary">.com</span>
              </h1>
              <p className="text-muted-foreground text-center text-xl mb-10 max-w-2xl font-medium">
                The best food discovery in <span className="font-bold text-foreground underline decoration-accent/30 underline-offset-4">Diphu, Karbi Anglong</span>
              </p>

              <div className="flex flex-col md:flex-row w-full max-w-3xl bg-background rounded-2xl border shadow-xl overflow-hidden ring-1 ring-border">
                <div className="flex items-center px-5 py-5 md:border-r border-b md:border-b-0 min-w-[200px] cursor-pointer hover:bg-muted/50 transition-colors">
                  <MapPin className="w-5 h-5 text-primary mr-3" />
                  <span className="text-sm font-bold truncate">Diphu, Karbi Anglong</span>
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
                    activeTab === tab ? "opacity-100" : "opacity-40 grayscale hover:opacity-80"
                  }`}
                >
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                    activeTab === tab ? "bg-primary/10 ring-2 ring-primary ring-offset-4 ring-offset-background" : "bg-muted"
                  }`}>
                    {tab === "Delivery" && <Clock className={`w-7 h-7 ${activeTab === tab ? "text-primary" : ""}`} />}
                    {tab === "Dining Out" && <UtensilsCrossed className={`w-7 h-7 ${activeTab === tab ? "text-primary" : ""}`} />}
                    {tab === "Nightlife" && <Star className={`w-7 h-7 ${activeTab === tab ? "text-primary" : ""}`} />}
                  </div>
                  <span className={`text-sm font-bold tracking-wide uppercase ${activeTab === tab ? "text-primary" : "text-muted-foreground"}`}>{tab}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-16 max-w-6xl">
          <section className="mb-16">
            <h2 className="text-3xl font-black mb-8">Inspiration for your first order</h2>
            <div className="flex gap-8 md:gap-12 overflow-x-auto no-scrollbar pb-4">
              {INSPIRATIONS.map((item) => (
                <div 
                  key={item.name} 
                  className="flex flex-col items-center gap-4 cursor-pointer group flex-shrink-0"
                  onClick={() => setSearchQuery(item.name)}
                >
                  <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden shadow-lg border-2 border-transparent group-hover:border-primary transition-all">
                    <Image src={item.img} alt={item.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <span className="text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors">{item.name}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-8">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-3xl font-black">
                  {searchQuery ? `Results for "${searchQuery}"` : `Best ${activeTab} in Diphu`}
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
            </div>
            
            <aside className="lg:col-span-4 space-y-10">
              <AIRecommendations />
            </aside>
          </div>
        </div>
      </main>
      <footer className="bg-card border-t py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 mb-16">
            <div className="flex items-center gap-3">
               <UtensilsCrossed className="w-10 h-10 text-primary" />
               <span className="text-3xl font-black tracking-tighter">zomatokarbi.com</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-medium border-t border-border pt-10">
            © {new Date().getFullYear()} zomatokarbi.com Ltd. All rights reserved. Diphu, Karbi Anglong, Assam.
          </p>
        </div>
      </footer>
    </>
  );
}
