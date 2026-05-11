
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
import { ShieldCheck, Edit2, Loader2, Save, X, Globe, Shield, ArrowDownToLine, Banknote, User, CheckCircle2, Copy, ShieldAlert, Zap, TrendingUp, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

const ADMIN_EMAIL = "elwinrongpi9@gmail.com";

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

  const pendingAmount = useMemo(() => {
    return withdrawals.filter(w => w.status === 'Pending').reduce((acc, curr) => acc + curr.amount, 0);
  }, [withdrawals]);

  if (userLoading || resLoading || withdrawLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="font-bold text-muted-foreground uppercase text-[10px] tracking-widest">Syncing Master Node...</p>
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
          <h1 className="text-4xl font-black mb-4 uppercase italic tracking-tighter">Access Denied</h1>
          <p className="text-muted-foreground mb-8 font-medium">This terminal is only for: <span className="text-foreground font-black">{ADMIN_EMAIL}</span></p>
          <Button onClick={() => router.push("/")} className="rounded-2xl px-12 h-14 font-black uppercase tracking-widest shadow-xl">Return Home</Button>
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
    const resRef = doc(firestore, "restaurants", id);
    updateDoc(resRef, editForm)
      .then(() => {
        setEditingId(null);
        toast({ title: "Updated!", description: "Restaurant info saved successfully." });
      })
      .catch((err) => {
        const permissionError = new FirestorePermissionError({
          path: resRef.path,
          operation: 'update',
          requestResourceData: editForm,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleWithdrawalStatus = async (id: string, status: 'Completed' | 'Rejected') => {
    if (!firestore) return;
    const reqRef = doc(firestore, "withdrawalRequests", id);
    updateDoc(reqRef, { status })
      .then(() => {
        toast({ 
          title: `Success!`, 
          description: status === 'Completed' ? "Request marked as paid. User ledger updated." : "Request rejected.",
          variant: status === 'Completed' ? "default" : "destructive"
        });
      })
      .catch((err) => {
        const permissionError = new FirestorePermissionError({
          path: reqRef.path,
          operation: 'update',
          requestResourceData: { status },
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "UPI Copied!", description: "Paste it in your UPI app to pay the user now." });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-5xl font-black italic tracking-tighter flex items-center gap-4 text-foreground">
              <ShieldCheck className="w-12 h-12 text-primary" />
              Owner Terminal
            </h1>
            <p className="text-muted-foreground font-bold mt-2 uppercase text-[10px] tracking-widest">Manage Restaurant Listings and User Payouts</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-primary/5 px-6 py-4 rounded-2xl border-2 border-primary/10 flex flex-col items-end gap-1">
               <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Pending Payout</span>
               <span className="text-2xl font-black text-primary">₹{pendingAmount}</span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="withdrawals" className="space-y-8">
          <TabsList className="bg-muted p-1.5 rounded-[1.5rem] h-16 w-full md:w-auto">
            <TabsTrigger value="withdrawals" className="rounded-xl font-black px-8 h-12 flex gap-3 data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all">
              Withdrawals 
              {withdrawals.filter(w => w.status === 'Pending').length > 0 && (
                <span className="bg-primary text-white text-[10px] w-6 h-6 rounded-full flex items-center justify-center animate-bounce shadow-lg">
                  {withdrawals.filter(w => w.status === 'Pending').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="restaurants" className="rounded-xl font-black px-8 h-12 transition-all">Listings</TabsTrigger>
            <TabsTrigger value="config" className="rounded-xl font-black px-8 h-12 transition-all">Gateway Config</TabsTrigger>
          </TabsList>

          <TabsContent value="withdrawals">
            <div className="space-y-6">
              <div className="bg-primary/5 p-8 rounded-[2.5rem] border-2 border-primary/10 flex items-center gap-6 relative overflow-hidden group">
                <Info className="w-12 h-12 text-primary opacity-20 group-hover:scale-110 transition-transform" />
                <div className="relative z-10">
                  <h4 className="font-black text-sm uppercase tracking-widest mb-1">Manual Payout Guide:</h4>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase leading-relaxed max-w-2xl">
                    1. Copy User's UPI ID. 2. Open PhonePe/GPay and pay the amount. 3. Click "Success (Mark Paid)" here to update user's history.
                  </p>
                </div>
              </div>
              
              {withdrawals.length === 0 ? (
                <div className="text-center py-32 bg-muted/20 rounded-[4rem] border-4 border-dashed flex flex-col items-center">
                  <Banknote className="w-20 h-20 text-muted-foreground mx-auto mb-6 opacity-5" />
                  <p className="font-black text-muted-foreground uppercase tracking-[0.2em] text-sm italic">Queue Empty</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {withdrawals.map((req) => (
                    <Card key={req.id} className={`rounded-[3rem] border-2 shadow-sm overflow-hidden bg-white transition-all hover:shadow-2xl ${req.status === 'Pending' ? 'border-orange-100 hover:border-primary/20' : 'border-muted opacity-80'}`}>
                      <div className="flex flex-col md:flex-row md:items-center justify-between p-10 gap-8">
                        <div className="flex items-start gap-8">
                          <div className={`p-6 rounded-[2rem] shadow-sm ${req.status === 'Pending' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                            <TrendingUp className="w-10 h-10" />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-4">
                              <h3 className="font-black text-5xl tracking-tighter text-foreground italic">₹{req.amount}</h3>
                              <Badge className={`rounded-full px-5 py-1 text-[10px] font-black uppercase tracking-widest ${
                                req.status === 'Pending' ? 'bg-orange-500 shadow-lg shadow-orange-500/20' : 
                                req.status === 'Completed' ? 'bg-green-600 shadow-lg shadow-green-600/20' : 'bg-destructive'
                              }`}>
                                {req.status}
                              </Badge>
                            </div>
                            <div className="flex flex-col gap-1 mt-2">
                              <p className="text-xs font-black text-muted-foreground flex items-center gap-2 uppercase tracking-widest">
                                <User className="w-3.5 h-3.5 text-primary" /> {req.userEmail}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 mt-6">
                              <div className="bg-muted px-6 py-4 rounded-2xl flex items-center gap-6 border-2 group hover:border-primary transition-all cursor-pointer" onClick={() => copyToClipboard(req.upiId)}>
                                <span className="text-xl font-black text-foreground select-all tracking-tight font-mono">{req.upiId}</span>
                                <div className="p-2 bg-white rounded-lg shadow-sm group-hover:bg-primary group-hover:text-white transition-all">
                                  <Copy className="w-5 h-5" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col md:items-end gap-6">
                          {req.status === 'Pending' && (
                            <div className="flex flex-col sm:flex-row gap-4 w-full">
                              <Button 
                                onClick={() => handleWithdrawalStatus(req.id, 'Completed')}
                                className="rounded-2xl font-black bg-green-600 hover:bg-green-700 gap-3 h-16 px-10 shadow-2xl shadow-green-600/30 text-lg uppercase tracking-widest"
                              >
                                <CheckCircle2 className="w-6 h-6" /> Success (Mark Paid)
                              </Button>
                              <Button 
                                variant="outline"
                                onClick={() => handleWithdrawalStatus(req.id, 'Rejected')}
                                className="rounded-2xl font-black text-destructive hover:bg-destructive/5 border-destructive/20 h-16 px-8 uppercase tracking-widest"
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                          <div className="text-right text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] italic">
                            Request Date: {new Date(req.createdAt).toLocaleDateString()} • {new Date(req.createdAt).toLocaleTimeString()}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {restaurants.map((res) => (
                <Card key={res.id} className="overflow-hidden border-2 rounded-[3rem] bg-white group shadow-sm hover:shadow-2xl transition-all">
                  <div className="relative h-60">
                    <Image src={res.image} alt={res.name} fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center backdrop-blur-[2px]">
                      <Button size="icon" variant="secondary" onClick={() => handleEdit(res)} className="rounded-full w-14 h-14 shadow-2xl hover:scale-110 transition-all">
                        <Edit2 className="w-6 h-6" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-10">
                    {editingId === res.id ? (
                      <div className="space-y-6">
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase tracking-widest">Restaurant Name</Label>
                           <Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="rounded-2xl h-12 border-2" />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase tracking-widest">Cuisine Type</Label>
                           <Input value={editForm.cuisine} onChange={e => setEditForm({...editForm, cuisine: e.target.value})} className="rounded-2xl h-12 border-2" />
                        </div>
                        <div className="flex gap-4 pt-4">
                          <Button onClick={() => handleSave(res.id)} className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest">Save</Button>
                          <Button onClick={() => setEditingId(null)} variant="outline" className="rounded-2xl w-12 h-12 border-2"><X className="w-5 h-5" /></Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 className="font-black text-2xl mb-1 italic tracking-tighter">{res.name}</h3>
                        <p className="text-xs text-muted-foreground font-black mb-6 uppercase tracking-widest">{res.cuisine}</p>
                        <div className="flex justify-between items-center text-[10px] font-black text-muted-foreground border-t-2 border-dashed pt-6 uppercase tracking-[0.15em]">
                          <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Rating: {res.rating}★</span>
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
            <Card className="border-4 border-primary/20 bg-primary/[0.03] rounded-[4rem] p-12 shadow-2xl max-w-3xl">
              <CardTitle className="text-4xl font-black italic tracking-tighter flex items-center gap-4 mb-8">
                <Globe className="w-12 h-12 text-primary" />
                PhonePe Gateway Status
              </CardTitle>
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-8 rounded-3xl border-2 shadow-sm">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] block mb-2">Merchant ID</Label>
                    <p className="font-black text-2xl text-primary italic">Q297152786@ybl</p>
                  </div>
                  <div className="bg-white p-8 rounded-3xl border-2 shadow-sm">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] block mb-2">Settlement Mode</Label>
                    <p className="font-black text-2xl text-foreground italic">Mode 02 (Business)</p>
                  </div>
                </div>
                
                <div className="bg-white p-8 rounded-[2.5rem] border-2 border-dashed border-primary/20">
                  <h4 className="font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-3">
                    <Shield className="w-5 h-5 text-primary" /> Automated Reconciliation Active
                  </h4>
                  <p className="text-xs font-bold text-muted-foreground uppercase leading-relaxed tracking-tight">
                    Every payment scanned via QR code in this app is tagged with Merchant Category Code 5812. This ensures the funds go directly to your PhonePe Business account linked with your Merchant ID. Withdrawal requests are manual to ensure 100% bank-verified payouts to users.
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
