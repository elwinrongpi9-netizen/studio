
"use client";

import Link from "next/link";
import { Search, ShoppingBag, User, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";

export function Navbar() {
  const { cart } = useAppStore();
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-primary p-1.5 rounded-lg shadow-lg">
            <UtensilsCrossed className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-primary tracking-tight">
            Karbi <span className="text-foreground">Tomato</span>
          </span>
        </Link>

        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              placeholder="Search for restaurants or dishes..." 
              className="w-full pl-10 pr-4 py-2 rounded-full border bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative hover:bg-primary/10 hover:text-primary transition-colors">
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </Button>
          </Link>
          <Link href="/orders">
            <Button variant="ghost" size="icon" className="hover:bg-primary/10 hover:text-primary transition-colors">
              <User className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
