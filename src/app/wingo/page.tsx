
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
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  User,
  X,
  Sparkles,
  Search
} from "lucide-react";
import Link from "next/link";
import { useUser, useFirestore, useDoc, useAuth, useCollection } from "@/firebase";
import { doc, increment, setDoc, getDoc, updateDoc, collection, query, orderBy, limit, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const auth = useAuth();
  
  const userRef = useMemo(() => (user && firestore) ? doc(firestore, "users", user.uid) : null, [user, firestore]);
  const { data: profile } = useDoc<any>(userRef);

  // User Bet History
  const userBetsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "users", user.uid, "bets"),
      orderBy("createdAt", "desc"),
      limit(20)
    );
  }, [firestore, user]);
  const { data: myBets } = useCollection<any>(userBetsQuery);

  const [timeLeft, setTimeLeft] = useState(60);
  const [periodId, setPeriodId] = useState("");
  const [history, setHistory] = useState<GameResult[]>([]);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [isBetting, setIsBetting] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [activeBets, setActiveBets] = useState<{ type: BetType; amount: number }[]>([]);
  
  // Winning Popup State
  const [showWinPopup, setShowWinPopup] = useState(false);
  const [winningStats, setWinningStats] = useState<{ amount: number; result: GameResult | null }>({ amount: 0, result: null });
  
  const activeBetsRef = useRef<{ type: BetType; amount: number }[]>([]);
  const lastProcessedPeriod = useRef("");

  useEffect(() => {
    activeBetsRef.current = activeBets;
  }, [activeBets]);

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
    setPeriodId(generatePeriodId());

    const syncTimer = () => {
      const seconds = new Date().getSeconds();
      const currentSecondsLeft = 60 - seconds;
      setTimeLeft(currentSecondsLeft);
      
      if (seconds === 0) {
        setPeriodId(generatePeriodId());
      }
    };

    syncTimer();
    const interval = setInterval(syncTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (timeLeft === 60 && periodId && lastProcessedPeriod.current !== periodId) {
      handleRoundEnd();
    }
  }, [timeLeft, periodId]);

  const handleRoundEnd = async () => {
    if (!firestore || !periodId) return;
    
    // Set calculating state for 3 seconds to "Wait"
    setIsCalculating(true);
    
    const now = new Date();
    now.setMinutes(now.getMinutes() - 1);
    const dateStr = now.getFullYear().toString() + 
                    (now.getMonth() + 1).toString().padStart(2, '0') + 
                    now.getDate().toString().padStart(2, '0');
    const prevTotalMinutes = now.getHours() * 60 + now.getMinutes();
    const finishedPeriod = dateStr + prevTotalMinutes.toString().padStart(4, '0');

    if (lastProcessedPeriod.current === finishedPeriod) {
      setIsCalculating(false);
      return;
    }
    lastProcessedPeriod.current = finishedPeriod;
    
    let winNumber = Math.floor(Math.random() * 10);
    
    try {
      const controlRef = doc(firestore, "wingoConfig", finishedPeriod);
      const controlSnap = await getDoc(controlRef);
      if (controlSnap.exists()) {
        const controlledData = controlSnap.data();
        if (controlledData && controlledData.number !== undefined) {
          winNumber = Number(controlledData.number);
        }
      }
    } catch (e) {
      console.warn("Manual result fetch error:", e);
    }

    const winColors = getColorsForNumber(winNumber);
    const winSize = getSizeForNumber(winNumber);

    const result: GameResult = {
      periodId: finishedPeriod,
      number: winNumber,
      colors: winColors,
      size: winSize
    };

    // Add to history list
    setHistory(prev => [result, ...prev].slice(0, 15));

    const betsToProcess = activeBetsRef.current;
    const currentUser = auth.currentUser;

    // Small delay to make it feel like "Waiting for Result"
    setTimeout(async () => {
      if (betsToProcess.length > 0 && currentUser && firestore) {
        let totalWinning = 0;
        
        // Payout Calculation
        betsToProcess.forEach(bet => {
          let isWin = false;
          let profit = 0;

          if (typeof bet.type === 'number') {
            if (Number(bet.type) === winNumber) {
              profit = bet.amount * 9; // 9x Profit
              isWin = true;
            }
          } else if (bet.type === 'big' || bet.type === 'small') {
            if ((bet.type === 'big' && winSize === 'Big') || (bet.type === 'small' && winSize === 'Small')) {
              profit = bet.amount * 2; // 2x Profit
              isWin = true;
            }
          } else {
            if (winColors.includes(bet.type as any)) {
              profit = bet.amount * 2; // 2x Profit
              isWin = true;
            }
          }

          if (isWin) {
            totalWinning += profit;
          }

          // Save individual bet result to history
          const betId = Math.random().toString(36).substr(2, 9);
          const betRef = doc(firestore, "users", currentUser.uid, "bets", betId);
          setDoc(betRef, {
            periodId: finishedPeriod,
            type: bet.type,
            amount: bet.amount,
            winAmount: isWin ? profit : 0,
            status: isWin ? "Win" : "Loss",
            resultNumber: winNumber,
            createdAt: new Date().toISOString()
          }, { merge: true });
        });

        if (totalWinning > 0) {
          const uRef = doc(firestore, "users", currentUser.uid);
          // Atomic Wallet Credit
          setDoc(uRef, {
            walletBalance: increment(totalWinning)
          }, { merge: true })
          .then(() => {
            setWinningStats({ amount: totalWinning, result });
            setShowWinPopup(true);
          });
        } else {
          toast({
            title: "ROUND LOSS",
            description: `Result was ${winNumber} (${winSize}). Better luck next round!`,
            variant: "destructive"
          });
        }
      }
      
      setActiveBets([]);
      activeBetsRef.current = [];
      setIsCalculating(false);
    }, 2000);
  };

  const placeBet = async (type: BetType) => {
    if (!user || !firestore) {
      toast({ title: "Please Login First", variant: "destructive" });
      return;
    }

    if (timeLeft < 5) {
      toast({ title: "Betting Closed", description: "Wait for the result.", variant: "destructive" });
      return;
    }

    if (betAmount <= 0) {
      toast({ title: "Invalid Amount", variant: "destructive" });
      return;
    }

    const currentBalance = profile?.walletBalance || 0;
    if (betAmount > currentBalance) {
      toast({ title: "Insufficient Coins", description: "Recharge your wallet to continue.", variant: "destructive" });
      return;
    }

    setIsBetting(true);
    const uRef = doc(firestore, "users", user.uid);
    
    // Deduct bet amount
    updateDoc(uRef, {
      walletBalance: increment(-betAmount)
    })
    .then(() => {
      setActiveBets(prev => {
        const newBets = [...prev, { type, amount: betAmount }];
        activeBetsRef.current = newBets;
        return newBets;
      });
      toast({ 
        title: "Bet Placed!", 
        description: `₹${betAmount} on ${typeof type === 'string' ? type.toUpperCase() : `Number ${type}`}` 
      });
    })
    .catch((err) => {
       console.error("Bet error:", err);
       toast({ title: "Bet Failed", variant: "destructive" });
    })
    .finally(() => setIsBetting(false));
  };

  const handleAdminSetResult = async () => {
    if (!firestore || !periodId || adminTargetNumber === "") return;
    const num = parseInt(adminTargetNumber);
    if (isNaN(num) || num < 0 || num > 9) {
      toast({ title: "Invalid Number", description: "Choose 0-9", variant: "destructive" });
      return;
    }

    const configRef = doc(firestore, "wingoConfig", periodId);
    setDoc(configRef, {
      periodId: periodId,
      number: num,
      updatedAt: new Date().toISOString()
    }, { merge: true })
    .then(() => {
      toast({ title: "SUCCESS!", description: `Period ${periodId} fixed to Number ${num}.`, className: "bg-primary text-white font-black" });
      setAdminTargetNumber("");
    })
    .catch((err) => {
      toast({ title: "Control Failed", variant: "destructive" });
    });
  };

  return (
    <div className="min-h-screen bg-[#f8f8f8] flex flex-col">
      <Navbar />
      
      {/* Header with Balance and Timer */}
      <div className="bg-primary text-white p-6 pb-14 rounded-b-[3.5rem] shadow-xl relative">
        <div className="container mx-auto max-w-2xl flex items-center justify-between mb-6">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full">
              <ArrowLeft className="w-6 h-6" />
            </Button>
          </Link>
          <div className="flex flex-col items-center">
            <h1 className="text-3xl font-black tracking-tighter italic">Wingo <span className="not-italic text-xs font-bold bg-white/20 px-3 py-1 rounded-full uppercase ml-2 tracking-widest">1 Minute</span></h1>
          </div>
          <div className="bg-white/20 px-5 py-2.5 rounded-2xl flex items-center gap-3 backdrop-blur-md border border-white/10 shadow-lg">
            <Wallet className="w-5 h-5 text-yellow-300" />
            <span className="font-black text-lg">₹{profile?.walletBalance?.toFixed(2) || "0.00"}</span>
          </div>
        </div>

        <div className="container mx-auto max-w-2xl bg-white rounded-[2.5rem] p-8 shadow-2xl flex justify-between items-center text-foreground relative z-10 border-b-4 border-primary/10">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-1">Current Issue</p>
            <p className="text-3xl font-black text-primary italic font-mono">{periodId}</p>
          </div>
          <div className="flex flex-col items-end">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] flex items-center gap-1.5 mb-2">
              <Timer className="w-3.5 h-3.5" /> Time Remaining
            </p>
            <div className="flex gap-2">
              <div className="bg-muted px-4 py-3 rounded-2xl text-4xl font-black text-primary font-mono shadow-inner border border-primary/5">0</div>
              <div className="bg-muted px-4 py-3 rounded-2xl text-4xl font-black text-primary font-mono shadow-inner border border-primary/5">{String(timeLeft === 60 ? 0 : timeLeft).padStart(2, '0')}</div>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 -mt-8 max-w-2xl pb-24 relative z-20">
        <div className="bg-white rounded-[3rem] p-10 shadow-2xl border-t-8 border-primary/5 mb-8">
          
          {isCalculating && (
             <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-[3rem] animate-in fade-in">
                <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
                <p className="text-xl font-black text-primary uppercase tracking-widest animate-pulse">Waiting for result...</p>
             </div>
          )}

          {/* Big / Small Selection */}
          <div className="flex gap-5 mb-8">
            <Button 
              onClick={() => placeBet("big")} 
              disabled={isBetting || timeLeft < 5}
              className="flex-1 h-16 rounded-[1.5rem] bg-[#ff9933] hover:bg-[#e68a00] font-black text-xl shadow-lg border-b-4 border-[#cc7a00] active:border-b-0 active:translate-y-1 transition-all"
            >
              BIG
            </Button>
            <Button 
              onClick={() => placeBet("small")} 
              disabled={isBetting || timeLeft < 5}
              className="flex-1 h-16 rounded-[1.5rem] bg-[#5c7cff] hover:bg-[#4a65cc] font-black text-xl shadow-lg border-b-4 border-[#3c52a3] active:border-b-0 active:translate-y-1 transition-all"
            >
              SMALL
            </Button>
          </div>

          {/* Color Selection */}
          <div className="flex justify-between gap-5 mb-10">
            <Button onClick={() => placeBet("green")} disabled={isBetting || timeLeft < 5} className="flex-1 h-20 rounded-[1.5rem] bg-[#18b663] hover:bg-[#149c55] font-black text-lg shadow-lg border-b-4 border-[#108246] active:border-b-0 transition-all">Green</Button>
            <Button onClick={() => placeBet("violet")} disabled={isBetting || timeLeft < 5} className="flex-1 h-20 rounded-[1.5rem] bg-[#9c27b0] hover:bg-[#862196] font-black text-lg shadow-lg border-b-4 border-[#6d1b7b] active:border-b-0 transition-all">Violet</Button>
            <Button onClick={() => placeBet("red")} disabled={isBetting || timeLeft < 5} className="flex-1 h-20 rounded-[1.5rem] bg-[#ff4b4b] hover:bg-[#e64343] font-black text-lg shadow-lg border-b-4 border-[#cc3c3c] active:border-b-0 transition-all">Red</Button>
          </div>

          {/* Number Selection */}
          <div className="grid grid-cols-5 gap-4 mb-12">
            {Array.from({ length: 10 }).map((_, n) => (
              <Button 
                key={n}
                onClick={() => placeBet(n)}
                disabled={isBetting || timeLeft < 5}
                variant="outline"
                className={`h-16 rounded-2xl font-black text-2xl border-2 transition-all hover:scale-110 active:scale-95 shadow-sm ${
                  n === 0 || n === 5 ? 'text-purple-600 border-purple-200 bg-purple-50/50' :
                  n % 2 === 0 ? 'text-red-600 border-red-200 bg-red-50/50' : 'text-green-600 border-green-200 bg-green-50/50'
                }`}
              >
                {n}
              </Button>
            ))}
          </div>

          {/* Bet Amount Selector */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-black uppercase text-muted-foreground tracking-widest">Select Bet Amount</span>
              <div className="flex gap-2">
                {[10, 50, 100, 500, 1000].map(amt => (
                  <Button 
                    key={amt} 
                    size="sm" 
                    variant={betAmount === amt ? "default" : "outline"}
                    onClick={() => setBetAmount(amt)}
                    className={`rounded-xl font-black h-9 text-[11px] px-4 transition-all ${betAmount === amt ? 'shadow-lg scale-110' : ''}`}
                  >
                    x{amt}
                  </Button>
                ))}
              </div>
            </div>
            <div className="relative group">
              <Input 
                type="number" 
                value={betAmount} 
                onChange={e => setBetAmount(parseInt(e.target.value) || 0)}
                className="h-20 rounded-3xl text-center font-black text-3xl bg-muted/30 border-none focus:ring-4 focus:ring-primary/20 transition-all"
              />
              <div className="absolute left-8 top-1/2 -translate-y-1/2 text-primary opacity-30 group-focus-within:opacity-100 transition-opacity">
                <TrendingUp className="w-8 h-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Admin Manual Control Panel */}
        {isAdmin && (
          <div className="mb-10 bg-[#121212] text-white rounded-[2.5rem] p-8 shadow-2xl border-4 border-primary/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary rounded-lg"><ShieldAlert className="w-5 h-5 text-white" /></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 leading-none">Admin Override Terminal</span>
                <span className="text-sm font-black text-primary mt-1">Issue: {periodId}</span>
              </div>
            </div>
            
            <div className="flex gap-5">
              <Input 
                type="number" 
                placeholder="Fix Num (0-9)" 
                value={adminTargetNumber} 
                onChange={e => setAdminTargetNumber(e.target.value)}
                className="bg-white/5 border-white/10 h-16 rounded-2xl text-xl font-mono text-white flex-1 focus:ring-2 focus:ring-primary text-center"
              />
              <Button onClick={handleAdminSetResult} className="bg-primary hover:bg-primary/80 h-16 rounded-2xl px-10 font-black uppercase text-sm tracking-widest shadow-xl shadow-primary/20">
                SET WINNER
              </Button>
            </div>
            <p className="text-[9px] font-bold text-white/30 uppercase mt-4 text-center tracking-widest leading-relaxed">
              Caution: Setting a result will force all active bets in the current round to follow this outcome.
            </p>
          </div>
        )}

        {/* Tabs for Records and History */}
        <div className="mt-4">
          <Tabs defaultValue="records" className="space-y-8">
            <TabsList className="bg-white p-2 rounded-[1.8rem] h-16 w-full shadow-lg border">
              <TabsTrigger value="records" className="rounded-2xl font-black flex-1 h-12 uppercase text-[11px] tracking-[0.15em] data-[state=active]:bg-primary data-[state=active]:text-white">Game History</TabsTrigger>
              <TabsTrigger value="mybets" className="rounded-2xl font-black flex-1 h-12 uppercase text-[11px] tracking-[0.15em] data-[state=active]:bg-primary data-[state=active]:text-white">My Records</TabsTrigger>
            </TabsList>

            <TabsContent value="records">
              <div className="bg-white rounded-[3rem] p-10 shadow-xl border">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-2xl font-black italic tracking-tighter flex items-center gap-4">
                    <History className="w-7 h-7 text-primary" /> Round History
                  </h3>
                  <Badge variant="outline" className="rounded-full px-5 py-2 font-black text-[10px] uppercase tracking-widest bg-muted border-none">15 Rounds</Badge>
                </div>
                <div className="space-y-5">
                  {history.map((res, i) => (
                    <div key={i} className="flex items-center justify-between p-5 rounded-3xl bg-muted/30 border border-transparent hover:border-primary/10 transition-all group">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest font-mono">{res.periodId}</p>
                        <div className="flex items-center gap-2">
                           <Badge variant="outline" className="rounded-lg px-2 text-[9px] font-black text-primary border-primary/20">Wingo 1M</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1.5 opacity-60">{res.size}</span>
                          <div className="relative group-hover:scale-110 transition-transform">
                            <span className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xl text-white shadow-xl ${
                              res.colors[0] === 'green' ? 'bg-[#18b663]' : 'bg-[#ff4b4b]'
                            }`}>
                              {res.number}
                            </span>
                            {res.colors.length > 1 && (
                              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#9c27b0] border-2 border-white shadow-lg" />
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {res.colors.map((color, ci) => (
                            <div key={ci} className={`w-4 h-4 rounded-full shadow-inner ${
                              color === 'green' ? 'bg-[#18b663]' : color === 'red' ? 'bg-[#ff4b4b]' : 'bg-[#9c27b0]'
                            }`} />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  {history.length === 0 && (
                     <div className="text-center py-20 opacity-30 flex flex-col items-center gap-4">
                       <Loader2 className="w-10 h-10 animate-spin" />
                       <p className="text-sm font-black uppercase tracking-[0.3em]">Synching Game Records...</p>
                     </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="mybets">
              <div className="bg-white rounded-[3rem] p-10 shadow-xl border min-h-[500px]">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-2xl font-black italic tracking-tighter flex items-center gap-4">
                    <User className="w-7 h-7 text-primary" /> Personal Ledger
                  </h3>
                  <Badge variant="outline" className="rounded-full px-5 py-2 font-black text-[10px] uppercase tracking-widest bg-primary/5 text-primary border-primary/10">Active History</Badge>
                </div>
                <div className="space-y-5">
                  {myBets?.map((bet, i) => (
                    <div key={i} className="flex items-center justify-between p-6 rounded-3xl bg-muted/40 border-2 border-transparent hover:border-primary/10 transition-all">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                           <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest font-mono">#{bet.periodId}</p>
                           <span className="text-[9px] font-bold text-muted-foreground">|</span>
                           <span className="text-[10px] font-black uppercase text-primary">₹{bet.amount} Laggaya</span>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="flex flex-col">
                             <span className="text-[9px] font-black text-muted-foreground uppercase opacity-50">Selection</span>
                             <span className="font-black text-lg uppercase tracking-tight">{bet.type}</span>
                           </div>
                           <div className="h-8 w-[1px] bg-border mx-2" />
                           <div className="flex flex-col">
                             <span className="text-[9px] font-black text-muted-foreground uppercase opacity-50">Multiplier</span>
                             <span className="font-black text-lg uppercase tracking-tight">{typeof bet.type === 'number' ? '9.0x' : '2.0x'}</span>
                           </div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-3">
                        <Badge className={`rounded-full px-5 py-1.5 text-[10px] font-black uppercase tracking-widest shadow-lg ${
                          bet.status === 'Win' ? 'bg-[#18b663] shadow-[#18b663]/20' : 'bg-destructive/70 shadow-destructive/20'
                        }`}>
                          {bet.status}
                        </Badge>
                        <p className={`text-2xl font-black italic tracking-tighter ${bet.status === 'Win' ? 'text-[#18b663]' : 'text-muted-foreground opacity-40'}`}>
                           {bet.status === 'Win' ? `+₹${bet.winAmount}` : `-₹${bet.amount}`}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!myBets || myBets.length === 0) && (
                    <div className="text-center py-32 opacity-20 flex flex-col items-center gap-6">
                       <Search className="w-16 h-16" />
                       <p className="text-xs font-black uppercase tracking-[0.4em]">No bets placed yet</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* PROFIT WINNING POPUP OVERLAY */}
      <Dialog open={showWinPopup} onOpenChange={setShowWinPopup}>
        <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden bg-transparent border-none shadow-none focus:outline-none z-[100]">
          <div className="relative flex flex-col items-center pt-28 pb-14 px-8">
             {/* Backdrop Blur */}
             <div className="absolute inset-0 bg-black/60 backdrop-blur-md -z-10 rounded-[4rem]" />
             
             {/* Floating Gold Coin Animation */}
             <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 pointer-events-none">
               <div className="absolute inset-0 bg-yellow-400/30 rounded-full animate-ping duration-1000" />
               <div className="relative w-full h-full bg-gradient-to-b from-yellow-300 via-yellow-500 to-yellow-700 rounded-full shadow-2xl border-8 border-yellow-200/50 flex items-center justify-center overflow-hidden">
                 <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.4)_0%,transparent_70%)] animate-pulse" />
                 <Trophy className="w-24 h-24 text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]" />
               </div>
             </div>

             {/* Congratulations Header */}
             <div className="bg-[#1a1a1a] w-full rounded-t-[2.5rem] p-10 text-center border-x-4 border-t-4 border-yellow-500/40 shadow-[0_-20px_40px_-15px_rgba(234,179,8,0.2)]">
               <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-500 to-yellow-200 italic tracking-tight drop-shadow-sm animate-pulse">
                 Congratulations
               </h2>
               <p className="text-[11px] font-black uppercase text-yellow-500/80 tracking-[0.4em] mt-3">Victory on Wingo 1M</p>
             </div>

             {/* Result Section */}
             <div className="bg-[#222222] w-full p-10 border-x-4 border-yellow-500/30 flex flex-col items-center gap-8 shadow-inner">
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-[0.5em] mb-2">Lottery Result</span>
                <div className="flex items-center gap-6">
                   <div className={`px-8 py-3 rounded-2xl font-black text-white uppercase text-xs shadow-2xl tracking-widest border-b-4 border-black/20 ${
                     winningStats.result?.colors.includes('red') ? 'bg-[#ff4b4b]' : 'bg-[#18b663]'
                   }`}>
                     {winningStats.result?.colors[0]}
                   </div>
                   <div className="relative group">
                     <div className="absolute inset-0 bg-yellow-500/20 blur-2xl rounded-full scale-150 animate-pulse" />
                     <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-5xl font-black text-white shadow-2xl border-4 border-white/20 relative z-10 scale-110">
                       {winningStats.result?.number}
                     </div>
                   </div>
                   <div className="px-8 py-3 rounded-2xl bg-[#ff4b4b] font-black text-white uppercase text-xs shadow-2xl tracking-widest border-b-4 border-black/20">
                     {winningStats.result?.size}
                   </div>
                </div>
             </div>

             {/* Bonus Profit Display */}
             <div className="bg-[#1a1a1a] w-full p-10 text-center border-x-4 border-yellow-500/40">
                <span className="text-[10px] font-black uppercase text-yellow-500/50 tracking-[0.5em] mb-5 block">Final Bonus Profit</span>
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-yellow-400 blur-3xl opacity-20 scale-150" />
                  <h3 className="text-7xl font-black text-yellow-400 italic tracking-tighter flex items-center justify-center gap-3 relative z-10 drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
                     <span className="text-4xl not-italic font-black text-yellow-500/50">₹</span>{winningStats.amount.toFixed(2)}
                  </h3>
                </div>
             </div>

             {/* Footer with Period ID */}
             <div className="bg-[#121212] w-full p-6 rounded-b-[2.5rem] text-center border-x-4 border-b-4 border-yellow-500/30 mb-8 shadow-2xl">
                <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] flex items-center justify-center gap-3">
                  <Sparkles className="w-3 h-3 text-yellow-500/40" />
                  Issue ID: {winningStats.result?.periodId}
                  <Sparkles className="w-3 h-3 text-yellow-500/40" />
                </p>
             </div>

             {/* Action Button - Close */}
             <button 
                onClick={() => setShowWinPopup(false)}
                className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center border-2 border-white/20 transition-all active:scale-90 shadow-2xl backdrop-blur-md group"
             >
                <X className="w-10 h-10 text-white group-hover:rotate-90 transition-transform" />
             </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
