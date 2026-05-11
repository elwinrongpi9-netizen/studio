
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Trophy, Play, RotateCcw, Utensils, Zap, Heart, ArrowLeft, Gamepad2, Star, Sparkles, QrCode, Smartphone, Timer, X, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const FOOD_ITEMS = ["🥟", "🍕", "🍔", "🍣", "🍛", "🍩", "🍦"];
const COLORS = ["bg-primary", "bg-accent", "bg-orange-500", "bg-green-500", "bg-yellow-500"];

// Merchant Details
const MERCHANT_UPI_ID = "rongpichinesewok@ybl";
const MERCHANT_NAME = "Rongpi Chinese wok";

export default function GameZonePage() {
  const [gameState, setGameState] = useState<"start" | "playing" | "gameover">("start");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [items, setItems] = useState<{ id: number; x: number; y: number; char: string; color: string }[]>([]);
  const [playerX, setPlayerX] = useState(50);
  const [lives, setLives] = useState(3);
  const [lastCatch, setLastCatch] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  // UPI QR Logic
  const upiUrl = useMemo(() => {
    // Amount can be based on score or a fixed "Support" amount, let's use a fixed 100 for "Game Special"
    const amount = "100.00"; 
    return `upi://pay?pa=${MERCHANT_UPI_ID}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${amount}&cu=INR`;
  }, []);

  const qrCodeUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(upiUrl)}`;
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
                  if (l <= 1) setGameState("gameover");
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

  useEffect(() => {
    if (gameState === "gameover" && score > highScore) {
      setHighScore(score);
      localStorage.setItem("karbi_game_highscore", score.toString());
    }
  }, [gameState, score, highScore]);

  // Timer logic for QR
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showQrModal && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setShowQrModal(false);
    }
    return () => clearInterval(timer);
  }, [showQrModal, timeLeft]);

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button variant="ghost" className="rounded-xl font-bold bg-white/50 hover:bg-white shadow-sm">
              <ArrowLeft className="w-4 h-4 mr-2" /> Exit
            </Button>
          </Link>
          <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-2xl border-2 border-primary/20 shadow-lg">
            <Trophy className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-muted-foreground leading-none tracking-widest">High Score</span>
              <span className="font-black text-lg text-primary leading-none">{highScore}</span>
            </div>
          </div>
        </div>

        <div 
          ref={gameAreaRef}
          className={`relative aspect-[3/4] bg-white rounded-[3rem] border-8 border-white overflow-hidden cursor-none shadow-2xl transition-all duration-300 ${lastCatch ? 'ring-8 ring-green-400/30 ring-offset-0' : 'ring-0'}`}
          onMouseMove={handleMouseMove}
          onTouchMove={handleMouseMove}
        >
          {gameState === "start" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/80 to-accent/80 p-8 text-center text-white backdrop-blur-[2px]">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl mb-8 animate-bounce">
                 <Gamepad2 className="w-20 h-20 text-primary" />
              </div>
              <h1 className="text-5xl font-black mb-4 tracking-tighter drop-shadow-lg uppercase">Momo Catch</h1>
              <p className="text-white/90 font-bold mb-10 max-w-[280px] text-lg leading-tight">
                Catch food to earn coins! Use coins to get special rewards.
              </p>
              <Button onClick={startGame} className="bg-white text-primary hover:bg-white/90 rounded-3xl px-16 py-10 text-2xl font-black shadow-2xl transition-all hover:scale-110 active:scale-95 border-b-8 border-primary/20">
                <Play className="w-8 h-8 mr-3 fill-current" /> PLAY
              </Button>
            </div>
          )}

          {gameState === "playing" && (
            <>
              <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
                <div className="bg-white/90 backdrop-blur-md px-8 py-3 rounded-full border-2 border-primary/20 shadow-xl flex items-center gap-3">
                  <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                  <span className="text-4xl font-black text-primary tabular-nums">{score}</span>
                </div>
              </div>

              <div className="absolute top-10 left-8 flex gap-3 z-10">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Heart key={i} className={`w-8 h-8 transition-all duration-300 ${i < lives ? "text-destructive fill-destructive scale-110 drop-shadow-md" : "text-gray-300 fill-gray-100 scale-90"}`} />
                ))}
              </div>

              {items.map((item) => (
                <div
                  key={item.id}
                  className="absolute text-5xl transition-all duration-75 drop-shadow-lg filter"
                  style={{ left: `${item.x}%`, top: `${item.y}%`, transform: 'translateX(-50%)' }}
                >
                  {item.char}
                </div>
              ))}

              <div 
                className={`absolute bottom-12 h-20 w-32 flex items-center justify-center transition-all duration-75 ${lastCatch ? 'scale-125' : 'scale-100'}`}
                style={{ left: `${playerX}%`, transform: 'translateX(-50%)' }}
              >
                <div className="relative w-full h-full">
                  <div className="absolute inset-x-0 bottom-0 h-4 bg-black/10 rounded-full blur-md" />
                  <div className="absolute inset-0 bg-gradient-to-b from-white to-gray-200 rounded-full shadow-2xl border-b-4 border-gray-400" />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-5xl">🍽️</div>
                </div>
              </div>
            </>
          )}

          {gameState === "gameover" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary to-accent p-8 text-white text-center">
              <div className="bg-white/20 p-6 rounded-full mb-6 animate-pulse">
                <Trophy className="w-16 h-16 text-yellow-300 fill-yellow-300" />
              </div>
              <h2 className="text-5xl font-black mb-2 tracking-tighter drop-shadow-xl italic">WELL DONE!</h2>
              <p className="text-xl font-black opacity-90 mb-8 uppercase tracking-widest">Kitchen Closed!</p>
              
              <div className="bg-white p-6 rounded-[2.5rem] w-full max-w-[300px] mb-6 shadow-2xl text-primary">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-black uppercase text-xs tracking-widest opacity-60">Total Coins</span>
                  <span className="text-5xl font-black">{score}</span>
                </div>
                <Button 
                  onClick={() => {
                    setTimeLeft(300);
                    setShowQrModal(true);
                  }}
                  className="w-full h-14 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-black flex items-center justify-center gap-2 shadow-lg"
                >
                  <QrCode className="w-5 h-5" /> Pay Merchant
                </Button>
              </div>

              <Button onClick={startGame} className="bg-white text-primary hover:bg-white/90 rounded-3xl w-full py-8 text-xl font-black shadow-2xl transition-all">
                <RotateCcw className="w-6 h-6 mr-3" /> PLAY AGAIN
              </Button>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-white/80 backdrop-blur-md rounded-[2.5rem] p-6 border-2 border-primary/10 shadow-xl">
           <div className="grid grid-cols-2 gap-4">
             <div className="bg-primary/5 p-4 rounded-3xl border border-primary/10 flex flex-col items-center text-center">
               <Zap className="w-6 h-6 text-primary mb-2" />
               <h4 className="font-black text-[10px] uppercase tracking-widest text-primary">Power Up</h4>
               <p className="text-[10px] font-bold text-muted-foreground leading-tight mt-1">Speed increases as you earn more coins!</p>
             </div>
             <div className="bg-accent/5 p-4 rounded-3xl border border-accent/10 flex flex-col items-center text-center">
               <QrCode className="w-6 h-6 text-accent mb-2" />
               <h4 className="font-black text-[10px] uppercase tracking-widest text-accent">Game Deal</h4>
               <p className="text-[10px] font-bold text-muted-foreground leading-tight mt-1">Pay ₹100 to merchant for "Gamer's Meal"!</p>
             </div>
           </div>
        </div>
      </main>

      {/* QR Modal for Game Zone */}
      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="sm:max-w-[420px] rounded-[2.5rem] p-8 overflow-hidden">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-3xl font-black text-center">Scan to Pay</DialogTitle>
            <DialogDescription className="text-center font-bold text-muted-foreground">
              Merchant: <span className="text-primary">{MERCHANT_NAME}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-2 rounded-full font-black text-sm animate-pulse">
              <Timer className="w-4 h-4" />
              <span>Expires in: {formatTime(timeLeft)}</span>
            </div>

            <div className="relative w-64 h-64 bg-white p-4 rounded-3xl shadow-2xl border-4 border-primary/10">
              <Image 
                src={qrCodeUrl} 
                alt="UPI Payment QR" 
                fill 
                className="object-contain p-2"
                unoptimized
              />
            </div>
            
            <div className="text-center space-y-1">
              <p className="text-4xl font-black text-primary">₹100.00</p>
              <div className="flex items-center justify-center gap-2 bg-muted/50 px-4 py-1.5 rounded-full">
                <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-[10px] font-black text-muted-foreground tracking-widest uppercase">{MERCHANT_UPI_ID}</p>
              </div>
            </div>

            <div className="w-full pt-2">
              <Button 
                className="w-full py-7 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 transition-all"
                onClick={() => setShowQrModal(false)}
              >
                Close Payment Screen
              </Button>
            </div>
            <p className="text-[9px] text-muted-foreground text-center font-bold uppercase tracking-[0.2em]">
              Scan using any UPI App (PhonePe, GPay)
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
