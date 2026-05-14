
"use client";

import { Navbar } from "@/components/navbar";
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import { doc, collection, query, where, orderBy, addDoc, updateDoc, increment, setDoc } from "firebase/firestore";
import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, History, CheckCircle2, Loader2, ArrowLeft, Zap, QrCode, Timer, CheckCircle, ArrowRightLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// SYNCED WITH PHP LOGIC MERCHANT UPI
const MERCHANT_UPI_ID = "Q297152786@ybl";
const MERCHANT_NAME = "Rongpi Chinese wok";

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
  
  const [showQrModal, setShowQrModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);
  const [transferState, setTransferState] = useState<"idle" | "verifying" | "success">("idle");

  const qrCodeUrl = useMemo(() => {
    const amt = parseFloat(amount) || 0;
    const upi = `upi://pay?pa=${MERCHANT_UPI_ID}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${amt.toFixed(2)}&cu=INR`;
    return `https://chart.googleapis.com/chart?chs=500x500&cht=qr&chl=${encodeURIComponent(upi)}&choe=UTF-8&chld=H|2`;
  }, [amount]);

  useEffect(() => {
    let timer: any;
    if (showQrModal && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setShowQrModal(false);
    }
    return () => clearInterval(timer);
  }, [showQrModal, timeLeft]);

  const handleMaxMain = () => setAmount(profile?.walletBalance?.toString() || "");
  const handleMaxWingo = () => setTransferAmount(profile?.walletBalance?.toString() || "");

  const confirmTransfer = async () => {
    if (!user || !firestore || !profile) return;
    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0 || withdrawAmount > (profile.walletBalance || 0)) {
      toast({ title: "Invalid Amount", variant: "destructive" });
      return;
    }
    
    setTransferState("verifying");
    setIsSubmitting(true);

    const timestamp = new Date().toISOString();
    const requestId = `TRF${Date.now()}`;

    const requestData = {
      order_id: requestId,
      userId: user.uid,
      userEmail: user.email,
      amount: withdrawAmount,
      upiId: MERCHANT_UPI_ID,
      state: "COMPLETED",
      createdAt: timestamp,
      udf1: profile.displayName || user.email,
      udf2: user.email
    };

    try {
      // Record in Global PhonePe Orders
      await setDoc(doc(firestore, "phonepe_orders", requestId), requestData);
      
      // Record Withdrawal Request
      await addDoc(collection(firestore, "withdrawalRequests"), requestData);

      // Deduct Wallet Balance
      await updateDoc(doc(firestore, "users", user.uid), {
        walletBalance: increment(-withdrawAmount)
      });

      // Show Success Animation
      setTimeout(() => {
        setTransferState("success");
        setIsSubmitting(false);
        setTimeout(() => {
          setShowQrModal(false);
          setTransferState("idle");
          setAmount("");
        }, 2000);
      }, 1000);

    } catch (e) {
      console.error(e);
      setTransferState("idle");
      setIsSubmitting(false);
      toast({ title: "Transfer Failed", variant: "destructive" });
    }
  };

  const handleWingoTransfer = async () => {
    if (!user || !firestore || !profile) return;
    const amt = parseFloat(transferAmount);
    if (isNaN(amt) || amt <= 0 || amt > (profile.walletBalance || 0)) {
      toast({ title: "Check amount", variant: "destructive" });
      return;
    }

    setIsTransferring(true);
    updateDoc(doc(firestore, "users", user.uid), {
      walletBalance: increment(-amt),
      wingoBalance: increment(amt)
    })
    .then(() => {
      toast({ title: "Wingo Balance Added! 🎉" });
      setTransferAmount("");
    })
    .finally(() => setIsTransferring(false));
  };

  if (userLoading || profileLoading) return null;

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-4 mb-10">
          <Link href="/"><Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm"><ArrowLeft className="w-5 h-5" /></Button></Link>
          <h1 className="text-4xl font-black italic">PhonePe <span className="text-primary not-italic">Wallet</span></h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <Card className="rounded-[2.5rem] bg-primary text-white p-10 relative overflow-hidden shadow-2xl group hover:scale-[1.02] transition-all">
            <Wallet className="absolute top-0 right-0 p-8 opacity-10 w-40 h-40 group-hover:scale-110 transition-transform" />
            <div className="relative z-10">
              <p className="font-black uppercase text-[10px] tracking-widest opacity-60">Main Balance</p>
              <div className="flex items-end justify-between mt-4">
                <h2 className="text-6xl font-black tracking-tighter">₹{profile?.walletBalance?.toFixed(0) || 0}</h2>
                <Button onClick={handleMaxMain} variant="outline" className="bg-white/10 border-white/20 text-white font-black text-[10px] rounded-xl px-4">MAX</Button>
              </div>
            </div>
          </Card>

          <Card className="rounded-[2.5rem] bg-purple-600 text-white p-10 relative overflow-hidden shadow-2xl group hover:scale-[1.02] transition-all">
            <Zap className="absolute top-0 right-0 p-8 opacity-10 w-40 h-40 group-hover:scale-110 transition-transform" />
            <div className="relative z-10">
              <p className="font-black uppercase text-[10px] tracking-widest opacity-60">Wingo Wallet</p>
              <div className="flex items-end justify-between mt-4">
                <h2 className="text-6xl font-black tracking-tighter">₹{profile?.wingoBalance?.toFixed(0) || 0}</h2>
                <Link href="/wingo"><Button variant="outline" className="bg-white/10 border-white/20 text-white font-black text-[10px] rounded-xl px-4">PLAY NOW</Button></Link>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-8">
            <Card className="rounded-[2.5rem] p-8 bg-white shadow-xl border-none">
              <CardHeader className="p-0 mb-6"><CardTitle className="text-xl font-black flex items-center gap-3"><ArrowRightLeft className="w-6 h-6 text-purple-600" /> Load Wingo</CardTitle></CardHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Input type="number" placeholder="Enter amount" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} className="h-14 rounded-2xl font-black bg-muted/30 pr-16" />
                  <Button onClick={handleMaxWingo} variant="ghost" className="absolute right-2 top-1/2 -translate-y-1/2 font-black text-[10px] text-primary">MAX</Button>
                </div>
                <Button onClick={handleWingoTransfer} disabled={isTransferring} className="w-full h-12 rounded-xl bg-purple-600 hover:bg-purple-700 font-black shadow-lg">TRANSFER TO Wingo</Button>
              </div>
            </Card>

            <Card className="rounded-[2.5rem] p-8 bg-white shadow-xl border-none">
              <CardHeader className="p-0 mb-6"><CardTitle className="text-xl font-black flex items-center gap-3"><QrCode className="w-6 h-6 text-primary" /> PhonePe Transfer</CardTitle></CardHeader>
              <div className="space-y-4">
                <Input type="number" placeholder="Enter Amount" value={amount} onChange={e => setAmount(e.target.value)} className="h-14 rounded-2xl font-black bg-muted/30" />
                <Button onClick={() => amount && setShowQrModal(true)} className="w-full h-14 rounded-2xl font-black shadow-lg bg-primary hover:bg-primary/90">SHOW MERCHANT QR</Button>
                <p className="text-[9px] font-black text-center text-muted-foreground uppercase tracking-widest">Official Gateway • Verified MC 5812</p>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-7">
            <Card className="bg-white rounded-[2.5rem] p-8 shadow-xl border-none min-h-[500px]">
              <h3 className="text-xl font-black flex items-center gap-3 italic mb-8"><History className="w-6 h-6 text-primary" /> Transfer History</h3>
              <div className="space-y-4">
                {withdrawals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 opacity-20">
                    <History className="w-16 h-16 mb-4" />
                    <p className="font-black uppercase text-xs tracking-widest">No history yet</p>
                  </div>
                ) : (
                  withdrawals.map((req: any) => (
                    <div key={req.id} className="flex items-center justify-between p-6 rounded-[2rem] bg-muted/30 border-2 border-transparent hover:border-primary/5 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="p-4 rounded-2xl bg-white shadow-sm text-primary"><CheckCircle2 className="w-6 h-6" /></div>
                        <div>
                          <p className="font-black text-2xl tracking-tighter italic">₹{req.amount}</p>
                          <p className="text-[9px] font-black uppercase text-muted-foreground font-mono">{req.order_id}</p>
                        </div>
                      </div>
                      <Badge className="bg-green-600 text-[9px] font-black uppercase rounded-full px-4 py-1.5 shadow-sm">{req.state}</Badge>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>

      <Dialog open={showQrModal} onOpenChange={(open) => !isSubmitting && setShowQrModal(open)}>
        <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] p-10 overflow-hidden">
          <DialogTitle className="sr-only">Wallet Transfer Modal</DialogTitle>
          <div className="flex flex-col items-center gap-6">
            {transferState === "verifying" ? (
              <div className="flex flex-col items-center py-20 gap-6 text-primary">
                <Loader2 className="w-20 h-20 animate-spin" />
                <h2 className="text-3xl font-black italic uppercase animate-pulse">Verifying...</h2>
              </div>
            ) : transferState === "success" ? (
              <div className="flex flex-col items-center py-20 text-green-600 scale-110 transition-transform">
                <CheckCircle className="w-24 h-24 mb-6" />
                <h2 className="text-4xl font-black italic tracking-tighter uppercase">SUCCESS! 🎉</h2>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-4">Paisa add ho gaya!</p>
              </div>
            ) : (
              <>
                <DialogHeader className="mb-2">
                  <DialogTitle className="text-3xl font-black text-center">Transfer QR</DialogTitle>
                  <DialogDescription className="text-center font-bold">{MERCHANT_NAME}</DialogDescription>
                </DialogHeader>
                <div className="relative w-72 h-72 bg-white p-4 rounded-3xl shadow-2xl border-4 border-primary/10">
                  <Image src={qrCodeUrl} alt="Merchant QR" fill className="object-contain p-2" unoptimized />
                </div>
                <div className="text-center">
                   <p className="text-4xl font-black text-primary">₹{parseFloat(amount || "0").toFixed(2)}</p>
                   <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.4em] mt-2">Mode 02 • MC 5812</p>
                </div>
                <Button className="w-full py-7 rounded-2xl font-black text-lg bg-primary shadow-xl" onClick={confirmTransfer} disabled={isSubmitting}>Confirm & Transfer</Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
