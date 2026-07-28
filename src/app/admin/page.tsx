
"use client";

import { Navbar } from "@/components/navbar";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, doc, updateDoc, query, orderBy, setDoc, limit, addDoc, onSnapshot } from "firebase/firestore";
import { useMemo, useState, useEffect, useRef } from "react";
import { Restaurant, WithdrawalRequest, Dish } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ShieldCheck, 
  Edit2, 
  Loader2, 
  Save, 
  X, 
  Zap, 
  Banknote, 
  User, 
  Copy, 
  ShieldAlert, 
  TrendingUp, 
  Info, 
  CreditCard, 
  Plus, 
  Utensils,
  Volume2,
  VolumeX,
  BellRing,
  ShoppingBag,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const ADMIN_EMAIL = "junakipi@gmail.com";
const RINGTONE_URL = "https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3"; 

export default function AdminPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastOrderIdRef = useRef<string | null>(null);

  const restaurantsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "restaurants"), orderBy("name"));
  }, [firestore]);

  const withdrawalsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "withdrawalRequests"), orderBy("createdAt", "desc"));
  }, [firestore]);

  const phonepeOrdersQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "phonepe_orders"), orderBy("createdAt", "desc"), limit(100));
  }, [firestore]);

  const { data: restaurants, loading: resLoading } = useCollection<Restaurant>(restaurantsQuery);
  const { data: withdrawals, loading: withdrawLoading } = useCollection<WithdrawalRequest>(withdrawalsQuery);
  const { data: phonepeOrders, loading: ordersLoading } = useCollection<any>(phonepeOrdersQuery);
  
  useEffect(() => {
    if (!firestore || !user || user.email !== ADMIN_EMAIL) return;

    const q = query(collection(firestore, "phonepe_orders"), orderBy("createdAt", "desc"), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const latestOrder = snapshot.docs[0];
        const orderId = latestOrder.id;

        if (lastOrderIdRef.current === null) {
          lastOrderIdRef.current = orderId;
          return;
        }

        if (orderId !== lastOrderIdRef.current) {
          lastOrderIdRef.current = orderId;
          if (isAudioEnabled) {
            triggerRingtone();
          }
        }
      }
    });

    return () => unsubscribe();
  }, [firestore, user, isAudioEnabled]);

  const triggerRingtone = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.warn("Audio play blocked", e));
      setIsRinging(true);
      setTimeout(() => setIsRinging(false), 8000); 
    }
    toast({
      title: "NEW ORDER RECEIVED! 🔔",
      description: "A customer just placed an order. Check the logs.",
      variant: "default",
    });
  };

  const toggleAudio = () => {
    if (!isAudioEnabled) {
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current?.pause();
          setIsAudioEnabled(true);
          toast({ title: "Audio Notifications Active 🔊" });
        }).catch(() => {
          toast({ title: "Interaction required for audio", variant: "destructive" });
        });
      }
    } else {
      setIsAudioEnabled(false);
      toast({ title: "Audio Notifications Muted 🔇" });
    }
  };

  const [selectedResId, setSelectedResId] = useState("");
  const [newDish, setNewDish] = useState<Partial<Dish>>({
    name: "",
    description: "",
    price: 0,
    category: "Starters",
    image: "https://picsum.photos/seed/newdish/400/300"
  });

  const [wingoPeriod, setWingoPeriod] = useState("");
  const [wingoNumber, setWingoNumber] = useState("");
  const [isWingoLoading, setIsWingoLoading] = useState(false);

  if (userLoading || resLoading || withdrawLoading || ordersLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="font-bold text-muted-foreground uppercase text-[10px] tracking-widest text-white">Loading Master Logs...</p>
        </div>
      </div>
    );
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 container mx-auto px-4 py-20 text-center">
          <ShieldAlert className="w-20 h-20 text-destructive mx-auto mb-6" />
          <h1 className="text-4xl font-black mb-4 uppercase italic tracking-tighter text-white">Access Denied</h1>
          <Button onClick={() => router.push("/")} className="rounded-2xl px-12 h-14 font-black">Return Home</Button>
        </div>
      </div>
    );
  }

  const handleAddDish = async () => {
    if (!firestore || !selectedResId || !newDish.name) {
      toast({ title: "Select restaurant & name", variant: "destructive" });
      return;
    }

    const res = restaurants.find(r => r.id === selectedResId);
    if (!res) return;

    const dishToAdd = { ...newDish, id: `dish_${Date.now()}` } as Dish;
    const updatedDishes = [...(res.dishes || []), dishToAdd];

    try {
      await updateDoc(doc(firestore, "restaurants", selectedResId), {
        dishes: updatedDishes
      });
      toast({ title: "Item Added Successfully! 🎉" });
      setNewDish({ name: "", description: "", price: 0, category: "Starters", image: "https://picsum.photos/seed/newdish/400/300" });
    } catch (e) {
      toast({ title: "Failed to add item", variant: "destructive" });
    }
  };

  const handleSetWingoResult = async () => {
    if (!firestore || !wingoPeriod || wingoNumber === "") return;
    const num = parseInt(wingoNumber);
    if (isNaN(num) || num < 0 || num > 9) {
      toast({ title: "Invalid Number", variant: "destructive" });
      return;
    }
    setIsWingoLoading(true);
    setDoc(doc(firestore, "wingoConfig", wingoPeriod), {
      periodId: wingoPeriod,
      number: num,
      updatedAt: new Date().toISOString()
    })
    .then(() => {
      toast({ title: "Manual Result Set!" });
      setWingoPeriod("");
      setWingoNumber("");
    })
    .finally(() => setIsWingoLoading(false));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <Navbar />
      
      <audio ref={audioRef} src={RINGTONE_URL} preload="auto" />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-5xl font-black italic tracking-tighter flex items-center gap-4 text-white">
              <ShieldCheck className="w-12 h-12 text-primary" />
              Admin Master Control
            </h1>
            <div className="flex items-center gap-3 mt-4">
              <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">PhonePe Order Dashboard</p>
              <div className="h-1 w-1 bg-muted-foreground rounded-full" />
              <button 
                onClick={toggleAudio}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                  isAudioEnabled ? 'bg-green-600 text-white shadow-lg shadow-green-500/20' : 'bg-muted text-muted-foreground'
                }`}
              >
                {isAudioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                {isAudioEnabled ? "Ringtone Active" : "Ringtone Off"}
              </button>
            </div>
          </div>
          
          {isRinging && (
            <div className="bg-primary/20 border-2 border-primary p-6 rounded-[2rem] flex items-center gap-5 animate-pulse shadow-2xl shadow-primary/20">
              <BellRing className="w-10 h-10 text-primary animate-bounce" />
              <div className="flex flex-col">
                <span className="font-black text-sm uppercase text-primary">NEW ORDER!</span>
                <span className="text-[10px] font-bold text-white/60">Phone is Ringing...</span>
              </div>
            </div>
          )}
        </div>

        <Tabs defaultValue="payments" className="space-y-8">
          <TabsList className="bg-card p-1.5 rounded-[1.5rem] h-16 w-full md:w-auto shadow-sm border border-border/50 overflow-x-auto no-scrollbar">
            <TabsTrigger value="payments" className="rounded-xl font-black px-8 h-12 flex gap-2 data-[state=active]:bg-primary">
              <ShoppingBag className="w-4 h-4" /> User Orders
            </TabsTrigger>
            <TabsTrigger value="menu" className="rounded-xl font-black px-8 h-12 flex gap-2 data-[state=active]:bg-primary">
              <Utensils className="w-4 h-4" /> Menu Manager
            </TabsTrigger>
            <TabsTrigger value="wingo" className="rounded-xl font-black px-8 h-12 flex gap-2 data-[state=active]:bg-primary">
              <Zap className="w-4 h-4" /> Wingo Terminal
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="rounded-xl font-black px-8 h-12 data-[state=active]:bg-primary">Withdrawals</TabsTrigger>
          </TabsList>

          <TabsContent value="payments">
            <Card className="rounded-[2.5rem] border-border/50 shadow-2xl bg-card overflow-hidden">
              <div className="p-8 border-b border-border/50 flex justify-between items-center">
                 <h3 className="font-black text-xl uppercase tracking-widest flex items-center gap-3">
                   <TrendingUp className="w-6 h-6 text-primary" />
                   Recent User Transactions
                 </h3>
                 <Badge variant="outline" className="rounded-full px-4 border-primary/20 text-primary font-black">
                   {phonepeOrders.length} Orders Logged
                 </Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-muted/50 border-b border-border/50">
                    <tr>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">Order ID</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">Customer</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">Items Ordered</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">Amount</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">State</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phonepeOrders.map((order) => (
                      <tr key={order.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="p-6 font-mono font-bold text-xs text-primary">{order.order_id}</td>
                        <td className="p-6">
                           <div className="flex flex-col">
                             <span className="font-black text-sm">{order.udf1}</span>
                             <span className="text-[10px] text-muted-foreground font-bold">{order.udf2}</span>
                           </div>
                        </td>
                        <td className="p-6">
                           <div className="flex flex-wrap gap-2 max-w-xs">
                             {order.items?.map((item: any, idx: number) => (
                               <span key={idx} className="bg-muted px-2 py-1 rounded-lg text-[10px] font-black border border-border/50">
                                 {item.quantity}x {item.name}
                               </span>
                             )) || <span className="text-muted-foreground italic text-xs">No items listed</span>}
                           </div>
                        </td>
                        <td className="p-6">
                          <span className="font-black text-primary text-xl tracking-tighter italic">₹{order.amount}</span>
                        </td>
                        <td className="p-6">
                          <Badge className={`rounded-full px-4 py-1 text-[9px] font-black uppercase tracking-widest shadow-sm ${
                            order.state === 'COMPLETED' ? 'bg-green-600' : 'bg-orange-500'
                          }`}>
                            {order.state}
                          </Badge>
                        </td>
                        <td className="p-6">
                           <div className="flex items-center gap-2 text-muted-foreground">
                             <Clock className="w-3 h-3" />
                             <span className="text-[10px] font-black uppercase tracking-widest">
                               {new Date(order.createdAt).toLocaleDateString()}
                             </span>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Other Tabs content remains the same but improved visually */}
          <TabsContent value="menu">
            <Card className="rounded-[3rem] bg-card p-10 shadow-2xl border border-border/50">
              <h2 className="text-3xl font-black italic mb-8 flex items-center gap-3 uppercase tracking-tighter">
                <Plus className="w-8 h-8 text-primary" /> Add New Item to Menu
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Restaurant</Label>
                    <select 
                      value={selectedResId} 
                      onChange={(e) => setSelectedResId(e.target.value)}
                      className="w-full h-14 rounded-2xl bg-[#0a0a0a] border-2 border-border/50 px-4 font-black"
                    >
                      <option value="">Choose Restaurant</option>
                      {restaurants.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Item Name</Label>
                    <Input 
                      placeholder="e.g. Chilli Chicken" 
                      value={newDish.name}
                      onChange={e => setNewDish({...newDish, name: e.target.value})}
                      className="h-14 rounded-2xl font-black bg-[#0a0a0a]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Price (Coins/₹)</Label>
                    <Input 
                      type="number" 
                      value={newDish.price}
                      onChange={e => setNewDish({...newDish, price: parseFloat(e.target.value) || 0})}
                      className="h-14 rounded-2xl font-black bg-[#0a0a0a]"
                    />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Category</Label>
                    <Input 
                      placeholder="e.g. Starters" 
                      value={newDish.category}
                      onChange={e => setNewDish({...newDish, category: e.target.value})}
                      className="h-14 rounded-2xl font-black bg-[#0a0a0a]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Image URL</Label>
                    <Input 
                      placeholder="https://..." 
                      value={newDish.image}
                      onChange={e => setNewDish({...newDish, image: e.target.value})}
                      className="h-14 rounded-2xl font-black bg-[#0a0a0a]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Description</Label>
                    <Input 
                      placeholder="Ingredients or details" 
                      value={newDish.description}
                      onChange={e => setNewDish({...newDish, description: e.target.value})}
                      className="h-14 rounded-2xl font-black bg-[#0a0a0a]"
                    />
                  </div>
                </div>
              </div>
              <Button onClick={handleAddDish} className="w-full h-18 rounded-2xl font-black text-xl mt-10 shadow-2xl bg-primary hover:bg-primary/90">
                Update Master Menu
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="wingo">
            <Card className="border-border/50 bg-card rounded-[4rem] p-12 shadow-2xl max-w-2xl mx-auto">
              <div className="flex flex-col items-center text-center space-y-4 mb-10">
                <div className="p-4 bg-primary/10 rounded-3xl">
                  <Zap className="w-12 h-12 text-primary" />
                </div>
                <h2 className="text-4xl font-black italic tracking-tighter uppercase">Wingo Manual Override</h2>
              </div>
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase ml-2 tracking-widest">Period ID</Label>
                    <Input 
                      placeholder="e.g. 202403151230" 
                      value={wingoPeriod} 
                      onChange={e => setWingoPeriod(e.target.value)}
                      className="h-14 rounded-2xl font-black bg-[#0a0a0a] border-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase ml-2 tracking-widest">Winning Number (0-9)</Label>
                    <Input 
                      type="number" 
                      value={wingoNumber} 
                      onChange={e => setWingoNumber(e.target.value)}
                      className="h-14 rounded-2xl font-black bg-[#0a0a0a] border-2"
                    />
                  </div>
                </div>
                <Button onClick={handleSetWingoResult} className="w-full h-20 rounded-2xl font-black text-xl py-8 shadow-xl" disabled={isWingoLoading}>
                  {isWingoLoading ? <Loader2 className="animate-spin" /> : "Fix Next Result"}
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="withdrawals">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {withdrawals.map((req) => (
                <Card key={req.id} className="rounded-[3rem] border-border/50 bg-card p-10 shadow-lg relative overflow-hidden group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="p-5 bg-orange-100/10 text-orange-600 rounded-3xl">
                        <Banknote className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-black text-4xl tracking-tighter italic">₹{req.amount}</h3>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{req.userEmail}</p>
                        <div className="bg-[#0a0a0a] px-3 py-1.5 rounded-xl flex items-center gap-3 border border-border/50 cursor-pointer mt-2" onClick={() => { navigator.clipboard.writeText(req.upiId); toast({title:"UPI Copied!"}); }}>
                          <span className="font-mono font-bold text-[10px] text-white/60">{req.upiId}</span>
                          <Copy className="w-3 h-3 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-orange-600 rounded-full px-4 py-1.5 uppercase font-black text-[9px] tracking-widest">{req.status}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

