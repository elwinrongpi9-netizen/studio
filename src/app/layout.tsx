import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import Link from "next/link";
import { Gamepad2 } from "lucide-react";

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
            
            {/* Floating Game Zone Trigger */}
            <Link 
              href="/game-zone" 
              className="fixed bottom-24 right-6 z-40 md:bottom-10"
            >
              <div className="group flex items-center gap-3 bg-white border-2 border-primary/20 p-2 pr-6 rounded-full shadow-2xl hover:scale-110 transition-all active:scale-95 cursor-pointer">
                <div className="bg-primary p-3 rounded-full shadow-lg group-hover:rotate-12 transition-transform">
                  <Gamepad2 className="w-6 h-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-primary leading-none tracking-widest">Mini Game</span>
                  <span className="text-sm font-black text-foreground">Game Zone</span>
                </div>
              </div>
            </Link>
          </div>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
