
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
  Smartphone
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
  const { data: profile } = useDoc<any>(userRef);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const isAdmin = user?.email === ADMIN_EMAIL;

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
          console.warn("User init delayed: Client might be offline.", e);
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
      toast({ title: "Welcome back!", description: "Successfully signed in with Gmail." });
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
        
        toast({ title: "Account Created! Welcome." });
      }
      setIsLoginOpen(false);
      setPhone("");
    } catch (error: any) {
      let msg = error.message;
      if (error.code === 'auth/invalid-credential') msg = "Invalid email or password.";
      if (error.code === 'auth/email-already-in-use') msg = "Email already registered. Try logging in.";
      
      toast({ title: authMode === 'login' ? "Login Failed" : "Sign Up Failed", description: msg, variant: "destructive" });
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
               <span className="text-3xl font-black tracking-tighter italic uppercase leading-none">RONGPI</span>
               <span className="text-[10px] font-black tracking-[0.5em] text-primary uppercase ml-1">CHINESE WOK</span>
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
                      <span className="text-[8px] font-black uppercase text-muted-foreground leading-none tracking-widest mb-1">Main Account</span>
                      <span className="text-sm font-black text-primary">₹{profile?.walletBalance?.toFixed(0) || 0}</span>
                    </div>
                 </div>
               </Link>
               <Link href="/wingo" className="group">
                 <div className="flex items-center gap-3 bg-purple-600/5 px-6 py-3 rounded-[1.5rem] border-2 border-purple-600/20 group-hover:bg-purple-600/10 transition-all shadow-lg">
                    <Zap className="w-5 h-5 text-purple-600" />
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase text-muted-foreground leading-none tracking-widest mb-1">Game Wallet</span>
                      <span className="text-sm font-black text-purple-600">₹{profile?.wingoBalance?.toFixed(0) || 0}</span>
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
                {isAdmin && (
                  <Link href="/admin">
                    <Button variant="ghost" className="hidden xl:flex items-center gap-3 text-primary font-black uppercase text-[10px] tracking-[0.2em] border-2 border-primary/30 rounded-[1.2rem] h-12 px-6 hover:bg-primary/5 transition-all">
                      <ShieldCheck className="w-4 h-4" /> Control Panel
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
                  <Button className="rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] px-10 h-14 bg-primary shadow-2xl shadow-primary/30 hover:scale-[1.05] transition-all active:scale-95">Member Login</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[420px] rounded-[4rem] p-12 bg-card border-none shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)]">
                  <DialogHeader className="mb-10">
                    <div className="flex justify-center mb-6">
                      <div className="p-4 bg-primary/10 rounded-[2rem]">
                        <Sparkles className="w-8 h-8 text-primary" />
                      </div>
                    </div>
                    <DialogTitle className="text-4xl font-black text-center italic tracking-tighter uppercase leading-[0.8]">
                      {authMode === 'login' ? 'Welcome Back to' : 'Join the'}
                      <br/>
                      <span className="text-primary not-italic">Premium Dining</span>
                    </DialogTitle>
                  </DialogHeader>
                  
                  <form onSubmit={handleEmailAuth} className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest ml-3 text-muted-foreground">Email Address</Label>
                      <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-[1.5rem] h-16 bg-muted/30 border-none ring-2 ring-border focus:ring-primary text-base font-bold px-6" placeholder="your@email.com" required />
                    </div>

                    {authMode === 'register' && (
                      <div className="space-y-3">
                        <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest ml-3 text-muted-foreground">Mobile Number</Label>
                        <div className="relative">
                          <Input 
                            id="phone" 
                            type="tel" 
                            value={phone} 
                            onChange={(e) => setPhone(e.target.value)} 
                            className="rounded-[1.5rem] h-16 bg-muted/30 border-none ring-2 ring-border focus:ring-primary text-base font-bold px-6 pl-14" 
                            placeholder="7086505053" 
                            required 
                          />
                          <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest ml-3 text-muted-foreground">Security Password</Label>
                      <div className="relative">
                        <Input 
                          id="password" 
                          type={showPassword ? "text" : "password"} 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          className="rounded-[1.5rem] h-16 bg-muted/30 border-none ring-2 ring-border focus:ring-primary text-base font-bold px-6 pr-14" 
                          required 
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    
                    <Button type="submit" className="w-full h-18 rounded-[1.5rem] font-black text-xl shadow-2xl bg-primary hover:bg-primary/90 py-8 uppercase tracking-widest mt-4" disabled={isAuthLoading}>
                      {isAuthLoading ? <Loader2 className="animate-spin" /> : authMode === 'login' ? "Authorize Login" : "Create Account"}
                    </Button>
                  </form>

                  <div className="text-center mt-6">
                    <button 
                      onClick={() => {
                        setAuthMode(authMode === 'login' ? 'register' : 'login');
                        setShowPassword(false);
                      }}
                      className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline flex items-center gap-2 mx-auto"
                    >
                      {authMode === 'login' ? <UserPlus className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      {authMode === 'login' ? 'Need an account? Sign Up' : 'Already have an account? Login'}
                    </button>
                  </div>

                  <div className="relative my-10">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t-2 border-border/20"></span></div>
                    <div className="relative flex justify-center text-[10px] uppercase font-black"><span className="bg-card px-6 text-muted-foreground tracking-[0.5em]">Global Auth</span></div>
                  </div>
                  
                  <Button variant="outline" onClick={handleGoogleLogin} className="w-full h-18 rounded-[1.5rem] border-2 border-border/50 font-black flex items-center justify-center gap-5 bg-background hover:bg-muted/50 py-8 transition-all group">
                    <svg className="w-7 h-7 group-hover:scale-110 transition-transform" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5.04c1.64 0 3.12.56 4.28 1.67l3.2-3.2C17.52 1.6 14.96 0 12 0 7.31 0 3.33 2.69 1.39 6.6l3.86 3c.94-2.82 3.56-4.96 6.75-4.96z"/><path fill="#4285F4" d="M23.49 12.27c0-.8-.07-1.57-.21-2.32H12v4.39h6.44c-.28 1.48-1.12 2.74-2.37 3.58l3.69 2.86c2.16-1.99 3.41-4.92 3.41-8.51z"/><path fill="#FBBC05" d="M5.25 14.61c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29l-3.86-3C.51 8.5 0 10.19 0 12c0 1.81.51 3.5 1.39 4.98l3.86-2.99z"/><path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.69-2.86c-1.11.75-2.52 1.19-4.26 1.19-3.19 0-5.81-2.14-6.75-4.96l-3.86 3C3.33 21.31 7.31 24 12 24z"/></svg>
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
