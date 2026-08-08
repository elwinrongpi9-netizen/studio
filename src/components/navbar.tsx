
"use client";

import Link from "next/link";
import { 
  ShoppingBag, 
  UtensilsCrossed, 
  LogOut, 
  Lock, 
  Mail, 
  Loader2, 
  ShieldCheck, 
  Wallet, 
  Zap, 
  Sparkles, 
  UserPlus, 
  Eye, 
  EyeOff,
  Smartphone,
  LayoutDashboard
} from "lucide-react";
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
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { UserProfile } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ADMIN_EMAIL = "junakipi@gmail.com";

export function Navbar() {
  const { cart } = useAppStore();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  
  const userRef = useMemo(() => (user && firestore) ? doc(firestore, "users", user.uid) : null, [user, firestore]);
  const { data: profile } = useDoc<UserProfile>(userRef as any);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  
  const isSuperAdmin = user?.email === ADMIN_EMAIL;
  const isRestaurantAdmin = !!profile?.managedRestaurantId;
  const hasControlAccess = isSuperAdmin || isRestaurantAdmin;

  useEffect(() => {
    const initUser = async () => {
      if (user && firestore) {
        try {
          const uRef = doc(firestore, "users", user.uid);
          const snap = await getDoc(uRef);
          
          if (!snap.exists()) {
            const userData = {
              displayName: user.displayName || user.email?.split('@')[0],
              email: user.email,
              photoURL: user.photoURL,
              lastLogin: serverTimestamp(),
              role: user.email === ADMIN_EMAIL ? "admin" : "user",
              walletBalance: 0,
              wingoBalance: 0,
              createdAt: serverTimestamp()
            };
            await setDoc(uRef, userData);
          } else {
            await setDoc(uRef, { lastLogin: serverTimestamp() }, { merge: true });
          }
        } catch (e) {
          console.warn("User init delayed.", e);
        }
      }
    };
    initUser();
  }, [user, firestore]);

  const handleGoogleLogin = async () => {
    setIsAuthLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast({ title: "Welcome back!", description: "Signed in successfully." });
      setIsLoginOpen(false);
    } catch (error: any) {
      toast({ title: "Auth Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: "Logged in successfully" });
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;
        
        await setDoc(doc(firestore, "users", newUser.uid), {
          displayName: email.split('@')[0],
          email: email,
          phoneNumber: phone,
          role: "user",
          walletBalance: 0,
          wingoBalance: 0,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        }, { merge: true });
        
        toast({ title: "Account Created!" });
      }
      setIsLoginOpen(false);
    } catch (error: any) {
      toast({ title: "Auth Error", description: error.message, variant: "destructive" });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: "Signed Out" });
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <nav className="w-full border-b-2 border-primary/10 bg-background/90 backdrop-blur-2xl z-[100] sticky top-0 shadow-2xl">
      <div className="container mx-auto px-4 h-24 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-4 group">
             <div className="p-3 bg-primary rounded-[1.5rem] group-hover:rotate-12 transition-all duration-500 shadow-xl shadow-primary/20">
               <UtensilsCrossed className="w-8 h-8 text-white" />
             </div>
             <div className="flex flex-col">
               <span className="text-3xl font-black tracking-tighter italic uppercase leading-none">KARBI</span>
               <span className="text-[10px] font-black tracking-[0.5em] text-primary uppercase ml-1">ZOMATO</span>
             </div>
          </Link>
        </div>

        <div className="flex items-center gap-6">
          {user && (
            <div className="hidden lg:flex items-center gap-5">
               <Link href="/wallet" className="group">
                 <div className="flex items-center gap-3 bg-primary/5 px-6 py-3 rounded-[1.5rem] border-2 border-primary/20 group-hover:bg-primary/10 transition-all shadow-lg">
                    <Wallet className="w-5 h-5 text-primary" />
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase text-muted-foreground leading-none tracking-widest mb-1">Main</span>
                      <span className="text-sm font-black text-primary">₹{profile?.walletBalance?.toFixed(0) || 0}</span>
                    </div>
                 </div>
               </Link>
            </div>
          )}
          
          <div className="flex items-center gap-4">
            <Link href="/cart">
              <Button variant="ghost" size="icon" className="relative hover:text-primary hover:bg-primary/5 rounded-[1.5rem] transition-all h-14 w-14 border-2 border-border/50 group shadow-lg">
                <ShoppingBag className="w-6 h-6 group-hover:scale-110 transition-transform" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-white text-[10px] w-6 h-6 rounded-full flex items-center justify-center font-black shadow-2xl ring-4 ring-background">
                    {cartCount}
                  </span>
                )}
              </Button>
            </Link>

            {userLoading ? (
              <div className="w-12 h-12 rounded-[1.5rem] bg-muted animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-6">
                {hasControlAccess && (
                  <Link href="/admin">
                    <Button variant="ghost" className="hidden xl:flex items-center gap-3 text-primary font-black uppercase text-[10px] tracking-[0.2em] border-2 border-primary/30 rounded-[1.2rem] h-12 px-6 hover:bg-primary/5 transition-all">
                      <LayoutDashboard className="w-4 h-4" /> Partner Dashboard
                    </Button>
                  </Link>
                )}
                <div className="flex items-center gap-4 bg-muted/20 p-1.5 rounded-[1.8rem] border border-border/50">
                  <Avatar className="w-11 h-11 border-2 border-primary/30 p-0.5 rounded-[1.2rem]">
                    <AvatarImage src={user.photoURL || ""} className="rounded-[1rem]" />
                    <AvatarFallback className="bg-primary text-white font-black rounded-[1rem] text-sm uppercase">{user.displayName?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <Button variant="ghost" size="icon" onClick={handleLogout} className="hover:text-destructive hover:bg-destructive/10 rounded-[1.2rem] h-11 w-11 transition-all">
                    <LogOut className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            ) : (
              <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] px-10 h-14 bg-primary shadow-2xl shadow-primary/30">Login</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[420px] rounded-[4rem] p-12 bg-card border-none shadow-2xl">
                  <DialogHeader className="mb-10 text-center">
                    <DialogTitle className="text-4xl font-black italic tracking-tighter uppercase leading-[0.8]">
                      Welcome to<br/>
                      <span className="text-primary not-italic">KARBI ZOMATO</span>
                    </DialogTitle>
                  </DialogHeader>
                  
                  <form onSubmit={handleEmailAuth} className="space-y-6">
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-[1.5rem] h-16 bg-muted/30 border-none font-bold px-6" placeholder="Email" required />
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-[1.5rem] h-16 bg-muted/30 border-none font-bold px-6" placeholder="Password" required />
                    
                    <Button type="submit" className="w-full h-18 rounded-[1.5rem] font-black text-xl bg-primary py-8 uppercase tracking-widest mt-4" disabled={isAuthLoading}>
                      {isAuthLoading ? <Loader2 className="animate-spin" /> : "Authorize"}
                    </Button>
                  </form>

                  <div className="text-center mt-6">
                    <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="text-[10px] font-black uppercase text-primary hover:underline">
                      {authMode === 'login' ? 'Create Partner/User Account' : 'Back to Login'}
                    </button>
                  </div>

                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/20"></span></div>
                    <div className="relative flex justify-center text-[8px] uppercase font-black"><span className="bg-card px-4 text-muted-foreground">OR</span></div>
                  </div>
                  
                  <Button variant="outline" onClick={handleGoogleLogin} className="w-full h-16 rounded-[1.5rem] font-black flex items-center justify-center gap-4">
                    Continue with Google
                  </Button>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
