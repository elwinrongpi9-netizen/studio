
"use client";

import { Navbar } from "@/components/navbar";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { useMemo, useState } from "react";
import { Restaurant, WithdrawalRequest } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Edit2, Loader2, Save, X, Globe, Shield, ArrowDownToLine, Banknote, User, CheckCircle2, Copy, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
          <p className="font-bold text-muted-foreground uppercase text-xs tracking-widest">Admin Command Center...</p>
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
          <h1 className="text-4xl font-black mb-4">Unauthorized Access</h1>
          <p className="text-muted-foreground mb-8">This page is only for the owner: {ADMIN_EMAIL}</p>
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
      toast({ title: "Updated!", description: "Restaurant info saved." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to update.", variant: "destructive" });
    }
  };

  const handleWithdrawalStatus = async (id: string, status: 'Completed' | 'Rejected') => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, "withdrawalRequests", id), { status });
      toast({ title: `Request ${status}`, description: status === 'Completed' ? "Settlement Success!" : "Request Denied." });
    } catch (e) {
      toast({ title: "Error", description: "Status update failed.", variant: "destructive" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "UPI Copied!", description: "Paste it in your PhonePe app to pay." });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-black flex items-center gap-3">
              <ShieldCheck className="w-10 h-10 text-primary" />
              Admin Control
            </h1>
            <p className="text-muted-foreground font-medium mt-2">Manage payouts and restaurant listings</p>
          </div>
        </div>

        <Tabs defaultValue="withdrawals" className="space-y-8">
          <TabsList className="bg-muted p-1 rounded-2xl h-14">
            <TabsTrigger value="withdrawals" className="rounded-xl font-black px-6 h-12 flex gap-3 data-[state=active]:bg-white shadow-sm">
              Withdrawals 
              {withdrawals.filter(w => w.status === 'Pending').length > 0 && (
                <span className="bg-primary text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                  {withdrawals.filter(w => w.status === 'Pending').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="restaurants" className="rounded-xl font-black px-6 h-12">Restaurants</TabsTrigger>
            <TabsTrigger value="config" className="rounded-xl font-black px-6 h-12">System Status</TabsTrigger>
          </TabsList>

          <TabsContent value="withdrawals">
            <div className="space-y-6">
              <div className="bg-primary/5 p-6 rounded-[2rem] border-2 border-primary/10 flex items-center gap-4">
                <Shield className="w-8 h-8 text-primary" />
                <div>
                  <h4 className="font-black text-sm">Settlement Rule (1 Coin = ₹1):</h4>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase leading-relaxed">
                    Step 1: Copy UPI. Step 2: Pay via PhonePe. Step 3: Click "Mark Paid". Payout goal: 24h.
                  </p>
                </div>
              </div>
              
              {withdrawals.length === 0 ? (
                <div className="text-center py-24 bg-muted/20 rounded-[3rem] border-2 border-dashed">
                  <Banknote className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                  <p className="font-bold text-muted-foreground">No withdrawal requests found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {withdrawals.map((req) => (
                    <Card key={req.id} className="rounded-[2.5rem] border-2 shadow-sm overflow-hidden bg-white hover:border-primary/10 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between p-8 gap-8">
                        <div className="flex items-start gap-6">
                          <div className={`p-5 rounded-[1.5rem] ${req.status === 'Pending' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                            <ArrowDownToLine className="w-8 h-8" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-black text-3xl text-foreground">₹{req.amount}</h3>
                              <Badge className={`rounded-full px-4 text-[10px] font-black uppercase ${
                                req.status === 'Pending' ? 'bg-orange-500' : 
                                req.status === 'Completed' ? 'bg-green-600' : 'bg-destructive'
                              }`}>
                                {req.status}
                              </Badge>
                            </div>
                            <p className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                              <User className="w-3 h-3" /> {req.userEmail}
                            </p>
                            <div className="flex items-center gap-2 mt-4">
                              <div className="bg-muted px-4 py-2 rounded-xl flex items-center gap-3 border group">
                                <span className="text-sm font-black text-foreground select-all">{req.upiId}</span>
                                <button 
                                  onClick={() => copyToClipboard(req.upiId)}
                                  className="p-1 hover:bg-primary/10 rounded-lg transition-colors text-primary"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col md:items-end gap-4">
                          {req.status === 'Pending' && (
                            <div className="flex gap-3">
                              <Button 
                                onClick={() => handleWithdrawalStatus(req.id, 'Completed')}
                                className="rounded-2xl font-black bg-green-600 hover:bg-green-700 gap-2 h-14 px-8 shadow-lg shadow-green-600/20"
                              >
                                <CheckCircle2 className="w-5 h-5" /> Mark Paid
                              </Button>
                              <Button 
                                variant="outline"
                                onClick={() => handleWithdrawalStatus(req.id, 'Rejected')}
                                className="rounded-2xl font-black text-destructive hover:text-destructive border-destructive/20 h-14"
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                          <div className="text-right text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                            {new Date(req.createdAt).toLocaleDateString()} at {new Date(req.createdAt).toLocaleTimeString()}
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
                <Card key={res.id} className="overflow-hidden border-2 rounded-[2.5rem] bg-white group shadow-sm">
                  <div className="relative h-52">
                    <Image src={res.image} alt={res.name} fill className="object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button size="icon" variant="secondary" onClick={() => handleEdit(res)} className="rounded-full w-12 h-12">
                        <Edit2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-8">
                    {editingId === res.id ? (
                      <div className="space-y-4">
                        <Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="rounded-xl" />
                        <Input value={editForm.cuisine} onChange={e => setEditForm({...editForm, cuisine: e.target.value})} className="rounded-xl" />
                        <div className="flex gap-2">
                          <Button onClick={() => handleSave(res.id)} className="flex-1 rounded-xl font-black">Save</Button>
                          <Button onClick={() => setEditingId(null)} variant="outline" className="rounded-xl px-4">X</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 className="font-black text-xl mb-1">{res.name}</h3>
                        <p className="text-xs text-muted-foreground font-bold mb-4">{res.cuisine}</p>
                        <div className="flex justify-between items-center text-[10px] font-black text-muted-foreground border-t pt-4 uppercase">
                          <span>Rating: {res.rating}★</span>
                          <span className="text-primary">₹{res.priceForTwo} For Two</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="config">
            <Card className="border-2 border-primary/20 bg-primary/[0.03] rounded-[2.5rem] p-8 shadow-sm max-w-2xl">
              <CardTitle className="text-2xl font-black flex items-center gap-3 mb-6">
                <Globe className="w-8 h-8 text-primary" />
                PhonePe Gateway Config
              </CardTitle>
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border flex justify-between items-center">
                  <div>
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Gateway Mode</Label>
                    <p className="font-black text-lg text-primary">Secure Mode 02</p>
                  </div>
                  <div className="text-right">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Business Cat (MC)</Label>
                    <p className="font-black text-lg text-foreground">5812 (Eating Places)</p>
                  </div>
                </div>
                <div className="bg-primary/10 p-6 rounded-2xl border border-primary/20">
                  <h4 className="font-black text-xs uppercase mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" /> Connection Verified
                  </h4>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase leading-relaxed">
                    Official merchant dashboard sync is active. Transactions with MC 5812 will be processed by PhonePe Business dashboard for real-time settlement tracking.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
