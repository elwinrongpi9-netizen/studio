
"use client";

import { Navbar } from "@/components/navbar";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, doc, updateDoc, query, orderBy, setDoc, limit, onSnapshot } from "firebase/firestore";
import { useMemo, useState, useEffect, useRef, Suspense } from "react";
import { Restaurant, WithdrawalRequest, Dish } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ShieldCheck, 
  Zap, 
  Banknote, 
  Copy, 
  ShieldAlert, 
  TrendingUp, 
  Utensils,
  Volume2,
  VolumeX,
  BellRing,
  ShoppingBag,
  CheckCircle2,
  Truck,
  Package,
  Plus,
  Flame,
  Save,
  Settings2,
  Trash2,
  Edit3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const ADMIN_EMAIL = "junakipi@gmail.com";
const RINGTONE_URL = "https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3"; 

function AdminDashboardContent() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const paramResId = searchParams.get("resId");

  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastOrderIdRef = useRef<string | null>(null);

  const [selectedResId, setSelectedResId] = useState(paramResId || "");
  const [newDish, setNewDish] = useState<Partial<Dish>>({
    name: "",
    description: "",
    price: 0,
    category: "Starters",
    image: "https://picsum.photos/seed/newdish/400/300"
  });

  const [wingoPeriod, setWingoPeriod] = useState("");
  const [wingoNumber, setWingoNumber] = useState("");

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

  const { data: restaurants } = useCollection<Restaurant>(restaurantsQuery);
  const { data: withdrawals } = useCollection<WithdrawalRequest>(withdrawalsQuery);
  const { data: phonepeOrders } = useCollection<any>(phonepeOrdersQuery);
  
  const selectedRestaurant = useMemo(() => {
    return restaurants?.find(r => r.id === selectedResId);
  }, [restaurants, selectedResId]);

  useEffect(() => {
    if (paramResId) {
      setSelectedResId(paramResId);
    }
  }, [paramResId]);

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
      description: "Check the logs for details.",
    });
  };

  const toggleAudio = () => {
    if (!isAudioEnabled) {
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current?.pause();
          setIsAudioEnabled(true);
          toast({ title: "Audio Active" });
        }).catch(() => {
          toast({ title: "Please interact with the page first", variant: "destructive" });
        });
      }
    } else {
      setIsAudioEnabled(false);
      toast({ title: "Audio Muted" });
    }
  };

  const updateOrderStatus = async (order: any, newStatus: string) => {
    if (!firestore) return;
    const orderId = order.order_id || order.id;
    const userId = order.userId;

    const globalRef = doc(firestore, "phonepe_orders", orderId);
    updateDoc(globalRef, { status: newStatus });

    if (userId) {
      const userOrderRef = doc(firestore, "users", userId, "orders", orderId);
      updateDoc(userOrderRef, { status: newStatus });
    }

    toast({ title: `Order ${newStatus}` });
  };

  const handleAddDish = async () => {
    if (!firestore || !selectedResId || !newDish.name || !newDish.image) {
      toast({ title: "Details or Image missing", variant: "destructive" });
      return;
    }

    const res = restaurants?.find(r => r.id === selectedResId);
    if (!res) return;

    const dishToAdd = { 
      ...newDish, 
      id: `dish_${Date.now()}`,
      description: newDish.description || "",
      price: newDish.price || 0
    } as Dish;
    
    const updatedDishes = [...(res.dishes || []), dishToAdd];

    updateDoc(doc(firestore, "restaurants", selectedResId), {
      dishes: updatedDishes
    });
    
    toast({ title: "Item Added! 🎉" });
    setNewDish({ name: "", description: "", price: 0, category: "Starters", image: "https://picsum.photos/seed/newdish/400/300" });
  };

  const handleUpdateDishFull = async (dishId: string, updatedData: Partial<Dish>) => {
    if (!firestore || !selectedResId || !selectedRestaurant) return;

    const updatedDishes = (selectedRestaurant.dishes || []).map(d => 
      d.id === dishId ? { ...d, ...updatedData } : d
    );

    updateDoc(doc(firestore, "restaurants", selectedResId), {
      dishes: updatedDishes
    });
    toast({ title: "Item Updated Successfully! ✨" });
  };

  const handleDeleteDish = async (dishId: string) => {
    if (!firestore || !selectedResId || !selectedRestaurant) return;

    const updatedDishes = (selectedRestaurant.dishes || []).filter(d => d.id !== dishId);

    updateDoc(doc(firestore, "restaurants", selectedResId), {
      dishes: updatedDishes
    });
    toast({ title: "Item Removed from Menu" });
  };

  const handleUpdateRestaurant = async (data: Partial<Restaurant>) => {
    if (!firestore || !selectedResId) return;
    updateDoc(doc(firestore, "restaurants", selectedResId), data);
    toast({ title: "Restaurant Updated! ✨" });
  };

  const handleSetWingoResult = async () => {
    if (!firestore || !wingoPeriod || wingoNumber === "") return;
    const num = parseInt(wingoNumber);
    if (isNaN(num) || num < 0 || num > 9) {
      toast({ title: "Invalid Number", variant: "destructive" });
      return;
    }
    setDoc(doc(firestore, "wingoConfig", wingoPeriod), {
      periodId: wingoPeriod,
      number: num,
      updatedAt: new Date().toISOString()
    })
    .then(() => {
      toast({ title: "Result Fixed!" });
      setWingoPeriod("");
      setWingoNumber("");
    });
  };

  if (!userLoading && (!user || user.email !== ADMIN_EMAIL)) {
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
              <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Live Order Dashboard</p>
              <div className="h-1 w-1 bg-muted-foreground rounded-full" />
              <button 
                onClick={toggleAudio}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                  isAudioEnabled ? 'bg-green-600 text-white shadow-lg shadow-green-500/20' : 'bg-muted text-muted-foreground'
                }`}
              >
                {isAudioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                {isAudioEnabled ? "Notifications On" : "Notifications Muted"}
              </button>
            </div>
          </div>
          
          {isRinging && (
            <div className="bg-primary/20 border-2 border-primary p-6 rounded-[2rem] flex items-center gap-5 animate-pulse shadow-2xl shadow-primary/20">
              <BellRing className="w-10 h-10 text-primary animate-bounce" />
              <div className="flex flex-col">
                <span className="font-black text-sm uppercase text-primary">NEW ORDER!</span>
                <span className="text-[10px] font-bold text-white/60">Ringing...</span>
              </div>
            </div>
          )}
        </div>

        <Tabs defaultValue={paramResId ? "menu" : "payments"} className="space-y-8">
          <TabsList className="bg-card p-1.5 rounded-[1.5rem] h-16 w-full md:w-auto border border-border/50">
            <TabsTrigger value="payments" className="rounded-xl font-black px-8 h-12 flex gap-2 data-[state=active]:bg-primary">
              <ShoppingBag className="w-4 h-4" /> Orders
            </TabsTrigger>
            <TabsTrigger value="menu" className="rounded-xl font-black px-8 h-12 flex gap-2 data-[state=active]:bg-primary">
              <Utensils className="w-4 h-4" /> Menu Manager
            </TabsTrigger>
            <TabsTrigger value="wingo" className="rounded-xl font-black px-8 h-12 flex gap-2 data-[state=active]:bg-primary">
              <Zap className="w-4 h-4" /> Wingo
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="rounded-xl font-black px-8 h-12 data-[state=active]:bg-primary">Withdrawals</TabsTrigger>
          </TabsList>

          <TabsContent value="payments">
            <Card className="rounded-[2.5rem] border-border/50 bg-card overflow-hidden">
              <div className="p-8 border-b border-border/50 flex justify-between items-center">
                 <h3 className="font-black text-xl uppercase tracking-widest flex items-center gap-3">
                   <TrendingUp className="w-6 h-6 text-primary" />
                   Recent Transactions
                 </h3>
                 <Badge variant="outline" className="rounded-full px-4 border-primary/20 text-primary font-black">
                   {phonepeOrders?.length || 0} Total
                 </Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-muted/50 border-b border-border/50">
                    <tr>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">ID</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">Customer</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">Items</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">Status</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">Amount</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phonepeOrders?.map((order) => (
                      <tr key={order.id} className="border-b border-border/50 hover:bg-muted/20">
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
                             )) || <span className="text-muted-foreground italic text-xs">-</span>}
                           </div>
                        </td>
                        <td className="p-6">
                          <Badge className={`rounded-full px-4 py-1 text-[9px] font-black uppercase tracking-widest shadow-sm ${
                            order.status === 'Preparing' ? 'bg-orange-500' : 
                            order.status === 'Cooking' ? 'bg-yellow-600' :
                            order.status === 'On the Way' ? 'bg-blue-500' :
                            order.status === 'Delivered' ? 'bg-green-600' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {order.status || order.state}
                          </Badge>
                        </td>
                        <td className="p-6">
                          <span className="font-black text-primary text-xl tracking-tighter italic">₹{order.amount}</span>
                        </td>
                        <td className="p-6">
                          <div className="flex flex-col gap-2">
                            {(!order.status || order.status === 'Received') && (
                              <Button 
                                onClick={() => updateOrderStatus(order, "Preparing")} 
                                size="sm" 
                                className="bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl text-[9px] h-8 px-4 uppercase tracking-widest"
                              >
                                <Package className="w-3 h-3 mr-2" /> Accept
                              </Button>
                            )}
                            {order.status === "Preparing" && (
                              <Button 
                                onClick={() => updateOrderStatus(order, "Cooking")} 
                                size="sm" 
                                className="bg-yellow-600 hover:bg-yellow-700 text-white font-black rounded-xl text-[9px] h-8 px-4 uppercase tracking-widest"
                              >
                                <Flame className="w-3 h-3 mr-2" /> Cook
                              </Button>
                            )}
                            {order.status === "Cooking" && (
                              <Button 
                                onClick={() => updateOrderStatus(order, "On the Way")} 
                                size="sm" 
                                className="bg-blue-500 hover:bg-blue-600 text-white font-black rounded-xl text-[9px] h-8 px-4 uppercase tracking-widest"
                              >
                                <Truck className="w-3 h-3 mr-2" /> Deliver
                              </Button>
                            )}
                            {order.status === "On the Way" && (
                              <Button 
                                onClick={() => updateOrderStatus(order, "Delivered")} 
                                size="sm" 
                                className="bg-green-600 hover:bg-green-700 text-white font-black rounded-xl text-[9px] h-8 px-4 uppercase tracking-widest"
                              >
                                <CheckCircle2 className="w-3 h-3 mr-2" /> Complete
                              </Button>
                            )}
                            {order.status === "Delivered" && (
                              <span className="text-[9px] font-black text-green-500 uppercase tracking-widest flex items-center gap-2">
                                <CheckCircle2 className="w-3 h-3" /> Done
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="menu">
            <div className="space-y-8">
              {/* Restaurant Settings */}
              <Card className="rounded-[3rem] bg-card p-10 border border-border/50">
                <h2 className="text-3xl font-black italic mb-8 flex items-center gap-3 uppercase tracking-tighter">
                  <Settings2 className="w-8 h-8 text-primary" /> Restaurant Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Select Restaurant</Label>
                      <select 
                        value={selectedResId} 
                        onChange={(e) => setSelectedResId(e.target.value)}
                        className="w-full h-14 rounded-2xl bg-[#0a0a0a] border-2 border-border/50 px-4 font-black text-white"
                      >
                        <option value="">Choose Restaurant</option>
                        {restaurants?.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                    {selectedRestaurant && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Restaurant Name</Label>
                          <Input 
                            defaultValue={selectedRestaurant.name}
                            onBlur={(e) => handleUpdateRestaurant({ name: e.target.value })}
                            className="h-14 rounded-2xl font-black bg-[#0a0a0a] border-white/10"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Cuisine Style</Label>
                          <Input 
                            defaultValue={selectedRestaurant.cuisine}
                            onBlur={(e) => handleUpdateRestaurant({ cuisine: e.target.value })}
                            className="h-14 rounded-2xl font-black bg-[#0a0a0a] border-white/10"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="space-y-6">
                    {selectedRestaurant && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Main Image URL</Label>
                          <Input 
                            defaultValue={selectedRestaurant.image}
                            onBlur={(e) => handleUpdateRestaurant({ image: e.target.value })}
                            className="h-14 rounded-2xl font-black bg-[#0a0a0a] border-white/10"
                          />
                        </div>
                        <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl border-4 border-primary/20">
                           <Image src={selectedRestaurant.image} alt="Restaurant" fill className="object-cover" unoptimized />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Card>

              {/* Add New Dish */}
              <Card className="rounded-[3rem] bg-card p-10 border border-border/50">
                <h2 className="text-3xl font-black italic mb-8 flex items-center gap-3 uppercase tracking-tighter">
                  <Plus className="w-8 h-8 text-primary" /> Add New Manual Item
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Item Name</Label>
                      <Input 
                        placeholder="e.g. Chilli Chicken" 
                        value={newDish.name}
                        onChange={e => setNewDish({...newDish, name: e.target.value})}
                        className="h-14 rounded-2xl font-black bg-[#0a0a0a] border-white/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Price (₹)</Label>
                      <Input 
                        type="number" 
                        value={newDish.price}
                        onChange={e => setNewDish({...newDish, price: parseFloat(e.target.value) || 0})}
                        className="h-14 rounded-2xl font-black bg-[#0a0a0a] border-white/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Category</Label>
                      <Input 
                        placeholder="e.g. Starters" 
                        value={newDish.category}
                        onChange={e => setNewDish({...newDish, category: e.target.value})}
                        className="h-14 rounded-2xl font-black bg-[#0a0a0a] border-white/10"
                      />
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Manual Image URL</Label>
                      <Input 
                        placeholder="Paste image link here..." 
                        value={newDish.image}
                        onChange={e => setNewDish({...newDish, image: e.target.value})}
                        className="h-14 rounded-2xl font-black bg-[#0a0a0a] border-white/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Description</Label>
                      <Input 
                        placeholder="Dish details..." 
                        value={newDish.description}
                        onChange={e => setNewDish({...newDish, description: e.target.value})}
                        className="h-14 rounded-2xl font-black bg-[#0a0a0a] border-white/10"
                      />
                    </div>
                    <div className="relative aspect-square w-full max-w-[150px] rounded-3xl overflow-hidden border-2 border-border/50 mx-auto bg-muted">
                       <Image src={newDish.image || "https://placehold.co/400x400"} alt="Preview" fill className="object-cover" unoptimized />
                    </div>
                  </div>
                </div>
                <Button onClick={handleAddDish} className="w-full h-18 rounded-2xl font-black text-xl mt-10 bg-primary hover:bg-primary/90 shadow-2xl">
                  Save Item to Menu
                </Button>
              </Card>

              {/* Manage & Full Edit Existing Dishes */}
              {selectedRestaurant && (
                <Card className="rounded-[3rem] bg-card p-10 border border-border/50">
                  <h2 className="text-3xl font-black italic mb-8 flex items-center gap-3 uppercase tracking-tighter">
                    <Edit3 className="w-8 h-8 text-primary" /> Item Editor Master
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {selectedRestaurant.dishes?.map((dish) => (
                      <div key={dish.id} className="bg-[#0a0a0a] p-8 rounded-[3rem] border border-border/50 flex flex-col gap-6 group hover:border-primary/30 transition-all">
                        <div className="flex items-start gap-6">
                          <div className="relative w-28 h-28 rounded-3xl overflow-hidden shadow-lg flex-shrink-0 border border-white/10 bg-muted">
                            <Image src={dish.image} alt={dish.name} fill className="object-cover" unoptimized />
                          </div>
                          <div className="flex-1 space-y-4">
                            <div className="flex justify-between items-center">
                                <h4 className="font-black text-lg uppercase italic text-primary">{dish.name}</h4>
                                <button onClick={() => handleDeleteDish(dish.id)} className="text-destructive hover:scale-110 transition-transform p-2 bg-destructive/10 rounded-xl">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-1">
                                 <Label className="text-[8px] font-black uppercase text-muted-foreground ml-1">Name</Label>
                                 <Input 
                                   defaultValue={dish.name}
                                   id={`name-input-${dish.id}`}
                                   className="h-10 rounded-xl bg-card border-white/10 text-xs font-black"
                                 />
                               </div>
                               <div className="space-y-1">
                                 <Label className="text-[8px] font-black uppercase text-muted-foreground ml-1">Price (₹)</Label>
                                 <Input 
                                   defaultValue={dish.price}
                                   id={`price-input-${dish.id}`}
                                   type="number"
                                   className="h-10 rounded-xl bg-card border-white/10 text-xs font-black"
                                 />
                               </div>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[8px] font-black uppercase text-muted-foreground ml-1">Category</Label>
                              <Input 
                                defaultValue={dish.category}
                                id={`cat-input-${dish.id}`}
                                className="h-10 rounded-xl bg-card border-white/10 text-xs font-black"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[8px] font-black uppercase text-muted-foreground ml-1">Description</Label>
                              <Input 
                                defaultValue={dish.description}
                                id={`desc-input-${dish.id}`}
                                className="h-10 rounded-xl bg-card border-white/10 text-xs font-black"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[8px] font-black uppercase text-muted-foreground ml-1">Image URL</Label>
                              <Input 
                                defaultValue={dish.image}
                                id={`img-input-${dish.id}`}
                                className="h-10 rounded-xl bg-card border-white/10 text-[10px] font-black"
                              />
                            </div>

                            <Button 
                              size="sm" 
                              className="w-full rounded-2xl h-12 font-black uppercase text-[10px] tracking-widest mt-2"
                              onClick={() => {
                                const nameInput = document.getElementById(`name-input-${dish.id}`) as HTMLInputElement;
                                const priceInput = document.getElementById(`price-input-${dish.id}`) as HTMLInputElement;
                                const imgInput = document.getElementById(`img-input-${dish.id}`) as HTMLInputElement;
                                const descInput = document.getElementById(`desc-input-${dish.id}`) as HTMLInputElement;
                                const catInput = document.getElementById(`cat-input-${dish.id}`) as HTMLInputElement;
                                
                                handleUpdateDishFull(dish.id, {
                                  name: nameInput.value,
                                  price: parseFloat(priceInput.value),
                                  image: imgInput.value,
                                  description: descInput.value,
                                  category: catInput.value
                                });
                              }}
                            >
                              <Save className="w-4 h-4 mr-2" /> Update Selection
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="wingo">
            <Card className="border-border/50 bg-card rounded-[4rem] p-12 shadow-2xl max-w-2xl mx-auto">
              <div className="flex flex-col items-center text-center space-y-4 mb-10">
                <div className="p-4 bg-primary/10 rounded-3xl">
                  <Zap className="w-12 h-12 text-primary" />
                </div>
                <h2 className="text-4xl font-black italic tracking-tighter uppercase">Wingo Control</h2>
              </div>
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase ml-2 tracking-widest">Period ID</Label>
                    <Input 
                      placeholder="e.g. 20240315" 
                      value={wingoPeriod} 
                      onChange={e => setWingoPeriod(e.target.value)}
                      className="h-14 rounded-2xl font-black bg-[#0a0a0a] border-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase ml-2 tracking-widest">Number (0-9)</Label>
                    <Input 
                      type="number" 
                      value={wingoNumber} 
                      onChange={e => setWingoNumber(e.target.value)}
                      className="h-14 rounded-2xl font-black bg-[#0a0a0a] border-2"
                    />
                  </div>
                </div>
                <Button onClick={handleSetWingoResult} className="w-full h-20 rounded-2xl font-black text-xl py-8">
                  Set Result
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="withdrawals">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {withdrawals?.map((req) => (
                <Card key={req.id} className="rounded-[3rem] border-border/50 bg-card p-10 relative overflow-hidden">
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

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>}>
      <AdminDashboardContent />
    </Suspense>
  );
}
