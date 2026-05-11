
"use client";

import { Navbar } from "@/components/navbar";
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import { doc, collection, query, where, orderBy, addDoc, updateDoc, increment } from "firebase/firestore";
import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, ArrowUpRight, History, Clock, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Shield, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function WalletPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const userRef = useMemo(() => (user && firestore) ? doc(firestore, "users", user.uid) : null, [user, firestore]);
  const { data: profile, loading: profileLoading } = useDoc<any>(userRef);

  const withdrawalsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    // Note: This query requires a composite index in production.
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

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore || !profile) return;

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount < 10) {
      toast({ title: "Min ₹10 Required", description: "Minimum ₹10 withdraw karein.", variant: "destructive" });
      return;
    }

    if (withdrawAmount > (profile.walletBalance || 0)) {
      toast({ title: "Insufficient Balance", variant: "destructive" });
      return;
    }

    if (!upiId.includes("@")) {
      toast({ title: "Invalid UPI ID", description: "Kripya sahi UPI ID bharein.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const timestamp = new Date().toISOString();
    const requestData = {
      userId: user.uid,
      userEmail: user.email,
      amount: withdrawAmount,
      upiId: upiId,
      status: "Pending",
      createdAt: timestamp
    };

    // Use atomic update for balance
    const userDocRef = doc(firestore, "users", user.uid);
    const requestRef = collection(firestore, "withdrawalRequests");

    addDoc(requestRef, requestData)
      .then(() => {
        updateDoc(userDocRef, {
          walletBalance: increment(-withdrawAmount)
        }).catch((err) => {
           const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'update',
            requestResourceData: { walletBalance: -withdrawAmount },
          });
          errorEmitter.emit('permission-error', permissionError);
        });

        toast({ 
          title: "Request Submitted!", 
          description: `₹${withdrawAmount} aapke UPI par 24 ghante mein bhej diye jayenge.` 
        });
        setAmount("");
        setUpiId("");
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: 'withdrawalRequests',
          operation: 'create',
          requestResourceData: requestData,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  if (userLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="mt-4 font-bold text-muted-foreground uppercase text-[10px] tracking-widest">Opening Karbi Wallet...</p>
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
          <h1 className="text-2xl font-black mb-2 uppercase italic tracking-tighter">Sign In Required</h1>
          <p className="text-muted-foreground mb-6 font-medium">Please login to access your Karbi Coins.</p>
          <Link href="/"><Button className="rounded-2xl font-bold px-10">Return Home</Button></Link>
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
            <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm hover:scale-110 transition-transform">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-4xl font-black italic tracking-tighter">Karbi <span className="text-primary uppercase not-italic">Wallet</span></h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            <Card className="rounded-[2.5rem] bg-primary text-white border-none shadow-2xl overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Wallet className="w-32 h-32" />
              </div>
              <CardContent className="p-10 relative z-10">
                <p className="text-primary-foreground/80 font-black uppercase tracking-widest text-[10px] mb-2">Real Balance (INR)</p>
                <h2 className="text-6xl font-black mb-8 flex items-center gap-2">
                  ₹{profile?.walletBalance || 0}
                  <Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
                </h2>
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-sm">
                  <Clock className="w-4 h-4 text-white" />
                  <p className="text-[10px] font-black uppercase tracking-tight">Withdrawals take up to 24 hours</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white p-8">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="text-xl font-black flex items-center gap-2">
                  <ArrowUpRight className="w-6 h-6 text-primary" />
                  UPI Withdrawal
                </CardTitle>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-tighter">1 Karbi Coin = ₹1 Indian Rupee</p>
              </CardHeader>
              <form onSubmit={handleWithdraw} className="space-y-6">
                <div className="space-y-2">
                  <Label className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Amount to Cash Out</Label>
                  <Input 
                    type="number" 
                    placeholder="Min ₹10" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)}
                    className="h-14 rounded-2xl text-xl font-black bg-muted/20 border-transparent focus:border-primary/20 transition-all"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Recipient UPI ID</Label>
                  <Input 
                    placeholder="e.g. yourname@ybl" 
                    value={upiId} 
                    onChange={e => setUpiId(e.target.value)}
                    className="h-14 rounded-2xl font-bold bg-muted/20 border-transparent focus:border-primary/20 transition-all"
                    required
                  />
                </div>
                <Button className="w-full h-16 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin" /> : "Request Cash Out"}
                </Button>
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                  <p className="text-[9px] text-center font-black text-primary uppercase leading-tight tracking-widest">
                    Owner manually process karenge. Sahi UPI ID bharein.
                  </p>
                </div>
              </form>
            </Card>
          </div>

          <div className="lg:col-span-7">
            <div className="bg-white rounded-[2.5rem] shadow-xl p-8 min-h-[550px]">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black flex items-center gap-2">
                  <History className="w-6 h-6 text-primary" />
                  Wallet Activity
                </h3>
                <Badge variant="outline" className="rounded-full px-4 font-black text-[10px] border-primary/20 text-primary">
                  {withdrawals.length} Entries
                </Badge>
              </div>

              {historyLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="animate-spin text-primary w-10 h-10" />
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Fetching History...</p>
                </div>
              ) : withdrawals.length === 0 ? (
                <div className="text-center py-24 bg-muted/10 rounded-[2rem] border-2 border-dashed flex flex-col items-center">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-10" />
                  <p className="font-black text-muted-foreground uppercase text-xs tracking-widest">No recent transactions.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {withdrawals.map((req: any) => (
                    <div key={req.id} className="flex items-center justify-between p-6 rounded-2xl bg-muted/20 border-2 border-transparent hover:border-primary/10 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-2xl shadow-sm transition-transform group-hover:scale-110 ${
                          req.status === 'Pending' ? 'bg-orange-100 text-orange-600' : 
                          req.status === 'Completed' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {req.status === 'Pending' ? <Clock className="w-6 h-6" /> : req.status === 'Completed' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-black text-2xl tracking-tighter">₹{req.amount}</p>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest truncate max-w-[150px] md:max-w-none">{req.upiId}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={`rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest ${
                          req.status === 'Pending' ? 'bg-orange-500' : 
                          req.status === 'Completed' ? 'bg-green-600' : 'bg-destructive'
                        }`}>
                          {req.status}
                        </Badge>
                        <p className="text-[9px] font-black text-muted-foreground mt-3 uppercase tracking-tighter">
                          {new Date(req.createdAt).toLocaleDateString()} at {new Date(req.createdAt).toLocaleTimeString()}
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
