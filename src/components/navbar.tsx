
"use client";

import Link from "next/link";
import { Search, ShoppingBag, User, UtensilsCrossed, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";

export function Navbar() {
  const { cart } = useAppStore();
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <nav className="w-full border-b bg-background z-50 sticky top-0">
      <div className="container mx-auto px-4 h-18 flex items-center justify-between py-3">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
             <UtensilsCrossed className="w-7 h-7 text-primary" />
             <span className="text-xl font-black tracking-tighter">Karbi Zomato</span>
          </Link>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          <Link href="#" className="hidden md:flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
            <Smartphone className="w-4 h-4" /> Get the App
          </Link>
          <div className="flex items-center gap-2 md:gap-6">
            <Link href="/cart">
              <Button variant="ghost" size="icon" className="relative hover:text-primary">
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </Button>
            </Link>
            <Link href="/orders" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Log in
            </Link>
            <Link href="/orders" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
