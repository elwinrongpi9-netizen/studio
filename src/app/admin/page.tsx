
"use client";

import { Navbar } from "@/components/navbar";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, doc, updateDoc, query, orderBy, setDoc, limit } from "firebase/firestore";
import { useMemo, useState } from "react";
import { Restaurant, WithdrawalRequest } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Edit2, Loader2, Save, X, Zap, Banknote, User, Copy, ShieldAlert, TrendingUp, Info, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

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

  const phonepeOrdersQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, "phonepe_orders"), orderBy("createdAt", "desc"), limit(50));
  }, [firestore]);

  const { data: restaurants, loading: resLoading } = useCollection<Restaurant>(restaurantsQuery);
  const { data: withdrawals, loading: withdrawLoading } = useCollection<WithdrawalRequest>(withdrawalsQuery);
  const { data: phonepeOrders, loading: ordersLoading } = useCollection<any>(phonepeOrdersQuery);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Restaurant>>({});

  // Wingo Manual Controller State
  const [wingoPeriod, setWingoPeriod] = useState("");
  const [wingoNumber, setWingoNumber] = useState("");
  const [isWingoLoading, setIsWingoLoading] = useState(false);

  if (userLoading || resLoading || withdrawLoading || ordersLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="font-bold text-muted-foreground uppercase text-[10px] tracking-widest">Loading PhonePe Secure Logs...</p>
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
          <Button onClick={() => router.push("/")} className="rounded-2xl px-12 h-14 font-black">Return Home</Button>
        </div>
      </div>
    );
  }

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!" });
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-5xl font-black italic tracking-tighter flex items-center gap-4 text-foreground">
              <ShieldCheck className="w-12 h-12 text-primary" />
              PhonePe Dashboard
            </h1>
            <p className="text-muted-foreground font-bold mt-2 uppercase text-[10px] tracking-widest">Payment History & Game Control</p>
          </div>
        </div>

        <Tabs defaultValue="payments" className="space-y-8">
          <TabsList className="bg-white p-1.5 rounded-[1.5rem] h-16 w-full md:w-auto shadow-sm">
            <TabsTrigger value="payments" className="rounded-xl font-black px-8 h-12 flex gap-2">
              <CreditCard className="w-4 h-4" /> PhonePe Logs
            </TabsTrigger>
            <TabsTrigger value="wingo" className="rounded-xl font-black px-8 h-12 flex gap-2">
              <Zap className="w-4 h-4" /> Wingo Control
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="rounded-xl font-black px-8 h-12">Withdrawals</TabsTrigger>
          </TabsList>

          <TabsContent value="payments">
            <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white overflow-hidden">
              <div className="p-8 border-b">
                 <h3 className="font-black text-xl uppercase tracking-widest flex items-center gap-3">
                   <TrendingUp className="w-6 h-6 text-primary" />
                   Recent PhonePe Transactions
                 </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">Order ID</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">User (UDF1)</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">Email (UDF2)</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">Amount</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">State</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phonepeOrders.map((order) => (
                      <tr key={order.id} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="p-6 font-mono font-bold text-xs">{order.order_id}</td>
                        <td className="p-6 font-bold">{order.udf1}</td>
                        <td className="p-6 font-medium text-muted-foreground">{order.udf2}</td>
                        <td className="p-6 font-black text-primary text-lg">₹{order.amount}</td>
                        <td className="p-6">
                          <Badge className={`rounded-full px-4 py-1 text-[9px] font-black ${
                            order.state === 'COMPLETED' ? 'bg-green-600' : 'bg-orange-500'
                          }`}>
                            {order.state}
                          </Badge>
                        </td>
                        <td className="p-6 text-[10px] font-black text-muted-foreground uppercase">{new Date(order.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="wingo">
            <Card className="border-none bg-white rounded-[4rem] p-12 shadow-2xl max-w-2xl mx-auto">
              <div className="flex flex-col items-center text-center space-y-4 mb-10">
                <div className="p-4 bg-primary/10 rounded-3xl">
                  <Zap className="w-12 h-12 text-primary" />
                </div>
                <h2 className="text-4xl font-black italic tracking-tighter">Manual Controller</h2>
              </div>
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase ml-2">Period ID</Label>
                    <Input 
                      placeholder="e.g. 202403151230" 
                      value={wingoPeriod} 
                      onChange={e => setPeriodId(e.target.value)}
                      className="h-14 rounded-2xl font-black border-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase ml-2">Winning Number (0-9)</Label>
                    <Input 
                      type="number" 
                      value={wingoNumber} 
                      onChange={e => setWingoNumber(e.target.value)}
                      className="h-14 rounded-2xl font-black border-2"
                    />
                  </div>
                </div>
                <Button onClick={handleSetWingoResult} className="w-full h-18 rounded-2xl font-black text-xl py-8 shadow-xl" disabled={isWingoLoading}>
                  {isWingoLoading ? <Loader2 className="animate-spin" /> : "Fix Result"}
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="withdrawals">
            <div className="space-y-6">
              {withdrawals.map((req) => (
                <Card key={req.id} className="rounded-[3rem] border-none bg-white p-10 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-8">
                      <div className="p-6 bg-orange-100 text-orange-600 rounded-[2rem]">
                        <Banknote className="w-10 h-10" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-black text-5xl tracking-tighter italic">₹{req.amount}</h3>
                        <p className="text-xs font-black text-muted-foreground uppercase">{req.userEmail}</p>
                        <div className="bg-muted px-4 py-2 rounded-xl flex items-center gap-4 border cursor-pointer mt-4" onClick={() => copyToClipboard(req.upiId)}>
                          <span className="font-mono font-bold text-sm">{req.upiId}</span>
                          <Copy className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-orange-500 rounded-full px-6 py-2 uppercase font-black text-[10px]">{req.status}</Badge>
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
