
"use client";

import { Navbar } from "@/components/navbar";
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import { doc, collection, query, where, orderBy, addDoc, updateDoc, increment } from "firebase/firestore";
import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, ArrowUpRight, History, Clock, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Sparkles, ShieldCheck, Zap, Info, QrCode, Timer, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MERCHANT_UPI_ID = "Q297152786@ybl";
const MERCHANT_NAME = "Rongpi Chinese wok";
const MERCHANT_CODE = "5812"; 

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
  
  // QR Modal States (Game Zone style)
  const [showQrModal, setShowQrModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);
  const [transferState, setTransferState] = useState<"idle" | "success">("idle");

  const upiUrl = useMemo(() => {
    const amt = parseFloat(amount) || 0;
    const pa = MERCHANT_UPI_ID;
    const pn = encodeURIComponent(MERCHANT_NAME);
    const mc = MERCHANT_CODE;
    const tr = `TRX${Date.now()}`;
    return `upi://pay?pa=${pa}&pn=${pn}&mc=${mc}&am=${amt.toFixed(2)}&cu=INR&mode=02`;
  }, [amount]);

  const qrCodeUrl = useMemo(() => {
    return `https://chart.googleapis.com/chart?chs=500x500&cht=qr&chl=${encodeURIComponent(upiUrl)}&choe=UTF-8&chld=H|2`;
  }, [upiUrl]);

  useEffect(() => {
    let timer: any;
    if (showQrModal && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setShowQrModal(false);
    }
    return () => clearInterval(timer);
  }, [showQrModal, timeLeft]);

  const handleMaxAmount = () => {
    if (profile?.walletBalance) {
      setAmount(profile.walletBalance.toString());
      setUpiId(MERCHANT_UPI_ID);
    }
  };

  const initiateTransfer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || !firestore || !profile) return;

    const withdrawAmount = parseFloat(amount);
    const currentBalance = profile.walletBalance || 0;

    if (isNaN(withdrawAmount) || withdrawAmount < 1) {
      toast({ title: "Amount Required", variant: "destructive" });
      return;
    }

    if (withdrawAmount > currentBalance) {
      toast({ title: "Insufficient Balance", variant: "destructive" });
      return;
    }

    setShowQrModal(true);
    setTimeLeft(300);
  };

  const confirmTransfer = async () => {
    if (!user || !firestore || !profile) return;
    const withdrawAmount = parseFloat(amount);
    
    setIsSubmitting(true);
    const timestamp = new Date().toISOString();
    const requestData = {
      userId: user.uid,
      userEmail: user.email,
      amount: withdrawAmount,
      upiId: MERCHANT_UPI_ID,
      status: "Completed", // Merchant transfers are marked completed instantly for UX
      createdAt: timestamp,
      type: "Merchant Transfer"
    };

    const userDocRef = doc(firestore, "users", user.uid);
    const requestsRef = collection(firestore, "withdrawalRequests");

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

        setTransferState("success");
        setTimeout(() => {
          setShowQrModal(false);
          setTransferState("idle");
          setAmount("");
          setUpiId("");
        }, 2000);
      })
      .catch((serverError) => {
        console.error(serverError);
        toast({ title: "Transfer Failed", variant: "destructive" });
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
          <p className="mt-4 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Syncing Ledger...</p>
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
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-1">Transfer All Coins to Merchant QR</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            <Card className="rounded-[2.5rem] bg-primary text-white border-none shadow-2xl overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Wallet className="w-32 h-32" />
              </div>
              <CardContent className="p-10 relative z-10">
                <p className="text-primary-foreground/80 font-black uppercase tracking-widest text-[10px] mb-2">Total Balance</p>
                <div className="flex items-end justify-between">
                  <h2 className="text-6xl font-black flex items-center gap-2">
                    ₹{profile?.walletBalance || 0}
                    <Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
                  </h2>
                  <Button 
                    onClick={handleMaxAmount}
                    variant="outline" 
                    className="bg-white/10 border-white/20 text-white rounded-xl font-black text-[10px] uppercase h-8 hover:bg-white/20"
                  >
                    Use Max
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-2 shadow-xl bg-white p-8">
              <CardHeader className="p-0 mb-8">
                <CardTitle className="text-2xl font-black flex items-center gap-3">
                  <QrCode className="w-7 h-7 text-primary" />
                  Quick Transfer
                </CardTitle>
                <div className="flex items-start gap-2 bg-muted/50 p-3 rounded-xl mt-2">
                  <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold text-muted-foreground leading-relaxed uppercase">Instantly transfer your coins to Rongpi Chinese Wok Merchant QR.</p>
                </div>
              </CardHeader>
              <form onSubmit={initiateTransfer} className="space-y-6">
                <div className="space-y-2">
                  <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Transfer Amount (₹)</Label>
                  <Input 
                    type="number" 
                    placeholder="Enter amount" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)}
                    className="h-16 rounded-2xl text-2xl font-black bg-muted/30 border-2 focus:border-primary transition-all"
                    required
                  />
                </div>
                <Button className="w-full h-18 rounded-2xl font-black text-xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all py-8" disabled={isSubmitting}>
                  <Zap className="w-6 h-6 mr-2 fill-yellow-300 text-yellow-300" />
                  Open Merchant QR
                </Button>
                <div className="bg-primary/5 p-5 rounded-2xl border border-primary/20 flex items-start gap-3">
                   <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                   <p className="text-[10px] font-black text-primary uppercase leading-normal tracking-wider">
                     Secure Merchant Gateway Active. Instant Verification.
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
                  Transfer History
                </h3>
                <Badge variant="outline" className="rounded-full px-5 py-1.5 font-black text-[10px] border-primary/30 text-primary uppercase">
                  {withdrawals.length} Entries
                </Badge>
              </div>

              {historyLoading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <Loader2 className="animate-spin text-primary w-12 h-12" />
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Syncing History...</p>
                </div>
              ) : withdrawals.length === 0 ? (
                <div className="text-center py-32 bg-muted/10 rounded-[3rem] border-2 border-dashed flex flex-col items-center">
                  <Zap className="w-16 h-16 text-muted-foreground mx-auto mb-6 opacity-10" />
                  <p className="font-black text-muted-foreground uppercase text-xs tracking-widest italic">No transfers yet.</p>
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
                          {req.status === 'Completed' ? <CheckCircle2 className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
                        </div>
                        <div className="space-y-1">
                          <p className="font-black text-3xl tracking-tighter text-foreground italic">₹{req.amount}</p>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{req.type || "Payout"}</p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-3">
                        <Badge className={`rounded-full px-5 py-1.5 text-[10px] font-black uppercase ${
                          req.status === 'Pending' ? 'bg-orange-500' : 'bg-green-600'
                        }`}>
                          {req.status}
                        </Badge>
                        <p className="text-[9px] font-black text-muted-foreground uppercase">
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

      {/* Merchant QR Modal (Game Zone style) */}
      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] p-10">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-3xl font-black text-center">Transfer QR</DialogTitle>
            <DialogDescription className="text-center font-bold text-muted-foreground">
              Merchant: <span className="text-primary">{MERCHANT_NAME}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-6">
            {transferState === "success" ? (
              <div className="flex flex-col items-center justify-center py-20 text-green-600 animate-in zoom-in">
                <CheckCircle className="w-24 h-24 mb-6 fill-green-100" />
                <h2 className="text-5xl font-black italic">SUCCESS!</h2>
                <p className="font-bold uppercase tracking-widest text-[10px] mt-2">Coins Transferred</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-2 rounded-full font-black text-xs animate-pulse">
                  <Timer className="w-4 h-4" />
                  <span>Session Expires: {Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</span>
                </div>

                <div className="relative w-80 h-80 bg-white p-4 rounded-3xl shadow-2xl border-4 border-primary/10">
                  <Image src={qrCodeUrl} alt="Merchant QR" fill className="object-contain p-2" unoptimized />
                </div>
                
                <div className="text-center">
                  <p className="text-4xl font-black text-primary">₹{parseFloat(amount || "0").toFixed(2)}</p>
                  <p className="text-[10px] font-black text-muted-foreground tracking-widest uppercase mt-2">{MERCHANT_UPI_ID}</p>
                </div>

                <Button className="w-full py-7 rounded-2xl font-black text-lg shadow-lg flex gap-2" onClick={confirmTransfer} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                  Confirm & Transfer ₹{amount}
                </Button>
                <p className="text-[9px] text-muted-foreground text-center font-bold uppercase tracking-wider">Secure Merchant Gateway • Mode 02 • MC 5812</p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
