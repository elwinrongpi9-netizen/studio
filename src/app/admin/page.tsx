
"use client";

import { Navbar } from "@/components/navbar";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { useMemo, useState } from "react";
import { Restaurant } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Plus, Trash2, Edit2, Loader2, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { useRouter } from "next/navigation";

const ADMIN_EMAIL = "zomatokarbi@gmail.com";

export default function AdminPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  const restaurantsQuery = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, "restaurants");
  }, [firestore]);

  const { data: restaurants, loading: resLoading } = useCollection<Restaurant>(restaurantsQuery);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Restaurant>>({});

  if (userLoading || resLoading) {
    return (
      <>
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="font-bold text-muted-foreground">Accessing Admin Panel...</p>
        </div>
      </>
    );
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <>
        <Navbar />
        <div className="flex-1 container mx-auto px-4 py-20 text-center">
          <ShieldCheck className="w-20 h-20 text-destructive mx-auto mb-6" />
          <h1 className="text-4xl font-black mb-4">Access Denied</h1>
          <p className="text-muted-foreground text-lg mb-8">This area is restricted to authorized administrators only.</p>
          <Button onClick={() => router.push("/")} className="rounded-xl px-8 font-bold">Return Home</Button>
        </div>
      </>
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
    <>
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-6xl">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-black flex items-center gap-3">
              <ShieldCheck className="w-10 h-10 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground font-medium mt-2">Manage zomatokarbi.com restaurant network</p>
          </div>
          <Button className="rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" /> Add Restaurant
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {restaurants.map((res) => (
            <Card key={res.id} className="overflow-hidden border-2 hover:border-primary/20 transition-all group">
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
                      <Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-black uppercase">Cuisine</Label>
                      <Input value={editForm.cuisine} onChange={e => setEditForm({...editForm, cuisine: e.target.value})} />
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
                      <span className="bg-green-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-1">
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
    </>
  );
}
