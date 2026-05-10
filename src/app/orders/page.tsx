
"use client";

import { Navbar } from "@/components/navbar";
import { useAppStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, Truck, Package, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function OrdersPage() {
  const { orders, isHydrated } = useAppStore();

  if (!isHydrated) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Preparing": return <Package className="w-5 h-5 text-orange-400" />;
      case "Out for delivery": return <Truck className="w-5 h-5 text-blue-400" />;
      case "Delivered": return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Preparing": return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      case "Out for delivery": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "Delivered": return "bg-green-500/10 text-green-400 border-green-500/20";
      default: return "";
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Order History</h1>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-3xl border shadow-sm">
               <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold mb-2">No orders yet</h2>
              <p className="text-muted-foreground mb-8">When you place an order, it will show up here.</p>
              <Link href="/">
                <Button variant="outline" className="rounded-xl px-8 font-bold border-primary text-primary hover:bg-primary/10">Order Something</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <div key={order.id} className="bg-card rounded-2xl p-6 shadow-sm border group hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${getStatusColor(order.status).split(' ')[0]}`}>
                        {getStatusIcon(order.status)}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{order.restaurantName}</h3>
                        <p className="text-sm text-muted-foreground">Order #{order.id} • {new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`rounded-full px-3 py-1 font-bold ${getStatusColor(order.status)}`} variant="outline">
                        {order.status}
                      </Badge>
                      <Button variant="ghost" size="icon" className="rounded-full">
                         <ChevronRight className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>

                  <div className="pl-14">
                    <div className="flex flex-wrap gap-2 mb-4">
                      {order.items.map((item, i) => (
                        <span key={i} className="text-sm text-muted-foreground">
                          {item.quantity} x {item.name}{i < order.items.length - 1 ? "," : ""}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-4">
                      <p className="font-bold text-primary">₹{order.total.toFixed(0)}</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="rounded-lg text-xs font-bold">Download Bill</Button>
                        <Button size="sm" className="rounded-lg text-xs font-bold">Re-order</Button>
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
