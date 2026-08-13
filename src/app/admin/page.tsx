
"use client";

import { Navbar } from "@/components/navbar";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { collection, doc, updateDoc, query, orderBy, setDoc, limit, onSnapshot, deleteDoc, getDocs, writeBatch } from "firebase/firestore";
import { useMemo, useState, useEffect, useRef, Suspense } from "react";
import { Restaurant, WithdrawalRequest, Dish, UserProfile, Inspiration } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ShieldCheck, 
  Zap, 
  TrendingUp, 
  Volume2,
  VolumeX,
  Plus,
  Save,
  Trash2,
  Loader2,
  Camera,
  X,
  AlertTriangle,
  RefreshCw,
  MoreVertical
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [showCreateResDialog, setShowCreateResDialog] = useState(false);
  const [newResData, setNewResData] = useState({ name: "", cuisine: "", image: "" });
  
  const [shopEdit, setShopEdit] = useState({ name: "", cuisine: "", image: "" });
  const [newDish, setNewDish] = useState<Partial<Dish>>({ name: "", description: "", price: 0, category: "Items", image: "", inStock: true });
  const [newInspiration, setNewInspiration] = useState<Partial<Inspiration>>({ name: "", image: "", hint: "" });
  const [editingInspiration, setEditingInspiration] = useState<string | null>(null);

  const [showCamera, setShowCamera] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<"dish" | "inspiration" | "shop" | "newRes">("dish");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isNuking, setIsNuking] = useState(false);

  const restaurantsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "restaurants"), orderBy("name"));
  }, [firestore]);

  const phonepeOrdersQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "phonepe_orders"), orderBy("createdAt", "desc"), limit(100));
  }, [firestore]);

  const inspirationsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "inspirations"), orderBy("name"));
  }, [firestore]);

  const { data: allRestaurants } = useCollection<Restaurant>(restaurantsQuery);
  const { data: phonepeOrders } = useCollection<any>(phonepeOrdersQuery);
  const { data: inspirations } = useCollection<Inspiration>(inspirationsQuery);
  
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
    if (selectedRestaurant) {
      setShopEdit({
        name: selectedRestaurant.name || "",
        cuisine: selectedRestaurant.cuisine || "",
        image: selectedRestaurant.image || ""
      });
    }
  }, [selectedRestaurant]);

  useEffect(() => {
    if (!firestore || !user || (!isSuperAdmin && !isRestaurantAdmin)) return;
    const q = query(collection(firestore, "phonepe_orders"), orderBy("createdAt", "desc"), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const latestOrder = snapshot.docs[0];
        const orderId = latestOrder.id;
        const orderData = latestOrder.data();
        if (isRestaurantAdmin && orderData.restaurantId !== managedResId) return;
        if (lastOrderIdRef.current === null) {
          lastOrderIdRef.current = orderId;
          return;
        }
        if (orderId !== lastOrderIdRef.current) {
          lastOrderIdRef.current = orderId;
          if (isAudioEnabled) triggerRingtone();
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
    toast({ title: "NEW ORDER RECEIVED! 🔔" });
  };

  const toggleAudio = () => {
    if (!isAudioEnabled) {
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current?.pause();
          setIsAudioEnabled(true);
          toast({ title: "Audio Active" });
        }).catch(() => toast({ title: "Please interact with the page first", variant: "destructive" }));
      }
    } else {
      setIsAudioEnabled(false);
      toast({ title: "Audio Muted" });
    }
  };

  const handleNukeData = async () => {
    if (!firestore || !isSuperAdmin) return;
    if (!window.confirm("ARE YOU SURE? This will DELETE all restaurants, items, and inspirations permanently!")) return;
    
    setIsNuking(true);
    try {
      const batch = writeBatch(firestore);
      
      const resDocs = await getDocs(collection(firestore, "restaurants"));
      resDocs.forEach(d => batch.delete(d.ref));
      
      const inspDocs = await getDocs(collection(firestore, "inspirations"));
      inspDocs.forEach(d => batch.delete(d.ref));
      
      const orderDocs = await getDocs(collection(firestore, "phonepe_orders"));
      orderDocs.forEach(d => batch.delete(d.ref));

      await batch.commit();
      toast({ title: "DATABASE NUKED! 💥", description: "All items have been deleted." });
      setSelectedResId("");
    } catch (e) {
      console.error(e);
      toast({ title: "Nuke Failed", variant: "destructive" });
    } finally {
      setIsNuking(false);
    }
  };

  const updateOrderStatus = async (order: any, newStatus: string) => {
    if (!firestore) return;
    const orderId = order.order_id || order.id;
    const userId = order.userId;
    updateDoc(doc(firestore, "phonepe_orders", orderId), { status: newStatus });
    if (userId) {
      updateDoc(doc(firestore, "users", userId, "orders", orderId), { status: newStatus });
    }
    toast({ title: `Order ${newStatus}` });
  };

  const handleCreateRestaurant = async () => {
    if (!firestore || !newResData.name || !newResData.image) {
      toast({ title: "Details or Image missing", variant: "destructive" });
      return;
    }
    const resId = `res_${Date.now()}`;
    await setDoc(doc(firestore, "restaurants", resId), {
      id: resId,
      name: newResData.name,
      cuisine: newResData.cuisine,
      image: newResData.image,
      rating: 5.0,
      deliveryTime: "30 min",
      priceRange: "₹₹",
      dishes: []
    });
    toast({ title: "Shop Created! 🏪" });
    setNewResData({ name: "", cuisine: "", image: "" });
    setShowCreateResDialog(false);
    setSelectedResId(resId);
  };

  const handleUpdateShopProfile = async () => {
    if (!firestore || !selectedResId || !shopEdit.name || !shopEdit.image) return;
    await updateDoc(doc(firestore, "restaurants", selectedResId), {
      name: shopEdit.name,
      cuisine: shopEdit.cuisine,
      image: shopEdit.image
    });
    toast({ title: "Shop Profile Updated!" });
  };

  const handleAddDish = async () => {
    if (!firestore || !selectedResId || !newDish.name || !newDish.image) return;
    const res = visibleRestaurants?.find(r => r.id === selectedResId);
    if (!res) return;
    const dishToAdd = { ...newDish, id: `dish_${Date.now()}`, inStock: true } as Dish;
    const updatedDishes = [...(res.dishes || []), dishToAdd];
    updateDoc(doc(firestore, "restaurants", selectedResId), { dishes: updatedDishes });
    toast({ title: "Item Added!" });
    setNewDish({ name: "", description: "", price: 0, category: "Items", image: "", inStock: true });
  };

  const handleDeleteDish = async (dishId: string) => {
    if (!firestore || !selectedResId || !selectedRestaurant) return;
    const updatedDishes = (selectedRestaurant.dishes || []).filter(d => d.id !== dishId);
    updateDoc(doc(firestore, "restaurants", selectedResId), { dishes: updatedDishes });
    toast({ title: "Item Removed" });
  };

  const handleSaveInspiration = async () => {
    if (!firestore || !newInspiration.name || !newInspiration.image) return;
    if (editingInspiration) {
      await updateDoc(doc(firestore, "inspirations", editingInspiration), { name: newInspiration.name, image: newInspiration.image });
      toast({ title: "Inspiration Updated!" });
    } else {
      const id = `insp_${Date.now()}`;
      await setDoc(doc(firestore, "inspirations", id), { id, name: newInspiration.name, image: newInspiration.image, hint: "" });
      toast({ title: "Inspiration Added!" });
    }
    setNewInspiration({ name: "", image: "", hint: "" });
    setEditingInspiration(null);
  };

  const startCamera = async (target: "dish" | "inspiration" | "shop" | "newRes") => {
    setCameraTarget(target);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }, 
        audio: false 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      toast({ title: "Camera Error", variant: "destructive" });
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      // Capture at full resolution of the video stream
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        // Use high quality setting for the data URL
        const dataUrl = canvas.toDataURL("image/jpeg", 1.0);
        
        if (cameraTarget === "dish") setNewDish({ ...newDish, image: dataUrl });
        else if (cameraTarget === "shop") setShopEdit({ ...shopEdit, image: dataUrl });
        else if (cameraTarget === "newRes") setNewResData({ ...newResData, image: dataUrl });
        else setNewInspiration({ ...newInspiration, image: dataUrl });
        
        stopCamera();
      }
    }
  };

  if (userLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  if (!user || (!isSuperAdmin && !isRestaurantAdmin)) return null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <audio ref={audioRef} src={RINGTONE_URL} preload="auto" />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-5xl font-black italic tracking-tighter flex items-center gap-4">
              <ShieldCheck className="w-12 h-12 text-primary" />
              {isSuperAdmin ? "Master Control" : "Partner Dashboard"}
            </h1>
            <div className="flex items-center gap-4 mt-4">
              <button onClick={toggleAudio} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${isAudioEnabled ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                {isAudioEnabled ? <Volume2 className="w-4 h-4 inline mr-2" /> : <VolumeX className="w-4 h-4 inline mr-2" />}
                Audio {isAudioEnabled ? 'On' : 'Off'}
              </button>
              {isSuperAdmin && (
                <Button variant="destructive" size="sm" onClick={handleNukeData} disabled={isNuking} className="rounded-full px-6 font-black uppercase text-[10px] tracking-widest">
                  {isNuking ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
                  Nuke Data
                </Button>
              )}
            </div>
          </div>
          {isRinging && <Badge className="bg-primary p-4 animate-pulse uppercase font-black text-xs">NEW ORDER! 🔔</Badge>}
        </div>

        <Tabs defaultValue="payments" className="space-y-8">
          <TabsList className="bg-card p-1.5 rounded-[1.5rem] h-16 w-full md:w-auto border border-border shadow-sm overflow-x-auto no-scrollbar">
            <TabsTrigger value="payments" className="rounded-xl font-black px-8 h-12 data-[state=active]:bg-primary">Orders</TabsTrigger>
            <TabsTrigger value="profile" className="rounded-xl font-black px-8 h-12 data-[state=active]:bg-primary">Shop Profile</TabsTrigger>
            <TabsTrigger value="menu" className="rounded-xl font-black px-8 h-12 data-[state=active]:bg-primary">Menu</TabsTrigger>
            {isSuperAdmin && <TabsTrigger value="inspirations" className="rounded-xl font-black px-8 h-12 data-[state=active]:bg-primary">Inspirations</TabsTrigger>}
          </TabsList>

          <TabsContent value="payments">
            <Card className="rounded-[2.5rem] border bg-card overflow-hidden shadow-xl">
              <div className="p-8 border-b bg-muted/30"><h3 className="font-black text-xl uppercase tracking-widest flex items-center gap-3"><TrendingUp className="w-6 h-6 text-primary" /> Recent Orders</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">Order ID</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">Customer</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">Restaurant</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">Status</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phonepeOrders?.filter(o => isSuperAdmin || o.restaurantId === managedResId).map((order) => (
                      <tr key={order.id} className="border-b hover:bg-muted/20">
                        <td className="p-6 font-mono font-bold text-xs text-primary">{order.order_id}</td>
                        <td className="p-6 font-black text-sm">{order.udf1}</td>
                        <td className="p-6 font-black text-xs uppercase italic text-primary">{order.restaurantName || "---"}</td>
                        <td className="p-6"><Badge className="rounded-full px-4 text-[9px] font-black uppercase">{order.status || 'Received'}</Badge></td>
                        <td className="p-6 flex flex-col gap-2">
                           {!order.status || order.status === 'Received' ? <Button onClick={() => updateOrderStatus(order, "Preparing")} size="sm" className="bg-orange-500 font-black rounded-xl text-[9px] h-8 uppercase">Accept</Button> : null}
                           {order.status === "Preparing" ? <Button onClick={() => updateOrderStatus(order, "On the Way")} size="sm" className="bg-blue-500 font-black rounded-xl text-[9px] h-8 uppercase">Deliver</Button> : null}
                           {order.status === "On the Way" ? <Button onClick={() => updateOrderStatus(order, "Delivered")} size="sm" className="bg-green-600 font-black rounded-xl text-[9px] h-8 uppercase">Complete</Button> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
             <Card className="rounded-[3rem] bg-card p-10 border shadow-xl">
               <div className="flex items-center justify-between mb-10">
                 <h2 className="text-3xl font-black italic uppercase tracking-tighter">Shop Profile</h2>
                 {isSuperAdmin && <Button onClick={() => setShowCreateResDialog(true)} className="rounded-2xl font-black uppercase h-14 px-8"><Plus className="w-5 h-5 mr-2" /> New Shop</Button>}
               </div>
               {isSuperAdmin && (
                  <div className="mb-10 p-6 bg-muted/20 rounded-2xl border flex items-center gap-6">
                    <Label className="text-[10px] font-black uppercase tracking-widest">Manage Restaurant</Label>
                    <select value={selectedResId} onChange={(e) => setSelectedResId(e.target.value)} className="bg-transparent font-black text-primary focus:outline-none flex-1">
                      <option value="">Choose Shop</option>
                      {visibleRestaurants?.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
               )}
               {selectedRestaurant ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="space-y-6">
                     <Input value={shopEdit.name} onChange={e => setShopEdit({...shopEdit, name: e.target.value})} className="h-14 rounded-2xl font-black bg-muted/10" placeholder="Name" />
                     <Input value={shopEdit.cuisine} onChange={e => setShopEdit({...shopEdit, cuisine: e.target.value})} className="h-14 rounded-2xl font-black bg-muted/10" placeholder="Cuisine" />
                     <Button onClick={handleUpdateShopProfile} className="w-full h-16 rounded-2xl font-black text-xl"><Save className="w-6 h-6 mr-3" /> Save Shop</Button>
                   </div>
                   <div className="space-y-6">
                     <div className="flex gap-2">
                       <Input value={shopEdit.image} onChange={e => setShopEdit({...shopEdit, image: e.target.value})} className="h-14 rounded-2xl font-black bg-muted/10 flex-1" placeholder="Image URL" />
                       <Button variant="outline" onClick={() => startCamera("shop")} className="h-14 rounded-2xl"><Camera className="w-5 h-5" /></Button>
                     </div>
                     {shopEdit.image?.startsWith("http") || shopEdit.image?.startsWith("data") ? (
                        <div className="relative aspect-video rounded-3xl overflow-hidden border-4 border-primary/20">
                          <Image src={shopEdit.image} alt="Shop" fill unoptimized className="object-cover" />
                        </div>
                     ) : null}
                   </div>
                 </div>
               ) : <div className="text-center py-20 font-black text-muted-foreground uppercase text-[10px] tracking-widest">Select a shop or create new one to manage</div>}
             </Card>
          </TabsContent>

          <TabsContent value="menu">
             <div className="space-y-8">
                {selectedRestaurant ? (
                  <>
                    <Card className="rounded-[3rem] bg-card p-10 border shadow-xl">
                      <h2 className="text-3xl font-black italic mb-8 uppercase tracking-tighter">Add Menu Item</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <Input placeholder="Item Name" value={newDish.name} onChange={e => setNewDish({...newDish, name: e.target.value})} className="h-14 rounded-2xl font-black bg-muted/10" />
                          <Input type="number" placeholder="Price" value={newDish.price} onChange={e => setNewDish({...newDish, price: parseFloat(e.target.value) || 0})} className="h-14 rounded-2xl font-black bg-muted/10" />
                        </div>
                        <div className="space-y-6">
                          <div className="flex gap-2">
                            <Input placeholder="Image URL" value={newDish.image} onChange={e => setNewDish({...newDish, image: e.target.value})} className="h-14 rounded-2xl font-black bg-muted/10 flex-1" />
                            <Button variant="outline" onClick={() => startCamera("dish")} className="h-14 rounded-2xl"><Camera className="w-5 h-5" /></Button>
                          </div>
                          {newDish.image?.startsWith("http") || newDish.image?.startsWith("data") ? (
                            <div className="relative w-24 h-24 rounded-2xl overflow-hidden border">
                              <Image src={newDish.image!} alt="dish" fill unoptimized className="object-cover" />
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <Button onClick={handleAddDish} className="w-full h-16 rounded-2xl font-black text-xl mt-10">Add To Menu</Button>
                    </Card>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {selectedRestaurant.dishes?.map((dish) => (
                        <Card key={dish.id} className="p-6 rounded-[2rem] flex items-center gap-6">
                          <div className="relative w-20 h-20 rounded-xl overflow-hidden">
                            <Image src={dish.image} alt={dish.name} fill unoptimized className="object-cover" />
                          </div>
                          <div className="flex-1"><h4 className="font-black text-lg text-primary">{dish.name}</h4><p className="text-xs font-bold">Rs. {dish.price}</p></div>
                          <Button onClick={() => handleDeleteDish(dish.id)} variant="ghost" className="text-destructive"><Trash2 className="w-5 h-5" /></Button>
                        </Card>
                      ))}
                    </div>
                  </>
                ) : <div className="text-center py-20 font-black text-muted-foreground uppercase text-[10px]">Select a shop to manage menu</div>}
             </div>
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="inspirations">
              <Card className="rounded-[3rem] bg-card p-10 border shadow-xl">
                <h2 className="text-3xl font-black italic mb-8 uppercase tracking-tighter">Global Inspirations</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                  <div className="space-y-6">
                    <Input placeholder="Name (e.g. Biryani)" value={newInspiration.name} onChange={e => setNewInspiration({...newInspiration, name: e.target.value})} className="h-14 rounded-2xl font-black bg-muted/10" />
                    <div className="flex gap-2">
                      <Input placeholder="Image URL" value={newInspiration.image} onChange={e => setNewInspiration({...newInspiration, image: e.target.value})} className="h-14 rounded-2xl font-black bg-muted/10 flex-1" />
                      <Button variant="outline" onClick={() => startCamera("inspiration")} className="h-14 rounded-2xl"><Camera className="w-5 h-5" /></Button>
                    </div>
                    <Button onClick={handleSaveInspiration} className="w-full h-16 rounded-2xl font-black uppercase">{editingInspiration ? "Update" : "Add"} Inspiration</Button>
                  </div>
                  {newInspiration.image?.startsWith("http") || newInspiration.image?.startsWith("data") ? (
                    <div className="relative aspect-video rounded-3xl overflow-hidden border-4 border-primary/20">
                      <Image src={newInspiration.image!} alt="insp" fill unoptimized className="object-cover" />
                    </div>
                  ) : null}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {inspirations?.map((item) => (
                    <Card key={item.id} className="p-6 rounded-[2rem] flex flex-col items-center gap-4 text-center">
                      <div className="relative w-32 h-32 rounded-[2rem] overflow-hidden">
                        <Image src={item.image} alt={item.name} fill unoptimized className="object-cover" />
                      </div>
                      <h4 className="font-black text-xl italic text-primary uppercase">{item.name}</h4>
                      <div className="flex gap-2 w-full">
                        <Button onClick={() => { setEditingInspiration(item.id); setNewInspiration({ name: item.name, image: item.image }); }} variant="outline" size="sm" className="flex-1 font-black text-[10px]">Edit</Button>
                        <Button onClick={() => deleteDoc(doc(firestore, "inspirations", item.id))} variant="destructive" size="sm" className="flex-1 font-black text-[10px]">Remove</Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Create Restaurant Dialog */}
        <Dialog open={showCreateResDialog} onOpenChange={setShowCreateResDialog}>
          <DialogContent className="rounded-[3rem] p-10 max-w-2xl">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-4xl font-black italic uppercase">New Shop</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <Input placeholder="Shop Name" value={newResData.name} onChange={e => setNewResData({...newResData, name: e.target.value})} className="h-14 rounded-2xl font-black bg-muted/10" />
                <Input placeholder="Cuisine" value={newResData.cuisine} onChange={e => setNewResData({...newResData, cuisine: e.target.value})} className="h-14 rounded-2xl font-black bg-muted/10" />
                <Button onClick={handleCreateRestaurant} className="w-full h-16 rounded-2xl font-black text-xl">Create</Button>
              </div>
              <div className="space-y-6">
                <div className="flex gap-2">
                  <Input placeholder="Image URL" value={newResData.image} onChange={e => setNewResData({...newResData, image: e.target.value})} className="h-14 rounded-2xl font-black bg-muted/10 flex-1" />
                  <Button variant="outline" onClick={() => startCamera("newRes")} className="h-14 rounded-2xl"><Camera className="w-5 h-5" /></Button>
                </div>
                {newResData.image?.startsWith("http") || newResData.image?.startsWith("data") ? (
                  <div className="relative aspect-video rounded-2xl overflow-hidden border">
                    <Image src={newResData.image} alt="preview" fill unoptimized className="object-cover" />
                  </div>
                ) : null}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Camera Dialog */}
        <Dialog open={showCamera} onOpenChange={(open) => !open && stopCamera()}>
          <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden bg-black">
            <DialogHeader>
              <DialogTitle className="sr-only">Camera</DialogTitle>
            </DialogHeader>
            <div className="relative aspect-[3/4] w-full bg-black flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute top-6 right-6 z-20"><Button variant="ghost" size="icon" onClick={stopCamera} className="text-white"><X className="w-6 h-6" /></Button></div>
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
                <Button onClick={capturePhoto} className="w-20 h-20 rounded-full bg-white border-4 border-primary p-0 flex items-center justify-center"><Camera className="w-10 h-10 text-primary" /></Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><RefreshCw className="animate-spin" /></div>}>
      <AdminDashboardContent />
    </Suspense>
  );
}
