
"use client";

import Link from "next/link";
import { Search, ShoppingBag, User, UtensilsCrossed, Smartphone, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { useAuth, useUser } from "@/firebase";
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Navbar() {
  const { cart } = useAppStore();
  const auth = useAuth();
  const { user, loading } = useUser();
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

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

            {loading ? (
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-4">
                <Link href="/orders" className="hidden md:block text-sm font-medium text-muted-foreground hover:text-foreground">
                  Orders
                </Link>
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8 border">
                    <AvatarImage src={user.photoURL || ""} />
                    <AvatarFallback>{user.displayName?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleLogin} className="font-bold">
                  Log in
                </Button>
                <Button size="sm" onClick={handleLogin} className="rounded-xl font-bold px-4">
                  Sign up
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
