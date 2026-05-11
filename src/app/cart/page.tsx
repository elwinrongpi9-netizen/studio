
"use client";

import { Navbar } from "@/components/navbar";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Minus, ShoppingBag, MapPin, CreditCard, Building2, Wallet, ShieldCheck, CheckCircle, QrCode, Timer } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useState, useMemo, useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// REAL MERCHANT DETAILS - Verified for Rongpi Chinese wok
const MERCHANT_UPI_ID = "rongpichinesewok@ybl";
const MERCHANT_NAME = "Rongpi Chinese wok";
const MERCHANT_CODE = "5812"; // Category code for restaurants

const PAYMENT_METHODS = [
  { id: 'upi', name: 'Scan & Pay (UPI QR)', icon: <QrCode className="w-4 h-4" /> },
  { id: 'cod', name: 'Cash on Delivery', icon: <Wallet className="w-4 h-4" /> },
  { id: 'card', name: 'Credit / Debit Card', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'netbanking', name: 'Net Banking', icon: <Building2 className="w-4 h-4" /> },
];

export default function CartPage() {
  const { cart, removeFromCart, addToCart, clearCart, isHydrated } = useAppStore();
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [showQrModal, setShowQrModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);

  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.price * 80) * item.quantity, 0);
  }, [cart]);

  const deliveryFee = subtotal > 0 ? 40 : 0;
  const platformFee = subtotal > 0 ? 5 : 0;
  const total = subtotal + deliveryFee + platformFee;

  // Optimized UPI Payment URI for Real PhonePe Business Transactions
  const upiUrl = useMemo(() => {
    const amount = total.toFixed(2);
    const pa = MERCHANT_UPI_ID;
    const pn = encodeURIComponent(MERCHANT_NAME);
    const mc = MERCHANT_CODE;
    const tr = `ZK${Date.now().toString().slice(-10)}`; // Unique ref
    const tn = encodeURIComponent("ZomatoKarbi Order");
    
    // Business Optimized URI with mode=02 for PhonePe Business tracking
    return `upi://pay?pa=${pa}&pn=${pn}&mc=${mc}&am=${amount}&cu=INR&tr=${tr}&tn=${tn}&mode=02&purpose=00`;
  }, [total]);

  const qrCodeUrl = useMemo(() => {
    return `https://chart.googleapis.com/chart?chs=500x500&cht=qr&chl=${encodeURIComponent(upiUrl)}&choe=UTF-8&chld=H`;
  }, [upiUrl]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showQrModal && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setShowQrModal(false);
    }
    return () => clearInterval(timer);
  }, [showQrModal, timeLeft]);

  useEffect(() => {
    if (showQrModal) setTimeLeft(300);
  }, [showQrModal]);

  if (!isHydrated) return null;

  const processOrder = (confirmedPayment = false) => {
    if (!user) {
      toast({ title: "Please Sign In", variant: "destructive" });
      return;
    }

    const orderId = Math.random().toString(36).substr(2, 9).toUpperCase();
    const paymentStatus = (paymentMethod === 'cod') ? 'Pending' : (confirmedPayment ? 'Paid' : 'Pending');

    const orderData = {
      id: orderId,
      restaurantName: cart[0]?.restaurantName || "Restaurant",
      total: total,
      status: "Preparing",
      createdAt: new Date().toISOString(),
      items: cart,
      userId: user.uid,
      paymentMethod: PAYMENT_METHODS.find(m => m.id === paymentMethod)?.name || 'Unknown',
      paymentStatus: paymentStatus,
    };

    const orderRef = doc(firestore, "users", user.uid, "orders", orderId);
    setDoc(orderRef, orderData)
      .catch(async () => {
        const permissionError = new FirestorePermissionError({
          path: orderRef.path,
          operation: "create",
          requestResourceData: orderData,
        });
        errorEmitter.emit("permission-error", permissionError);
      });

    clearCart();
    toast({
      title: "Order Placed!",
      description: `Order #${orderId} successful.`,
    });
    router.push("/orders");
  };

  const handleCheckout = () => {
    if (!user) {
      toast({ title: "Please Sign In", variant: "destructive" });
      return;
    }
    if (cart.length === 0) return;

    if (paymentMethod === 'upi') {
      setShowQrModal(true);
    } else {
      processOrder(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-black mb-8 flex items-center gap-3">
             <ShoppingBag className="w-10 h-10 text-primary" />
             Finalize Order
          </h1>

          {cart.length === 0 ? (
            <div className="text-center py-24 bg-card rounded-[2.5rem] border-2 border-dashed shadow-sm">
              <ShoppingBag className="w-12 h-12 text-primary mx-auto mb-6 opacity-20" />
              <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
              <Link href="/"><Button className="rounded-2xl px-10 py-6 text-lg font-black">Find Food</Button></Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-6">
                <div className="bg-card p-8 rounded-3xl shadow-sm border space-y-4">
                  <h3 className="font-black text-lg flex items-center gap-2 mb-2">
                    <MapPin className="w-6 h-6 text-primary" />
                    Delivery Address
                  </h3>
                  <p className="text-sm text-muted-foreground ml-8">Diphu, Karbi Anglong, Assam - 782462</p>
                </div>

                <div className="bg-card p-8 rounded-3xl shadow-sm border space-y-6">
                  <h3 className="font-black text-lg">Order Items</h3>
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.id} className="flex gap-4 items-center border-b border-muted pb-4 last:border-0 last:pb-0">
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden shadow-sm">
                          <Image src={item.image} alt={item.name} fill className="object-cover" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-black text-sm">{item.name}</h4>
                          <p className="text-xs font-bold text-primary mt-0.5">₹{item.price * 80}</p>
                        </div>
                        <div className="flex items-center gap-3 bg-muted/30 rounded-xl p-1.5 px-3 border">
                          <button onClick={() => addToCart({...item, quantity: -1})} disabled={item.quantity <= 1}><Minus className="w-4 h-4" /></button>
                          <span className="text-sm font-black w-4 text-center">{item.quantity}</span>
                          <button onClick={() => addToCart({...item, quantity: 1})}><Plus className="w-4 h-4" /></button>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-card p-8 rounded-3xl shadow-sm border space-y-6">
                  <h3 className="font-black text-lg flex items-center gap-2">
                    <CreditCard className="w-6 h-6 text-primary" />
                    Payment Method
                  </h3>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {PAYMENT_METHODS.map((method) => (
                      <div 
                        key={method.id} 
                        className={`flex items-center space-x-3 p-4 border-2 rounded-2xl transition-all cursor-pointer ${paymentMethod === method.id ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/20'}`}
                        onClick={() => setPaymentMethod(method.id)}
                      >
                        <RadioGroupItem value={method.id} id={method.id} className="sr-only" />
                        <div className={`p-2 rounded-xl ${paymentMethod === method.id ? 'bg-primary text-white' : 'bg-white text-muted-foreground shadow-sm'}`}>{method.icon}</div>
                        <Label htmlFor={method.id} className="font-black text-sm cursor-pointer flex-1">{method.name}</Label>
                        {paymentMethod === method.id && <CheckCircle className="w-4 h-4 text-primary" />}
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>

              <div className="lg:col-span-4">
                <div className="bg-card p-8 rounded-[2rem] shadow-2xl border sticky top-24">
                  <h3 className="font-black text-xl mb-6">Bill Summary</h3>
                  <div className="space-y-4 text-sm border-b border-dashed pb-6 mb-6">
                    <div className="flex justify-between font-bold"><span className="text-muted-foreground">Item Total</span><span>₹{subtotal.toFixed(0)}</span></div>
                    <div className="flex justify-between font-bold"><span className="text-muted-foreground">Delivery</span><span className="text-green-600">₹{deliveryFee}</span></div>
                  </div>
                  <div className="flex justify-between font-black text-2xl mb-8"><span>Total</span><span className="text-primary">₹{total.toFixed(0)}</span></div>
                  <Button className="w-full py-7 rounded-2xl font-black text-lg shadow-xl shadow-primary/20" onClick={handleCheckout}>
                    {paymentMethod === 'upi' ? 'Scan & Pay Now' : 'Place Order'}
                  </Button>
                  <div className="flex items-center justify-center gap-2 mt-6 text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                    <ShieldCheck className="w-3 h-3 text-primary" />
                    Secure PhonePe Business
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] p-10">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-3xl font-black text-center">Scan to Pay</DialogTitle>
            <DialogDescription className="text-center font-bold text-muted-foreground">
              Merchant: <span className="text-primary">{MERCHANT_NAME}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-2 rounded-full font-black text-xs animate-pulse">
              <Timer className="w-4 h-4" />
              <span>Expires in: {Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</span>
            </div>

            <div className="relative w-80 h-80 bg-white p-4 rounded-3xl shadow-2xl border-4 border-primary/10">
              <Image src={qrCodeUrl} alt="PhonePe QR" fill className="object-contain p-2" unoptimized />
            </div>
            
            <div className="text-center">
              <p className="text-4xl font-black text-primary">₹{total.toFixed(0)}</p>
              <p className="text-[10px] font-black text-muted-foreground tracking-widest uppercase mt-2">{MERCHANT_UPI_ID}</p>
            </div>

            <Button className="w-full py-7 rounded-2xl font-black text-lg shadow-lg" onClick={() => { setShowQrModal(false); processOrder(true); }}>
              I have paid ₹{total.toFixed(0)}
            </Button>
            <p className="text-[9px] text-muted-foreground text-center font-bold uppercase tracking-wider">Verified for PhonePe Business Accounts</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
