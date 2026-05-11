
"use client";

import Link from "next/link";
import { ShoppingBag, UtensilsCrossed, Smartphone, LogOut, User, Lock, Mail, Loader2, ShieldCheck, Gamepad2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { useAuth, useUser, useFirestore, useDoc } from "@/firebase";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword 
} from "firebase/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useMemo } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ADMIN_EMAIL = "zomatokarbi@gmail.com";

export function Navbar() {
  const { cart } = useAppStore();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("Junakip1");
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const userRef = useMemo(() => (user && firestore) ? doc(firestore, "users", user.uid) : null, [user, firestore]);
  const { data: profile } = useDoc<any>(userRef);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (user && firestore) {
      const userRef = doc(firestore, "users", user.uid);
      setDoc(userRef, {
        displayName: user.displayName || email.split('@')[0],
        email: user.email,
        photoURL: user.photoURL,
        lastLogin: serverTimestamp(),
        role: user.email === ADMIN_EMAIL ? "admin" : "user"
      }, { merge: true });
    }
  }, [user, firestore, email]);

  const handleGoogleLogin = async () => {
    setIsAuthLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast({ title: "Welcome back!", description: "Successfully signed in." });
      setIsLoginOpen(false);
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Logged in successfully", description: "Welcome to zomatokarbi.com" });
      setIsLoginOpen(false);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
          toast({ title: "Account Created", description: "New account created and logged in." });
          setIsLoginOpen(false);
        } catch (regError: any) {
          handleAuthError(regError);
        }
      } else {
        handleAuthError(error);
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleAuthError = (error: any) => {
    toast({ title: "Auth Failed", description: error.message, variant: "destructive" });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Signed Out", description: "You have been logged out." });
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
             <span className="text-2xl font-black tracking-tighter text-foreground">zomatokarbi<span className="text-primary">.com</span></span>
          </Link>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          {user && (
             <div className="hidden sm:flex items-center gap-2 bg-primary/5 px-4 py-2 rounded-2xl border border-primary/10">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-sm font-black text-primary">{profile?.walletBalance || 0}</span>
             </div>
          )}
          <Link href="/game-zone" className="hidden lg:flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors">
            <Gamepad2 className="w-4 h-4" /> Game Zone
          </Link>
          <div className="flex items-center gap-2 md:gap-6">
            <Link href="/cart">
              <Button variant="ghost" size="icon" className="relative hover:text-primary hover:bg-primary/5 rounded-xl transition-all">
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black shadow-lg">
                    {cartCount}
                  </span>
                )}
              </Button>
            </Link>

            {userLoading ? (
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-4">
                {isAdmin && (
                  <Link href="/admin">
                    <Button variant="ghost" className="hidden md:flex items-center gap-2 text-primary font-bold">
                      <ShieldCheck className="w-4 h-4" /> Admin
                    </Button>
                  </Link>
                )}
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
              <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-xl font-bold px-6 bg-primary hover:bg-primary/90 shadow-md">Login</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px] rounded-3xl p-8">
                  <DialogHeader className="mb-6">
                    <DialogTitle className="text-3xl font-black text-center">Login to <span className="text-primary">zomatokarbi</span></DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="font-bold flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> Email</Label>
                      <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl h-12" placeholder="your@email.com" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="font-bold flex items-center gap-2"><Lock className="w-4 h-4 text-primary" /> Password</Label>
                      <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-xl h-12" required />
                    </div>
                    <Button type="submit" className="w-full h-12 rounded-xl font-black text-lg shadow-lg shadow-primary/20" disabled={isAuthLoading}>
                      {isAuthLoading ? <Loader2 className="animate-spin" /> : "Sign In"}
                    </Button>
                  </form>
                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground font-bold">Or continue with</span></div>
                  </div>
                  <Button variant="outline" onClick={handleGoogleLogin} className="w-full h-12 rounded-xl border-2 font-bold flex items-center justify-center gap-3">
                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5.04c1.64 0 3.12.56 4.28 1.67l3.2-3.2C17.52 1.6 14.96 0 12 0 7.31 0 3.33 2.69 1.39 6.6l3.86 3c.94-2.82 3.56-4.96 6.75-4.96z"/><path fill="#4285F4" d="M23.49 12.27c0-.8-.07-1.57-.21-2.32H12v4.39h6.44c-.28 1.48-1.12 2.74-2.37 3.58l3.69 2.86c2.16-1.99 3.41-4.92 3.41-8.51z"/><path fill="#FBBC05" d="M5.25 14.61c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29l-3.86-3C.51 8.5 0 10.19 0 12c0 1.81.51 3.5 1.39 4.98l3.86-2.99z"/><path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.69-2.86c-1.11.75-2.52 1.19-4.26 1.19-3.19 0-5.81-2.14-6.75-4.96l-3.86 3C3.33 21.31 7.31 24 12 24z"/></svg>
                    Google
                  </Button>
                  <p className="text-[10px] text-center text-muted-foreground mt-8 leading-tight">Developer Hint: Login with <span className="font-bold">zomatokarbi@gmail.com</span> / <span className="font-bold">Junakip1</span></p>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
