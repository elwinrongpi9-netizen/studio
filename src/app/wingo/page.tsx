
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { 
  History, 
  Timer, 
  Wallet, 
  ArrowLeft, 
  Zap,
  Loader2,
  ShieldAlert,
  Trophy,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { useUser, useFirestore, useDoc, useAuth } from "@/firebase";
import { doc, increment, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

type BetType = "green" | "red" | "violet" | "big" | "small" | number;

interface GameResult {
  periodId: string;
  number: number;
  colors: ("green" | "red" | "violet")[];
  size: "Big" | "Small";
}

const ADMIN_EMAIL = "elwinrongpi9@gmail.com";

export default function WingoPage() {
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const userRef = useMemo(() => (user && firestore) ? doc(firestore, "users", user.uid) : null, [user, firestore]);
  const { data: profile } = useDoc<any>(userRef);

  const [timeLeft, setTimeLeft] = useState(60);
  const [periodId, setPeriodId] = useState("");
  const [history, setHistory] = useState<GameResult[]>([]);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [isBetting, setIsBetting] = useState(false);
  const [activeBets, setActiveBets] = useState<{ type: BetType; amount: number }[]>([]);
  
  const activeBetsRef = useRef<{ type: BetType; amount: number }[]>([]);
  useEffect(() => {
    activeBetsRef.current = activeBets;
  }, [activeBets]);

  // Admin Controller State
  const [adminTargetNumber, setAdminTargetNumber] = useState("");
  const isAdmin = user?.email === ADMIN_EMAIL;

  const getColorsForNumber = (num: number): ("green" | "red" | "violet")[] => {
    if (num === 0) return ["red", "violet"];
    if (num === 5) return ["green", "violet"];
    if ([2, 4, 6, 8].includes(num)) return ["red"];
    return ["green"];
  };

  const getSizeForNumber = (num: number): "Big" | "Small" => {
    return num >= 5 ? "Big" : "Small";
  };

  const generatePeriodId = () => {
    const now = new Date();
    const dateStr = now.getFullYear().toString() + 
                    (now.getMonth() + 1).toString().padStart(2, '0') + 
                    now.getDate().toString().padStart(2, '0');
    const totalMinutes = now.getHours() * 60 + now.getMinutes();
    return dateStr + totalMinutes.toString().padStart(4, '0');
  };

  useEffect(() => {
    const pid = generatePeriodId();
    setPeriodId(pid);

    const syncTimer = () => {
      const seconds = new Date().getSeconds();
      setTimeLeft(60 - seconds);
    };

    syncTimer();
    const interval = setInterval(syncTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (timeLeft === 60) {
      handleRoundEnd();
    }
  }, [timeLeft]);

  const handleRoundEnd = async () => {
    if (!firestore || !periodId) return;

    const currentPeriod = periodId;
    let winNumber = Math.floor(Math.random() * 10);
    
    // Check for Admin Override (Manual Control)
    try {
      const controlRef = doc(firestore, "wingoConfig", currentPeriod);
      const controlSnap = await getDoc(controlRef);
      if (controlSnap.exists()) {
        const controlledData = controlSnap.data();
        if (controlledData && typeof controlledData.number === 'number') {
          winNumber = controlledData.number;
        }
      }
    } catch (e) {
      console.warn("Manual override check failed", e);
    }

    const winColors = getColorsForNumber(winNumber);
    const winSize = getSizeForNumber(winNumber);

    const result: GameResult = {
      periodId: currentPeriod,
      number: winNumber,
      colors: winColors,
      size: winSize
    };

    setHistory(prev => [result, ...prev].slice(0, 10));
    setPeriodId(generatePeriodId());

    // Process Payouts
    const betsToProcess = activeBetsRef.current;
    const currentUser = auth.currentUser;

    if (betsToProcess.length > 0 && currentUser) {
      let totalWinning = 0;
      betsToProcess.forEach(bet => {
        if (typeof bet.type === 'number') {
          // 9x profit for exact number match
          if (Number(bet.type) === winNumber) totalWinning += bet.amount * 9;
        } else if (bet.type === 'big' || bet.type === 'small') {
          if ((bet.type === 'big' && winSize === 'Big') || (bet.type === 'small' && winSize === 'Small')) {
            totalWinning += bet.amount * 2;
          }
        } else {
          if (winColors.includes(bet.type as any)) totalWinning += bet.amount * 2;
        }
      });

      if (totalWinning > 0) {
        const uRef = doc(firestore, "users", currentUser.uid);
        // Use setDoc with merge to ensure wallet document is updated correctly
        setDoc(uRef, {
          walletBalance: increment(totalWinning)
        }, { merge: true })
        .then(() => {
          toast({
            title: "VICTORY! 🎉",
            description: `Round ${currentPeriod} Result: ${winNumber}. Profit ₹${totalWinning} added to wallet!`,
            className: "bg-green-600 text-white font-black"
          });
        })
        .catch((err) => {
          console.error("Payout failed", err);
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: uRef.path,
            operation: 'update',
            requestResourceData: { walletBalance: totalWinning },
          }));
        });
      } else {
        toast({
          title: "LOSS 😞",
          description: `Result: ${winNumber} (${winSize}). Better luck next round!`,
          variant: "destructive"
        });
      }
    }
    setActiveBets([]);
  };

  const placeBet = async (type: BetType) => {
    if (!user || !firestore) {
      toast({ title: "Please Login First", variant: "destructive" });
      return;
    }

    if (timeLeft < 5) {
      toast({ title: "Betting Closed", description: "Wait for the next round.", variant: "destructive" });
      return;
    }

    const currentBalance = profile?.walletBalance || 0;
    if (betAmount > currentBalance) {
      toast({ title: "Insufficient Coins", description: "Recharge your wallet to play.", variant: "destructive" });
      return;
    }

    setIsBetting(true);
    const uRef = doc(firestore, "users", user.uid);
    updateDoc(uRef, {
      walletBalance: increment(-betAmount)
    })
    .then(() => {
      setActiveBets(prev => [...prev, { type, amount: betAmount }]);
      toast({ 
        title: "Bet Success", 
        description: `₹${betAmount} on ${typeof type === 'string' ? type.toUpperCase() : `Number ${type}`}` 
      });
    })
    .catch((err) => {
       toast({ title: "Bet Failed", variant: "destructive" });
    })
    .finally(() => setIsBetting(false));
  };

  const handleAdminSetResult = async () => {
    if (!firestore || !periodId || adminTargetNumber === "") return;
    const num = parseInt(adminTargetNumber);
    if (isNaN(num) || num < 0 || num > 9) return;

    const configRef = doc(firestore, "wingoConfig", periodId);
    setDoc(configRef, {
      periodId: periodId,
      number: num,
      updatedAt: new Date().toISOString()
    }, { merge: true })
    .then(() => {
      toast({ title: "SUCCESS!", description: `Period ${periodId} fixed to Number ${num}.` });
      setAdminTargetNumber("");
    })
    .catch((err) => {
      toast({ title: "Control Failed", variant: "destructive" });
    });
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
      <Navbar />
      
      <div className="bg-primary text-white p-6 pb-12 rounded-b-[3rem] shadow-xl relative">
        <div className="container mx-auto max-w-2xl flex items-center justify-between mb-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full">
              <ArrowLeft className="w-6 h-6" />
            </Button>
          </Link>
          <h1 className="text-3xl font-black tracking-tighter italic">Wingo <span className="not-italic text-sm font-bold bg-white/20 px-3 py-1 rounded-full">1 Min</span></h1>
          <div className="bg-white/20 px-4 py-2 rounded-2xl flex items-center gap-2 backdrop-blur-md border border-white/10">
            <Wallet className="w-4 h-4" />
            <span className="font-black">₹{profile?.walletBalance || 0}</span>
          </div>
        </div>

        <div className="container mx-auto max-w-2xl bg-white rounded-[2rem] p-8 shadow-2xl flex justify-between items-center text-foreground">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Current Period</p>
            <p className="text-2xl font-black text-primary italic">{periodId}</p>
          </div>
          <div className="flex flex-col items-end">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1">
              <Timer className="w-3 h-3" /> Ends in
            </p>
            <div className="flex gap-2 mt-1">
              <span className="bg-muted px-3 py-2 rounded-xl text-3xl font-black text-primary font-mono shadow-inner border">0</span>
              <span className="bg-muted px-3 py-2 rounded-xl text-3xl font-black text-primary font-mono shadow-inner border">{String(timeLeft === 60 ? 0 : timeLeft).padStart(2, '0')}</span>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 -mt-6 max-w-2xl pb-24">
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border-t-4 border-primary/10">
          <div className="flex gap-4 mb-6">
            <Button 
              onClick={() => placeBet("big")} 
              disabled={isBetting || timeLeft < 5}
              className="flex-1 h-14 rounded-2xl bg-orange-500 hover:bg-orange-600 font-black text-lg shadow-lg border-b-4 border-orange-700 active:border-b-0 active:translate-y-1 transition-all"
            >
              Big
            </Button>
            <Button 
              onClick={() => placeBet("small")} 
              disabled={isBetting || timeLeft < 5}
              className="flex-1 h-14 rounded-2xl bg-blue-500 hover:bg-blue-600 font-black text-lg shadow-lg border-b-4 border-blue-700 active:border-b-0 active:translate-y-1 transition-all"
            >
              Small
            </Button>
          </div>

          <div className="flex justify-between gap-4 mb-8">
            <Button onClick={() => placeBet("green")} disabled={isBetting || timeLeft < 5} className="flex-1 h-16 rounded-2xl bg-green-500 hover:bg-green-600 font-black text-lg shadow-lg border-b-4 border-green-700 active:border-b-0 transition-all">Green</Button>
            <Button onClick={() => placeBet("violet")} disabled={isBetting || timeLeft < 5} className="flex-1 h-16 rounded-2xl bg-purple-500 hover:bg-purple-600 font-black text-lg shadow-lg border-b-4 border-purple-700 active:border-b-0 transition-all">Violet</Button>
            <Button onClick={() => placeBet("red")} disabled={isBetting || timeLeft < 5} className="flex-1 h-16 rounded-2xl bg-red-500 hover:bg-red-600 font-black text-lg shadow-lg border-b-4 border-red-700 active:border-b-0 transition-all">Red</Button>
          </div>

          <div className="grid grid-cols-5 gap-3 mb-10">
            {Array.from({ length: 10 }).map((_, n) => (
              <Button 
                key={n}
                onClick={() => placeBet(n)}
                disabled={isBetting || timeLeft < 5}
                variant="outline"
                className={`h-14 rounded-xl font-black text-xl border-2 transition-all hover:scale-110 active:scale-95 ${
                  n === 0 || n === 5 ? 'text-purple-600 border-purple-200 bg-purple-50/30' :
                  n % 2 === 0 ? 'text-red-600 border-red-200 bg-red-50/30' : 'text-green-600 border-green-200 bg-green-50/30'
                }`}
              >
                {n}
              </Button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-muted-foreground tracking-widest">Bet Amount (₹)</span>
              <div className="flex gap-2">
                {[10, 50, 100, 500].map(amt => (
                  <Button 
                    key={amt} 
                    size="sm" 
                    variant={betAmount === amt ? "default" : "outline"}
                    onClick={() => setBetAmount(amt)}
                    className="rounded-lg font-black h-8 text-[10px] px-3"
                  >
                    x{amt}
                  </Button>
                ))}
              </div>
            </div>
            <Input 
              type="number" 
              value={betAmount} 
              onChange={e => setBetAmount(parseInt(e.target.value) || 0)}
              className="h-14 rounded-xl text-center font-black text-2xl bg-muted/30 border-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {isAdmin && (
          <div className="mt-8 bg-black text-white rounded-[2rem] p-6 shadow-2xl border-2 border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Manual Controller (Period: {periodId})</span>
            </div>
            
            <div className="flex gap-4">
              <Input 
                type="number" 
                placeholder="Win Num (0-9)" 
                value={adminTargetNumber} 
                onChange={e => setAdminTargetNumber(e.target.value)}
                className="bg-white/5 border-white/10 h-12 rounded-xl text-sm font-mono text-white flex-1"
              />
              <Button onClick={handleAdminSetResult} className="bg-primary hover:bg-primary/80 h-12 rounded-xl px-8 font-black uppercase text-xs">
                SUCCESS!
              </Button>
            </div>
          </div>
        )}

        <div className="mt-8 bg-white rounded-[2.5rem] p-8 shadow-xl">
          <h3 className="text-xl font-black italic tracking-tighter flex items-center gap-3 mb-8">
            <History className="w-6 h-6 text-primary" /> Game Records
          </h3>
          <div className="space-y-4">
            {history.map((res, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-transparent hover:border-primary/10 transition-all">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{res.periodId}</p>
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-1">{res.size}</span>
                    <div className="relative">
                      <span className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white shadow-lg ${
                        res.colors[0] === 'green' ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                        {res.number}
                      </span>
                      {res.colors.length > 1 && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-purple-500 border-2 border-white shadow-sm" />
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {res.colors.map((color, ci) => (
                      <div key={ci} className={`w-3.5 h-3.5 rounded-full ${
                        color === 'green' ? 'bg-green-500' : color === 'red' ? 'bg-red-500' : 'bg-purple-500'
                      }`} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
