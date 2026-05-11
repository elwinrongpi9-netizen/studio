"use client";

import { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Trophy, Play, RotateCcw, Utensils, Zap, Heart, ArrowLeft, Gamepad2, Star, Sparkles } from "lucide-react";
import Link from "next/link";

const FOOD_ITEMS = ["🥟", "🍕", "🍔", "🍣", "🍛", "🍩", "🍦"];
const COLORS = ["bg-primary", "bg-accent", "bg-orange-500", "bg-green-500", "bg-yellow-500"];

export default function GameZonePage() {
  const [gameState, setGameState] = useState<"start" | "playing" | "gameover">("start");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [items, setItems] = useState<{ id: number; x: number; y: number; char: string; color: string }[]>([]);
  const [playerX, setPlayerX] = useState(50);
  const [lives, setLives] = useState(3);
  const [lastCatch, setLastCatch] = useState(false);
  const gameAreaRef = useRef<HTMLDivElement>(null);

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
              // Catch logic
              if (item.y > 85 && item.y < 95 && Math.abs(item.x - playerX) < 12) {
                setScore((s) => s + 10);
                setLastCatch(true);
                setTimeout(() => setLastCatch(false), 200);
                return false;
              }
              // Miss logic
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
            <Button variant="ghost" className="rounded-xl font-bold bg-white/50 hover:bg-white shadow-sm">
              <ArrowLeft className="w-4 h-4 mr-2" /> Exit Game
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
          {/* Animated Background Gradients */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_var(--tw-gradient-from)_0%,_transparent_50%)] from-primary/30" />
            <div className="grid grid-cols-6 gap-8 p-4">
              {Array.from({ length: 24 }).map((_, i) => (
                <Utensils key={i} className={`w-8 h-8 rotate-12 ${i % 2 === 0 ? 'text-primary' : 'text-accent'}`} />
              ))}
            </div>
          </div>

          {gameState === "start" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/80 to-accent/80 p-8 text-center text-white backdrop-blur-[2px]">
              <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl mb-8 animate-bounce">
                 <Gamepad2 className="w-20 h-20 text-primary" />
              </div>
              <h1 className="text-5xl font-black mb-4 tracking-tighter drop-shadow-lg">MOMO CATCH</h1>
              <p className="text-white/90 font-bold mb-10 max-w-[280px] text-lg leading-tight">
                Move the plate and catch as much food as you can to win big! 
              </p>
              <Button onClick={startGame} className="bg-white text-primary hover:bg-white/90 rounded-3xl px-16 py-10 text-2xl font-black shadow-2xl transition-all hover:scale-110 active:scale-95 border-b-8 border-primary/20">
                <Play className="w-8 h-8 mr-3 fill-current" /> PLAY NOW
              </Button>
            </div>
          )}

          {gameState === "playing" && (
            <>
              {/* Score HUD */}
              <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
                <div className="bg-white/90 backdrop-blur-md px-8 py-3 rounded-full border-2 border-primary/20 shadow-xl">
                  <span className="text-4xl font-black text-primary tabular-nums">{score}</span>
                </div>
              </div>

              {/* Lives HUD */}
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

              {/* Player / Plate */}
              <div 
                className={`absolute bottom-12 h-20 w-32 flex items-center justify-center transition-all duration-75 ${lastCatch ? 'scale-125' : 'scale-100'}`}
                style={{ left: `${playerX}%`, transform: 'translateX(-50%)' }}
              >
                <div className="relative w-full h-full">
                  <div className="absolute inset-x-0 bottom-0 h-4 bg-black/10 rounded-full blur-md" />
                  <div className="absolute inset-0 bg-gradient-to-b from-white to-gray-200 rounded-full shadow-2xl border-b-4 border-gray-400" />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-5xl animate-pulse">🍽️</div>
                  {lastCatch && (
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-2xl animate-ping text-green-500 font-black">+10</div>
                  )}
                </div>
              </div>
            </>
          )}

          {gameState === "gameover" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-red-600 to-orange-600 p-8 text-white text-center">
              <div className="bg-white/20 p-6 rounded-full mb-6 animate-pulse">
                <Zap className="w-16 h-16 text-yellow-300 fill-yellow-300" />
              </div>
              <h2 className="text-6xl font-black mb-2 tracking-tighter drop-shadow-xl italic">Ouch!</h2>
              <p className="text-2xl font-black opacity-90 mb-8 uppercase tracking-widest">Kitchen Closed!</p>
              
              <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-[300px] mb-10 shadow-2xl text-primary">
                <div className="flex justify-between items-center mb-6">
                  <span className="font-black uppercase text-xs tracking-widest opacity-60">Final Score</span>
                  <span className="text-5xl font-black">{score}</span>
                </div>
                <div className="flex justify-between items-center text-accent">
                  <span className="font-black uppercase text-xs tracking-widest opacity-80 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" /> High Score
                  </span>
                  <span className="text-2xl font-black">{highScore}</span>
                </div>
              </div>

              <Button onClick={startGame} className="bg-white text-red-600 hover:bg-white/90 rounded-3xl w-full py-10 text-2xl font-black shadow-2xl transition-all hover:scale-105 active:scale-95">
                <RotateCcw className="w-8 h-8 mr-3" /> TRY AGAIN
              </Button>
              
              <p className="mt-8 text-sm font-bold opacity-80 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Next time you'll catch 'em all!
              </p>
            </div>
          )}
        </div>

        <div className="mt-12 bg-white/50 backdrop-blur-md rounded-[2.5rem] p-8 border-2 border-primary/10 shadow-xl">
           <h3 className="font-black text-sm uppercase tracking-[0.2em] text-primary mb-6 text-center">Master Class Instructions</h3>
           <div className="grid grid-cols-3 gap-6 text-[10px] font-black uppercase text-center">
             <div className="flex flex-col items-center gap-3 group">
               <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center border-2 border-primary/10 shadow-lg group-hover:scale-110 group-hover:bg-primary/5 transition-all">
                  <span className="text-2xl">👉</span>
               </div>
               <span className="text-muted-foreground">Slide to Move</span>
             </div>
             <div className="flex flex-col items-center gap-3 group">
               <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center border-2 border-primary/10 shadow-lg group-hover:scale-110 group-hover:bg-green-50 transition-all">
                  <span className="text-2xl">🥟</span>
               </div>
               <span className="text-muted-foreground">Catch Food</span>
             </div>
             <div className="flex flex-col items-center gap-3 group">
               <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center border-2 border-primary/10 shadow-lg group-hover:scale-110 group-hover:bg-red-50 transition-all">
                  <span className="text-2xl">💔</span>
               </div>
               <span className="text-muted-foreground">3 Lives Only</span>
             </div>
           </div>
        </div>
      </main>
    </div>
  );
}
