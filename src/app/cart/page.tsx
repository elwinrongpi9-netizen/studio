
"use client";

import { Navbar } from "@/components/navbar";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Minus, ShoppingBag, MapPin, CreditCard, Loader2, Smartphone, Building2, Wallet } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const PAYMENT_METHODS = [
  { id: 'upi', name: 'UPI (GPay, PhonePe)', icon: <Smartphone className="w-4 h-4" /> },
  { id: 'card', name: 'Credit / Debit Card', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'netbanking', name: 'Net Banking', icon: <Building2 className="w-4 h-4" /> },
  { id: 'cod', name: 'Cash on Delivery', icon: <Wallet className="w-4 h-4" /> },
];

export default function CartPage() {
  const { cart, removeFromCart, addToCart, clearCart, isHydrated } = useAppStore();
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi');

  if (!isHydrated) return null;

  const subtotal = cart.reduce((acc, item) => acc + (item.price * 80) * item.quantity, 0);
  const deliveryFee = subtotal > 0 ? 40 : 0;
  const platformFee = subtotal > 0 ? 5 : 0;
  const total = subtotal + deliveryFee + platformFee;

  const handleCheckout = async () => {
    if (!user) {
      toast({
        title: "Please Sign In",
        description: "You need to be logged in to place an order.",
        variant: "destructive",
      });
      return;
    }

    if (cart.length === 0) return;
    setIsPlacingOrder(true);

    // Simulate payment gateway delay
    setTimeout(() => {
      const orderId = Math.random().toString(36).substr(2, 9).toUpperCase();
      const orderData = {
        id: orderId,
        restaurantName: cart[0].restaurantName,
        total: total,
        status: "Preparing",
        createdAt: new Date().toISOString(),
        items: cart,
        userId: user.uid,
        paymentMethod: PAYMENT_METHODS.find(m => m.id === paymentMethod)?.name || 'Unknown',
        paymentStatus: paymentMethod === 'cod' ? 'Pending' : 'Paid',
      };

      const orderRef = doc(firestore, "users", user.uid, "orders", orderId);

      setDoc(orderRef, orderData)
        .then(() => {
          clearCart();
          toast({
            title: "Payment Successful!",
            description: `Order #${orderId} has been placed successfully.`,
          });
          router.push("/orders");
        })
        .catch(async (error) => {
          const permissionError = new FirestorePermissionError({
            path: orderRef.path,
            operation: "create",
            requestResourceData: orderData,
          });
          errorEmitter.emit("permission-error", permissionError);
          setIsPlacingOrder(false);
        });
    }, 2000);
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-black mb-8 flex items-center gap-3">
             <ShoppingBag className="w-8 h-8 text-primary" />
             Checkout
          </h1>

          {cart.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-3xl border shadow-sm">
              <div className="bg-primary/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
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
                <div className="bg-card p-6 rounded-2xl shadow-sm border space-y-4">
                  <h3 className="font-bold flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    Delivery Address
                  </h3>
                  <div className="pl-7">
                    <p className="font-bold">Home</p>
                    <p className="text-sm text-muted-foreground">{user?.email || "123 Karbi St, Diphu, Assam - 782462"}</p>
                  </div>
                </div>

                <div className="bg-card p-6 rounded-2xl shadow-sm border space-y-6">
                  <h3 className="font-bold">Order Items</h3>
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

                <div className="bg-card p-6 rounded-2xl shadow-sm border space-y-4">
                  <h3 className="font-bold flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    Payment Method
                  </h3>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid gap-4">
                    {PAYMENT_METHODS.map((method) => (
                      <div key={method.id} className="flex items-center space-x-3 p-4 border rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
                        <RadioGroupItem value={method.id} id={method.id} />
                        <Label htmlFor={method.id} className="flex items-center gap-3 cursor-pointer flex-1">
                          <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            {method.icon}
                          </div>
                          <span className="font-bold">{method.name}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>

              <div className="lg:col-span-4">
                <div className="bg-card p-6 rounded-2xl shadow-lg border sticky top-24">
                  <h3 className="font-bold mb-4">Bill Summary</h3>
                  <div className="space-y-3 text-sm border-b pb-4 mb-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Item Total</span>
                      <span>₹{subtotal.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delivery Fee</span>
                      <span className="text-green-500 font-bold">₹{deliveryFee.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Platform Fee</span>
                      <span>₹{platformFee.toFixed(0)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between font-black text-xl mb-6">
                    <span>Total Pay</span>
                    <span className="text-primary">₹{total.toFixed(0)}</span>
                  </div>
                  <Button 
                    className="w-full py-7 rounded-xl font-black text-lg shadow-xl shadow-primary/20"
                    onClick={handleCheckout}
                    disabled={isPlacingOrder}
                  >
                    {isPlacingOrder ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="animate-spin" />
                        <span>Processing Payment...</span>
                      </div>
                    ) : (
                      `Pay ₹${total.toFixed(0)}`
                    )}
                  </Button>
                  <p className="text-[10px] text-center text-muted-foreground mt-4 leading-tight">
                    By placing the order, you agree to our terms and conditions.
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
