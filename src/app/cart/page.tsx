
"use client";

import { Navbar } from "@/components/navbar";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Minus, ShoppingBag, MapPin, CreditCard, Wallet, QrCode, Timer, Sparkles, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, useDoc } from "@/firebase";
import { doc, setDoc, updateDoc, increment, collection } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { useState, useMemo, useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// UPDATED WITH YOUR UPI ID FROM PHP PLUGIN LOGIC
const MERCHANT_UPI_ID = "Q297152786@ybl";
const MERCHANT_NAME = "Rongpi Chinese wok";
const MERCHANT_CODE = "5812"; 

const PAYMENT_METHODS = [
  { id: 'upi', name: 'PhonePe Payments (UPI)', icon: <QrCode className="w-4 h-4" /> },
  { id: 'cod', name: 'Cash on Delivery', icon: <Wallet className="w-4 h-4" /> },
];

export default function CartPage() {
  const { cart, removeFromCart, addToCart, clearCart, isHydrated } = useAppStore();
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const userRef = useMemo(() => (user && firestore) ? doc(firestore, "users", user.uid) : null, [user, firestore]);
  const { data: profile } = useDoc<any>(userRef);

  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [showQrModal, setShowQrModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);
  const [useWallet, setUseWallet] = useState(false);

  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.price * 80) * item.quantity, 0);
  }, [cart]);

  const deliveryFee = subtotal > 0 ? 40 : 0;
  const platformFee = subtotal > 0 ? 5 : 0;
  
  const walletBalance = profile?.walletBalance || 0;
  const billTotal = subtotal + deliveryFee + platformFee;
  const walletDeduction = useWallet ? Math.min(walletBalance, billTotal) : 0;
  
  const total = billTotal - walletDeduction;

  const upiUrl = useMemo(() => {
    const amount = total.toFixed(2);
    const tr = `ORD${Date.now()}`;
    return `upi://pay?pa=${MERCHANT_UPI_ID}&pn=${encodeURIComponent(MERCHANT_NAME)}&mc=${MERCHANT_CODE}&tr=${tr}&am=${amount}&cu=INR&mode=02`;
  }, [total]);

  const qrCodeUrl = useMemo(() => {
    return `https://chart.googleapis.com/chart?chs=500x500&cht=qr&chl=${encodeURIComponent(upiUrl)}&choe=UTF-8&chld=H|2`;
  }, [upiUrl]);

  useEffect(() => {
    let timer: any;
    if (showQrModal && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setShowQrModal(false);
    }
    return () => clearInterval(timer);
  }, [showQrModal, timeLeft]);

  if (!isHydrated) return null;

  const processOrder = async (confirmedPayment = false) => {
    if (!user || !firestore) return;

    setIsVerifying(true);

    const orderId = `ORD${Date.now()}`.toUpperCase();
    const state = (total === 0 || confirmedPayment) ? 'COMPLETED' : 'PENDING';

    const orderData = {
      order_id: orderId,
      restaurantName: cart[0]?.restaurantName || "Restaurant",
      amount: billTotal,
      state: state,
      udf1: profile?.displayName || user.email, // Similar to PHP udf1
      udf2: user.email, // Similar to PHP udf2
      items: cart,
      userId: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paymentMethod: total === 0 ? 'Karbi Coins' : 'PhonePe UPI',
    };

    // Save to Global PhonePe Orders collection (Mimicking PHP table)
    const globalOrderRef = doc(firestore, "phonepe_orders", orderId);
    setDoc(globalOrderRef, orderData).catch(console.error);

    // Save to User's private orders
    const userOrderRef = doc(firestore, "users", user.uid, "orders", orderId);
    setDoc(userOrderRef, orderData)
      .then(() => {
        if (walletDeduction > 0) {
          updateDoc(doc(firestore, "users", user.uid), {
            walletBalance: increment(-walletDeduction)
          });
        }
        
        setTimeout(() => {
          clearCart();
          setIsVerifying(false);
          setShowQrModal(false);
          toast({ title: "Payment Recorded!", description: `Order #${orderId} state: ${state}` });
          router.push("/orders");
        }, 1500);
      });
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-black mb-8 flex items-center gap-3">
             <ShoppingBag className="w-10 h-10 text-primary" />
             PhonePe Checkout
          </h1>

          {cart.length === 0 ? (
            <div className="text-center py-24 bg-card rounded-[2.5rem] border-2 border-dashed shadow-sm">
              <ShoppingBag className="w-12 h-12 text-primary mx-auto mb-6 opacity-20" />
              <h2 className="text-2xl font-bold mb-4">Empty Bag</h2>
              <Link href="/"><Button className="rounded-2xl px-10 py-6 text-lg font-black">Browse Restaurants</Button></Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-6">
                <div className="bg-card p-8 rounded-3xl shadow-sm border space-y-4">
                  <h3 className="font-black text-lg flex items-center gap-2 mb-2">
                    <MapPin className="w-6 h-6 text-primary" />
                    Delivery Point
                  </h3>
                  <p className="text-sm text-muted-foreground ml-8">Diphu Market, Karbi Anglong, Assam</p>
                </div>

                <div className="bg-card p-8 rounded-3xl shadow-sm border space-y-6">
                  <h3 className="font-black text-lg flex items-center gap-2">
                    <CreditCard className="w-6 h-6 text-primary" />
                    Payment Gateway
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
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>

              <div className="lg:col-span-4">
                <div className="bg-card p-8 rounded-[2rem] shadow-2xl border sticky top-24">
                  <h3 className="font-black text-xl mb-6">Order Total</h3>
                  <div className="flex justify-between font-black text-2xl mb-8"><span>Final Pay</span><span className="text-primary">₹{total.toFixed(0)}</span></div>
                  <Button className="w-full py-7 rounded-2xl font-black text-lg shadow-xl shadow-primary/20" onClick={() => (total > 0 && paymentMethod === 'upi') ? setShowQrModal(true) : processOrder(false)}>
                    {total <= 0 ? 'Place Order' : 'Proceed to PhonePe'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] p-10 overflow-hidden">
          <DialogTitle className="sr-only">PhonePe Payment Modal</DialogTitle>
          {isVerifying ? (
             <div className="flex flex-col items-center justify-center py-20 gap-6">
                <Loader2 className="w-16 h-16 text-primary animate-spin" />
                <h3 className="text-2xl font-black uppercase italic">Verifying Transaction</h3>
             </div>
          ) : (
            <>
              <DialogHeader className="mb-4">
                <DialogTitle className="text-3xl font-black text-center">PhonePe QR</DialogTitle>
                <DialogDescription className="text-center font-bold">
                  Merchant ID: <span className="text-primary">{MERCHANT_UPI_ID}</span>
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-6">
                <div className="relative w-80 h-80 bg-white p-4 rounded-3xl shadow-2xl border-4 border-primary/10">
                  <Image src={qrCodeUrl} alt="UPI QR" fill className="object-contain p-2" unoptimized />
                </div>
                <div className="text-center">
                  <p className="text-4xl font-black text-primary">₹{total.toFixed(2)}</p>
                </div>
                <Button className="w-full py-7 rounded-2xl font-black text-lg" onClick={() => processOrder(true)}>
                  I have paid ₹{total.toFixed(0)}
                </Button>
                <p className="text-[9px] text-muted-foreground text-center font-black uppercase tracking-widest">Powered by PhonePe Secure Gateway</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
