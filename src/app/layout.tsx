
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import Link from "next/link";
import { Gamepad2, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: 'zomatokarbi.com | Fresh Food Delivered',
  description: 'Your favorite local food discovery and delivery app in Karbi Anglong.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background">
        <FirebaseClientProvider>
          <div className="min-h-screen flex flex-col relative">
            {children}
            
            {/* Floating Game Zone Triggers */}
            <div className="fixed bottom-24 right-6 z-40 md:bottom-10 flex flex-col gap-4 items-end">
              <Link 
                href="/wingo" 
                className="group flex items-center gap-3 bg-primary border-2 border-white/20 p-2 pr-6 rounded-full shadow-2xl hover:scale-110 transition-all active:scale-95 cursor-pointer"
              >
                <div className="bg-white p-3 rounded-full shadow-lg group-hover:rotate-12 transition-transform">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-white leading-none tracking-widest">Prediction</span>
                  <span className="text-sm font-black text-white">Wingo 1M</span>
                </div>
              </Link>

              <Link 
                href="/game-zone" 
                className="group flex items-center gap-3 bg-white border-2 border-primary/20 p-2 pr-6 rounded-full shadow-2xl hover:scale-110 transition-all active:scale-95 cursor-pointer"
              >
                <div className="bg-primary p-3 rounded-full shadow-lg group-hover:rotate-12 transition-transform">
                  <Gamepad2 className="w-6 h-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-primary leading-none tracking-widest">Mini Game</span>
                  <span className="text-sm font-black text-foreground">Game Zone</span>
                </div>
              </Link>
            </div>
          </div>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
