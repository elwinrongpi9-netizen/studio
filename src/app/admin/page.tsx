
"use client";

import { Navbar } from "@/components/navbar";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { useMemo, useState } from "react";
import { Restaurant, WithdrawalRequest } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Edit2, Loader2, Save, X, Globe, Shield, ArrowDownToLine, Banknote, User, CheckCircle2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

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

  const withdrawalsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "withdrawalRequests"), orderBy("createdAt", "desc"));
  }, [firestore]);

  const { data: restaurants, loading: resLoading } = useCollection<Restaurant>(restaurantsQuery);
  const { data: withdrawals, loading: withdrawLoading } = useCollection<WithdrawalRequest>(withdrawalsQuery);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Restaurant>>({});

  if (userLoading || resLoading || withdrawLoading) {
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
    if (!firestore) return;
    try {
      const resRef = doc(firestore, "restaurants", id);
      await updateDoc(resRef, editForm);
      setEditingId(null);
      toast({ title: "Updated!", description: `${editForm.name} updated successfully.` });
    } catch (e) {
      toast({ title: "Error", description: "Failed to update restaurant.", variant: "destructive" });
    }
  };

  const handleWithdrawalStatus = async (id: string, status: 'Completed' | 'Rejected') => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, "withdrawalRequests", id), { status });
      toast({ 
        title: `Request ${status}`, 
        description: status === 'Completed' ? "Payment marked as sent!" : "Request rejected." 
      });
    } catch (e) {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
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
            <p className="text-muted-foreground font-medium mt-2">Manage zomatokarbi.com ecosystem</p>
          </div>
        </div>

        <Tabs defaultValue="withdrawals" className="space-y-8">
          <TabsList className="bg-muted p-1 rounded-2xl">
            <TabsTrigger value="withdrawals" className="rounded-xl font-bold px-6 flex gap-2">
              Withdrawals 
              {withdrawals.filter(w => w.status === 'Pending').length > 0 && (
                <span className="bg-primary text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                  {withdrawals.filter(w => w.status === 'Pending').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="restaurants" className="rounded-xl font-bold px-6">Restaurants</TabsTrigger>
            <TabsTrigger value="config" className="rounded-xl font-bold px-6">Gateway Status</TabsTrigger>
          </TabsList>

          <TabsContent value="withdrawals">
            <div className="space-y-4">
              <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 mb-6">
                <p className="text-xs font-bold text-primary flex items-center gap-2">
                  <Shield className="w-4 h-4" /> 
                  Owner Tip: Manual PhonePe payment ke baad hi "Mark Paid" click karein.
                </p>
              </div>
              
              {withdrawals.length === 0 ? (
                <div className="text-center py-20 bg-muted/20 rounded-[2rem] border-2 border-dashed">
                  <Banknote className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                  <p className="font-bold text-muted-foreground">No withdrawal requests found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {withdrawals.map((req) => (
                    <Card key={req.id} className="rounded-3xl border shadow-sm overflow-hidden bg-white">
                      <div className="flex flex-col md:flex-row md:items-center justify-between p-6 gap-6">
                        <div className="flex items-center gap-4">
                          <div className={`p-4 rounded-2xl ${req.status === 'Pending' ? 'bg-orange-100' : 'bg-green-100'}`}>
                            <ArrowDownToLine className={`w-6 h-6 ${req.status === 'Pending' ? 'text-orange-600' : 'text-green-600'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-black text-2xl">₹{req.amount}</h3>
                              <Badge className={`rounded-full px-3 text-[10px] font-black uppercase ${
                                req.status === 'Pending' ? 'bg-orange-500' : 
                                req.status === 'Completed' ? 'bg-green-600' : 'bg-destructive'
                              }`}>
                                {req.status}
                              </Badge>
                            </div>
                            <p className="text-xs font-bold text-muted-foreground mt-1 flex items-center gap-1">
                              <User className="w-3 h-3" /> {req.userEmail}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <p className="text-sm font-black text-primary bg-primary/5 px-3 py-1 rounded-lg border border-primary/10 select-all">
                                UPI ID: {req.upiId}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {req.status === 'Pending' && (
                            <>
                              <Button 
                                onClick={() => handleWithdrawalStatus(req.id, 'Completed')}
                                className="rounded-xl font-bold bg-green-600 hover:bg-green-700 gap-2 h-12 px-6"
                              >
                                <CheckCircle2 className="w-4 h-4" /> Mark Paid
                              </Button>
                              <Button 
                                variant="outline"
                                onClick={() => handleWithdrawalStatus(req.id, 'Rejected')}
                                className="rounded-xl font-bold text-destructive hover:text-destructive border-destructive/20 h-12"
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          <div className="text-right">
                             <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                              {new Date(req.createdAt).toLocaleDateString()}
                            </span>
                             <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                              {new Date(req.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="restaurants">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {restaurants.map((res) => (
                <Card key={res.id} className="overflow-hidden border-2 hover:border-primary/20 transition-all group rounded-3xl bg-white shadow-sm">
                  <div className="relative h-48">
                    <Image src={res.image} alt={res.name} fill className="object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      <Button size="icon" variant="secondary" onClick={() => handleEdit(res)} className="rounded-full shadow-lg">
                        <Edit2 className="w-4 h-4" />
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
          </TabsContent>

          <TabsContent value="config">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="border-primary/20 bg-primary/5 rounded-3xl overflow-hidden shadow-sm">
                <CardHeader className="bg-primary/10 border-b border-primary/10 py-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary" />
                    PhonePe Business Sync
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Merchant Name</Label>
                    <p className="font-bold text-lg text-foreground">Rongpi Chinese Wok</p>
                  </div>
                  <div>
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Category Code (MC)</Label>
                    <p className="font-bold text-sm text-primary">5812 (Restaurant & Eating Places)</p>
                  </div>
                  <div className="bg-white/50 p-4 rounded-2xl border border-dashed border-primary/20">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Official **MC 5812** and **Mode 02** are active. Transactions are optimized for real-time visibility in your PhonePe Business dashboard.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
