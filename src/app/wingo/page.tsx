
"use client";

import { useState, useEffect, useMemo } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { 
  History, 
  Timer, 
  Wallet, 
  ArrowLeft, 
  Info, 
  Sparkles,
  Zap,
  TrendingUp,
  Loader2,
  ShieldAlert,
  Save,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, increment, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
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

  // Admin Controller State
  const [adminTargetPeriod, setAdminTargetPeriod] = useState("");
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

  useEffect(() => {
    const generatePeriodId = () => {
      const now = new Date();
      return now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, '0') + now.getDate().toString().padStart(2, '0') + now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0');
    };

    const pid = generatePeriodId();
    setPeriodId(pid);
    setAdminTargetPeriod(pid);

    const mockHistory: GameResult[] = Array.from({ length: 5 }).map((_, i) => {
      const num = Math.floor(Math.random() * 10);
      return {
        periodId: (parseInt(pid) - (i + 1)).toString(),
        number: num,
        colors: getColorsForNumber(num),
        size: getSizeForNumber(num)
      };
    });
    setHistory(mockHistory);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleRoundEnd();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, activeBets, periodId]);

  const handleRoundEnd = async () => {
    if (!firestore) return;

    let winNumber = Math.floor(Math.random() * 10);
    const currentPeriod = periodId;
    
    // Check for Admin Override with high priority
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
      console.warn("Manual controller check failed", e);
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
    
    // Set Next Period
    const nextPid = (parseInt(currentPeriod) + 1).toString();
    setPeriodId(nextPid);
    if (isAdmin) setAdminTargetPeriod(nextPid);

    // Process Bets and Payouts
    if (activeBets.length > 0 && user && firestore) {
      let totalWinning = 0;
      activeBets.forEach(bet => {
        if (typeof bet.type === 'number') {
          // Number Prediction (9x PROFIT)
          if (bet.type === winNumber) {
            totalWinning += bet.amount * 9;
          }
        } else if (bet.type === 'big' || bet.type === 'small') {
          // Big/Small Prediction (2x)
          if ((bet.type === 'big' && winSize === 'Big') || (bet.type === 'small' && winSize === 'Small')) {
            totalWinning += bet.amount * 2;
          }
        } else {
          // Color Prediction (2x)
          if (winColors.includes(bet.type as any)) {
            totalWinning += bet.amount * 2;
          }
        }
      });

      if (totalWinning > 0) {
        const uRef = doc(firestore, "users", user.uid);
        // Instant Wallet Update using increment
        updateDoc(uRef, {
          walletBalance: increment(totalWinning)
        })
        .then(() => {
          toast({
            title: "VICTORY! 🎉",
            description: `Round ${result.periodId} won! Result: ${winNumber}. ₹${totalWinning} added to wallet.`,
            className: "bg-green-600 text-white font-black border-none"
          });
        })
        .catch((err) => {
          const permissionError = new FirestorePermissionError({
            path: uRef.path,
            operation: 'update',
            requestResourceData: { walletBalance: totalWinning },
          });
          errorEmitter.emit('permission-error', permissionError);
        });
      } else {
        toast({
          title: "LOSS 😞",
          description: `Result: ${winNumber} (${winSize}). Better luck next time!`,
          variant: "destructive",
          className: "font-black"
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
      toast({ title: "Betting Closed (Last 5s)", variant: "destructive" });
      return;
    }

    const currentBalance = profile?.walletBalance || 0;
    if (betAmount > currentBalance) {
      toast({ title: "Insufficient Balance", description: "Recharge coins in Game Zone or Wallet first!", variant: "destructive" });
      return;
    }

    setIsBetting(true);
    try {
      const uRef = doc(firestore, "users", user.uid);
      await updateDoc(uRef, {
        walletBalance: increment(-betAmount)
      });
      setActiveBets(prev => [...prev, { type, amount: betAmount }]);
      toast({ 
        title: "Bet Placed!", 
        description: `₹${betAmount} on ${typeof type === 'string' ? type.toUpperCase() : `No. ${type}`}` 
      });
    } catch (e) {
      console.error(e);
      toast({ title: "Transaction Failed", variant: "destructive" });
    } finally {
      setIsBetting(false);
    }
  };

  const handleAdminSetResult = async () => {
    if (!firestore || !adminTargetPeriod || adminTargetNumber === "") return;
    const num = parseInt(adminTargetNumber);
    if (isNaN(num) || num < 0 || num > 9) {
      toast({ title: "Choose 0-9", variant: "destructive" });
      return;
    }

    // Set Result Instantly (Skip loading spinner)
    const configRef = doc(firestore, "wingoConfig", adminTargetPeriod);
    setDoc(configRef, {
      periodId: adminTargetPeriod,
      number: num,
      updatedAt: new Date().toISOString()
    })
    .then(() => {
      toast({ title: "SUCCESS!", description: `Round ${adminTargetPeriod} fixed to ${num}.` });
      setAdminTargetNumber("");
    })
    .catch((err) => {
      const permissionError = new FirestorePermissionError({
        path: configRef.path,
        operation: 'write',
        requestResourceData: { periodId: adminTargetPeriod, number: num },
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col font-sans">
      <Navbar />
      
      <div className="bg-primary text-white p-6 pb-12 rounded-b-[3rem] shadow-xl relative">
        <div className="container mx-auto max-w-2xl flex items-center justify-between mb-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full">
              <ArrowLeft className="w-6 h-6" />
            </Button>
          </Link>
          <h1 className="text-3xl font-black tracking-tighter italic">Wingo <span className="not-italic text-sm font-bold bg-white/20 px-3 py-1 rounded-full">1 Min</span></h1>
          <div className="bg-white/20 px-4 py-2 rounded-2xl flex items-center gap-2 backdrop-blur-md">
            <Wallet className="w-4 h-4" />
            <span className="font-black">₹{profile?.walletBalance || 0}</span>
          </div>
        </div>

        <div className="container mx-auto max-w-2xl bg-white rounded-[2rem] p-8 shadow-2xl flex justify-between items-center text-foreground">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Period ID</p>
            <p className="text-2xl font-black text-primary italic">{periodId}</p>
          </div>
          <div className="flex flex-col items-end">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1">
              <Timer className="w-3 h-3" /> Ends in
            </p>
            <div className="flex gap-2 mt-1">
              <span className="bg-muted px-3 py-2 rounded-xl text-3xl font-black text-primary font-mono shadow-inner">0</span>
              <span className="bg-muted px-3 py-2 rounded-xl text-3xl font-black text-primary font-mono shadow-inner">{String(timeLeft).padStart(2, '0')}</span>
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
                  n === 0 || n === 5 ? 'text-purple-600 border-purple-100 bg-purple-50/50' :
                  n % 2 === 0 ? 'text-red-600 border-red-100 bg-red-50/50' : 'text-green-600 border-green-100 bg-green-50/50'
                }`}
              >
                {n}
              </Button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-muted-foreground tracking-widest">Select Bet Amount (₹)</span>
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
          <div className="mt-8 bg-black text-white rounded-[2rem] p-6 shadow-2xl border-2 border-white/10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Real-Time Manual Controller</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[9px] font-black text-white/40 uppercase ml-1 mb-1">Target Period</p>
                <div className="flex gap-2">
                  <Input 
                    value={adminTargetPeriod} 
                    onChange={e => setAdminTargetPeriod(e.target.value)} 
                    className="bg-white/5 border-white/10 h-10 rounded-xl text-[10px] font-mono text-white"
                  />
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-bold text-primary opacity-80 cursor-pointer hover:opacity-100" onClick={() => setAdminTargetPeriod(periodId)}>Current: {periodId}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-white/40 uppercase ml-1 mb-1">Winning Num (0-9)</p>
                <div className="flex gap-2">
                  <Input 
                    type="number" 
                    placeholder="Num" 
                    value={adminTargetNumber} 
                    onChange={e => setAdminTargetNumber(e.target.value)}
                    className="bg-white/5 border-white/10 h-10 rounded-xl text-xs font-mono text-white w-20"
                  />
                  <Button onClick={handleAdminSetResult} className="bg-primary hover:bg-primary/80 h-10 rounded-xl px-4 flex-1 text-[10px] font-black uppercase transition-transform active:scale-95">
                    Set Result
                  </Button>
                </div>
              </div>
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
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{res.periodId}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-1">{res.size}</span>
                    <div className="flex items-center gap-1.5">
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
                  </div>
                  <div className="flex gap-1.5">
                    {res.colors.map((color, ci) => (
                      <div key={ci} className={`w-3.5 h-3.5 rounded-full shadow-inner ${
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
