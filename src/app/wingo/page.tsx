
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
  User
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
      limit(10)
    );
  }, [firestore, user]);
  const { data: myBets } = useCollection<any>(userBetsQuery);

  const [timeLeft, setTimeLeft] = useState(60);
  const [periodId, setPeriodId] = useState("");
  const [history, setHistory] = useState<GameResult[]>([]);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [isBetting, setIsBetting] = useState(false);
  const [activeBets, setActiveBets] = useState<{ type: BetType; amount: number }[]>([]);
  
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
      
      // Auto trigger end if seconds is exactly 0
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
    
    // We process the PREVIOUS period
    const now = new Date();
    now.setMinutes(now.getMinutes() - 1);
    const dateStr = now.getFullYear().toString() + 
                    (now.getMonth() + 1).toString().padStart(2, '0') + 
                    now.getDate().toString().padStart(2, '0');
    const prevTotalMinutes = now.getHours() * 60 + now.getMinutes();
    const finishedPeriod = dateStr + prevTotalMinutes.toString().padStart(4, '0');

    if (lastProcessedPeriod.current === finishedPeriod) return;
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

    setHistory(prev => [result, ...prev].slice(0, 10));

    const betsToProcess = activeBetsRef.current;
    const currentUser = auth.currentUser;

    if (betsToProcess.length > 0 && currentUser && firestore) {
      let totalWinning = 0;
      betsToProcess.forEach(bet => {
        let isWin = false;
        let profit = 0;

        if (typeof bet.type === 'number') {
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

        if (isWin) {
          totalWinning += profit;
        }

        // Save Bet History for User
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
        updateDoc(uRef, {
          walletBalance: increment(totalWinning)
        })
        .then(() => {
          toast({
            title: "VICTORY! 🏆",
            description: `Round ${finishedPeriod} Result: ${winNumber}. Profit ₹${totalWinning} added!`,
            className: "bg-green-600 text-white font-black border-none"
          });
        });
      } else {
        toast({
          title: "ROUND OVER",
          description: `Result: ${winNumber} (${winSize}). Better luck next time!`,
          variant: "destructive"
        });
      }
    }
    
    setActiveBets([]);
    activeBetsRef.current = [];
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
      setActiveBets(prev => {
        const newBets = [...prev, { type, amount: betAmount }];
        activeBetsRef.current = newBets;
        return newBets;
      });
      toast({ 
        title: "Bet Success", 
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
            <div className="relative">
              <Input 
                type="number" 
                value={betAmount} 
                onChange={e => setBetAmount(parseInt(e.target.value) || 0)}
                className="h-16 rounded-xl text-center font-black text-2xl bg-muted/30 border-none focus:ring-2 focus:ring-primary"
              />
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-primary">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
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

        <div className="mt-8">
          <Tabs defaultValue="records" className="space-y-6">
            <TabsList className="bg-white p-1.5 rounded-2xl h-14 w-full shadow-sm">
              <TabsTrigger value="records" className="rounded-xl font-black flex-1 h-11 uppercase text-[10px] tracking-widest">Game Records</TabsTrigger>
              <TabsTrigger value="mybets" className="rounded-xl font-black flex-1 h-11 uppercase text-[10px] tracking-widest">My History</TabsTrigger>
            </TabsList>

            <TabsContent value="records">
              <div className="bg-white rounded-[2.5rem] p-8 shadow-xl">
                <h3 className="text-xl font-black italic tracking-tighter flex items-center gap-3 mb-8">
                  <History className="w-6 h-6 text-primary" /> Global Records
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
                  {history.length === 0 && (
                     <div className="text-center py-10 opacity-40">
                       <p className="text-xs font-black uppercase tracking-widest">Waiting for results...</p>
                     </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="mybets">
              <div className="bg-white rounded-[2.5rem] p-8 shadow-xl min-h-[400px]">
                <h3 className="text-xl font-black italic tracking-tighter flex items-center gap-3 mb-8">
                  <User className="w-6 h-6 text-primary" /> Personal History
                </h3>
                <div className="space-y-4">
                  {myBets.map((bet, i) => (
                    <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-muted/20 border border-transparent hover:border-primary/5 transition-all">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Round: {bet.periodId}</p>
                        <div className="flex items-center gap-2">
                           <span className="font-black text-sm uppercase">Bet: {bet.type}</span>
                           <span className="text-[10px] font-bold text-muted-foreground">|</span>
                           <span className="font-black text-sm text-primary">₹{bet.amount}</span>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <Badge className={`rounded-full px-3 py-0.5 text-[9px] font-black uppercase ${
                          bet.status === 'Win' ? 'bg-green-600 shadow-md shadow-green-600/20' : 'bg-destructive/60'
                        }`}>
                          {bet.status}
                        </Badge>
                        <p className={`text-sm font-black ${bet.status === 'Win' ? 'text-green-600' : 'text-muted-foreground'}`}>
                           {bet.status === 'Win' ? `+₹${bet.winAmount}` : `-₹${bet.amount}`}
                        </p>
                      </div>
                    </div>
                  ))}
                  {myBets.length === 0 && (
                    <div className="text-center py-20 opacity-40">
                       <p className="text-xs font-black uppercase tracking-widest">No bets placed yet</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
