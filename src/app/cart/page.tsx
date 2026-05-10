
"use client";

import { Navbar } from "@/components/navbar";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, CreditCard, MapPin } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function CartPage() {
  const { cart, removeFromCart, addToCart, placeOrder, isHydrated } = useAppStore();
  const router = useRouter();
  const { toast } = useToast();

  if (!isHydrated) return null;

  const subtotal = cart.reduce((acc, item) => acc + (item.price * 80) * item.quantity, 0);
  const deliveryFee = subtotal > 0 ? 40 : 0;
  const platformFee = subtotal > 0 ? 5 : 0;
  const total = subtotal + deliveryFee + platformFee;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const restaurantName = cart[0].restaurantName;
    const orderId = placeOrder(restaurantName);
    toast({
      title: "Order Placed Successfully!",
      description: `Order #${orderId} has been confirmed.`,
    });
    router.push("/orders");
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
             <ShoppingBag className="w-8 h-8 text-primary" />
             Your Order
          </h1>

          {cart.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border shadow-sm">
              <div className="bg-primary/5 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
              <p className="text-muted-foreground mb-8">Looks like you haven't added anything to your cart yet.</p>
              <Link href="/">
                <Button className="rounded-xl px-8 font-bold">Browse Restaurants</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-6">
                {/* Delivery Address Section */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary" />
                      Delivery Address
                    </h3>
                    <Button variant="link" className="text-primary font-bold">Change</Button>
                  </div>
                  <div className="pl-7">
                    <p className="font-bold">Home</p>
                    <p className="text-sm text-muted-foreground">123 Karbi St, Diphu, Assam - 782462</p>
                  </div>
                </div>

                {/* Items Section */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-6">
                  <h3 className="font-bold flex items-center gap-2">
                    <UtensilsIcon className="w-5 h-5 text-primary" />
                    Items from {cart[0].restaurantName}
                  </h3>
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.id} className="flex gap-4 items-center border-b pb-4 last:border-0 last:pb-0">
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                          <Image src={item.image} alt={item.name} fill className="object-cover" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-sm">{item.name}</h4>
                          <p className="text-xs text-muted-foreground">₹{item.price * 80}</p>
                        </div>
                        <div className="flex items-center gap-3 bg-muted/50 rounded-xl p-1 px-2 border">
                          <button 
                            className="text-primary disabled:opacity-30" 
                            disabled={item.quantity <= 1}
                            onClick={() => addToCart({...item, quantity: -1})}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                          <button className="text-primary" onClick={() => addToCart({...item, quantity: 1})}>
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Option */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
                  <h3 className="font-bold flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    Payment Mode
                  </h3>
                  <div className="pl-7 space-y-3">
                    <div className="flex items-center gap-3 p-3 border rounded-xl bg-primary/5 border-primary/20">
                      <div className="w-4 h-4 rounded-full border-4 border-primary" />
                      <div>
                        <p className="text-sm font-bold">Cash on Delivery</p>
                        <p className="text-xs text-muted-foreground">Pay when your food arrives</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4">
                <div className="bg-white p-6 rounded-2xl shadow-lg border sticky top-24">
                  <h3 className="font-bold mb-4">Summary</h3>
                  <div className="space-y-3 text-sm border-b pb-4 mb-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">₹{subtotal.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delivery Fee</span>
                      <span className="font-medium text-green-600">₹{deliveryFee.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Platform Fee</span>
                      <span className="font-medium">₹{platformFee.toFixed(0)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between font-bold text-lg mb-6">
                    <span>Total</span>
                    <span>₹{total.toFixed(0)}</span>
                  </div>
                  <Button 
                    className="w-full py-6 rounded-xl font-bold shadow-lg"
                    onClick={handleCheckout}
                  >
                    Place Order
                  </Button>
                  <p className="text-[10px] text-center mt-4 text-muted-foreground">
                    By placing this order, you agree to our Terms and Conditions.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function UtensilsIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </svg>
  );
}
