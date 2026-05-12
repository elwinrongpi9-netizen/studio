
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
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { doc, increment, setDoc, getDoc, query, collection, orderBy, limit } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
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
    };
    syncTimer();
    const interval = setInterval(syncTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (timeLeft === 60 && periodId) {
      handleRoundEnd();
    }
  }, [timeLeft, periodId]);

  const handleRoundEnd = async () => {
    if (!firestore || !periodId) return;
    
    const now = new Date();
    now.setMinutes(now.getMinutes() - 1);
    const finishedPeriod = generatePeriodId(now);

    if (lastProcessedPeriod.current === finishedPeriod) return;
    lastProcessedPeriod.current = finishedPeriod;
    
    setIsCalculating(true);
    
    // Take snapshot of current bets immediately
    const betsToProcess = [...activeBetsRef.current];
    // Clear for next round
    setActiveBets([]);
    activeBetsRef.current = [];

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
      console.warn("Manual result fetch skipped:", e);
    }

    const winColors = getColorsForNumber(winNumber);
    const winSize = getSizeForNumber(winNumber);
    const result: GameResult = { periodId: finishedPeriod, number: winNumber, colors: winColors, size: winSize };

    // Update public trend history
    setHistory(prev => [result, ...prev].slice(0, 15));

    // Fast Result Processing (~500ms delay for UI feeling)
    setTimeout(async () => {
      if (user && firestore) {
        let totalWinning = 0;
        const uRef = doc(firestore, "users", user.uid);

        if (betsToProcess.length > 0) {
          for (const bet of betsToProcess) {
            let isWin = false;
            let profit = 0;

            // Robust matching logic for 9x Numbers, 2x Colors/Size
            if (typeof bet.type === 'number' || !isNaN(Number(bet.type))) {
              if (Number(bet.type) === winNumber) {
                profit = bet.amount * 9; 
                isWin = true;
              }
            } else if (bet.type === 'big' || bet.type === 'small') {
              if ((bet.type === 'big' && winSize === 'Big') || (bet.type === 'small' && winSize === 'Small')) {
                profit = bet.amount * 2; 
                isWin = true;
              }
            } else {
              if (winColors.includes(bet.type as any)) {
                profit = bet.amount * 2; 
                isWin = true;
              }
            }

            if (isWin) totalWinning += profit;

            // Record this specific bet result in user's subcollection
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
            const finalProfit = totalWinning;
            // Atomic Update: Guaranteed Balance PLUS
            setDoc(uRef, { walletBalance: increment(finalProfit) }, { merge: true })
              .then(() => {
                setWinningStats({ amount: finalProfit, result });
                setShowWinPopup(true);
              })
              .catch(err => {
                const permissionError = new FirestorePermissionError({
                  path: uRef.path,
                  operation: 'update',
                  requestResourceData: { walletBalance: finalProfit },
                });
                errorEmitter.emit('permission-error', permissionError);
              });
          } else {
            toast({
              title: "Better luck next time!",
              description: `Round #${finishedPeriod} result was ${winNumber} (${winSize})`,
              variant: "destructive"
            });
          }
        }
      }
      setIsCalculating(false);
    }, 500); 
  };

  const placeBet = async (type: BetType) => {
    if (!user || !firestore) {
      toast({ title: "Please Login First", variant: "destructive" });
      return;
    }
    
    if (timeLeft <= 5) {
      toast({ title: "Round Locked", description: "Wait for the next round to start.", variant: "destructive" });
      return;
    }
    
    if (betAmount <= 0) {
      toast({ title: "Invalid Amount", variant: "destructive" });
      return;
    }

    const currentBalance = profile?.walletBalance || 0;
    if (betAmount > currentBalance) {
      toast({ title: "Insufficient Balance!", variant: "destructive" });
      return;
    }

    setIsBetting(true);
    const uRef = doc(firestore, "users", user.uid);
    
    // Deduct stake immediately (Atomic)
    setDoc(uRef, { walletBalance: increment(-betAmount) }, { merge: true })
      .then(() => {
        const newBet = { type, amount: betAmount };
        activeBetsRef.current = [...activeBetsRef.current, newBet];
        setActiveBets([...activeBetsRef.current]);
        
        toast({ title: "Bet Placed! 🎉", description: `₹${betAmount} on ${type.toString().toUpperCase()}` });
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
      
      <div className="bg-primary text-white p-6 pb-20 rounded-b-[5rem] shadow-2xl relative">
        <div className="container mx-auto max-w-2xl flex items-center justify-between mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full">
              <ArrowLeft className="w-6 h-6" />
            </Button>
          </Link>
          <h1 className="text-4xl font-black italic tracking-tighter flex items-center gap-2">
            WINGO <span className="text-[10px] bg-white/20 px-3 py-1 rounded-full not-italic tracking-widest font-black">1M</span>
          </h1>
          <div className="bg-white/10 px-6 py-3 rounded-2xl flex items-center gap-3 backdrop-blur-md border border-white/5">
            <Wallet className="w-5 h-5 text-yellow-300" />
            <span className="font-black text-xl">₹{profile?.walletBalance?.toFixed(0) || "0"}</span>
          </div>
        </div>

        <div className="container mx-auto max-w-2xl bg-white rounded-[4rem] p-12 shadow-2xl flex justify-between items-center text-foreground relative z-10 border-b-[12px] border-primary/10">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.4em] opacity-60">Issue ID</p>
            <p className="text-4xl font-black text-primary font-mono tracking-tighter">{periodId}</p>
          </div>
          <div className="flex flex-col items-end">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.4em] flex items-center gap-2 mb-3 opacity-60">
              <Timer className="w-4 h-4 text-primary" /> Time Left
            </p>
            <div className="flex gap-2.5">
              <div className="bg-muted px-6 py-5 rounded-[2rem] text-6xl font-black text-primary font-mono shadow-inner ring-1 ring-primary/5">0</div>
              <div className="bg-muted px-6 py-5 rounded-[2rem] text-6xl font-black text-primary font-mono shadow-inner ring-1 ring-primary/5">{String(timeLeft === 60 ? 0 : timeLeft).padStart(2, '0')}</div>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 -mt-12 max-w-2xl pb-24 relative z-20">
        <div className="bg-white rounded-[4rem] p-12 shadow-2xl border-t-4 border-primary/5 mb-10 overflow-hidden relative">
          
          {/* Waiting/Lock Overlay */}
          {(isCalculating || isLockTime) && (
             <div className="absolute inset-0 bg-white/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center animate-in fade-in duration-500">
                <Loader2 className="w-20 h-20 text-primary animate-spin mb-8" />
                <div className="text-center space-y-2">
                  <p className="text-3xl font-black text-primary uppercase tracking-[0.4em] animate-pulse">
                    {isLockTime ? "Locking bets..." : "Opening Result..."}
                  </p>
                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Processing Payouts...</p>
                </div>
             </div>
          )}

          {/* Size Betting */}
          <div className="flex gap-8 mb-12">
            <Button onClick={() => placeBet("big")} disabled={isBetting || isLockTime} className="flex-1 h-24 rounded-[2.5rem] bg-[#ff9933] hover:bg-[#e68a00] font-black text-3xl shadow-xl border-b-8 border-[#cc7a00] active:border-b-0 active:translate-y-2 transition-all">BIG</Button>
            <Button onClick={() => placeBet("small")} disabled={isBetting || isLockTime} className="flex-1 h-24 rounded-[2.5rem] bg-[#5c7cff] hover:bg-[#4a65cc] font-black text-3xl shadow-xl border-b-8 border-[#3c52a3] active:border-b-0 active:translate-y-2 transition-all">SMALL</Button>
          </div>

          {/* Color Betting */}
          <div className="flex justify-between gap-6 mb-16">
            <Button onClick={() => placeBet("green")} disabled={isBetting || isLockTime} className="flex-1 h-20 rounded-[2.2rem] bg-[#18b663] hover:bg-[#149c55] font-black text-xl shadow-xl border-b-8 border-[#108246] active:border-b-0 transition-all">Green</Button>
            <Button onClick={() => placeBet("violet")} disabled={isBetting || isLockTime} className="flex-1 h-20 rounded-[2.2rem] bg-[#9c27b0] hover:bg-[#862196] font-black text-xl shadow-xl border-b-8 border-[#6d1b7b] active:border-b-0 transition-all">Violet</Button>
            <Button onClick={() => placeBet("red")} disabled={isBetting || isLockTime} className="flex-1 h-20 rounded-[2.2rem] bg-[#ff4b4b] hover:bg-[#e64343] font-black text-xl shadow-xl border-b-8 border-[#cc3c3c] active:border-b-0 transition-all">Red</Button>
          </div>

          {/* Number Betting (9x Profit) */}
          <div className="grid grid-cols-5 gap-6 mb-16">
            {Array.from({ length: 10 }).map((_, n) => (
              <Button 
                key={n}
                onClick={() => placeBet(n)}
                disabled={isBetting || isLockTime}
                variant="outline"
                className={`h-20 rounded-[2rem] font-black text-3xl border-4 transition-all hover:scale-110 active:scale-95 shadow-sm hover:shadow-xl ${
                  n === 0 || n === 5 ? 'text-purple-600 border-purple-100 bg-purple-50/30' :
                  n % 2 === 0 ? 'text-red-600 border-red-100 bg-red-50/30' : 'text-green-600 border-green-100 bg-green-50/30'
                }`}
              >
                {n}
              </Button>
            ))}
          </div>

          {/* Stake Control */}
          <div className="space-y-10">
            <div className="flex items-center justify-between px-6">
              <span className="text-xs font-black uppercase text-muted-foreground tracking-[0.2em] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Selection Multiplier
              </span>
              <div className="flex gap-4">
                {[10, 50, 100, 500, 1000].map(amt => (
                  <Button 
                    key={amt} 
                    size="sm" 
                    variant={betAmount === amt ? "default" : "outline"}
                    onClick={() => setBetAmount(amt)}
                    className={`rounded-[1.2rem] font-black h-12 text-xs px-6 transition-all ${betAmount === amt ? 'shadow-xl scale-110 ring-4 ring-primary/20' : 'opacity-60'}`}
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
                className="h-28 rounded-[3rem] text-center font-black text-6xl bg-muted/30 border-none focus:ring-[12px] focus:ring-primary/10 transition-all shadow-inner font-mono"
              />
              <TrendingUp className="absolute left-12 top-1/2 -translate-y-1/2 w-12 h-12 text-primary opacity-20" />
              <div className="absolute right-12 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary/40 uppercase tracking-widest">Stake Amount</div>
            </div>
          </div>
        </div>

        {/* Admin Manual Control */}
        {isAdmin && (
          <div className="mb-12 bg-[#0a0a0a] text-white rounded-[4rem] p-12 shadow-2xl border-4 border-primary/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5"><ShieldAlert className="w-32 h-32" /></div>
            <div className="flex items-center gap-5 mb-10">
              <div className="p-4 bg-primary rounded-3xl shadow-xl shadow-primary/30 animate-pulse"><ShieldAlert className="w-8 h-8 text-white" /></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">Master Controller Active</span>
                <span className="text-2xl font-black text-primary mt-1 italic tracking-tighter">Fix Round: {periodId}</span>
              </div>
            </div>
            <div className="flex gap-8 relative z-10">
              <Input 
                type="number" 
                placeholder="0-9" 
                value={adminTargetNumber} 
                onChange={e => setAdminTargetNumber(e.target.value)}
                className="bg-white/5 border-white/10 h-20 rounded-3xl text-4xl font-mono text-white flex-1 focus:ring-8 focus:ring-primary/20 text-center font-black"
              />
              <Button onClick={handleAdminSetResult} className="bg-primary hover:bg-primary/90 h-20 rounded-3xl px-16 font-black uppercase text-sm tracking-widest shadow-[0_0_40px_rgba(139,92,246,0.3)]">
                FORCE RESULT
              </Button>
            </div>
          </div>
        )}

        {/* Trend & My History Tabs */}
        <Tabs defaultValue="records" className="space-y-10">
          <TabsList className="bg-white p-3 rounded-[3rem] h-24 w-full shadow-2xl border-b-8 border-muted ring-1 ring-black/5">
            <TabsTrigger value="records" className="rounded-[2.2rem] font-black flex-1 h-18 uppercase text-[12px] tracking-[0.3em] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-xl transition-all">Round Trend</TabsTrigger>
            <TabsTrigger value="mybets" className="rounded-[2.2rem] font-black flex-1 h-18 uppercase text-[12px] tracking-[0.3em] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-xl transition-all">My Records</TabsTrigger>
          </TabsList>

          <TabsContent value="records">
            <div className="bg-white rounded-[4rem] p-12 shadow-2xl border-t-4 border-primary/5 min-h-[600px]">
              <div className="flex items-center justify-between mb-12">
                <h3 className="text-4xl font-black italic tracking-tighter flex items-center gap-5">
                  <History className="w-10 h-10 text-primary not-italic" /> Trends
                </h3>
              </div>
              <div className="space-y-8">
                {history.map((res, i) => (
                  <div key={i} className="flex items-center justify-between p-8 rounded-[3rem] bg-muted/20 border-2 border-transparent hover:border-primary/20 transition-all hover:bg-white hover:shadow-2xl group">
                    <div className="space-y-3">
                      <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.3em] font-mono opacity-50 group-hover:opacity-100">{res.periodId}</p>
                      <Badge variant="outline" className="rounded-2xl px-5 py-1.5 text-[10px] font-black text-primary border-primary/20 bg-primary/5 uppercase">Standard 1M</Badge>
                    </div>
                    <div className="flex items-center gap-12">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-3 opacity-40">{res.size}</span>
                        <div className="relative">
                          <span className={`w-20 h-20 rounded-full flex items-center justify-center font-black text-4xl text-white shadow-2xl border-8 border-white/20 scale-110 ${
                            res.colors[0] === 'green' ? 'bg-[#18b663]' : 'bg-[#ff4b4b]'
                          }`}>
                            {res.number}
                          </span>
                          {res.colors.length > 1 && (
                            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-[#9c27b0] border-4 border-white shadow-xl" />
                          )}
                        </div>
                      </div>
                      <div className="flex gap-3">
                        {res.colors.map((color, ci) => (
                          <div key={ci} className={`w-6 h-6 rounded-full shadow-inner ring-2 ring-white ${
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
            <div className="bg-white rounded-[4rem] p-12 shadow-2xl border-t-4 border-primary/5 min-h-[600px]">
              <div className="flex items-center justify-between mb-12">
                <h3 className="text-4xl font-black italic tracking-tighter flex items-center gap-5">
                  <User className="w-10 h-10 text-primary not-italic" /> My Bets
                </h3>
              </div>
              <div className="space-y-8">
                {myBets?.map((bet, i) => (
                  <div key={i} className="flex items-center justify-between p-10 rounded-[3.5rem] bg-muted/30 border-2 border-transparent hover:border-primary/30 transition-all hover:bg-white hover:shadow-2xl">
                    <div className="space-y-5">
                      <div className="flex items-center gap-5">
                         <p className="text-[12px] font-black text-muted-foreground uppercase tracking-widest font-mono">#{bet.periodId}</p>
                         <Badge className="bg-primary/10 text-primary text-[11px] font-black border-none px-4 py-1 rounded-xl">Stake: ₹{bet.amount}</Badge>
                      </div>
                      <div className="flex items-center gap-8">
                         <div className="flex flex-col">
                           <span className="text-[10px] font-black text-muted-foreground uppercase opacity-40 mb-1">Target</span>
                           <span className="font-black text-3xl uppercase tracking-tighter text-foreground">{bet.type}</span>
                         </div>
                         <div className="h-12 w-[2px] bg-border/40 mx-2" />
                         <div className="flex flex-col">
                           <span className="text-[10px] font-black text-muted-foreground uppercase opacity-40 mb-1">Profit/Loss</span>
                           <span className={`font-black text-3xl uppercase tracking-tighter ${bet.status === 'Win' ? 'text-green-600' : 'text-muted-foreground'}`}>
                             {bet.status === 'Win' ? `+₹${bet.winAmount}` : `-₹${bet.amount}`}
                           </span>
                         </div>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-5">
                      <Badge className={`rounded-[1.5rem] px-8 py-3 text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl scale-110 ${
                        bet.status === 'Win' ? 'bg-[#18b663] shadow-[#18b663]/30' : 'bg-destructive/60 shadow-destructive/10'
                      }`}>
                        {bet.status}
                      </Badge>
                      <p className="text-[10px] font-black text-muted-foreground uppercase opacity-30 flex items-center gap-2">
                         <Clock className="w-3 h-3" /> {new Date(bet.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* WINNING POPUP OVERLAY */}
      <Dialog open={showWinPopup} onOpenChange={setShowWinPopup}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-transparent border-none shadow-none focus:outline-none z-[100] rounded-none">
          <div className="relative flex flex-col items-center pt-32 pb-20 px-10">
             <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl -z-10 rounded-[6rem] ring-4 ring-yellow-500/20" />
             
             {/* Trophy Head */}
             <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 pointer-events-none">
               <div className="absolute inset-0 bg-yellow-400/40 rounded-full animate-ping duration-1000" />
               <div className="relative w-full h-full bg-gradient-to-b from-yellow-100 via-yellow-500 to-yellow-900 rounded-full shadow-[0_0_120px_rgba(234,179,8,0.6)] border-[12px] border-yellow-200/50 flex items-center justify-center overflow-hidden">
                 <Trophy className="w-32 h-32 text-white drop-shadow-[0_12px_24px_rgba(0,0,0,0.7)] animate-bounce" />
               </div>
             </div>

             <div className="bg-[#111] w-full rounded-t-[4rem] p-14 text-center border-x-4 border-t-4 border-yellow-500/50">
               <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-100 via-yellow-400 to-yellow-100 italic tracking-tighter animate-pulse uppercase">
                 Victory! 🎉
               </h2>
               <p className="text-[12px] font-black uppercase text-yellow-500/60 tracking-[0.6em] mt-6">Bonus Balance Credited</p>
             </div>

             <div className="bg-[#181818] w-full p-14 border-x-4 border-yellow-500/40 flex flex-col items-center gap-12">
                <div className="flex items-center gap-10">
                   <div className={`px-12 py-5 rounded-[2rem] font-black text-white uppercase text-sm shadow-2xl tracking-[0.3em] border-b-[10px] border-black/40 ${
                     winningStats.result?.colors.includes('red') ? 'bg-[#ff4b4b]' : 'bg-[#18b663]'
                   }`}>
                     {winningStats.result?.colors[0]}
                   </div>
                   <div className="relative">
                     <div className="absolute inset-0 bg-yellow-500/40 blur-[80px] scale-150 animate-pulse" />
                     <div className="w-28 h-28 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-800 flex items-center justify-center text-7xl font-black text-white shadow-2xl border-[6px] border-white/40 relative z-10 scale-125 ring-8 ring-yellow-500/20">
                       {winningStats.result?.number}
                     </div>
                   </div>
                   <div className="px-12 py-5 rounded-[2rem] bg-blue-600 font-black text-white uppercase text-sm shadow-2xl tracking-[0.3em] border-b-[10px] border-black/40">
                     {winningStats.result?.size}
                   </div>
                </div>
             </div>

             <div className="bg-[#111] w-full p-14 text-center border-x-4 border-yellow-500/50">
                <span className="text-[12px] font-black uppercase text-yellow-500/30 tracking-[0.8em] mb-8 block">Total Bonus Payout</span>
                <h3 className="text-9xl font-black text-yellow-400 italic tracking-tighter flex items-center justify-center gap-6 drop-shadow-[0_20px_30px_rgba(0,0,0,0.9)]">
                   <span className="text-5xl not-italic font-black text-yellow-500/20">₹</span>{winningStats.amount.toFixed(0)}
                </h3>
             </div>

             <div className="bg-[#050505] w-full p-10 rounded-b-[4rem] text-center border-x-4 border-b-4 border-yellow-500/40 mb-12 shadow-2xl">
                <p className="text-[11px] font-black text-gray-800 uppercase tracking-[0.4em] flex items-center justify-center gap-5">
                  <Sparkles className="w-5 h-5 text-yellow-500/10" />
                  Period ID: {winningStats.result?.periodId}
                  <Sparkles className="w-5 h-5 text-yellow-500/10" />
                </p>
             </div>

             <button 
                onClick={() => setShowWinPopup(false)}
                className="w-24 h-24 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center border-4 border-white/10 transition-all active:scale-90 shadow-2xl group ring-4 ring-yellow-500/10"
             >
                <X className="w-14 h-14 text-white group-hover:rotate-90 transition-transform" />
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
      toast({ title: "Choose 0-9 only", variant: "destructive" });
      return;
    }
    const configRef = doc(firestore, "wingoConfig", periodId);
    setDoc(configRef, { periodId, number: num, updatedAt: new Date().toISOString() }, { merge: true })
      .then(() => {
        toast({ title: "ADMIN OVERRIDE SUCCESS!", description: `Round ${periodId} will open Number ${num}`, className: "bg-primary text-white font-black rounded-2xl" });
        setAdminTargetNumber("");
      });
  }
}

