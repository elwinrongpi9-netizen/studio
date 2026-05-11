"use client";

import { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Trophy, Play, RotateCcw, Utensils, Zap, Heart, ArrowLeft, Gamepad2 } from "lucide-react";
import Link from "next/link";

const FOOD_ITEMS = ["🥟", "🍕", "🍔", "🍣", "🍛"];

export default function GameZonePage() {
  const [gameState, setGameState] = useState<"start" | "playing" | "gameover">("start");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [items, setItems] = useState<{ id: number; x: number; y: number; char: string }[]>([]);
  const [playerX, setPlayerX] = useState(50);
  const [lives, setLives] = useState(3);
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
          },
        ]);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState === "playing") {
      const gameLoop = setInterval(() => {
        setItems((prev) => {
          const newItems = prev
            .map((item) => ({ ...item, y: item.y + 1.5 }))
            .filter((item) => {
              // Catch logic
              if (item.y > 85 && item.y < 95 && Math.abs(item.x - playerX) < 10) {
                setScore((s) => s + 10);
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
  }, [gameState, playerX]);

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
    <>
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button variant="ghost" className="rounded-xl font-bold">
              <ArrowLeft className="w-4 h-4 mr-2" /> Exit Game
            </Button>
          </Link>
          <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-2xl border border-primary/20">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="font-black text-sm">Best: {highScore}</span>
          </div>
        </div>

        <div 
          ref={gameAreaRef}
          className="relative aspect-[3/4] bg-white rounded-[2.5rem] border-4 border-muted overflow-hidden cursor-none shadow-2xl group select-none"
          onMouseMove={handleMouseMove}
          onTouchMove={handleMouseMove}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="grid grid-cols-6 gap-8 p-4">
              {Array.from({ length: 24 }).map((_, i) => (
                <Utensils key={i} className="w-8 h-8 rotate-12" />
              ))}
            </div>
          </div>

          {gameState === "start" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-primary/5 p-8 text-center">
              <div className="bg-white p-6 rounded-[2rem] shadow-xl border-2 mb-8">
                 <Gamepad2 className="w-16 h-16 text-primary animate-bounce mx-auto" />
              </div>
              <h1 className="text-4xl font-black mb-4 tracking-tighter">Momo Catch</h1>
              <p className="text-muted-foreground font-medium mb-10 max-w-[250px]">
                Move the plate and catch as much food as you can! 
              </p>
              <Button onClick={startGame} className="rounded-2xl px-12 py-8 text-xl font-black shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
                <Play className="w-6 h-6 mr-2 fill-current" /> Play Now
              </Button>
            </div>
          )}

          {gameState === "playing" && (
            <>
              <div className="absolute top-6 left-6 flex gap-2">
                {Array.from({ length: lives }).map((_, i) => (
                  <Heart key={i} className="w-6 h-6 text-destructive fill-destructive" />
                ))}
              </div>
              <div className="absolute top-6 right-6 font-black text-3xl text-primary">
                {score}
              </div>

              {items.map((item) => (
                <div
                  key={item.id}
                  className="absolute text-4xl transition-all duration-100"
                  style={{ left: `${item.x}%`, top: `${item.y}%`, transform: 'translateX(-50%)' }}
                >
                  {item.char}
                </div>
              ))}

              <div 
                className="absolute bottom-10 h-16 w-24 flex items-center justify-center transition-all duration-75"
                style={{ left: `${playerX}%`, transform: 'translateX(-50%)' }}
              >
                <div className="relative w-full h-full">
                  <div className="absolute inset-0 bg-primary rounded-full shadow-lg border-b-4 border-primary-foreground/30" />
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-3xl">🍽️</div>
                </div>
              </div>
            </>
          )}

          {gameState === "gameover" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-8 text-white">
              <Zap className="w-16 h-16 text-accent mb-4 animate-pulse" />
              <h2 className="text-5xl font-black mb-2 tracking-tighter">Oh No!</h2>
              <p className="text-xl font-bold opacity-80 mb-8">Game Over</p>
              
              <div className="bg-white/10 p-8 rounded-3xl border border-white/10 w-full max-w-[280px] mb-10">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold opacity-60">Score</span>
                  <span className="text-3xl font-black">{score}</span>
                </div>
                <div className="flex justify-between items-center text-accent">
                  <span className="font-bold">High Score</span>
                  <span className="text-xl font-black">{highScore}</span>
                </div>
              </div>

              <Button onClick={startGame} className="rounded-2xl w-full py-8 text-xl font-black shadow-2xl shadow-primary/30">
                <RotateCcw className="w-6 h-6 mr-2" /> Try Again
              </Button>
            </div>
          )}
        </div>

        <div className="mt-12 bg-muted/30 rounded-3xl p-6 border border-dashed text-center">
           <h3 className="font-black text-sm uppercase tracking-widest text-muted-foreground mb-4">How to Play</h3>
           <div className="flex justify-around gap-4 text-xs font-bold">
             <div className="flex flex-col items-center gap-2">
               <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border shadow-sm">🖱️</div>
               <span>Move Mouse/Finger</span>
             </div>
             <div className="flex flex-col items-center gap-2">
               <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border shadow-sm">🥟</div>
               <span>Catch Food</span>
             </div>
             <div className="flex flex-col items-center gap-2">
               <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border shadow-sm">❤️</div>
               <span>Don't Miss</span>
             </div>
           </div>
        </div>
      </main>
    </>
  );
}
