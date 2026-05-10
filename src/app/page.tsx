
"use client";

import { useState, useMemo } from "react";
import { Navbar } from "@/components/navbar";
import { RESTAURANTS } from "@/lib/mock-data";
import { RestaurantCard } from "@/components/restaurant-card";
import { AIRecommendations } from "@/components/ai-recommendations";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal, UtensilsCrossed, ChevronDown, MapPin, Star, Clock } from "lucide-react";
import Image from "next/image";

const INSPIRATIONS = [
  { name: "Biryani", img: "https://picsum.photos/seed/biryani/200/200" },
  { name: "Pizza", img: "https://picsum.photos/seed/pizza/200/200" },
  { name: "Burgers", img: "https://picsum.photos/seed/burger/200/200" },
  { name: "Cakes", img: "https://picsum.photos/seed/cake/200/200" },
  { name: "North Indian", img: "https://picsum.photos/seed/curry/200/200" },
  { name: "Chinese", img: "https://picsum.photos/seed/chinese/200/200" },
];

export default function Home() {
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Delivery");

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
      <main className="flex-1 pb-20">
        {/* Zomato-style Hero Search Section */}
        <section className="bg-card py-12 border-b">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="flex flex-col items-center mb-8">
               <h1 className="text-4xl md:text-5xl font-black mb-6 text-center">
                Karbi <span className="text-primary italic">Zomato</span>
              </h1>
              <p className="text-muted-foreground text-center text-lg mb-8 max-w-2xl">
                Discover the best food & drinks in <span className="font-bold text-foreground">Diphu, Karbi Anglong</span>
              </p>

              <div className="flex flex-col md:flex-row w-full max-w-3xl bg-background rounded-xl border shadow-xl overflow-hidden">
                <div className="flex items-center px-4 py-4 md:border-r border-b md:border-b-0 min-w-[180px]">
                  <MapPin className="w-5 h-5 text-primary mr-2" />
                  <span className="text-sm font-medium truncate">Diphu, Assam</span>
                  <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground" />
                </div>
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for restaurant, cuisine or a dish" 
                    className="w-full pl-12 pr-4 py-4 bg-transparent focus:outline-none text-base"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-8 md:gap-12 mt-4">
              {["Delivery", "Dining Out", "Nightlife"].map((tab) => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex flex-col items-center gap-2 transition-all group ${
                    activeTab === tab ? "opacity-100" : "opacity-50 grayscale hover:opacity-80"
                  }`}
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    activeTab === tab ? "bg-primary/10 ring-2 ring-primary ring-offset-4 ring-offset-background" : "bg-muted"
                  }`}>
                    {tab === "Delivery" && <Clock className={`w-6 h-6 ${activeTab === tab ? "text-primary" : ""}`} />}
                    {tab === "Dining Out" && <UtensilsCrossed className={`w-6 h-6 ${activeTab === tab ? "text-primary" : ""}`} />}
                    {tab === "Nightlife" && <Star className={`w-6 h-6 ${activeTab === tab ? "text-primary" : ""}`} />}
                  </div>
                  <span className={`text-sm font-bold ${activeTab === tab ? "text-primary" : ""}`}>{tab}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-12 max-w-6xl">
          {/* Inspiration Section */}
          <section className="mb-12 overflow-x-auto no-scrollbar">
            <h2 className="text-2xl font-bold mb-6">Inspiration for your first order</h2>
            <div className="flex gap-8 md:gap-12 min-w-max">
              {INSPIRATIONS.map((item) => (
                <div 
                  key={item.name} 
                  className="flex flex-col items-center gap-3 cursor-pointer group"
                  onClick={() => {setSearchQuery(item.name); setFilter("All");}}
                >
                  <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden shadow-lg border-2 border-transparent group-hover:border-primary transition-all">
                    <Image src={item.img} alt={item.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <span className="text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors">{item.name}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
              {/* Filter Chips */}
              <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2 no-scrollbar">
                <Button variant="outline" className="rounded-lg h-9 px-3 gap-2 font-medium">
                  <SlidersHorizontal className="w-4 h-4" /> Filters
                </Button>
                <Button variant="outline" className="rounded-lg h-9 px-3 font-medium">Rating: 4.0+</Button>
                <Button variant="outline" className="rounded-lg h-9 px-3 font-medium">Pure Veg</Button>
                <Button variant="outline" className="rounded-lg h-9 px-3 font-medium">Cuisine <ChevronDown className="w-3 h-3 ml-1" /></Button>
              </div>

              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold">
                  {searchQuery ? `Results for "${searchQuery}"` : `Best ${activeTab} Restaurants in Diphu`}
                </h2>
              </div>
              
              {filteredAndSortedRestaurants.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-10">
                  {filteredAndSortedRestaurants.map((res) => (
                    <RestaurantCard key={res.id} restaurant={res} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-card rounded-3xl border border-dashed">
                  <UtensilsCrossed className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium text-muted-foreground">No restaurants found matching your criteria.</p>
                  <Button variant="link" onClick={() => {setSearchQuery(""); setFilter("All");}} className="mt-2">
                    Show all restaurants
                  </Button>
                </div>
              )}
            </div>
            
            <aside className="lg:col-span-4 space-y-8">
              <AIRecommendations />
              <div className="bg-card p-6 rounded-2xl shadow-sm border space-y-4">
                <h3 className="font-bold">Exclusive Collections</h3>
                <div className="relative rounded-xl overflow-hidden h-40 group cursor-pointer">
                  <Image src="https://picsum.photos/seed/coll1/400/200" alt="New in Town" fill className="object-cover transition-transform group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4">
                    <p className="text-white font-bold">New in Town</p>
                    <p className="text-white/70 text-xs">9 Places →</p>
                  </div>
                </div>
                <div className="relative rounded-xl overflow-hidden h-40 group cursor-pointer">
                  <Image src="https://picsum.photos/seed/coll2/400/200" alt="Trending" fill className="object-cover transition-transform group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4">
                    <p className="text-white font-bold">Trending this week</p>
                    <p className="text-white/70 text-xs">12 Places →</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <footer className="bg-card border-t py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
            <div className="flex items-center gap-2">
               <UtensilsCrossed className="w-8 h-8 text-primary" />
               <span className="text-2xl font-black">Karbi Zomato</span>
            </div>
            <div className="flex gap-4">
              <Button variant="outline" className="rounded-lg font-bold border-border">India</Button>
              <Button variant="outline" className="rounded-lg font-bold border-border">English</Button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12 text-sm">
            <div className="space-y-3">
              <p className="font-bold tracking-widest text-xs uppercase mb-4">About Zomato</p>
              <a href="#" className="block text-muted-foreground hover:text-foreground">Who We Are</a>
              <a href="#" className="block text-muted-foreground hover:text-foreground">Blog</a>
              <a href="#" className="block text-muted-foreground hover:text-foreground">Work With Us</a>
              <a href="#" className="block text-muted-foreground hover:text-foreground">Contact Us</a>
            </div>
            <div className="space-y-3">
              <p className="font-bold tracking-widest text-xs uppercase mb-4">Zomaverse</p>
              <a href="#" className="block text-muted-foreground hover:text-foreground">Zomato</a>
              <a href="#" className="block text-muted-foreground hover:text-foreground">Blinkit</a>
              <a href="#" className="block text-muted-foreground hover:text-foreground">Feeding India</a>
              <a href="#" className="block text-muted-foreground hover:text-foreground">Hyperpure</a>
            </div>
            <div className="space-y-3">
              <p className="font-bold tracking-widest text-xs uppercase mb-4">For Restaurants</p>
              <a href="#" className="block text-muted-foreground hover:text-foreground">Partner With Us</a>
              <a href="#" className="block text-muted-foreground hover:text-foreground">Apps For You</a>
            </div>
            <div className="space-y-3">
              <p className="font-bold tracking-widest text-xs uppercase mb-4">Learn More</p>
              <a href="#" className="block text-muted-foreground hover:text-foreground">Privacy</a>
              <a href="#" className="block text-muted-foreground hover:text-foreground">Security</a>
              <a href="#" className="block text-muted-foreground hover:text-foreground">Terms</a>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground/50 border-t pt-8">
            By continuing past this page, you agree to our Terms of Service, Cookie Policy, Privacy Policy and Content Policies. All trademarks are properties of their respective owners. 2008-{new Date().getFullYear()} © Karbi Zomato™ Ltd. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}
