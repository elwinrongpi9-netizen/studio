
"use client";

import { Navbar } from "@/components/navbar";
import { useUser, useFirestore, useCollection, useDoc } from "@/firebase";
import { collection, doc, updateDoc, query, orderBy, setDoc, limit, onSnapshot, deleteDoc } from "firebase/firestore";
import { useMemo, useState, useEffect, useRef, Suspense } from "react";
import { Restaurant, WithdrawalRequest, Dish, UserProfile, Inspiration } from "@/lib/types";
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
  Trash2,
  Edit3,
  Loader2,
  Store,
  Sparkles,
  X,
  Camera,
  Info
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
  const [newDish, setNewDish] = useState<Partial<Dish>>({ name: "", description: "", price: 0, category: "Starters", image: "", inStock: true });
  const [newInspiration, setNewInspiration] = useState<Partial<Inspiration>>({ name: "", image: "", hint: "" });
  const [editingInspiration, setEditingInspiration] = useState<string | null>(null);

  const [showCamera, setShowCamera] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<"dish" | "inspiration" | "shop" | "newRes">("dish");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  const inspirationsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "inspirations"), orderBy("name"));
  }, [firestore]);

  const { data: allRestaurants } = useCollection<Restaurant>(restaurantsQuery);
  const { data: withdrawals } = useCollection<WithdrawalRequest>(withdrawalsQuery);
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
    toast({ title: "NEW ORDER RECEIVED! 🔔", description: "Check the logs for details." });
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
      rating: 4.5,
      deliveryTime: "30 min",
      priceRange: "₹₹",
      dishes: []
    });
    toast({ title: "Restaurant Created! 🏪" });
    setNewResData({ name: "", cuisine: "", image: "" });
    setShowCreateResDialog(false);
    setSelectedResId(resId);
  };

  const handleUpdateShopProfile = async () => {
    if (!firestore || !selectedResId || !shopEdit.name || !shopEdit.image) {
      toast({ title: "Name or Image missing", variant: "destructive" });
      return;
    }
    await updateDoc(doc(firestore, "restaurants", selectedResId), {
      name: shopEdit.name,
      cuisine: shopEdit.cuisine,
      image: shopEdit.image
    });
    toast({ title: "Shop Profile Updated! 🏪" });
  };

  const handleAddDish = async () => {
    if (!firestore || !selectedResId || !newDish.name || !newDish.image) {
      toast({ title: "Details or Image missing", variant: "destructive" });
      return;
    }
    const res = visibleRestaurants?.find(r => r.id === selectedResId);
    if (!res) return;
    const dishToAdd = { ...newDish, id: `dish_${Date.now()}`, description: newDish.description || "", price: newDish.price || 0, inStock: newDish.inStock ?? true } as Dish;
    const updatedDishes = [...(res.dishes || []), dishToAdd];
    updateDoc(doc(firestore, "restaurants", selectedResId), { dishes: updatedDishes });
    toast({ title: "Item Added! 🎉" });
    setNewDish({ name: "", description: "", price: 0, category: "Starters", image: "", inStock: true });
  };

  const handleDeleteDish = async (dishId: string) => {
    if (!firestore || !selectedResId || !selectedRestaurant) return;
    const updatedDishes = (selectedRestaurant.dishes || []).filter(d => d.id !== dishId);
    updateDoc(doc(firestore, "restaurants", selectedResId), { dishes: updatedDishes });
    toast({ title: "Item Removed" });
  };

  const handleSaveInspiration = async () => {
    if (!firestore || !newInspiration.name || !newInspiration.image) {
      toast({ title: "Name or Image missing", variant: "destructive" });
      return;
    }
    if (editingInspiration) {
      await updateDoc(doc(firestore, "inspirations", editingInspiration), { name: newInspiration.name, image: newInspiration.image, hint: newInspiration.hint || "" });
      toast({ title: "Inspiration Updated! ✨" });
    } else {
      const id = `insp_${Date.now()}`;
      await setDoc(doc(firestore, "inspirations", id), { id, name: newInspiration.name, image: newInspiration.image, hint: newInspiration.hint || "" });
      toast({ title: "Inspiration Added! ✨" });
    }
    setNewInspiration({ name: "", image: "", hint: "" });
    setEditingInspiration(null);
  };

  const startCamera = async (target: "dish" | "inspiration" | "shop" | "newRes") => {
    setCameraTarget(target);
    setShowCamera(true);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast({ title: "Camera Not Supported", variant: "destructive" });
      setShowCamera(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn("Video play failed", e));
      }
    } catch (err) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.warn("Video play failed", e));
        }
      } catch (err2) {
        toast({ title: "Camera Permission Denied", variant: "destructive" });
        setShowCamera(false);
      }
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
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        if (cameraTarget === "dish") setNewDish({ ...newDish, image: dataUrl });
        else if (cameraTarget === "shop") setShopEdit({ ...shopEdit, image: dataUrl });
        else if (cameraTarget === "newRes") setNewResData({ ...newResData, image: dataUrl });
        else setNewInspiration({ ...newInspiration, image: dataUrl });
        stopCamera();
        toast({ title: "Photo Captured! 📸" });
      }
    }
  };

  const isValidUrl = (url: string | undefined) => {
    if (!url) return false;
    if (url.startsWith('data:image/')) return true;
    return url.startsWith('http://') || url.startsWith('https://');
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
              {isSuperAdmin ? "Master Control" : "Partner Profile"}
            </h1>
            <div className="flex items-center gap-3 mt-4">
              <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">
                {isSuperAdmin ? "Super Admin Access" : `Managing: ${selectedRestaurant?.name || 'Assigned Restaurant'}`}
              </p>
              <button 
                onClick={toggleAudio}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                  isAudioEnabled ? 'bg-green-500 text-white shadow-lg' : 'bg-muted text-muted-foreground'
                }`}
              >
                {isAudioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                {isAudioEnabled ? "Audio On" : "Audio Off"}
              </button>
            </div>
          </div>
          {isRinging && <Badge className="bg-primary p-4 animate-pulse uppercase font-black text-xs">NEW ORDER! 🔔</Badge>}
        </div>

        <Tabs defaultValue="payments" className="space-y-8">
          <TabsList className="bg-card p-1.5 rounded-[1.5rem] h-16 w-full md:w-auto border border-border overflow-x-auto no-scrollbar shadow-sm">
            <TabsTrigger value="payments" className="rounded-xl font-black px-8 h-12 flex gap-2 data-[state=active]:bg-primary shrink-0">Orders</TabsTrigger>
            <TabsTrigger value="profile" className="rounded-xl font-black px-8 h-12 flex gap-2 data-[state=active]:bg-primary shrink-0">Shop Profile</TabsTrigger>
            <TabsTrigger value="menu" className="rounded-xl font-black px-8 h-12 flex gap-2 data-[state=active]:bg-primary shrink-0">Menu</TabsTrigger>
            {isSuperAdmin && <TabsTrigger value="inspirations" className="rounded-xl font-black px-8 h-12 flex gap-2 data-[state=active]:bg-primary shrink-0">Inspirations</TabsTrigger>}
          </TabsList>

          <TabsContent value="payments">
            <Card className="rounded-[2.5rem] border border-border bg-card overflow-hidden shadow-xl">
              <div className="p-8 border-b border-border bg-muted/30">
                 <h3 className="font-black text-xl uppercase tracking-widest flex items-center gap-3"><TrendingUp className="w-6 h-6 text-primary" /> Recent Orders</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">Order ID</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">Customer</th>
                      {isSuperAdmin && <th className="p-6 text-[10px] font-black uppercase tracking-widest">Restaurant</th>}
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">Status</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phonepeOrders?.filter(o => isSuperAdmin || o.restaurantId === managedResId).map((order) => (
                      <tr key={order.id} className="border-b border-border hover:bg-muted/20">
                        <td className="p-6 font-mono font-bold text-xs text-primary">{order.order_id}</td>
                        <td className="p-6 font-black text-sm">{order.udf1}</td>
                        {isSuperAdmin && <td className="p-6 font-black text-xs uppercase italic">{order.restaurantName}</td>}
                        <td className="p-6">
                          <Badge className="rounded-full px-4 py-1 text-[9px] font-black uppercase tracking-widest">{order.status || 'Received'}</Badge>
                        </td>
                        <td className="p-6 flex flex-col gap-2">
                           {!order.status || order.status === 'Received' ? <Button onClick={() => updateOrderStatus(order, "Preparing")} size="sm" className="bg-orange-500 font-black rounded-xl text-[9px] h-8 uppercase">Accept</Button> : null}
                           {order.status === "Preparing" ? <Button onClick={() => updateOrderStatus(order, "Cooking")} size="sm" className="bg-yellow-600 font-black rounded-xl text-[9px] h-8 uppercase">Cook</Button> : null}
                           {order.status === "Cooking" ? <Button onClick={() => updateOrderStatus(order, "On the Way")} size="sm" className="bg-blue-500 font-black rounded-xl text-[9px] h-8 uppercase">Deliver</Button> : null}
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
             <Card className="rounded-[3rem] bg-card p-10 border border-border shadow-xl">
               <div className="flex items-center justify-between mb-10">
                 <h2 className="text-3xl font-black italic flex items-center gap-3 uppercase tracking-tighter">Shop Profile</h2>
                 {isSuperAdmin && <Button onClick={() => setShowCreateResDialog(true)} className="rounded-2xl font-black uppercase h-14 px-8"><Plus className="w-5 h-5 mr-2" /> New Shop</Button>}
               </div>
               {isSuperAdmin && (
                  <div className="mb-10 p-6 bg-muted/20 rounded-2xl border border-border flex items-center gap-6">
                    <Label className="text-[10px] font-black uppercase tracking-widest">Select Shop To Manage</Label>
                    <select value={selectedResId} onChange={(e) => setSelectedResId(e.target.value)} className="bg-transparent font-black text-primary focus:outline-none flex-1">
                      <option value="">Choose Restaurant</option>
                      {visibleRestaurants?.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
               )}
               {selectedRestaurant ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="space-y-6">
                     <Input value={shopEdit.name} onChange={e => setShopEdit({...shopEdit, name: e.target.value})} className="h-14 rounded-2xl font-black bg-muted/10" placeholder="Restaurant Name" />
                     <Input value={shopEdit.cuisine} onChange={e => setShopEdit({...shopEdit, cuisine: e.target.value})} className="h-14 rounded-2xl font-black bg-muted/10" placeholder="Cuisine / Tagline" />
                     <Button onClick={handleUpdateShopProfile} className="w-full h-16 rounded-2xl font-black text-xl shadow-xl"><Save className="w-6 h-6 mr-3" /> Save Changes</Button>
                   </div>
                   <div className="space-y-6">
                     <div className="flex gap-2">
                       <Input value={shopEdit.image} onChange={e => setShopEdit({...shopEdit, image: e.target.value})} className="h-14 rounded-2xl font-black bg-muted/10 flex-1" placeholder="Header Image URL" />
                       <Button variant="outline" onClick={() => startCamera("shop")} className="h-14 rounded-2xl"><Camera className="w-5 h-5" /></Button>
                     </div>
                     {isValidUrl(shopEdit.image) && (
                       <div className="relative aspect-video rounded-3xl overflow-hidden border-4 border-primary/20">
                         <Image src={shopEdit.image} alt="Shop" fill unoptimized className="object-cover" />
                       </div>
                     )}
                   </div>
                 </div>
               ) : <div className="text-center py-20 font-black text-muted-foreground uppercase text-xs">Please select or create a shop</div>}
             </Card>
          </TabsContent>

          <TabsContent value="menu">
             <div className="space-y-8">
                {selectedRestaurant ? (
                  <>
                    <Card className="rounded-[3rem] bg-card p-10 border border-border shadow-xl">
                      <h2 className="text-3xl font-black italic mb-8 uppercase tracking-tighter">Add New Item</h2>
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
                          {isValidUrl(newDish.image) && <div className="relative w-24 h-24 rounded-2xl overflow-hidden border"><Image src={newDish.image!} alt="dish" fill unoptimized className="object-cover" /></div>}
                        </div>
                      </div>
                      <Button onClick={handleAddDish} className="w-full h-16 rounded-2xl font-black text-xl mt-10">Add To Menu</Button>
                    </Card>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {selectedRestaurant.dishes?.map((dish) => (
                        <Card key={dish.id} className="p-6 rounded-[2rem] flex items-center gap-6">
                          <div className="relative w-20 h-20 rounded-xl overflow-hidden"><Image src={dish.image} alt={dish.name} fill unoptimized className="object-cover" /></div>
                          <div className="flex-1"><h4 className="font-black text-lg text-primary">{dish.name}</h4><p className="text-xs font-bold">Rs. {dish.price}</p></div>
                          <Button onClick={() => handleDeleteDish(dish.id)} variant="ghost" className="text-destructive"><Trash2 className="w-5 h-5" /></Button>
                        </Card>
                      ))}
                    </div>
                  </>
                ) : <div className="text-center py-20 font-black text-muted-foreground uppercase text-xs">Select a shop to manage menu</div>}
             </div>
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="inspirations">
              <Card className="rounded-[3rem] bg-card p-10 border border-border shadow-xl">
                <h2 className="text-3xl font-black italic mb-8 uppercase tracking-tighter">Manage Signature Inspirations</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                  <div className="space-y-6">
                    <Input placeholder="Category Name (e.g. Biryani)" value={newInspiration.name} onChange={e => setNewInspiration({...newInspiration, name: e.target.value})} className="h-14 rounded-2xl font-black bg-muted/10" />
                    <div className="flex gap-2">
                      <Input placeholder="Image URL" value={newInspiration.image} onChange={e => setNewInspiration({...newInspiration, image: e.target.value})} className="h-14 rounded-2xl font-black bg-muted/10 flex-1" />
                      <Button variant="outline" onClick={() => startCamera("inspiration")} className="h-14 rounded-2xl"><Camera className="w-5 h-5" /></Button>
                    </div>
                    <Button onClick={handleSaveInspiration} className="w-full h-16 rounded-2xl font-black uppercase">{editingInspiration ? "Update Inspiration" : "Add Inspiration"}</Button>
                  </div>
                  {isValidUrl(newInspiration.image) && <div className="relative aspect-video rounded-3xl overflow-hidden border-4 border-primary/20"><Image src={newInspiration.image!} alt="insp" fill unoptimized className="object-cover" /></div>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {inspirations?.map((item) => (
                    <Card key={item.id} className="p-6 rounded-[2rem] flex flex-col items-center gap-4 text-center">
                      <div className="relative w-32 h-32 rounded-[2rem] overflow-hidden"><Image src={item.image} alt={item.name} fill unoptimized className="object-cover" /></div>
                      <h4 className="font-black text-xl italic text-primary uppercase">{item.name}</h4>
                      <div className="flex gap-2 w-full">
                        <Button onClick={() => { setEditingInspiration(item.id); setNewInspiration({ name: item.name, image: item.image, hint: item.hint }); }} variant="outline" size="sm" className="flex-1 font-black uppercase text-[10px]">Edit</Button>
                        <Button onClick={() => deleteDoc(doc(firestore, "inspirations", item.id))} variant="destructive" size="sm" className="flex-1 font-black uppercase text-[10px]">Remove</Button>
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
            <DialogHeader className="mb-8"><DialogTitle className="text-4xl font-black italic uppercase">Create New Shop</DialogTitle></DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <Input placeholder="Shop Name" value={newResData.name} onChange={e => setNewResData({...newResData, name: e.target.value})} className="h-14 rounded-2xl font-black bg-muted/10" />
                <Input placeholder="Cuisine / Tagline" value={newResData.cuisine} onChange={e => setNewResData({...newResData, cuisine: e.target.value})} className="h-14 rounded-2xl font-black bg-muted/10" />
                <Button onClick={handleCreateRestaurant} className="w-full h-16 rounded-2xl font-black text-xl">Create Shop</Button>
              </div>
              <div className="space-y-6">
                <div className="flex gap-2">
                  <Input placeholder="Header Image URL" value={newResData.image} onChange={e => setNewResData({...newResData, image: e.target.value})} className="h-14 rounded-2xl font-black bg-muted/10 flex-1" />
                  <Button variant="outline" onClick={() => startCamera("newRes")} className="h-14 rounded-2xl"><Camera className="w-5 h-5" /></Button>
                </div>
                {isValidUrl(newResData.image) && <div className="relative aspect-video rounded-2xl overflow-hidden border"><Image src={newResData.image} alt="preview" fill unoptimized className="object-cover" /></div>}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Camera Dialog */}
        <Dialog open={showCamera} onOpenChange={(open) => !open && stopCamera()}>
          <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden bg-black border-none">
            <div className="relative aspect-[3/4] w-full bg-black flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute top-6 right-6 z-20"><Button variant="ghost" size="icon" onClick={stopCamera} className="text-white"><X className="w-6 h-6" /></Button></div>
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
                <Button onClick={capturePhoto} className="w-20 h-20 rounded-full bg-white border-4 border-primary shadow-2xl p-0 flex items-center justify-center">
                  <Camera className="w-10 h-10 text-primary" />
                </Button>
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>}>
      <AdminDashboardContent />
    </Suspense>
  );
}
