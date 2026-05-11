
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Trophy, Gamepad2, Star, QrCode, Timer, CheckCircle2, Heart, ArrowLeft, Wallet, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc, increment } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const FOOD_ITEMS = ["🥟", "🍕", "🍔", "🍣", "🍛", "🍩", "🍦"];
const COLORS = ["bg-primary", "bg-accent", "bg-orange-500", "bg-green-500", "bg-yellow-500"];

// MERCHANT DETAILS
const MERCHANT_UPI_ID = "Q297152786@ybl";
const MERCHANT_NAME = "Rongpi Chinese Wok";
const MERCHANT_CODE = "5812";

export default function GameZonePage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const userRef = useMemo(() => (user && firestore) ? doc(firestore, "users", user.uid) : null, [user, firestore]);
  const { data: profile } = useDoc<any>(userRef);

  const [gameState, setGameState] = useState<"start" | "playing" | "gameover" | "success">("start");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [items, setItems] = useState<{ id: number; x: number; y: number; char: string; color: string }[]>([]);
  const [playerX, setPlayerX] = useState(50);
  const [lives, setLives] = useState(3);
  const [lastCatch, setLastCatch] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);
  const [isSaving, setIsSaving] = useState(false);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  const earnedCoins = Math.floor(score / 10); 

  const upiUrl = useMemo(() => {
    const amount = "100.00"; 
    const pa = MERCHANT_UPI_ID;
    const pn = encodeURIComponent(MERCHANT_NAME);
    const mc = MERCHANT_CODE;
    const tr = `GM${Date.now().toString().slice(-10)}`;
    const tn = encodeURIComponent(`Gamer_Combo_Recharge`);
    
    // Standard PhonePe Business URI with Mode 02
    return `upi://pay?pa=${pa}&pn=${pn}&mc=${mc}&tr=${tr}&tn=${tn}&am=${amount}&cu=INR&mode=02`;
  }, []);

  const qrCodeUrl = useMemo(() => {
    return `https://chart.googleapis.com/chart?chs=500x500&cht=qr&chl=${encodeURIComponent(upiUrl)}&choe=UTF-8&chld=M|2`;
  }, [upiUrl]);

  useEffect(() => {
    const saved = localStorage.getItem("karbi_game_highscore");
    if (saved) setHighScore(parseInt(saved));
  }, []);

  useEffect(() => {
    if (gameState === "playing") {
      const interval = setInterval(() => {
        setItems((prev) => [
          ...prev,
          {
            id: Date.now(),
            x: Math.random() * 90 + 5,
            y: -10,
            char: FOOD_ITEMS[Math.floor(Math.random() * FOOD_ITEMS.length)],
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
          },
        ]);
      }, 900);
      return () => clearInterval(interval);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState === "playing") {
      const gameLoop = setInterval(() => {
        setItems((prev) => {
          const newItems = prev
            .map((item) => ({ ...item, y: item.y + (1.5 + score / 500) }))
            .filter((item) => {
              if (item.y > 85 && item.y < 95 && Math.abs(item.x - playerX) < 12) {
                setScore((s) => s + 10);
                setLastCatch(true);
                setTimeout(() => setLastCatch(false), 200);
                return false;
              }
              if (item.y > 100) {
                setLives((l) => {
                  if (l <= 1) handleGameOver();
                  return l - 1;
                });
                return false;
              }
              return true;
            });
          return newItems;
        });
      }, 16);
      return () => clearInterval(gameLoop);
    }
  }, [gameState, playerX, score]);

  const handleGameOver = async () => {
    setGameState("gameover");
    if (user && firestore && earnedCoins > 0) {
      setIsSaving(true);
      try {
        await updateDoc(doc(firestore, "users", user.uid), {
          walletBalance: increment(earnedCoins)
        });
        toast({ 
          title: "Coins Saved!", 
          description: `Added ${earnedCoins} Karbi Coins (₹${earnedCoins}) to your wallet.` 
        });
      } catch (e) {
        console.error("Wallet save failed", e);
      } finally {
        setIsSaving(false);
      }
    }
  };

  useEffect(() => {
    if (gameState === "gameover" && score > highScore) {
      setHighScore(score);
      localStorage.setItem("karbi_game_highscore", score.toString());
    }
  }, [gameState, score, highScore]);

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameState !== "playing" || !gameAreaRef.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const x = "touches" in e 
      ? ((e.touches[0].clientX - rect.left) / rect.width) * 100 
      : ((e.clientX - rect.left) / rect.width) * 100;
    setPlayerX(Math.max(5, Math.min(95, x)));
  };

  const startGame = () => {
    setScore(0);
    setLives(3);
    setItems([]);
    setGameState("playing");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button variant="ghost" className="rounded-xl font-bold bg-white/50 shadow-sm"><ArrowLeft className="w-4 h-4 mr-2" /> Exit</Button>
          </Link>
          <div className="flex gap-3">
             <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-2xl border-2 border-primary/20 shadow-lg">
                <Wallet className="w-5 h-5 text-primary" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-muted-foreground leading-none">Wallet (₹)</span>
                  <span className="font-black text-lg text-primary">{profile?.walletBalance || 0}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-2xl border-2 border-yellow-500/20 shadow-lg">
                <Trophy className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-muted-foreground leading-none">Best</span>
                  <span className="font-black text-lg text-yellow-600">{highScore}</span>
                </div>
              </div>
          </div>
        </div>

        <div 
          ref={gameAreaRef}
          className={`relative aspect-[3/4] bg-white rounded-[3rem] border-8 border-white overflow-hidden cursor-none shadow-2xl transition-all duration-300 ${lastCatch ? 'ring-8 ring-green-400/30' : ''}`}
          onMouseMove={handleMouseMove}
          onTouchMove={handleMouseMove}
        >
          {gameState === "start" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/90 to-accent/90 p-8 text-white text-center">
              <div className="bg-white p-6 rounded-[2rem] shadow-2xl mb-8 animate-bounce"><Gamepad2 className="w-16 h-16 text-primary" /></div>
              <h1 className="text-5xl font-black mb-4 tracking-tighter italic uppercase text-white">Momo Catch</h1>
              <p className="text-white/90 font-bold mb-10 max-w-[280px]">Earn Karbi Coins! 1 Coin = ₹1. Kheliye aur Jitiye!</p>
              {!user ? (
                <div className="bg-white/20 p-4 rounded-2xl mb-4 font-bold">Sign in to save your coins!</div>
              ) : null}
              <Button onClick={startGame} className="bg-white text-primary hover:bg-white/90 rounded-3xl px-16 py-8 text-2xl font-black shadow-2xl scale-110">PLAY</Button>
            </div>
          )}

          {gameState === "playing" && (
            <>
              <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
                <div className="bg-white/90 px-8 py-3 rounded-full border-2 border-primary/20 shadow-xl flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span className="text-3xl font-black text-primary">{score}</span>
                </div>
              </div>
              <div className="absolute top-10 left-8 flex gap-2 z-10">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Heart key={i} className={`w-6 h-6 ${i < lives ? "text-destructive fill-destructive" : "text-gray-300"}`} />
                ))}
              </div>
              {items.map((item) => (
                <div key={item.id} className="absolute text-5xl transition-all" style={{ left: `${item.x}%`, top: `${item.y}%`, transform: 'translateX(-50%)' }}>{item.char}</div>
              ))}
              <div className={`absolute bottom-12 h-16 w-24 flex items-center justify-center transition-all ${lastCatch ? 'scale-125' : ''}`} style={{ left: `${playerX}%`, transform: 'translateX(-50%)' }}>
                <div className="relative w-full h-full bg-gray-200 rounded-full shadow-xl border-b-4 border-gray-400 flex items-center justify-center text-4xl">🍽️</div>
              </div>
            </>
          )}

          {gameState === "gameover" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-primary p-8 text-white text-center">
              {isSaving ? <Loader2 className="w-12 h-12 animate-spin mb-4" /> : <Trophy className="w-16 h-16 text-yellow-300 fill-yellow-300 mb-6" />}
              <h2 className="text-5xl font-black mb-2 italic">GAME OVER</h2>
              <div className="bg-white p-6 rounded-[2.5rem] w-full max-w-[300px] mb-6 shadow-2xl text-primary mt-4">
                <div className="flex justify-between items-center mb-2"><span className="font-black text-xs uppercase opacity-60">Score</span><span className="text-4xl font-black">{score}</span></div>
                <div className="flex justify-between items-center mb-4"><span className="font-black text-xs uppercase opacity-60">Earned</span><span className="text-xl font-black">₹{earnedCoins} (Coins)</span></div>
                <Button onClick={() => setShowQrModal(true)} className="w-full h-14 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-black flex items-center justify-center gap-2 shadow-lg">
                  <QrCode className="w-5 h-5" /> Pay Business ₹100
                </Button>
              </div>
              <Button onClick={startGame} className="bg-white/20 hover:bg-white/30 rounded-3xl w-full py-6 text-xl font-black">RETRY</Button>
            </div>
          )}

          {gameState === "success" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-500 p-8 text-white text-center">
              <CheckCircle2 className="w-24 h-24 mb-6" />
              <h2 className="text-5xl font-black mb-4 italic">PAID!</h2>
              <p className="font-bold opacity-90 mb-10">Gamer's Combo Payment Received for<br/><span className="text-yellow-300">{MERCHANT_NAME}</span></p>
              <Button onClick={startGame} className="bg-white text-green-600 rounded-3xl w-full py-8 text-xl font-black">PLAY AGAIN</Button>
            </div>
          )}
        </div>
      </main>

      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] p-10">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-3xl font-black text-center">Scan to Pay</DialogTitle>
            <DialogDescription className="text-center font-bold">Merchant: <span className="text-primary">{MERCHANT_NAME}</span></DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-6">
            <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-full font-black text-xs animate-pulse flex items-center gap-2">
              <Timer className="w-4 h-4" />
              <span>Expires in: {Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</span>
            </div>
            <div className="relative w-72 h-72 bg-white p-4 rounded-3xl shadow-2xl border-4 border-primary/10">
              <Image src={qrCodeUrl} alt="UPI Business QR" fill className="object-contain p-2" unoptimized />
            </div>
            <div className="text-center">
              <p className="text-4xl font-black text-primary">₹100.00</p>
              <p className="text-[10px] font-black text-muted-foreground uppercase mt-1">{MERCHANT_UPI_ID}</p>
            </div>
            <Button className="w-full py-7 rounded-2xl font-black text-lg bg-primary shadow-xl" onClick={() => { setShowQrModal(false); setGameState("success"); }}>I have paid ₹100</Button>
            <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest text-center">Verified Merchant Account (Mode 02)</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
