
"use client";

import { Navbar } from "@/components/navbar";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useMemo, useState, useEffect } from "react";
import { Restaurant } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Plus, Trash2, Edit2, Loader2, Save, X, Globe, Settings, ExternalLink, CheckCircle2, AlertCircle, CreditCard, Shield } from "lucide-center";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";

const ADMIN_EMAIL = "zomatokarbi@gmail.com";

export default function AdminPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [currentHostname, setCurrentHostname] = useState<string>("");
  
  const restaurantsQuery = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, "restaurants");
  }, [firestore]);

  const { data: restaurants, loading: resLoading } = useCollection<Restaurant>(restaurantsQuery);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Restaurant>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentHostname(window.location.hostname);
    }
  }, []);

  if (userLoading || resLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="font-bold text-muted-foreground">Accessing Admin Panel...</p>
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
          <h1 className="text-4xl font-black mb-4">Access Denied</h1>
          <p className="text-muted-foreground text-lg mb-8">This area is restricted to authorized administrators only.</p>
          <Button onClick={() => router.push("/")} className="rounded-xl px-8 font-bold">Return Home</Button>
        </div>
      </div>
    );
  }

  const handleEdit = (res: Restaurant) => {
    setEditingId(res.id);
    setEditForm(res);
  };

  const handleSave = async (id: string) => {
    try {
      const resRef = doc(firestore, "restaurants", id);
      await updateDoc(resRef, editForm);
      setEditingId(null);
      toast({ title: "Updated!", description: `${editForm.name} updated successfully.` });
    } catch (e) {
      toast({ title: "Error", description: "Failed to update restaurant.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this restaurant?")) return;
    try {
      await deleteDoc(doc(firestore, "restaurants", id));
      toast({ title: "Deleted", description: "Restaurant removed from database." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-black flex items-center gap-3">
              <ShieldCheck className="w-10 h-10 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground font-medium mt-2">Manage zomatokarbi.com restaurant network</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Site Config Card */}
          <Card className="lg:col-span-2 border-primary/20 bg-primary/5 rounded-3xl overflow-hidden shadow-sm">
            <CardHeader className="bg-primary/10 border-b border-primary/10 py-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                Live Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Main Website URL</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="bg-white px-3 py-2 rounded-lg border flex-1 text-xs font-bold text-primary">https://zomatokarbi.com</code>
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Merchant Name</Label>
                    <p className="font-bold text-sm text-foreground">Rongpi Chinese Wok</p>
                  </div>
                </div>
                <div className="bg-white/50 p-4 rounded-2xl border border-dashed border-primary/20 flex flex-col justify-center">
                  <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" /> Secure Mode 02 Active
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    App ab official **Merchant Category Code (5812)** aur **Secure Mode 02** use kar raha hai PhonePe Business settlements ke liye.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Settings Card */}
          <Card className="border-green-600/20 bg-green-50 rounded-3xl overflow-hidden shadow-sm">
            <CardHeader className="bg-green-600/10 border-b border-green-600/10 py-4">
              <CardTitle className="text-lg flex items-center gap-2 text-green-700">
                <CreditCard className="w-5 h-5" />
                Gateway Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Verified VPA</Label>
                  <p className="font-bold text-sm text-green-800 mt-1 truncate">Q297152786@ybl</p>
                </div>
                <div>
                  <Label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Settlement Type</Label>
                  <div className="flex items-center gap-2 mt-1">
                     <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                     <span className="text-[10px] font-black uppercase text-green-700">PhonePe Business Dashboard</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-green-600/10">
                   <p className="text-[10px] text-green-600 font-bold leading-tight italic">
                     *MC 5812 Match Active. Transactions reflect real-time in merchant dashboard.
                   </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black">Restaurant Network ({restaurants.length})</h2>
          <div className="h-px flex-1 mx-6 bg-border" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {restaurants.map((res) => (
            <Card key={res.id} className="overflow-hidden border-2 hover:border-primary/20 transition-all group rounded-3xl bg-white shadow-sm">
              <div className="relative h-48">
                <Image src={res.image} alt={res.name} fill className="object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <Button size="icon" variant="secondary" onClick={() => handleEdit(res)} className="rounded-full shadow-lg">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="destructive" onClick={() => handleDelete(res.id)} className="rounded-full shadow-lg">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-6">
                {editingId === res.id ? (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-black uppercase">Name</Label>
                      <Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="rounded-xl" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-black uppercase">Cuisine</Label>
                      <Input value={editForm.cuisine} onChange={e => setEditForm({...editForm, cuisine: e.target.value})} className="rounded-xl" />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={() => handleSave(res.id)} className="flex-1 rounded-xl h-10 font-bold gap-2">
                        <Save className="w-4 h-4" /> Save
                      </Button>
                      <Button onClick={() => setEditingId(null)} variant="outline" className="rounded-xl h-10 px-3">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-black text-xl truncate pr-4">{res.name}</h3>
                      <span className="bg-green-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 flex-shrink-0">
                        {res.rating}★
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground font-medium mb-4">{res.cuisine}</p>
                    <div className="flex justify-between text-xs font-bold text-muted-foreground border-t pt-4">
                      <span>{res.deliveryTime}</span>
                      <span className="text-foreground">₹{res.priceForTwo} for two</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
