
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
  TrendingUp,
  User,
  X,
  Sparkles,
  Clock
} from "lucide-react";
import Link from "next/link";
import { useUser, useFirestore, useAuth, useCollection, useDoc } from "@/firebase";
import { doc, increment, setDoc, getDoc, query, collection, orderBy, limit } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
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

  const generatePeriodId = (dateObj?: Date) => {
    const now = dateObj || new Date();
    const dateStr = now.getFullYear().toString() + 
                    (now.getMonth() + 1).toString().padStart(2, '0') + 
                    now.getDate().toString().padStart(2, '0');
    const totalMinutes = now.getHours() * 60 + now.getMinutes();
    return dateStr + totalMinutes.toString().padStart(4, '0');
  };

  useEffect(() => {
    setPeriodId(generatePeriodId());
    const syncTimer = () => {
      const now = new Date();
      const seconds = now.getSeconds();
      const currentSecondsLeft = 60 - seconds;
      setTimeLeft(currentSecondsLeft);
      
      if (seconds === 0) {
        setPeriodId(generatePeriodId(now));
      }

      // Automatically unlock UI when a new round starts
      if (currentSecondsLeft === 60 || currentSecondsLeft === 59) {
        setIsBetting(false);
      }
    };
    syncTimer();
    const interval = setInterval(syncTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Round transition logic
    if (timeLeft === 60 && periodId) {
      handleRoundEnd();
    }
  }, [timeLeft, periodId]);

  const handleRoundEnd = async () => {
    if (!firestore || !periodId) return;
    
    // Calculate previous period correctly
    const now = new Date();
    now.setMinutes(now.getMinutes() - 1);
    const finishedPeriod = generatePeriodId(now);

    if (lastProcessedPeriod.current === finishedPeriod) return;
    lastProcessedPeriod.current = finishedPeriod;
    
    setIsCalculating(true);
    
    // Capture bets for processing and clear active bets immediately to unlock next round
    const betsToProcess = [...activeBetsRef.current];
    setActiveBets([]);
    activeBetsRef.current = [];

    let winNumber = Math.floor(Math.random() * 10);
    
    try {
      // Check admin fixed result for the finished period
      const controlRef = doc(firestore, "wingoConfig", finishedPeriod);
      const controlSnap = await getDoc(controlRef);
      if (controlSnap.exists()) {
        const controlledData = controlSnap.data();
        if (controlledData && controlledData.number !== undefined) {
          winNumber = Number(controlledData.number);
        }
      }
    } catch (e) {
      console.warn("Manual result fetch skipped:", e);
    }

    const winColors = getColorsForNumber(winNumber);
    const winSize = getSizeForNumber(winNumber);
    const result: GameResult = { periodId: finishedPeriod, number: winNumber, colors: winColors, size: winSize };

    setHistory(prev => [result, ...prev].slice(0, 15));

    // Wait 2 seconds for dramatic effect then process payouts
    setTimeout(async () => {
      if (betsToProcess.length > 0 && user && firestore) {
        let totalWinning = 0;
        
        for (const bet of betsToProcess) {
          let isWin = false;
          let profit = 0;

          if (typeof bet.type === 'number') {
            if (Number(bet.type) === winNumber) {
              profit = bet.amount * 9; // 9x Payout for Numbers
              isWin = true;
            }
          } else if (bet.type === 'big' || bet.type === 'small') {
            if ((bet.type === 'big' && winSize === 'Big') || (bet.type === 'small' && winSize === 'Small')) {
              profit = bet.amount * 2; // 2x Payout for Size
              isWin = true;
            }
          } else {
            if (winColors.includes(bet.type as any)) {
              profit = bet.amount * 2; // 2x Payout for Colors
              isWin = true;
            }
          }

          if (isWin) totalWinning += profit;

          // Log the bet result in Firestore
          const betId = Math.random().toString(36).substr(2, 9).toUpperCase();
          const betRef = doc(firestore, "users", user.uid, "bets", betId);
          setDoc(betRef, {
            periodId: finishedPeriod,
            type: bet.type,
            amount: bet.amount,
            winAmount: isWin ? profit : 0,
            status: isWin ? "Win" : "Loss",
            resultNumber: winNumber,
            createdAt: new Date().toISOString()
          }, { merge: true });
        }

        if (totalWinning > 0) {
          // Atomic Payout: Add winning amount to wallet balance
          const uRef = doc(firestore, "users", user.uid);
          setDoc(uRef, { walletBalance: increment(totalWinning) }, { merge: true })
            .then(() => {
              setWinningStats({ amount: totalWinning, result });
              setShowWinPopup(true);
            })
            .catch(err => console.error("Wallet Payout Error:", err));
        } else {
          toast({
            title: "Round Result",
            description: `Round #${finishedPeriod} result: ${winNumber} (${winSize}). Better luck next time!`,
            variant: "destructive"
          });
        }
      }
      setIsCalculating(false);
    }, 2000);
  };

  const placeBet = async (type: BetType) => {
    if (!user || !firestore) {
      toast({ title: "Please Login First", variant: "destructive" });
      return;
    }
    
    // Betting locks in last 5 seconds of the round
    if (timeLeft <= 5) {
      toast({ title: "Round Ending", description: "Wait for the next round to start.", variant: "destructive" });
      return;
    }
    
    const currentBalance = profile?.walletBalance || 0;
    if (betAmount > currentBalance) {
      toast({ title: "Insufficient Balance!", variant: "destructive" });
      return;
    }

    setIsBetting(true);
    const uRef = doc(firestore, "users", user.uid);
    
    // Deduct stake amount immediately
    setDoc(uRef, { walletBalance: increment(-betAmount) }, { merge: true })
      .then(() => {
        setActiveBets(prev => {
          const newBets = [...prev, { type, amount: betAmount }];
          activeBetsRef.current = newBets;
          return newBets;
        });
        toast({ title: "Bet Placed!", description: `₹${betAmount} on ${type.toString().toUpperCase()}` });
      })
      .catch((err) => {
        console.error(err);
        toast({ title: "Bet Failed", variant: "destructive" });
      })
      .finally(() => {
        setIsBetting(false);
      });
  };

  const isLockTime = timeLeft <= 5 && timeLeft > 0;

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-body">
      <Navbar />
      
      {/* Header & Wallet Section */}
      <div className="bg-primary text-white p-6 pb-16 rounded-b-[4rem] shadow-2xl relative">
        <div className="container mx-auto max-w-2xl flex items-center justify-between mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full">
              <ArrowLeft className="w-6 h-6" />
            </Button>
          </Link>
          <h1 className="text-4xl font-black italic tracking-tighter">WINGO <span className="text-xs bg-white/20 px-3 py-1 rounded-full not-italic">1M</span></h1>
          <div className="bg-white/10 px-6 py-3 rounded-2xl flex items-center gap-3 backdrop-blur-md border border-white/5">
            <Wallet className="w-5 h-5 text-yellow-300" />
            <span className="font-black text-xl">₹{profile?.walletBalance?.toFixed(0) || "0"}</span>
          </div>
        </div>

        {/* Current Period & Timer Section */}
        <div className="container mx-auto max-w-2xl bg-white rounded-[3rem] p-10 shadow-2xl flex justify-between items-center text-foreground relative z-10 border-b-8 border-primary/10">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em]">Issue ID</p>
            <p className="text-3xl font-black text-primary font-mono tracking-tighter">{periodId}</p>
          </div>
          <div className="flex flex-col items-end">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em] flex items-center gap-1.5 mb-2">
              <Timer className="w-3.5 h-3.5" /> Time Left
            </p>
            <div className="flex gap-2">
              <div className="bg-muted px-5 py-4 rounded-2xl text-5xl font-black text-primary font-mono shadow-inner">0</div>
              <div className="bg-muted px-5 py-4 rounded-2xl text-5xl font-black text-primary font-mono shadow-inner">{String(timeLeft === 60 ? 0 : timeLeft).padStart(2, '0')}</div>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 -mt-10 max-w-2xl pb-24 relative z-20">
        <div className="bg-white rounded-[4rem] p-12 shadow-2xl border-t-4 border-primary/5 mb-8 overflow-hidden relative">
          
          {/* Waiting/Lock Overlay */}
          {(isCalculating || isLockTime) && (
             <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-50 flex flex-col items-center justify-center animate-in fade-in duration-500">
                <Loader2 className="w-16 h-16 text-primary animate-spin mb-6" />
                <p className="text-2xl font-black text-primary uppercase tracking-[0.4em] animate-pulse">
                   {isLockTime ? "Betting Locked" : "Opening Result..."}
                </p>
             </div>
          )}

          {/* Size Betting */}
          <div className="flex gap-6 mb-10">
            <Button onClick={() => placeBet("big")} disabled={isBetting || isLockTime} className="flex-1 h-20 rounded-[2rem] bg-[#ff9933] hover:bg-[#e68a00] font-black text-2xl shadow-xl border-b-8 border-[#cc7a00] active:border-b-0 active:translate-y-1 transition-all">BIG</Button>
            <Button onClick={() => placeBet("small")} disabled={isBetting || isLockTime} className="flex-1 h-20 rounded-[2rem] bg-[#5c7cff] hover:bg-[#4a65cc] font-black text-2xl shadow-xl border-b-8 border-[#3c52a3] active:border-b-0 active:translate-y-1 transition-all">SMALL</Button>
          </div>

          {/* Color Betting */}
          <div className="flex justify-between gap-6 mb-12">
            <Button onClick={() => placeBet("green")} disabled={isBetting || isLockTime} className="flex-1 h-20 rounded-[2rem] bg-[#18b663] hover:bg-[#149c55] font-black text-lg shadow-xl border-b-8 border-[#108246] active:border-b-0 transition-all">Green</Button>
            <Button onClick={() => placeBet("violet")} disabled={isBetting || isLockTime} className="flex-1 h-20 rounded-[2rem] bg-[#9c27b0] hover:bg-[#862196] font-black text-lg shadow-xl border-b-8 border-[#6d1b7b] active:border-b-0 transition-all">Violet</Button>
            <Button onClick={() => placeBet("red")} disabled={isBetting || isLockTime} className="flex-1 h-20 rounded-[2rem] bg-[#ff4b4b] hover:bg-[#e64343] font-black text-lg shadow-xl border-b-8 border-[#cc3c3c] active:border-b-0 transition-all">Red</Button>
          </div>

          {/* Number Betting (9x Profit) */}
          <div className="grid grid-cols-5 gap-5 mb-14">
            {Array.from({ length: 10 }).map((_, n) => (
              <Button 
                key={n}
                onClick={() => placeBet(n)}
                disabled={isBetting || isLockTime}
                variant="outline"
                className={`h-20 rounded-[1.8rem] font-black text-3xl border-4 transition-all hover:scale-110 active:scale-95 shadow-sm ${
                  n === 0 || n === 5 ? 'text-purple-600 border-purple-100 bg-purple-50/30' :
                  n % 2 === 0 ? 'text-red-600 border-red-100 bg-red-50/30' : 'text-green-600 border-green-100 bg-green-50/30'
                }`}
              >
                {n}
              </Button>
            ))}
          </div>

          {/* Stake Control */}
          <div className="space-y-8">
            <div className="flex items-center justify-between px-4">
              <span className="text-xs font-black uppercase text-muted-foreground tracking-widest">Multiplier</span>
              <div className="flex gap-3">
                {[10, 50, 100, 500, 1000].map(amt => (
                  <Button 
                    key={amt} 
                    size="sm" 
                    variant={betAmount === amt ? "default" : "outline"}
                    onClick={() => setBetAmount(amt)}
                    className={`rounded-2xl font-black h-11 text-xs px-5 transition-all ${betAmount === amt ? 'shadow-xl scale-110 ring-4 ring-primary/20' : 'opacity-60'}`}
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
                className="h-24 rounded-[2.5rem] text-center font-black text-5xl bg-muted/30 border-none focus:ring-8 focus:ring-primary/10 transition-all shadow-inner"
              />
              <TrendingUp className="absolute left-10 top-1/2 -translate-y-1/2 w-10 h-10 text-primary opacity-20" />
            </div>
          </div>
        </div>

        {/* Admin Manual Control */}
        {isAdmin && (
          <div className="mb-10 bg-[#0a0a0a] text-white rounded-[3rem] p-10 shadow-2xl border-4 border-primary/30">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary/20"><ShieldAlert className="w-6 h-6 text-white" /></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Admin Override</span>
                <span className="text-lg font-black text-primary mt-1">Next Round: {periodId}</span>
              </div>
            </div>
            <div className="flex gap-6">
              <Input 
                type="number" 
                placeholder="Win Number" 
                value={adminTargetNumber} 
                onChange={e => setAdminTargetNumber(e.target.value)}
                className="bg-white/5 border-white/10 h-18 rounded-2xl text-2xl font-mono text-white flex-1 focus:ring-4 focus:ring-primary/20 text-center"
              />
              <Button onClick={handleAdminSetResult} className="bg-primary hover:bg-primary/90 h-18 rounded-2xl px-12 font-black uppercase text-sm tracking-widest shadow-2xl shadow-primary/30">
                SET RESULT
              </Button>
            </div>
          </div>
        )}

        {/* Trend & My History Tabs */}
        <Tabs defaultValue="records" className="space-y-8">
          <TabsList className="bg-white p-2.5 rounded-[2.5rem] h-20 w-full shadow-2xl border-b-4 border-muted">
            <TabsTrigger value="records" className="rounded-[1.8rem] font-black flex-1 h-14 uppercase text-[11px] tracking-[0.2em] data-[state=active]:bg-primary data-[state=active]:text-white">Trend History</TabsTrigger>
            <TabsTrigger value="mybets" className="rounded-[1.8rem] font-black flex-1 h-14 uppercase text-[11px] tracking-[0.2em] data-[state=active]:bg-primary data-[state=active]:text-white">My Records</TabsTrigger>
          </TabsList>

          <TabsContent value="records">
            <div className="bg-white rounded-[4rem] p-12 shadow-2xl border relative">
              <div className="flex items-center justify-between mb-12">
                <h3 className="text-3xl font-black italic tracking-tighter flex items-center gap-4">
                  <History className="w-8 h-8 text-primary" /> Round History
                </h3>
              </div>
              <div className="space-y-6">
                {history.map((res, i) => (
                  <div key={i} className="flex items-center justify-between p-7 rounded-[2.5rem] bg-muted/20 border-2 border-transparent hover:border-primary/20 transition-all hover:bg-white hover:shadow-xl">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] font-mono">{res.periodId}</p>
                      <Badge variant="outline" className="rounded-xl px-3 py-1 text-[10px] font-black text-primary border-primary/20">Wingo 1M</Badge>
                    </div>
                    <div className="flex items-center gap-10">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2 opacity-60">{res.size}</span>
                        <div className="relative">
                          <span className={`w-16 h-16 rounded-full flex items-center justify-center font-black text-2xl text-white shadow-2xl border-4 border-white/20 ${
                            res.colors[0] === 'green' ? 'bg-[#18b663]' : 'bg-[#ff4b4b]'
                          }`}>
                            {res.number}
                          </span>
                          {res.colors.length > 1 && (
                            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#9c27b0] border-4 border-white shadow-lg" />
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {res.colors.map((color, ci) => (
                          <div key={ci} className={`w-5 h-5 rounded-full shadow-inner ${
                            color === 'green' ? 'bg-[#18b663]' : color === 'red' ? 'bg-[#ff4b4b]' : 'bg-[#9c27b0]'
                          }`} />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="mybets">
            <div className="bg-white rounded-[4rem] p-12 shadow-2xl border min-h-[600px]">
              <div className="flex items-center justify-between mb-12">
                <h3 className="text-3xl font-black italic tracking-tighter flex items-center gap-4">
                  <User className="w-8 h-8 text-primary" /> Betting Records
                </h3>
              </div>
              <div className="space-y-6">
                {myBets?.map((bet, i) => (
                  <div key={i} className="flex items-center justify-between p-8 rounded-[2.8rem] bg-muted/30 border-2 border-transparent hover:border-primary/20 transition-all">
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                         <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest font-mono">ID: #{bet.periodId}</p>
                         <Badge className="bg-primary/5 text-primary text-[10px] font-black border-none px-3">Stake: ₹{bet.amount}</Badge>
                      </div>
                      <div className="flex items-center gap-6">
                         <div className="flex flex-col">
                           <span className="text-[9px] font-black text-muted-foreground uppercase opacity-50">Bet On</span>
                           <span className="font-black text-2xl uppercase tracking-tighter">{bet.type}</span>
                         </div>
                         <div className="h-10 w-[2px] bg-border/50 mx-2" />
                         <div className="flex flex-col">
                           <span className="text-[9px] font-black text-muted-foreground uppercase opacity-50">Profit Status</span>
                           <span className={`font-black text-2xl uppercase tracking-tighter ${bet.status === 'Win' ? 'text-green-600' : 'text-muted-foreground'}`}>
                             {bet.status === 'Win' ? `+₹${bet.winAmount}` : `-₹${bet.amount}`}
                           </span>
                         </div>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-3">
                      <Badge className={`rounded-full px-6 py-2 text-[10px] font-black uppercase tracking-widest shadow-2xl ${
                        bet.status === 'Win' ? 'bg-[#18b663] shadow-[#18b663]/30' : 'bg-destructive/60 shadow-destructive/10'
                      }`}>
                        {bet.status}
                      </Badge>
                      <p className="text-[9px] font-black text-muted-foreground uppercase opacity-40">
                         {new Date(bet.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* PROFIT WINNING POPUP OVERLAY */}
      <Dialog open={showWinPopup} onOpenChange={setShowWinPopup}>
        <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden bg-transparent border-none shadow-none focus:outline-none z-[100] rounded-none">
          <div className="relative flex flex-col items-center pt-32 pb-16 px-10">
             <div className="absolute inset-0 bg-black/80 backdrop-blur-xl -z-10 rounded-[5rem]" />
             
             <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 pointer-events-none">
               <div className="absolute inset-0 bg-yellow-400/30 rounded-full animate-ping duration-700" />
               <div className="relative w-full h-full bg-gradient-to-b from-yellow-200 via-yellow-500 to-yellow-800 rounded-full shadow-[0_0_100px_rgba(234,179,8,0.5)] border-[10px] border-yellow-200/40 flex items-center justify-center overflow-hidden">
                 <Trophy className="w-28 h-28 text-white drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)] animate-bounce" />
               </div>
             </div>

             <div className="bg-[#151515] w-full rounded-t-[3.5rem] p-12 text-center border-x-4 border-t-4 border-yellow-500/40">
               <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-100 via-yellow-400 to-yellow-100 italic tracking-tighter animate-pulse">
                 Congratulations
               </h2>
               <p className="text-[12px] font-black uppercase text-yellow-500/80 tracking-[0.5em] mt-5">Winning Bonus Credited</p>
             </div>

             <div className="bg-[#1a1a1a] w-full p-12 border-x-4 border-yellow-500/30 flex flex-col items-center gap-10">
                <div className="flex items-center gap-8">
                   <div className={`px-10 py-4 rounded-3xl font-black text-white uppercase text-xs shadow-2xl tracking-[0.2em] border-b-8 border-black/30 ${
                     winningStats.result?.colors.includes('red') ? 'bg-[#ff4b4b]' : 'bg-[#18b663]'
                   }`}>
                     {winningStats.result?.colors[0]}
                   </div>
                   <div className="relative">
                     <div className="absolute inset-0 bg-yellow-500/30 blur-3xl scale-150 animate-pulse" />
                     <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-700 flex items-center justify-center text-6xl font-black text-white shadow-2xl border-4 border-white/30 relative z-10 scale-125">
                       {winningStats.result?.number}
                     </div>
                   </div>
                   <div className="px-10 py-4 rounded-3xl bg-blue-600 font-black text-white uppercase text-xs shadow-2xl tracking-[0.2em] border-b-8 border-black/30">
                     {winningStats.result?.size}
                   </div>
                </div>
             </div>

             <div className="bg-[#151515] w-full p-12 text-center border-x-4 border-yellow-500/40">
                <span className="text-[11px] font-black uppercase text-yellow-500/40 tracking-[0.6em] mb-6 block">Total Bonus Payout</span>
                <h3 className="text-8xl font-black text-yellow-400 italic tracking-tighter flex items-center justify-center gap-4 drop-shadow-[0_15px_15px_rgba(0,0,0,0.8)]">
                   <span className="text-4xl not-italic font-black text-yellow-500/30">₹</span>{winningStats.amount.toFixed(0)}
                </h3>
             </div>

             <div className="bg-[#0a0a0a] w-full p-8 rounded-b-[3.5rem] text-center border-x-4 border-b-4 border-yellow-500/30 mb-10 shadow-2xl">
                <p className="text-[10px] font-black text-gray-700 uppercase tracking-[0.3em] flex items-center justify-center gap-4">
                  <Sparkles className="w-4 h-4 text-yellow-500/20" />
                  Period ID: {winningStats.result?.periodId}
                  <Sparkles className="w-4 h-4 text-yellow-500/20" />
                </p>
             </div>

             <button 
                onClick={() => setShowWinPopup(false)}
                className="w-20 h-20 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center border-2 border-white/10 transition-all active:scale-90 shadow-2xl group"
             >
                <X className="w-12 h-12 text-white group-hover:rotate-90 transition-transform" />
             </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  async function handleAdminSetResult() {
    if (!firestore || !periodId || adminTargetNumber === "") return;
    const num = parseInt(adminTargetNumber);
    if (isNaN(num) || num < 0 || num > 9) {
      toast({ title: "Invalid Number", variant: "destructive" });
      return;
    }
    const configRef = doc(firestore, "wingoConfig", periodId);
    setDoc(configRef, { periodId, number: num, updatedAt: new Date().toISOString() }, { merge: true })
      .then(() => {
        toast({ title: "RESULT FIXED!", description: `Round ${periodId} will result in Number ${num}`, className: "bg-primary text-white font-black" });
        setAdminTargetNumber("");
      });
  }
}
