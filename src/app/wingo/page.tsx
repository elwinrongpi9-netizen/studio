"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { 
  Timer, 
  Wallet, 
  ArrowLeft, 
  Zap,
  Loader2,
  ShieldAlert,
  Trophy,
  X,
  Sparkles,
  TrendingUp
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
  DialogTitle,
} from "@/components/ui/dialog";

type BetType = "green" | "red" | "violet" | "big" | "small" | number;

interface GameResult {
  periodId: string;
  number: number;
  colors: ("green" | "red" | "violet")[];
  size: "Big" | "Small";
}

const ADMIN_EMAIL = "junakipi@gmail.com";

export default function WingoPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const userRef = useMemo(() => (user && firestore) ? doc(firestore, "users", user.uid) : null, [user, firestore]);
  const { data: profile } = useDoc<any>(userRef);

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
    const interval = setInterval(() => {
      const now = new Date();
      const seconds = now.getSeconds();
      const currentPeriod = generatePeriodId(now);
      
      setTimeLeft(60 - seconds);
      
      if (currentPeriod !== periodId) {
        if (periodId !== "") {
          handleRoundEnd(periodId);
        }
        setPeriodId(currentPeriod);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [periodId]);

  const handleRoundEnd = async (finishedPeriod: string) => {
    if (!firestore || !finishedPeriod || lastProcessedPeriod.current === finishedPeriod) return;
    lastProcessedPeriod.current = finishedPeriod;
    
    const betsToProcess = [...activeBetsRef.current];
    activeBetsRef.current = [];
    setActiveBets([]);
    
    setIsCalculating(true);
    
    let winNumber = Math.floor(Math.random() * 10);
    try {
      const configRef = doc(firestore, "wingoConfig", finishedPeriod);
      const snap = await getDoc(configRef);
      if (snap.exists()) {
        winNumber = Number(snap.data().number);
      }
    } catch (e) {
      console.warn("Manual result fetch skipped", e);
    }

    const winColors = getColorsForNumber(winNumber);
    const winSize = getSizeForNumber(winNumber);
    const result: GameResult = { periodId: finishedPeriod, number: winNumber, colors: winColors, size: winSize };

    setHistory(prev => [result, ...prev].slice(0, 15));

    if (user && firestore && betsToProcess.length > 0) {
      let totalWinning = 0;

      for (const bet of betsToProcess) {
        let isWin = false;
        let profit = 0;

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

        const betId = `BET_${finishedPeriod}_${Math.random().toString(36).substr(2, 5)}`;
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
        const uRef = doc(firestore, "users", user.uid);
        setDoc(uRef, { 
          wingoBalance: increment(totalWinning) 
        }, { merge: true })
        .then(() => {
          setWinningStats({ amount: totalWinning, result });
          setShowWinPopup(true);
        });
      }
    }
    
    setTimeout(() => setIsCalculating(false), 800);
  };

  const placeBet = async (type: BetType) => {
    if (!user || !firestore) {
      toast({ title: "Please Login First", variant: "destructive" });
      return;
    }
    
    if (timeLeft <= 5) {
      toast({ title: "Round Locked", variant: "destructive" });
      return;
    }

    const currentBalance = profile?.wingoBalance || 0;
    if (betAmount > currentBalance) {
      toast({ title: "No Balance!", variant: "destructive" });
      return;
    }

    setIsBetting(true);
    const uRef = doc(firestore, "users", user.uid);
    
    setDoc(uRef, { wingoBalance: increment(-betAmount) }, { merge: true })
      .then(() => {
        const newBet = { type, amount: betAmount };
        activeBetsRef.current = [...activeBetsRef.current, newBet];
        setActiveBets([...activeBetsRef.current]);
        toast({ title: "Bet Placed! 🎉" });
      })
      .finally(() => {
        setIsBetting(false);
      });
  };

  const isLockTime = timeLeft <= 5 && timeLeft > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <div className="bg-primary text-white p-8 pb-24 rounded-b-[4rem] shadow-2xl relative">
        <div className="container mx-auto max-w-2xl flex items-center justify-between mb-10">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full h-12 w-12">
              <ArrowLeft className="w-6 h-6" />
            </Button>
          </Link>
          <h1 className="text-4xl font-black italic tracking-tighter">WINGO 1M</h1>
          <div className="bg-white/20 px-6 py-3 rounded-2xl flex items-center gap-3 border border-white/20 backdrop-blur-md">
            <Zap className="w-5 h-5 text-yellow-300" />
            <div className="flex flex-col">
              <span className="text-[7px] font-black uppercase tracking-widest leading-none">Wingo Wallet</span>
              <span className="font-black text-xl">₹{profile?.wingoBalance?.toFixed(0) || "0"}</span>
            </div>
          </div>
        </div>

        <div className="container mx-auto max-w-2xl glass-effect rounded-[3rem] p-12 shadow-2xl flex justify-between items-center text-foreground relative z-10 ring-1 ring-black/5">
          <div className="space-y-1">
            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.4em]">Issue ID</p>
            <p className="text-4xl font-black text-primary font-mono italic tracking-tighter">{periodId}</p>
          </div>
          <div className="flex flex-col items-end">
            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.4em] mb-4">Time Left</p>
            <div className="flex gap-2.5">
              <div className="bg-white/50 px-6 py-5 rounded-2xl text-6xl font-black text-primary font-mono shadow-inner ring-1 ring-black/5">0</div>
              <div className="bg-white/50 px-6 py-5 rounded-2xl text-6xl font-black text-primary font-mono shadow-inner ring-1 ring-black/5">{String(timeLeft === 60 ? 0 : timeLeft).padStart(2, '0')}</div>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 -mt-16 max-w-2xl pb-32 relative z-20">
        <div className="bg-white/80 backdrop-blur-xl rounded-[3rem] p-10 shadow-2xl border border-white/40 mb-12 relative overflow-hidden">
          
          {(isCalculating || isLockTime) && (
             <div className="absolute inset-0 bg-white/90 backdrop-blur-xl z-50 flex flex-col items-center justify-center">
                <Loader2 className="w-16 h-16 text-primary animate-spin mb-6" />
                <p className="text-2xl font-black text-primary uppercase tracking-widest animate-pulse">Syncing Result...</p>
             </div>
          )}

          <div className="flex gap-6 mb-12">
            <Button onClick={() => placeBet("big")} disabled={isBetting || isLockTime} className="flex-1 h-24 rounded-3xl bg-orange-500 hover:bg-orange-600 font-black text-4xl shadow-xl text-white italic">BIG</Button>
            <Button onClick={() => placeBet("small")} disabled={isBetting || isLockTime} className="flex-1 h-24 rounded-3xl bg-blue-500 hover:bg-blue-600 font-black text-4xl shadow-xl text-white italic">SMALL</Button>
          </div>

          <div className="flex justify-between gap-6 mb-16">
            <Button onClick={() => placeBet("green")} disabled={isBetting || isLockTime} className="flex-1 h-20 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-black text-xl shadow-lg">Green</Button>
            <Button onClick={() => placeBet("violet")} disabled={isBetting || isLockTime} className="flex-1 h-20 rounded-2xl bg-purple-500 hover:bg-purple-600 text-white font-black text-xl shadow-lg">Violet</Button>
            <Button onClick={() => placeBet("red")} disabled={isBetting || isLockTime} className="flex-1 h-20 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black text-xl shadow-lg">Red</Button>
          </div>

          <div className="grid grid-cols-5 gap-4 mb-16">
            {Array.from({ length: 10 }).map((_, n) => (
              <Button 
                key={n}
                onClick={() => placeBet(n)}
                disabled={isBetting || isLockTime}
                className={`h-20 rounded-2xl font-black text-4xl border-4 transition-all hover:scale-105 active:scale-95 shadow-md ${
                  n === 0 || n === 5 ? 'text-purple-500 border-purple-500/20 bg-purple-50' :
                  n % 2 === 0 ? 'text-red-500 border-red-500/20 bg-red-50' : 'text-green-500 border-green-500/20 bg-green-50'
                }`}
              >
                {n}
              </Button>
            ))}
          </div>

          <div className="space-y-8">
            <div className="flex items-center justify-between px-4">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Selection Multiplier
              </span>
              <div className="flex gap-3">
                {[10, 100, 500, 1000].map(amt => (
                  <Button 
                    key={amt} 
                    size="sm" 
                    variant={betAmount === amt ? "default" : "outline"}
                    onClick={() => setBetAmount(amt)}
                    className={`rounded-xl font-black h-10 text-[10px] px-4 ${betAmount === amt ? 'bg-primary text-white shadow-xl scale-110' : 'opacity-60'}`}
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
                className="h-24 rounded-3xl text-center font-black text-5xl bg-muted/20 border-none ring-1 ring-black/5 focus:ring-primary shadow-inner font-mono italic"
              />
              <TrendingUp className="absolute left-10 top-1/2 -translate-y-1/2 w-10 h-10 text-primary opacity-10" />
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="mb-12 bg-white rounded-[3rem] p-10 border border-primary/20 shadow-xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-primary rounded-2xl animate-pulse"><ShieldAlert className="w-6 h-6 text-white" /></div>
              <h2 className="text-xl font-black italic tracking-tighter">Admin Terminal</h2>
            </div>
            <div className="flex gap-4">
              <Input 
                type="number" 
                placeholder="Fix 0-9" 
                value={adminTargetNumber} 
                onChange={e => setAdminTargetNumber(e.target.value)}
                className="bg-muted/10 h-16 rounded-2xl text-3xl font-mono text-center font-black"
              />
              <Button onClick={() => {
                if (!firestore || !periodId || adminTargetNumber === "") return;
                setDoc(doc(firestore, "wingoConfig", periodId), { periodId, number: parseInt(adminTargetNumber) }, { merge: true });
                setAdminTargetNumber("");
                toast({ title: "Result Fixed!" });
              }} className="bg-primary text-white h-16 rounded-2xl px-10 font-black text-xs tracking-widest uppercase">
                FIX
              </Button>
            </div>
          </div>
        )}

        <Tabs defaultValue="records" className="space-y-8">
          <TabsList className="bg-white/50 backdrop-blur-md p-2 rounded-[2rem] h-20 w-full shadow-lg border border-white/40">
            <TabsTrigger value="records" className="rounded-[1.5rem] font-black flex-1 h-16 uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white">Trends</TabsTrigger>
            <TabsTrigger value="mybets" className="rounded-[1.5rem] font-black flex-1 h-16 uppercase text-[10px] tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white">My History</TabsTrigger>
          </TabsList>

          <TabsContent value="records">
            <div className="bg-white/80 backdrop-blur-xl rounded-[3rem] p-10 shadow-xl border border-white/40 min-h-[400px]">
              <div className="space-y-6">
                {history.map((res, i) => (
                  <div key={i} className="flex items-center justify-between p-6 rounded-3xl bg-white border border-black/5 hover:border-primary/20 transition-all shadow-sm">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest font-mono">{res.periodId}</p>
                      <Badge variant="outline" className="rounded-full px-3 py-0.5 text-[8px] font-black border-primary/20 text-primary uppercase">Wingo 1M</Badge>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="flex flex-col items-center">
                        <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-2 opacity-50">{res.size}</span>
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-2xl text-white shadow-lg ${
                            res.colors[0] === 'green' ? 'bg-green-500' : 'bg-red-500'
                          }`}>
                            {res.number}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="mybets">
            <div className="bg-white/80 backdrop-blur-xl rounded-[3rem] p-10 shadow-xl border border-white/40 min-h-[400px]">
              <div className="space-y-6">
                {myBets?.map((bet, i) => (
                  <div key={i} className="flex items-center justify-between p-8 rounded-[2.5rem] bg-white border border-black/5 hover:border-primary/20 transition-all shadow-sm">
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                         <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest font-mono">#{bet.periodId}</p>
                         <Badge className="bg-primary/10 text-primary text-[9px] font-black px-3 py-0.5 rounded-full border-none">₹{bet.amount}</Badge>
                      </div>
                      <div className="flex items-center gap-6">
                         <div className="flex flex-col">
                           <span className="text-[8px] font-black text-muted-foreground uppercase mb-1 opacity-50">Bet</span>
                           <span className="font-black text-xl uppercase italic">{bet.type}</span>
                         </div>
                         <div className="w-px h-10 bg-black/5" />
                         <div className="flex flex-col">
                           <span className="text-[8px] font-black text-muted-foreground uppercase mb-1 opacity-50">Result</span>
                           <span className={`font-black text-xl italic ${bet.status === 'Win' ? 'text-green-600' : 'text-muted-foreground'}`}>
                             {bet.status === 'Win' ? `+₹${bet.winAmount}` : `Loss`}
                           </span>
                         </div>
                      </div>
                    </div>
                    <Badge className={`rounded-2xl px-6 py-2 text-[10px] font-black text-white uppercase tracking-widest shadow-lg ${
                        bet.status === 'Win' ? 'bg-green-600' : 'bg-zinc-400'
                      }`}>
                        {bet.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={showWinPopup} onOpenChange={setShowWinPopup}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-transparent border-none shadow-none">
          <DialogTitle className="sr-only">Win Announcement</DialogTitle>
          <div className="relative flex flex-col items-center py-20 px-10">
             <div className="absolute inset-0 bg-white/95 backdrop-blur-2xl -z-10 rounded-[4rem] border border-yellow-500/20 shadow-2xl" />
             <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-full border-[10px] border-white flex items-center justify-center shadow-2xl animate-bounce">
               <Trophy className="w-24 h-24 text-white" />
             </div>
             <div className="text-center mt-12 w-full">
               <h2 className="text-5xl font-black text-yellow-600 italic tracking-tighter uppercase mb-2">VICTORY!</h2>
               <p className="text-[10px] font-black uppercase text-yellow-600/40 tracking-[0.5em] mb-10">Wingo Balance Added</p>
               <div className="bg-yellow-50 p-10 rounded-[3rem] border border-yellow-200 mb-10">
                 <h3 className="text-8xl font-black text-yellow-600 italic tracking-tighter flex items-center justify-center gap-4">
                   <span className="text-3xl not-italic font-black opacity-30 text-yellow-700">₹</span>{winningStats.amount.toFixed(0)}
                 </h3>
               </div>
               <Button onClick={() => setShowWinPopup(false)} className="bg-yellow-500 hover:bg-yellow-600 text-white h-16 w-16 rounded-full font-black shadow-2xl">
                 <X className="w-8 h-8" />
               </Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
