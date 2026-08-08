"use client";

import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, Truck, Package, Calendar, CreditCard, ShoppingBag, Info, Flame, Timer } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { useMemo } from "react";
import { Order } from "@/lib/types";

export default function OrdersPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();

  const ordersQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "users", user.uid, "orders"),
      orderBy("createdAt", "desc")
    );
  }, [firestore, user]);

  const { data: orders, loading: ordersLoading } = useCollection<Order>(ordersQuery);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Received": return <Clock className="w-5 h-5 text-zinc-400" />;
      case "Preparing": return <Package className="w-5 h-5 text-orange-400" />;
      case "Cooking": return <Flame className="w-5 h-5 text-yellow-400" />;
      case "On the Way": return <Truck className="w-5 h-5 text-blue-400" />;
      case "Delivered": return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Received": return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
      case "Preparing": return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      case "Cooking": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      case "On the Way": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "Delivered": return "bg-green-500/10 text-green-400 border-green-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h1 className="text-4xl font-black mb-2">My Orders</h1>
              <p className="text-muted-foreground font-medium">Tracking your delicious moments in Diphu</p>
            </div>
            {user && (
              <Badge variant="outline" className="px-4 py-1.5 rounded-full border-primary/20 bg-primary/5 text-primary font-bold">
                {orders?.length || 0} Orders
              </Badge>
            )}
          </div>

          {!userLoading && !user ? (
            <div className="text-center py-24 bg-card rounded-[2.5rem] border shadow-sm">
              <h2 className="text-2xl font-bold mb-4">Sign in to view orders</h2>
              <p className="text-muted-foreground mb-8 max-w-xs mx-auto">Access your full order history and track deliveries in real-time.</p>
            </div>
          ) : orders?.length === 0 && !ordersLoading ? (
            <div className="text-center py-24 bg-card rounded-[2.5rem] border shadow-sm border-dashed">
               <div className="bg-primary/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-3xl font-black mb-3">No orders found</h2>
              <p className="text-muted-foreground mb-10 max-w-sm mx-auto font-medium">Hungry? Explore the best restaurants in Karbi Anglong and place your first order!</p>
              <Link href="/">
                <Button className="rounded-2xl px-12 py-7 text-lg font-black shadow-xl shadow-primary/20">Explore Restaurants</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {orders?.map((order) => (
                <div key={order.id} className="bg-card rounded-[2rem] p-8 shadow-sm border hover:shadow-xl transition-all group border-primary/5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-8 border-b border-dashed">
                    <div className="flex items-center gap-5">
                      <div className={`p-4 rounded-2xl ${getStatusColor(order.status || 'Received').split(' ')[0]}`}>
                        {getStatusIcon(order.status || 'Received')}
                      </div>
                      <div>
                        <h3 className="font-black text-2xl group-hover:text-primary transition-colors">{order.restaurantName}</h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-bold text-muted-foreground mt-1">
                          <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(order.createdAt).toLocaleDateString()}</span>
                          <span className="bg-muted px-2 py-0.5 rounded-lg">ID: #{order.id}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       <Badge className={`rounded-xl px-4 py-2 font-black tracking-wide uppercase text-[10px] ${getStatusColor(order.status || 'Received')}`} variant="outline">
                        {order.status || 'Received'}
                      </Badge>
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                        <CreditCard className="w-3 h-3" /> {order.paymentMethod}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-4">Order Items</h4>
                      <div className="space-y-3">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex justify-between items-center bg-muted/20 p-3 rounded-xl border border-transparent hover:border-primary/10 transition-colors">
                            <span className="text-sm font-bold"><span className="text-primary mr-2">{item.quantity}x</span> {item.name}</span>
                            <span className="text-xs font-black">₹{(item.price * item.quantity).toFixed(0)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col justify-between">
                      {order.status !== 'Delivered' && order.estimatedDelivery && (
                        <div className="bg-primary/10 p-4 rounded-xl border border-primary/20 flex items-center gap-3 mb-4">
                          <Timer className="w-5 h-5 text-primary animate-pulse" />
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Estimated Arrival</p>
                            <p className="font-black text-primary">{new Date(order.estimatedDelivery).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                      )}
                      <div className="bg-primary/[0.03] p-6 rounded-2xl border border-primary/10">
                        <div className="flex justify-between items-center mb-1">
                           <span className="text-sm font-bold text-muted-foreground">Grand Total</span>
                           <span className="text-2xl font-black text-primary">₹{(order.amount || order.total || 0).toFixed(0)}</span>
                        </div>
                        <p className="text-[10px] font-bold text-muted-foreground text-right uppercase tracking-widest">Inclusive of all taxes</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
