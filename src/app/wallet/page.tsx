
"use client";

import { Navbar } from "@/components/navbar";
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import { doc, collection, query, where, orderBy, addDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, ArrowUpRight, History, Clock, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Shield, Sparkles, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function WalletPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const userRef = useMemo(() => (user && firestore) ? doc(firestore, "users", user.uid) : null, [user, firestore]);
  const { data: profile, loading: profileLoading } = useDoc<any>(userRef);

  const withdrawalsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "withdrawalRequests"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
  }, [firestore, user]);

  const { data: withdrawals, loading: historyLoading } = useCollection<any>(withdrawalsQuery);

  const [amount, setAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalWithdrawn = useMemo(() => {
    return withdrawals
      .filter((w: any) => w.status === 'Completed')
      .reduce((acc: number, w: any) => acc + w.amount, 0);
  }, [withdrawals]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore || !profile) return;

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount < 10) {
      toast({ title: "Min ₹10 Required", description: "Kam se kam ₹10 hone chahiye.", variant: "destructive" });
      return;
    }

    if (withdrawAmount > (profile.walletBalance || 0)) {
      toast({ title: "Insufficient Coins", variant: "destructive" });
      return;
    }

    if (!upiId.includes("@")) {
      toast({ title: "Invalid UPI ID", description: "Kripya valid UPI ID enter karein.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const timestamp = new Date().toISOString();
      
      // Create the withdrawal request
      await addDoc(collection(firestore, "withdrawalRequests"), {
        userId: user.uid,
        userEmail: user.email,
        amount: withdrawAmount,
        upiId: upiId,
        status: "Pending",
        createdAt: timestamp
      });

      // Deduct coins from user balance immediately
      await updateDoc(doc(firestore, "users", user.uid), {
        walletBalance: increment(-withdrawAmount)
      });

      toast({ 
        title: "Request Success!", 
        description: `₹${withdrawAmount} aapke UPI par 24 ghante mein bhej diye jayenge.` 
      });
      setAmount("");
      setUpiId("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (userLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="mt-4 font-bold text-muted-foreground">Opening your Karbi Wallet...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <Wallet className="w-16 h-16 text-muted-foreground mb-4 opacity-20" />
          <h1 className="text-2xl font-black mb-2">Sign In Required</h1>
          <p className="text-muted-foreground mb-6">Apna balance dekhne aur withdraw karne ke liye login karein.</p>
          <Link href="/"><Button className="rounded-xl font-bold">Return Home</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-black">Karbi <span className="text-primary">Wallet</span></h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Balance Card */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="rounded-[2.5rem] bg-primary text-white border-none shadow-2xl overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none group-hover:scale-110 transition-transform">
                <Wallet className="w-32 h-32" />
              </div>
              <CardContent className="p-10 relative z-10">
                <p className="text-primary-foreground/80 font-bold uppercase tracking-widest text-[10px] mb-2">Available Balance</p>
                <h2 className="text-6xl font-black mb-8 flex items-center gap-2">
                  ₹{profile?.walletBalance || 0}
                  <Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-2xl p-3">
                    <p className="text-[9px] uppercase font-black opacity-60">Success Out</p>
                    <p className="font-black text-sm">₹{totalWithdrawn}</p>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-3">
                    <p className="text-[9px] uppercase font-black opacity-60">Pending</p>
                    <p className="font-black text-sm">₹{withdrawals.filter(w => w.status === 'Pending').reduce((a, b) => a + b.amount, 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-8">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="text-xl font-black flex items-center gap-2">
                  <ArrowUpRight className="w-6 h-6 text-primary" />
                  Real-Time Withdraw
                </CardTitle>
                <p className="text-xs font-bold text-muted-foreground">Coins will be deducted immediately from wallet.</p>
              </CardHeader>
              <form onSubmit={handleWithdraw} className="space-y-6">
                <div className="space-y-2">
                  <Label className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Amount to Cash Out (₹)</Label>
                  <Input 
                    type="number" 
                    placeholder="Min ₹10" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)}
                    className="h-14 rounded-2xl text-xl font-black focus:ring-primary/20 bg-muted/20"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Your UPI ID (Verified Only)</Label>
                  <Input 
                    placeholder="e.g. mobile@ybl" 
                    value={upiId} 
                    onChange={e => setUpiId(e.target.value)}
                    className="h-14 rounded-2xl font-bold bg-muted/20"
                    required
                  />
                  <div className="flex items-start gap-2 bg-primary/5 p-3 rounded-xl border border-primary/10 mt-2">
                    <Shield className="w-3.5 h-3.5 text-primary mt-0.5" />
                    <p className="text-[9px] text-muted-foreground font-bold leading-tight uppercase">
                      Admin manually transfers funds to this UPI. Please ensure it is 100% correct.
                    </p>
                  </div>
                </div>
                <Button className="w-full h-16 rounded-2xl font-black text-lg shadow-xl hover:scale-[1.02] transition-transform" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin" /> : "Initiate Withdrawal"}
                </Button>
              </form>
            </Card>
          </div>

          {/* History Column */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-[2.5rem] shadow-xl p-8 min-h-[600px] flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black flex items-center gap-2">
                  <History className="w-6 h-6 text-primary" />
                  Transaction Log
                </h3>
                <Badge variant="outline" className="rounded-full font-black px-4 bg-muted border-none uppercase text-[10px] tracking-widest">
                  {withdrawals.length} Entries
                </Badge>
              </div>

              {historyLoading ? (
                <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>
              ) : withdrawals.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-20 bg-muted/10 rounded-[2rem] border-2 border-dashed">
                  <div className="bg-white p-6 rounded-full shadow-sm mb-4">
                    <Clock className="w-8 h-8 text-muted-foreground opacity-30" />
                  </div>
                  <p className="font-bold text-muted-foreground">Your financial history starts here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {withdrawals.map((req: any) => (
                    <div key={req.id} className="flex items-center justify-between p-5 rounded-2xl bg-muted/20 border border-transparent hover:border-primary/5 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${
                          req.status === 'Pending' ? 'bg-orange-100 text-orange-600' : 
                          req.status === 'Completed' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {req.status === 'Pending' ? <Clock className="w-5 h-5" /> : req.status === 'Completed' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                             <p className="font-black text-lg">₹{req.amount}</p>
                             <span className="text-[10px] font-black uppercase text-muted-foreground">to UPI</span>
                          </div>
                          <p className="text-[9px] font-black text-muted-foreground tracking-widest uppercase truncate max-w-[150px]">{req.upiId}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={`rounded-full px-3 text-[10px] font-black uppercase tracking-tighter ${
                          req.status === 'Pending' ? 'bg-orange-500' : 
                          req.status === 'Completed' ? 'bg-green-600' : 'bg-destructive'
                        }`}>
                          {req.status}
                        </Badge>
                        <p className="text-[10px] font-black text-muted-foreground mt-2 uppercase">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
