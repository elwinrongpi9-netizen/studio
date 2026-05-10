
"use client";

import { useState, useMemo } from "react";
import { Navbar } from "@/components/navbar";
import { RESTAURANTS } from "@/lib/mock-data";
import { RestaurantCard } from "@/components/restaurant-card";
import { AIRecommendations } from "@/components/ai-recommendations";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal, UtensilsCrossed } from "lucide-react";

export default function Home() {
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const categories = ["All", "Pizza", "Burgers", "Sushi", "Indian", "Healthy", "Desserts"];

  const filteredAndSortedRestaurants = useMemo(() => {
    return RESTAURANTS
      .filter((res) => {
        const matchesCategory = 
          filter === "All" || 
          res.cuisine.toLowerCase().includes(filter.toLowerCase()) ||
          res.dishes.some(d => d.category.toLowerCase() === filter.toLowerCase());
        
        const matchesSearch = 
          res.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          res.cuisine.toLowerCase().includes(searchQuery.toLowerCase()) ||
          res.dishes.some(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()));
          
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filter, searchQuery]);

  return (
    <>
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <section className="mb-12">
          <div className="max-w-2xl mx-auto text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              Cravings satisfied in <span className="text-primary italic">minutes.</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Discover the best food and drinks from top-rated local restaurants in Karbi Anglong.
            </p>
          </div>
          
          <div className="flex max-w-xl mx-auto mb-8">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for Burgers, Pizza, or Restaurants..." 
                className="w-full pl-12 pr-4 py-4 rounded-2xl border bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-base shadow-lg"
              />
            </div>
          </div>

          <div className="flex overflow-x-auto pb-4 gap-2 no-scrollbar">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={filter === cat ? "default" : "outline"}
                className={`rounded-full whitespace-nowrap px-6 transition-all ${
                  filter === cat ? "shadow-md scale-105" : "hover:border-primary/40 hover:text-primary"
                }`}
                onClick={() => setFilter(cat)}
              >
                {cat}
              </Button>
            ))}
            <Button variant="outline" className="rounded-full px-4 ml-auto hidden md:flex">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {searchQuery ? `Results for "${searchQuery}"` : "Best Restaurants Near You"}
              </h2>
              <span className="text-primary text-sm font-bold cursor-pointer hover:underline">
                {filteredAndSortedRestaurants.length} found
              </span>
            </div>
            
            {filteredAndSortedRestaurants.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredAndSortedRestaurants.map((res) => (
                  <RestaurantCard key={res.id} restaurant={res} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed">
                <UtensilsCrossed className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium text-muted-foreground">No restaurants found matching your search.</p>
                <Button variant="link" onClick={() => {setSearchQuery(""); setFilter("All");}} className="mt-2">
                  Clear all filters
                </Button>
              </div>
            )}
          </div>
          
          <aside className="lg:col-span-4 space-y-8">
            <AIRecommendations />
            <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
              <h3 className="font-bold">Exclusive Offers</h3>
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                <span className="text-[10px] font-bold text-primary uppercase bg-primary/10 px-2 py-0.5 rounded mb-2 inline-block">Flash Deal</span>
                <p className="font-bold text-lg mb-1">50% OFF</p>
                <p className="text-xs text-muted-foreground">On your first order from Zomato Italiano</p>
              </div>
              <div className="p-4 bg-accent/5 rounded-xl border border-accent/10">
                <span className="text-[10px] font-bold text-accent uppercase bg-accent/10 px-2 py-0.5 rounded mb-2 inline-block">Limited Time</span>
                <p className="font-bold text-lg mb-1">Free Delivery</p>
                <p className="text-xs text-muted-foreground">For all orders above ₹499</p>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <footer className="bg-white border-t py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center items-center gap-2 mb-4">
             <UtensilsCrossed className="w-6 h-6 text-primary" />
             <span className="text-xl font-bold">Karbi Zomato</span>
          </div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Karbi Zomato is your companion for discovering delicious meals around you. Fast delivery, fresh food, and best service.
          </p>
          <div className="flex justify-center gap-8 text-xs text-muted-foreground font-medium uppercase tracking-widest">
            <a href="#" className="hover:text-primary transition-colors">About Us</a>
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-primary transition-colors">Contact</a>
          </div>
          <p className="mt-8 text-[10px] text-muted-foreground/50">© {new Date().getFullYear()} Karbi Zomato. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}
