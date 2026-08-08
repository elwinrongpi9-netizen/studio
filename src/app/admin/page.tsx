"use client";

import { Navbar } from "@/components/navbar";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { collection, doc, updateDoc, query, orderBy, setDoc, limit, onSnapshot } from "firebase/firestore";
import { useMemo, useState, useEffect, useRef, Suspense } from "react";
import { Restaurant, WithdrawalRequest, Dish, UserProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Edit3,
  Loader2,
  Upload,
  UserCheck
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
  
  const userRef = useMemo(() => (user && firestore) ? doc(firestore, "users", user.uid) : null, [user, firestore]);
  const { data: profile } = useDoc<UserProfile>(userRef as any);

  const isSuperAdmin = user?.email === ADMIN_EMAIL;
  const isRestaurantAdmin = !!profile?.managedRestaurantId;
  const managedResId = profile?.managedRestaurantId;

  const paramResId = searchParams.get("resId");

  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isRinging, setIsRinging] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastOrderIdRef = useRef<string | null>(null);

  const [selectedResId, setSelectedResId] = useState("");
  const [newDish, setNewDish] = useState<Partial<Dish>>({
    name: "",
    description: "",
    price: 0,
    category: "Starters",
    image: "https://picsum.photos/seed/newdish/400/300",
    inStock: true
  });

  const dishImageRefs = useRef<Record<string, string>>({});

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

  const { data: allRestaurants } = useCollection<Restaurant>(restaurantsQuery);
  const { data: withdrawals } = useCollection<WithdrawalRequest>(withdrawalsQuery);
  const { data: phonepeOrders } = useCollection<any>(phonepeOrdersQuery);
  
  const visibleRestaurants = useMemo(() => {
    if (isSuperAdmin) return allRestaurants;
    if (isRestaurantAdmin) return allRestaurants?.filter(r => r.id === managedResId);
    return [];
  }, [allRestaurants, isSuperAdmin, isRestaurantAdmin, managedResId]);

  const selectedRestaurant = useMemo(() => {
    return visibleRestaurants?.find(r => r.id === selectedResId);
  }, [visibleRestaurants, selectedResId]);

  useEffect(() => {
    if (isRestaurantAdmin && managedResId) {
      setSelectedResId(managedResId);
    } else if (paramResId) {
      setSelectedResId(paramResId);
    }
  }, [paramResId, managedResId, isRestaurantAdmin]);

  useEffect(() => {
    if (!firestore || !user || (!isSuperAdmin && !isRestaurantAdmin)) return;

    const q = query(collection(firestore, "phonepe_orders"), orderBy("createdAt", "desc"), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const latestOrder = snapshot.docs[0];
        const orderData = latestOrder.data();
        const orderId = latestOrder.id;

        // If restaurant admin, only ring for their restaurant's orders
        if (isRestaurantAdmin && orderData.restaurantId !== managedResId) return;

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
  }, [firestore, user, isAudioEnabled, isSuperAdmin, isRestaurantAdmin, managedResId]);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isNewItem: boolean, dishId?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (isNewItem) {
        setNewDish({ ...newDish, image: base64String });
      } else if (dishId) {
        dishImageRefs.current[dishId] = base64String;
        const previewImg = document.getElementById(`preview-${dishId}`) as HTMLImageElement;
        if (previewImg) previewImg.src = base64String;
        toast({ title: "Local Photo Ready! 📸", description: "Click Update to save." });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddDish = async () => {
    if (!firestore || !selectedResId || !newDish.name || !newDish.image) {
      toast({ title: "Details or Image missing", variant: "destructive" });
      return;
    }

    const res = visibleRestaurants?.find(r => r.id === selectedResId);
    if (!res) return;

    const dishToAdd = { 
      ...newDish, 
      id: `dish_${Date.now()}`,
      description: newDish.description || "",
      price: newDish.price || 0,
      inStock: newDish.inStock ?? true
    } as Dish;
    
    const updatedDishes = [...(res.dishes || []), dishToAdd];

    updateDoc(doc(firestore, "restaurants", selectedResId), {
      dishes: updatedDishes
    });
    
    toast({ title: "Item Added! 🎉" });
    setNewDish({ name: "", description: "", price: 0, category: "Starters", image: "https://picsum.photos/seed/newdish/400/300", inStock: true });
  };

  const handleUpdateDishFull = async (dishId: string, updatedData: Partial<Dish>) => {
    if (!firestore || !selectedResId || !selectedRestaurant) return;

    const originalDish = selectedRestaurant.dishes?.find(d => d.id === dishId);
    const finalImage = dishImageRefs.current[dishId] || 
                       (updatedData.image && updatedData.image.startsWith('data:') ? updatedData.image : originalDish?.image);

    const updatedDishes = (selectedRestaurant.dishes || []).map(d => 
      d.id === dishId ? { ...d, ...updatedData, image: finalImage } : d
    );

    updateDoc(doc(firestore, "restaurants", selectedResId), {
      dishes: updatedDishes
    });
    
    delete dishImageRefs.current[dishId];
    toast({ title: "Item Updated! ✨" });
  };

  const handleDeleteDish = async (dishId: string) => {
    if (!firestore || !selectedResId || !selectedRestaurant) return;

    const updatedDishes = (selectedRestaurant.dishes || []).filter(d => d.id !== dishId);

    updateDoc(doc(firestore, "restaurants", selectedResId), {
      dishes: updatedDishes
    });
    toast({ title: "Item Removed" });
  };

  const handleUpdateRestaurant = async (data: Partial<Restaurant>) => {
    if (!firestore || !selectedResId) return;
    updateDoc(doc(firestore, "restaurants", selectedResId), data);
    toast({ title: "Restaurant Details Updated! ✨" });
  };

  if (userLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

  if (!user || (!isSuperAdmin && !isRestaurantAdmin)) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 container mx-auto px-4 py-20 text-center">
          <ShieldAlert className="w-20 h-20 text-destructive mx-auto mb-6" />
          <h1 className="text-4xl font-black mb-4 uppercase italic tracking-tighter text-foreground">Access Denied</h1>
          <p className="text-muted-foreground mb-8">This area is reserved for Super Admins and Restaurant Partners.</p>
          <Button onClick={() => router.push("/")} className="rounded-2xl px-12 h-14 font-black">Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <audio ref={audioRef} src={RINGTONE_URL} preload="auto" />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-5xl font-black italic tracking-tighter flex items-center gap-4 text-foreground">
              <ShieldCheck className="w-12 h-12 text-primary" />
              {isSuperAdmin ? "Master Control" : "Partner Dashboard"}
            </h1>
            <div className="flex items-center gap-3 mt-4">
              <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">
                {isSuperAdmin ? "Super Admin Access" : `Managing: ${selectedRestaurant?.name || 'Assigned Restaurant'}`}
              </p>
              <div className="h-1 w-1 bg-muted rounded-full" />
              <button 
                onClick={toggleAudio}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                  isAudioEnabled ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-muted text-muted-foreground'
                }`}
              >
                {isAudioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                {isAudioEnabled ? "Audio On" : "Audio Off"}
              </button>
            </div>
          </div>
          
          {isRinging && (
            <div className="bg-primary/10 border-2 border-primary p-6 rounded-[2rem] flex items-center gap-5 animate-pulse shadow-2xl shadow-primary/10">
              <BellRing className="w-10 h-10 text-primary animate-bounce" />
              <div className="flex flex-col">
                <span className="font-black text-sm uppercase text-primary">NEW ORDER!</span>
                <span className="text-[10px] font-bold text-muted-foreground">Notification active...</span>
              </div>
            </div>
          )}
        </div>

        <Tabs defaultValue="payments" className="space-y-8">
          <TabsList className="bg-card p-1.5 rounded-[1.5rem] h-16 w-full md:w-auto border border-border overflow-x-auto no-scrollbar shadow-sm">
            <TabsTrigger value="payments" className="rounded-xl font-black px-8 h-12 flex gap-2 data-[state=active]:bg-primary shrink-0">
              <ShoppingBag className="w-4 h-4" /> Orders
            </TabsTrigger>
            <TabsTrigger value="menu" className="rounded-xl font-black px-8 h-12 flex gap-2 data-[state=active]:bg-primary shrink-0">
              <Utensils className="w-4 h-4" /> Menu
            </TabsTrigger>
            {isSuperAdmin && (
              <>
                <TabsTrigger value="wingo" className="rounded-xl font-black px-8 h-12 flex gap-2 data-[state=active]:bg-primary shrink-0">
                  <Zap className="w-4 h-4" /> Wingo
                </TabsTrigger>
                <TabsTrigger value="withdrawals" className="rounded-xl font-black px-8 h-12 data-[state=active]:bg-primary shrink-0">Withdrawals</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="payments">
            <Card className="rounded-[2.5rem] border border-border bg-card overflow-hidden shadow-xl">
              <div className="p-8 border-b border-border flex justify-between items-center bg-muted/30">
                 <h3 className="font-black text-xl uppercase tracking-widest flex items-center gap-3">
                   <TrendingUp className="w-6 h-6 text-primary" />
                   Recent Orders
                 </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">Order ID</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">Customer</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">Items</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">Status</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">Amount</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phonepeOrders?.filter(o => isSuperAdmin || o.restaurantId === managedResId).map((order) => (
                      <tr key={order.id} className="border-b border-border hover:bg-muted/20">
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
                             ))}
                           </div>
                        </td>
                        <td className="p-6">
                          <Badge className={`rounded-full px-4 py-1 text-[9px] font-black uppercase tracking-widest ${
                            order.status === 'Preparing' ? 'bg-orange-500 text-white' : 
                            order.status === 'Cooking' ? 'bg-yellow-600 text-white' :
                            order.status === 'On the Way' ? 'bg-blue-500 text-white' :
                            order.status === 'Delivered' ? 'bg-green-600 text-white' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {order.status || 'Received'}
                          </Badge>
                        </td>
                        <td className="p-6">
                          <span className="font-black text-primary text-xl tracking-tighter italic">Rs. {order.amount}</span>
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
              <Card className="rounded-[3rem] bg-card p-10 border border-border shadow-xl">
                <h2 className="text-3xl font-black italic mb-8 flex items-center gap-3 uppercase tracking-tighter text-foreground">
                  <Settings2 className="w-8 h-8 text-primary" /> Restaurant Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Managed Restaurant</Label>
                      {isSuperAdmin ? (
                        <select 
                          value={selectedResId} 
                          onChange={(e) => setSelectedResId(e.target.value)}
                          className="w-full h-14 rounded-2xl bg-muted/20 border-2 border-border px-4 font-black text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Choose Restaurant</option>
                          {visibleRestaurants?.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="h-14 rounded-2xl bg-muted/20 border-2 border-border px-4 flex items-center font-black text-primary">
                          {selectedRestaurant?.name || "Accessing..."}
                        </div>
                      )}
                    </div>
                    {selectedRestaurant && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Display Name</Label>
                          <Input 
                            defaultValue={selectedRestaurant.name}
                            onBlur={(e) => handleUpdateRestaurant({ name: e.target.value })}
                            className="h-14 rounded-2xl font-black bg-muted/10 border-border"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Cuisine Description</Label>
                          <Input 
                            defaultValue={selectedRestaurant.cuisine}
                            onBlur={(e) => handleUpdateRestaurant({ cuisine: e.target.value })}
                            className="h-14 rounded-2xl font-black bg-muted/10 border-border"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="space-y-6">
                    {selectedRestaurant && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Cover Image URL</Label>
                          <Input 
                            defaultValue={selectedRestaurant.image}
                            onBlur={(e) => handleUpdateRestaurant({ image: e.target.value })}
                            className="h-14 rounded-2xl font-black bg-muted/10 border-border"
                          />
                        </div>
                        <div className="relative aspect-video rounded-3xl overflow-hidden shadow-xl border-4 border-primary/10">
                           <Image src={selectedRestaurant.image} alt="Restaurant" fill unoptimized className="object-cover" />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Card>

              {selectedRestaurant && (
                <>
                  <Card className="rounded-[3rem] bg-card p-10 border border-border shadow-xl">
                    <h2 className="text-3xl font-black italic mb-8 flex items-center gap-3 uppercase tracking-tighter text-foreground">
                      <Plus className="w-8 h-8 text-primary" /> Add New Item
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Item Name</Label>
                          <Input 
                            placeholder="e.g. Chilli Paneer" 
                            value={newDish.name}
                            onChange={e => setNewDish({...newDish, name: e.target.value})}
                            className="h-14 rounded-2xl font-black bg-muted/10 border-border"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Price (Rs.)</Label>
                          <Input 
                            type="number" 
                            value={newDish.price}
                            onChange={e => setNewDish({...newDish, price: parseFloat(e.target.value) || 0})}
                            className="h-14 rounded-2xl font-black bg-muted/10 border-border"
                          />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${newDish.inStock ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-zinc-400'}`} />
                            <Label className="text-sm font-black text-foreground">Mark as Available</Label>
                          </div>
                          <Switch 
                            checked={newDish.inStock}
                            onCheckedChange={checked => setNewDish({...newDish, inStock: checked})}
                          />
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Upload Image</Label>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="relative">
                               <input 
                                type="file" 
                                accept="image/*" 
                                onChange={(e) => handleImageUpload(e, true)}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                               />
                               <Button variant="outline" className="w-full h-12 rounded-xl border-dashed border-primary/40 font-black text-[10px] flex gap-2">
                                 <Upload className="w-3 h-3" /> Select Local
                               </Button>
                             </div>
                             <Input 
                              placeholder="Or paste link..." 
                              value={newDish.image?.startsWith('data:') ? 'Local Image Attached' : newDish.image}
                              onChange={e => setNewDish({...newDish, image: e.target.value})}
                              className="h-12 rounded-xl font-black bg-muted/10 border-border"
                            />
                          </div>
                        </div>
                        <div className="relative aspect-square w-full max-w-[120px] rounded-3xl overflow-hidden border-2 border-border mx-auto bg-muted/30">
                           <Image src={newDish.image || "https://placehold.co/400x400"} alt="Preview" fill unoptimized className="object-cover" />
                        </div>
                      </div>
                    </div>
                    <Button onClick={handleAddDish} className="w-full h-16 rounded-2xl font-black text-xl mt-10 bg-primary hover:bg-primary/90 shadow-2xl text-white">
                      Save Item to Menu
                    </Button>
                  </Card>

                  <Card className="rounded-[3rem] bg-card p-10 border border-border shadow-xl">
                    <h2 className="text-3xl font-black italic mb-8 flex items-center gap-3 uppercase tracking-tighter text-foreground">
                      <Edit3 className="w-8 h-8 text-primary" /> Live Menu Editor
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {selectedRestaurant.dishes?.map((dish) => (
                        <div key={dish.id} className="bg-muted/10 p-8 rounded-[3rem] border border-border flex flex-col gap-6 group hover:border-primary/30 transition-all shadow-sm">
                          <div className="flex items-start gap-6">
                            <div className="relative w-24 h-24 rounded-3xl overflow-hidden shadow-lg flex-shrink-0 border border-border bg-white">
                              <Image id={`preview-${dish.id}`} src={dish.image} alt={dish.name} fill unoptimized className="object-cover" />
                            </div>
                            <div className="flex-1 space-y-4">
                              <div className="flex justify-between items-center">
                                  <h4 className="font-black text-lg uppercase italic text-primary">{dish.name}</h4>
                                  <button onClick={() => handleDeleteDish(dish.id)} className="text-destructive hover:scale-110 transition-transform p-2">
                                      <Trash2 className="w-5 h-5" />
                                  </button>
                              </div>
                              
                              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-border shadow-sm">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${dish.inStock !== false ? 'text-green-600' : 'text-zinc-500'}`}>
                                  {dish.inStock !== false ? '🟢 In Stock' : '⚪ Out of Stock'}
                                </span>
                                <Switch 
                                  id={`stock-switch-${dish.id}`}
                                  defaultChecked={dish.inStock !== false}
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                 <Input defaultValue={dish.name} id={`name-input-${dish.id}`} className="h-10 rounded-xl bg-white border-border text-xs font-black" />
                                 <Input defaultValue={dish.price} id={`price-input-${dish.id}`} type="number" className="h-10 rounded-xl bg-white border-border text-xs font-black" />
                              </div>

                              <Button 
                                size="sm" 
                                className="w-full rounded-2xl h-12 font-black uppercase text-[10px] tracking-widest mt-2 text-white"
                                onClick={() => {
                                  const nameInput = document.getElementById(`name-input-${dish.id}`) as HTMLInputElement;
                                  const priceInput = document.getElementById(`price-input-${dish.id}`) as HTMLInputElement;
                                  const stockSwitch = document.getElementById(`stock-switch-${dish.id}`) as HTMLButtonElement;
                                  const inStock = stockSwitch.getAttribute('data-state') === 'checked';

                                  handleUpdateDishFull(dish.id, {
                                    name: nameInput.value,
                                    price: parseFloat(priceInput.value),
                                    inStock: inStock
                                  });
                                }}
                              >
                                <Save className="w-4 h-4 mr-2" /> Update Item
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </>
              )}
            </div>
          </TabsContent>

          {isSuperAdmin && (
            <>
              <TabsContent value="wingo">
                <Card className="border border-border bg-card rounded-[4rem] p-12 shadow-2xl max-w-2xl mx-auto">
                  <div className="flex flex-col items-center text-center space-y-4 mb-10">
                    <Zap className="w-12 h-12 text-primary" />
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase text-foreground">Wingo Master</h2>
                  </div>
                  <div className="space-y-8">
                    <Input placeholder="Period ID" value={wingoPeriod} onChange={e => setWingoPeriod(e.target.value)} className="h-14 rounded-2xl font-black bg-muted/20 border-border" />
                    <Input type="number" placeholder="Winning Number (0-9)" value={wingoNumber} onChange={e => setWingoNumber(e.target.value)} className="h-14 rounded-2xl font-black bg-muted/20 border-border" />
                    <Button onClick={() => {
                      if (!firestore || !wingoPeriod) return;
                      setDoc(doc(firestore, "wingoConfig", wingoPeriod), { periodId: wingoPeriod, number: parseInt(wingoNumber) })
                      .then(() => toast({ title: "Result Set!" }));
                    }} className="w-full h-16 rounded-2xl font-black text-xl text-white">Set Result</Button>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="withdrawals">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {withdrawals?.map((req) => (
                    <Card key={req.id} className="rounded-[3rem] border border-border bg-card p-10 relative overflow-hidden shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <Banknote className="w-8 h-8 text-orange-600" />
                          <div className="space-y-1">
                            <h3 className="font-black text-4xl tracking-tighter italic text-foreground">Rs. {req.amount}</h3>
                            <p className="text-[9px] font-black text-muted-foreground uppercase">{req.userEmail}</p>
                            <div className="bg-muted/20 px-3 py-1.5 rounded-xl flex items-center gap-3 border border-border cursor-pointer" onClick={() => { navigator.clipboard.writeText(req.upiId); toast({title:"UPI Copied!"}); }}>
                              <span className="font-mono font-bold text-[10px] text-muted-foreground">{req.upiId}</span>
                              <Copy className="w-3 h-3 text-primary" />
                            </div>
                          </div>
                        </div>
                        <Badge className="bg-orange-600 text-white rounded-full px-4 py-1.5 uppercase font-black text-[9px] tracking-widest">{req.status}</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </>
          )}
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
