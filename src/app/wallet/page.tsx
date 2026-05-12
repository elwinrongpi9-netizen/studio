
"use client";

import { Navbar } from "@/components/navbar";
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import { doc, collection, query, where, orderBy, addDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, ArrowUpRight, History, Clock, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Sparkles, ShieldCheck, Zap, Info, QrCode, Timer, CheckCircle, ArrowRightLeft } from "lucide-react";
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
  const [transferAmount, setTransferAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  
  // QR Modal States
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
    }
  };

  const handleMaxWingoTransfer = () => {
    if (profile?.walletBalance) {
      setTransferAmount(profile.walletBalance.toString());
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
      status: "Completed",
      createdAt: timestamp,
      type: "Merchant Transfer"
    };

    const userDocRef = doc(firestore, "users", user.uid);
    const requestsRef = collection(firestore, "withdrawalRequests");

    addDoc(requestsRef, requestData)
      .then(() => {
        updateDoc(userDocRef, {
          walletBalance: increment(-withdrawAmount)
        });
        setTransferState("success");
        setTimeout(() => {
          setShowQrModal(false);
          setTransferState("idle");
          setAmount("");
        }, 2000);
      })
      .catch((err) => {
        console.error(err);
        toast({ title: "Transfer Failed", variant: "destructive" });
      })
      .finally(() => setIsSubmitting(false));
  };

  const handleWingoWalletTransfer = async () => {
    if (!user || !firestore || !profile) return;
    const amt = parseFloat(transferAmount);
    if (isNaN(amt) || amt < 1) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    if (amt > (profile.walletBalance || 0)) {
      toast({ title: "Insufficient Main Balance", variant: "destructive" });
      return;
    }

    setIsTransferring(true);
    const userDocRef = doc(firestore, "users", user.uid);
    
    updateDoc(userDocRef, {
      walletBalance: increment(-amt),
      wingoBalance: increment(amt)
    })
    .then(() => {
      toast({ title: "Wingo Balance Added!", description: `₹${amt} transferred to Wingo wallet.` });
      setTransferAmount("");
    })
    .catch((err) => {
      console.error(err);
      toast({ title: "Transfer Failed", variant: "destructive" });
    })
    .finally(() => setIsTransferring(false));
  };

  if (userLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
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
            <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-4xl font-black italic">Karbi <span className="text-primary not-italic">Wallets</span></h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Main Wallet */}
          <Card className="rounded-[2.5rem] bg-primary text-white border-none shadow-2xl overflow-hidden p-10 relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Wallet className="w-24 h-24" />
            </div>
            <p className="text-primary-foreground/80 font-black uppercase text-[10px] tracking-widest mb-2">Main Balance</p>
            <div className="flex items-end justify-between">
              <h2 className="text-6xl font-black">₹{profile?.walletBalance || 0}</h2>
              <Button onClick={handleMaxAmount} variant="outline" className="bg-white/10 border-white/20 text-white rounded-xl font-black text-[10px] h-8">USE MAX</Button>
            </div>
            <p className="text-[9px] mt-6 opacity-60 uppercase font-black">For food and real withdrawals</p>
          </Card>

          {/* Wingo Wallet */}
          <Card className="rounded-[2.5rem] bg-purple-600 text-white border-none shadow-2xl overflow-hidden p-10 relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Zap className="w-24 h-24" />
            </div>
            <p className="text-purple-100 font-black uppercase text-[10px] tracking-widest mb-2">Wingo Balance</p>
            <div className="flex items-end justify-between">
              <h2 className="text-6xl font-black">₹{profile?.wingoBalance || 0}</h2>
              <Link href="/wingo"><Button variant="outline" className="bg-white/10 border-white/20 text-white rounded-xl font-black text-[10px] h-8">PLAY NOW</Button></Link>
            </div>
            <p className="text-[9px] mt-6 opacity-60 uppercase font-black">For Wingo 1M Game Only</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-8">
            {/* Transfer to Wingo */}
            <Card className="rounded-[2.5rem] border-2 shadow-xl bg-white p-8">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="text-xl font-black flex items-center gap-3">
                  <ArrowRightLeft className="w-6 h-6 text-purple-600" />
                  Load Wingo Wallet
                </CardTitle>
              </CardHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Transfer to Game (₹)</Label>
                  <Input 
                    type="number" 
                    placeholder="Enter amount" 
                    value={transferAmount}
                    onChange={e => setTransferAmount(e.target.value)}
                    className="h-14 rounded-2xl text-xl font-black bg-muted/30"
                  />
                </div>
                <div className="flex gap-2">
                   <Button onClick={handleMaxWingoTransfer} variant="outline" className="flex-1 h-12 rounded-xl font-black text-[10px]">ALL MAIN</Button>
                   <Button onClick={handleWingoWalletTransfer} disabled={isTransferring} className="flex-[2] h-12 rounded-xl bg-purple-600 hover:bg-purple-700 font-black uppercase text-xs">
                     {isTransferring ? <Loader2 className="animate-spin" /> : "Move to Wingo"}
                   </Button>
                </div>
              </div>
            </Card>

            {/* Merchant Transfer */}
            <Card className="rounded-[2.5rem] border-2 shadow-xl bg-white p-8">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="text-xl font-black flex items-center gap-3">
                  <QrCode className="w-6 h-6 text-primary" />
                  Merchant Payout
                </CardTitle>
              </CardHeader>
              <form onSubmit={initiateTransfer} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Main Withdrawal (₹)</Label>
                  <Input 
                    type="number" 
                    placeholder="Amount to withdraw" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)}
                    className="h-14 rounded-2xl text-xl font-black bg-muted/30"
                    required
                  />
                </div>
                <Button className="w-full h-14 rounded-2xl font-black shadow-lg" disabled={isSubmitting}>
                   Confirm Payout QR
                </Button>
              </form>
            </Card>
          </div>

          <div className="lg:col-span-7">
            <Card className="bg-white rounded-[2.5rem] shadow-xl p-8 min-h-[500px] border-2">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black flex items-center gap-3 italic">
                  <History className="w-6 h-6 text-primary not-italic" />
                  Payout History
                </h3>
              </div>
              {historyLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>
              ) : withdrawals.length === 0 ? (
                <div className="text-center py-20 opacity-20"><Zap className="w-12 h-12 mx-auto mb-4" /><p className="font-black uppercase text-[10px]">No History</p></div>
              ) : (
                <div className="space-y-4">
                  {withdrawals.map((req: any) => (
                    <div key={req.id} className="flex items-center justify-between p-6 rounded-[2rem] bg-muted/30 border-2 border-transparent">
                      <div className="flex items-center gap-4">
                        <div className="p-4 rounded-2xl bg-white shadow-sm text-primary">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-black text-2xl tracking-tighter italic">₹{req.amount}</p>
                          <p className="text-[9px] font-black uppercase text-muted-foreground">{req.type || "Payout"}</p>
                        </div>
                      </div>
                      <Badge className="rounded-full bg-green-600 uppercase text-[9px] px-3 font-black">COMPLETED</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>

      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] p-10">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-3xl font-black text-center">Transfer QR</DialogTitle>
            <DialogDescription className="text-center font-bold">Merchant: <span className="text-primary">{MERCHANT_NAME}</span></DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-6">
            {transferState === "success" ? (
              <div className="flex flex-col items-center justify-center py-20 text-green-600 animate-in zoom-in">
                <CheckCircle className="w-24 h-24 mb-6" />
                <h2 className="text-4xl font-black italic">SUCCESS!</h2>
              </div>
            ) : (
              <>
                <div className="relative w-72 h-72 bg-white p-4 rounded-3xl shadow-2xl border-4 border-primary/10">
                  <Image src={qrCodeUrl} alt="Merchant QR" fill className="object-contain p-2" unoptimized />
                </div>
                <div className="text-center">
                  <p className="text-4xl font-black text-primary">₹{parseFloat(amount || "0").toFixed(2)}</p>
                  <p className="text-[10px] font-black text-muted-foreground uppercase mt-2">{MERCHANT_UPI_ID}</p>
                </div>
                <Button className="w-full py-7 rounded-2xl font-black text-lg" onClick={confirmTransfer} disabled={isSubmitting}>Confirm & Transfer</Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
