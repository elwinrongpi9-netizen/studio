
"use client";

import { Navbar } from "@/components/navbar";
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import { doc, collection, query, where, orderBy, addDoc, updateDoc, increment } from "firebase/firestore";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, ArrowUpRight, History, Clock, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Sparkles, ShieldCheck, Zap } from "lucide-react";
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
    const currentBalance = profile.walletBalance || 0;

    if (isNaN(withdrawAmount) || withdrawAmount < 10) {
      toast({ title: "Min ₹10 Required", description: "Minimum withdrawal limit is ₹10.", variant: "destructive" });
      return;
    }

    if (withdrawAmount > currentBalance) {
      toast({ title: "Insufficient Balance", description: "You don't have enough coins.", variant: "destructive" });
      return;
    }

    if (!upiId.includes("@")) {
      toast({ title: "Invalid UPI ID", description: "Please enter a valid UPI ID (e.g. name@vpa).", variant: "destructive" });
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

    const userDocRef = doc(firestore, "users", user.uid);
    const requestsRef = collection(firestore, "withdrawalRequests");

    // Atomic Deduction and Save Request
    addDoc(requestsRef, requestData)
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
          title: "Request Success!", 
          description: `₹${withdrawAmount} deducted. Settlement starts now.` 
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
          <p className="mt-4 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Verifying Payout Ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-4 mb-10">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm hover:scale-110 transition-transform">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter">Karbi <span className="text-primary not-italic">Wallet</span></h1>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-1">1 Karbi Coin = ₹1 Indian Rupee</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            <Card className="rounded-[2.5rem] bg-primary text-white border-none shadow-2xl overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Wallet className="w-32 h-32" />
              </div>
              <CardContent className="p-10 relative z-10">
                <p className="text-primary-foreground/80 font-black uppercase tracking-widest text-[10px] mb-2">Available Balance</p>
                <h2 className="text-6xl font-black mb-8 flex items-center gap-2">
                  ₹{profile?.walletBalance || 0}
                  <Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
                </h2>
                <div className="flex items-center gap-2 bg-white/10 px-5 py-3 rounded-xl border border-white/10 backdrop-blur-sm">
                  <Clock className="w-5 h-5 text-white animate-spin-slow" />
                  <p className="text-[10px] font-black uppercase tracking-widest leading-none">Settlement Promise: 24 Hours</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-2 shadow-xl bg-white p-8">
              <CardHeader className="p-0 mb-8">
                <CardTitle className="text-2xl font-black flex items-center gap-3">
                  <ArrowUpRight className="w-7 h-7 text-primary" />
                  Request Success Payout
                </CardTitle>
              </CardHeader>
              <form onSubmit={handleWithdraw} className="space-y-6">
                <div className="space-y-2">
                  <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Cash Amount (₹)</Label>
                  <Input 
                    type="number" 
                    placeholder="Min ₹10" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)}
                    className="h-16 rounded-2xl text-2xl font-black bg-muted/30 border-2 focus:border-primary transition-all"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Destination UPI ID</Label>
                  <Input 
                    placeholder="e.g. username@upi" 
                    value={upiId} 
                    onChange={e => setUpiId(e.target.value)}
                    className="h-16 rounded-2xl font-black bg-muted/30 border-2 focus:border-primary transition-all text-lg"
                    required
                  />
                </div>
                <Button className="w-full h-18 rounded-2xl font-black text-xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all py-8" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin" /> : "Initiate Withdrawal"}
                </Button>
                <div className="bg-primary/5 p-5 rounded-2xl border border-primary/20 flex items-start gap-3">
                   <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                   <p className="text-[10px] font-black text-primary uppercase leading-normal tracking-wider">
                     Verification starts immediately. Our admin will transfer the funds to your UPI account within 24 hours.
                   </p>
                </div>
              </form>
            </Card>
          </div>

          <div className="lg:col-span-7">
            <div className="bg-white rounded-[2.5rem] shadow-xl p-10 min-h-[600px] border-2">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-2xl font-black flex items-center gap-3 italic">
                  <History className="w-7 h-7 text-primary not-italic" />
                  Success Ledger
                </h3>
                <Badge variant="outline" className="rounded-full px-5 py-1.5 font-black text-[10px] border-primary/30 text-primary uppercase">
                  {withdrawals.length} Entries
                </Badge>
              </div>

              {historyLoading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <Loader2 className="animate-spin text-primary w-12 h-12" />
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Syncing Ledger...</p>
                </div>
              ) : withdrawals.length === 0 ? (
                <div className="text-center py-32 bg-muted/10 rounded-[3rem] border-2 border-dashed flex flex-col items-center">
                  <Zap className="w-16 h-16 text-muted-foreground mx-auto mb-6 opacity-10" />
                  <p className="font-black text-muted-foreground uppercase text-xs tracking-widest italic">No requests recorded.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {withdrawals.map((req: any) => (
                    <div key={req.id} className="flex items-center justify-between p-7 rounded-[2rem] bg-muted/30 border-2 border-transparent hover:border-primary/20 transition-all group">
                      <div className="flex items-center gap-6">
                        <div className={`p-5 rounded-2xl shadow-sm transition-transform group-hover:scale-110 ${
                          req.status === 'Pending' ? 'bg-orange-100 text-orange-600' : 
                          req.status === 'Completed' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {req.status === 'Pending' ? <Clock className="w-8 h-8" /> : req.status === 'Completed' ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                        </div>
                        <div className="space-y-1">
                          <p className="font-black text-3xl tracking-tighter text-foreground italic">₹{req.amount}</p>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest truncate max-w-[150px] md:max-w-none">{req.upiId}</p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-3">
                        <Badge className={`rounded-full px-5 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] ${
                          req.status === 'Pending' ? 'bg-orange-500 shadow-lg shadow-orange-500/20' : 
                          req.status === 'Completed' ? 'bg-green-600 shadow-lg shadow-green-600/20' : 'bg-destructive shadow-lg'
                        }`}>
                          {req.status}
                        </Badge>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter opacity-60">
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
