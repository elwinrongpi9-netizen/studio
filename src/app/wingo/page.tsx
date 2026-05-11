
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { 
  History, 
  Timer, 
  Wallet, 
  ArrowLeft, 
  Trophy, 
  Info, 
  Loader2, 
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, setDoc, increment, getDoc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type BetType = "green" | "red" | "violet" | number;

interface GameResult {
  periodId: string;
  number: number;
  color: "green" | "red" | "violet";
}

export default function WingoPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const userRef = useMemo(() => (user && firestore) ? doc(firestore, "users", user.uid) : null, [user, firestore]);
  const { data: profile } = useDoc<any>(userRef);

  const [timeLeft, setTimeLeft] = useState(60);
  const [periodId, setPeriodId] = useState("");
  const [history, setHistory] = useState<GameResult[]>([]);
  const [selectedBet, setSelectedBet] = useState<BetType | null>(null);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [isBetting, setIsBetting] = useState(false);
  const [activeBets, setActiveBets] = useState<{ type: BetType; amount: number }[]>([]);

  // Initialize Period ID and History
  useEffect(() => {
    const now = new Date();
    const pid = now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, '0') + now.getDate().toString().padStart(2, '0') + now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0');
    setPeriodId(pid);

    // Mock initial history
    const mockHistory: GameResult[] = Array.from({ length: 5 }).map((_, i) => ({
      periodId: (parseInt(pid) - (i + 1)).toString(),
      number: Math.floor(Math.random() * 10),
      color: ["green", "red", "violet"][Math.floor(Math.random() * 3)] as any
    }));
    setHistory(mockHistory);
  }, []);

  // Timer Logic
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
  }, [timeLeft, activeBets]);

  const handleRoundEnd = async () => {
    const winNumber = Math.floor(Math.random() * 10);
    let winColor: "green" | "red" | "violet" = "green";
    if (winNumber === 0 || winNumber === 5) winColor = "violet";
    else if (winNumber % 2 === 0) winColor = "red";
    else winColor = "green";

    const result: GameResult = {
      periodId: periodId,
      number: winNumber,
      color: winColor
    };

    setHistory(prev => [result, ...prev].slice(0, 10));
    setPeriodId((prev) => (parseInt(prev) + 1).toString());

    // Check winnings
    if (activeBets.length > 0 && user && firestore) {
      let totalWinning = 0;
      activeBets.forEach(bet => {
        if (typeof bet.type === 'number') {
          if (bet.type === winNumber) totalWinning += bet.amount * 9;
        } else {
          if (bet.type === winColor) totalWinning += bet.amount * 2;
        }
      });

      if (totalWinning > 0) {
        await updateDoc(doc(firestore, "users", user.uid), {
          walletBalance: increment(totalWinning)
        });
        toast({
          title: "Congratulations! 🎉",
          description: `You won ₹${totalWinning} in period ${result.periodId}`,
          variant: "default"
        });
      } else {
        toast({
          title: "Round Ended",
          description: `Result: ${winColor.toUpperCase()} ${winNumber}. Better luck next time!`,
          variant: "destructive"
        });
      }
    }
    setActiveBets([]);
  };

  const placeBet = async (type: BetType) => {
    if (!user || !firestore) {
      toast({ title: "Please login to bet", variant: "destructive" });
      return;
    }

    if (timeLeft < 5) {
      toast({ title: "Wait for next round", description: "Betting closed for this period.", variant: "destructive" });
      return;
    }

    const currentBalance = profile?.walletBalance || 0;
    if (betAmount > currentBalance) {
      toast({ title: "Insufficient Balance", description: "Recharge your wallet to continue.", variant: "destructive" });
      return;
    }

    if (betAmount < 1) {
      toast({ title: "Invalid Amount", description: "Min bet is ₹1", variant: "destructive" });
      return;
    }

    setIsBetting(true);
    try {
      await updateDoc(doc(firestore, "users", user.uid), {
        walletBalance: increment(-betAmount)
      });
      setActiveBets(prev => [...prev, { type, amount: betAmount }]);
      toast({ title: "Bet Placed!", description: `₹${betAmount} on ${typeof type === 'string' ? type.toUpperCase() : type}` });
    } catch (e) {
      console.error(e);
      toast({ title: "Bet Failed", variant: "destructive" });
    } finally {
      setIsBetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col font-sans">
      <Navbar />
      
      {/* Game Header */}
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

        {/* Countdown Box */}
        <div className="container mx-auto max-w-2xl bg-white rounded-[2rem] p-8 shadow-2xl flex justify-between items-center text-foreground">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Period ID</p>
            <p className="text-2xl font-black text-primary italic">{periodId}</p>
          </div>
          <div className="flex flex-col items-end">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1">
              <Timer className="w-3 h-3" /> Time Left
            </p>
            <div className="flex gap-2 mt-1">
              <span className="bg-muted px-3 py-2 rounded-xl text-3xl font-black text-primary font-mono shadow-inner">0</span>
              <span className="bg-muted px-3 py-2 rounded-xl text-3xl font-black text-primary font-mono shadow-inner">{String(timeLeft).padStart(2, '0')}</span>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 -mt-6 max-w-2xl pb-20">
        {/* Betting Controls */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border-t-4 border-primary/10">
          <div className="flex justify-between gap-4 mb-8">
            <Button 
              onClick={() => placeBet("green")} 
              disabled={isBetting || timeLeft < 5}
              className="flex-1 h-16 rounded-2xl bg-green-500 hover:bg-green-600 font-black text-lg shadow-lg shadow-green-500/20"
            >
              Join Green
            </Button>
            <Button 
              onClick={() => placeBet("violet")} 
              disabled={isBetting || timeLeft < 5}
              className="flex-1 h-16 rounded-2xl bg-purple-500 hover:bg-purple-600 font-black text-lg shadow-lg shadow-purple-500/20"
            >
              Join Violet
            </Button>
            <Button 
              onClick={() => placeBet("red")} 
              disabled={isBetting || timeLeft < 5}
              className="flex-1 h-16 rounded-2xl bg-red-500 hover:bg-red-600 font-black text-lg shadow-lg shadow-red-500/20"
            >
              Join Red
            </Button>
          </div>

          {/* Number Betting */}
          <div className="grid grid-cols-5 gap-3 mb-10">
            {Array.from({ length: 10 }).map((_, n) => (
              <Button 
                key={n}
                onClick={() => placeBet(n)}
                disabled={isBetting || timeLeft < 5}
                variant="outline"
                className={`h-14 rounded-xl font-black text-xl border-2 transition-all hover:scale-110 active:scale-95 ${
                  n === 0 || n === 5 ? 'text-purple-600 border-purple-100 hover:bg-purple-50' :
                  n % 2 === 0 ? 'text-red-600 border-red-100 hover:bg-red-50' : 'text-green-600 border-green-100 hover:bg-green-50'
                }`}
              >
                {n}
              </Button>
            ))}
          </div>

          {/* Amount Selection */}
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
              className="h-14 rounded-xl text-center font-black text-2xl bg-muted/30 border-none"
            />
          </div>
        </div>

        {/* Active Bets */}
        {activeBets.length > 0 && (
          <div className="mt-8 bg-primary/5 border-2 border-primary/20 rounded-[2rem] p-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> My Bets (Period {periodId})
            </h3>
            <div className="flex flex-wrap gap-3">
              {activeBets.map((bet, i) => (
                <Badge key={i} className="px-4 py-2 rounded-xl bg-white text-primary border-2 border-primary/10 shadow-sm font-black">
                   {typeof bet.type === 'string' ? bet.type.toUpperCase() : `No. ${bet.type}`} : ₹{bet.amount}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Game History */}
        <div className="mt-12 bg-white rounded-[2.5rem] p-8 shadow-xl border-b-8 border-primary/5">
          <h3 className="text-xl font-black italic tracking-tighter flex items-center gap-3 mb-8">
            <History className="w-6 h-6 text-primary" /> Game Records
          </h3>
          <div className="space-y-4">
            {history.map((res, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border-2 border-transparent hover:border-primary/10 transition-all">
                <div className="space-y-1">
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">{res.periodId}</p>
                </div>
                <div className="flex items-center gap-6">
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white shadow-lg ${
                    res.color === 'green' ? 'bg-green-500' : res.color === 'red' ? 'bg-red-500' : 'bg-purple-500'
                  }`}>
                    {res.number}
                  </span>
                  <div className={`w-3 h-3 rounded-full animate-pulse ${
                    res.color === 'green' ? 'bg-green-500' : res.color === 'red' ? 'bg-red-500' : 'bg-purple-500'
                  }`} />
                  <span className="text-[10px] font-black uppercase text-muted-foreground w-12 text-right tracking-tighter">
                    {res.color}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Betting Rules Info */}
        <div className="mt-8 bg-muted/30 p-6 rounded-[2rem] border-2 border-dashed flex items-start gap-4">
          <Info className="w-6 h-6 text-primary shrink-0" />
          <div className="space-y-1">
             <p className="text-[10px] font-black uppercase tracking-widest text-foreground">Wingo Rules</p>
             <p className="text-[11px] font-bold text-muted-foreground uppercase leading-relaxed">
               Predict color to win 2x amount. Predict number to win 9x amount. 1 Coin = ₹1. Withdrawals processed within 24H.
             </p>
          </div>
        </div>
      </main>
    </div>
  );
}
