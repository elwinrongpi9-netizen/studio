
"use client";

import Link from "next/link";
import { ShoppingBag, UtensilsCrossed, Smartphone, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { useAuth, useUser, useFirestore } from "@/firebase";
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export function Navbar() {
  const { cart } = useAppStore();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, loading } = useUser();
  const { toast } = useToast();
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    if (user && firestore) {
      const userRef = doc(firestore, "users", user.uid);
      setDoc(userRef, {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        lastLogin: serverTimestamp(),
      }, { merge: true });
    }
  }, [user, firestore]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast({
        title: "Welcome back!",
        description: "Successfully signed in with Google.",
      });
    } catch (error: any) {
      console.error("Login failed", error);
      toast({
        title: "Login Failed",
        description: error.message || "Could not sign in with Google. Ensure it's enabled in Firebase Console.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Signed Out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <nav className="w-full border-b bg-white/80 backdrop-blur-md z-50 sticky top-0 shadow-sm">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between py-3">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
             <div className="p-2 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
               <UtensilsCrossed className="w-7 h-7 text-primary" />
             </div>
             <span className="text-2xl font-black tracking-tighter text-foreground">Karbi <span className="text-primary">Zomato</span></span>
          </Link>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          <Link href="#" className="hidden lg:flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors">
            <Smartphone className="w-4 h-4" /> Get App
          </Link>
          <div className="flex items-center gap-2 md:gap-6">
            <Link href="/cart">
              <Button variant="ghost" size="icon" className="relative hover:text-primary hover:bg-primary/5 rounded-xl transition-all">
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black shadow-lg animate-in zoom-in">
                    {cartCount}
                  </span>
                )}
              </Button>
            </Link>

            {loading ? (
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-4">
                <Link href="/orders" className="hidden md:block text-sm font-bold text-muted-foreground hover:text-primary">
                  Orders
                </Link>
                <div className="flex items-center gap-2">
                  <Avatar className="w-9 h-9 border-2 border-primary/20 p-0.5">
                    <AvatarImage src={user.photoURL || ""} className="rounded-full" />
                    <AvatarFallback className="bg-primary/10 text-primary font-black">{user.displayName?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout" className="hover:text-destructive hover:bg-destructive/5 rounded-xl">
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={handleLogin} className="font-bold text-muted-foreground hover:text-primary">
                  Log in
                </Button>
                <Button size="sm" onClick={handleLogin} className="rounded-xl font-bold px-6 bg-primary hover:bg-primary/90 shadow-md transition-all">
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
