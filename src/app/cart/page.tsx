
"use client";

import { Navbar } from "@/components/navbar";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Trash2, ShoppingBag, MapPin, CreditCard, Wallet, QrCode, Timer, Sparkles, CheckCircle, Loader2, Info } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, useDoc } from "@/firebase";
import { doc, setDoc, updateDoc, increment } from "firebase/firestore";
import { useState, useMemo, useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const MERCHANT_UPI_ID = "7086505053@ybl";
const MERCHANT_NAME = "Rongpi Chinese wok";
const MERCHANT_CODE = "5812"; 
const MERCHANT_WHATSAPP = "7086505053";

const PAYMENT_METHODS = [
  { id: 'upi', name: 'PhonePe Payments (UPI)', icon: <QrCode className="w-4 h-4" /> },
  { id: 'cod', name: 'Cash on Delivery', icon: <Wallet className="w-4 h-4" /> },
];

export default function CartPage() {
  const { cart, removeFromCart, clearCart, isHydrated } = useAppStore();
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

  const deliveryFee = subtotal > 0 ? 0 : 0; // Set to 0 as per free delivery hint
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

  const sendToWhatsApp = (orderData: any) => {
    const itemsList = orderData.items.map((item: any) => `✅ ${item.quantity}x ${item.name} (₹${(item.price * 80 * item.quantity).toFixed(0)})`).join('\n');
    
    const message = `*🍱 NEW ORDER RECEIVED!* \n\n` +
      `*Order ID:* #${orderData.order_id}\n` +
      `*Restaurant:* ${orderData.restaurantName}\n` +
      `-------------------------\n` +
      `${itemsList}\n` +
      `-------------------------\n` +
      `*Grand Total:* ₹${orderData.amount}\n` +
      `*Payment Method:* ${orderData.paymentMethod}\n` +
      `*Status:* ${orderData.status}\n\n` +
      `*Customer Name:* ${orderData.udf1}\n` +
      `*Customer Email:* ${orderData.udf2}\n\n` +
      `_Please prepare the order soon!_ 🚀`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${MERCHANT_WHATSAPP}?text=${encodedMessage}`;
    
    // Using window.location.href to avoid popup blockers
    window.location.href = whatsappUrl;
  };

  const processOrder = async (confirmedPayment = false) => {
    if (!user || !firestore) {
        toast({ title: "Please Login", description: "You need to be signed in to order.", variant: "destructive" });
        return;
    }

    setIsVerifying(true);

    const orderId = `ORD${Date.now()}`.toUpperCase();
    const state = (total === 0 || confirmedPayment) ? 'COMPLETED' : 'PENDING';

    const orderData = {
      order_id: orderId,
      restaurantName: cart[0]?.restaurantName || "Rongpi Chinese wok",
      amount: billTotal,
      total: billTotal,
      state: state,
      status: 'Received',
      udf1: profile?.displayName || user.email,
      udf2: user.email,
      items: cart,
      userId: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paymentMethod: total === 0 ? 'Karbi Coins' : (paymentMethod === 'cod' ? 'Cash on Delivery' : 'PhonePe UPI'),
      estimatedDelivery: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };

    try {
      const globalOrderRef = doc(firestore, "phonepe_orders", orderId);
      await setDoc(globalOrderRef, orderData);

      const userOrderRef = doc(firestore, "users", user.uid, "orders", orderId);
      await setDoc(userOrderRef, orderData);

      if (walletDeduction > 0) {
        await updateDoc(doc(firestore, "users", user.uid), {
          walletBalance: increment(-walletDeduction)
        });
      }

      // Success feedback
      toast({ title: "Order Confirmed! 🎉", description: "Redirecting to WhatsApp..." });
      
      // Clear cart before redirect
      clearCart();
      
      // Final step: WhatsApp Redirect
      setTimeout(() => {
        sendToWhatsApp(orderData);
      }, 500);

    } catch (error) {
      console.error("Order failed", error);
      setIsVerifying(false);
      toast({ title: "Order Failed", description: "Something went wrong, please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <ShoppingBag className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-black italic tracking-tighter">Confirm Your <span className="text-primary not-italic">Order</span></h1>
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-24 bg-card rounded-[3rem] border-2 border-dashed shadow-sm">
              <ShoppingBag className="w-16 h-16 text-primary mx-auto mb-6 opacity-20" />
              <h2 className="text-2xl font-bold mb-4">Your bag is empty</h2>
              <Link href="/"><Button className="rounded-2xl px-12 py-7 text-lg font-black bg-primary">Start Adding Items</Button></Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-6">
                
                {/* Cart Items Review */}
                <div className="bg-card p-8 rounded-[2.5rem] shadow-sm border border-border/50">
                  <h3 className="font-black text-xl mb-6 flex items-center gap-3 italic">
                    <Info className="w-6 h-6 text-primary" />
                    Review Items
                  </h3>
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-muted/10 rounded-2xl border border-border/20 group hover:border-primary/20 transition-all">
                        <div className="flex items-center gap-5">
                          <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-md flex-shrink-0">
                            <Image src={item.image} alt={item.name} fill className="object-cover group-hover:scale-110 transition-transform" />
                          </div>
                          <div>
                            <h4 className="font-black text-lg group-hover:text-primary transition-colors">{item.name}</h4>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{item.restaurantName}</span>
                                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-lg text-[9px] font-black">x{item.quantity}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-2xl tracking-tighter text-primary italic">₹{(item.price * 80 * item.quantity).toFixed(0)}</p>
                          <button onClick={() => removeFromCart(item.id)} className="text-[10px] font-black text-destructive uppercase tracking-widest mt-1 hover:underline">Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-card p-8 rounded-[2.5rem] shadow-sm border border-border/50 space-y-4">
                  <h3 className="font-black text-xl flex items-center gap-3 italic">
                    <MapPin className="w-6 h-6 text-primary" />
                    Delivery Address
                  </h3>
                  <div className="p-5 bg-muted/20 rounded-2xl border border-dashed border-border/50">
                    <p className="text-sm font-bold text-foreground">Diphu Market area</p>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Karbi Anglong, Assam</p>
                  </div>
                </div>

                <div className="bg-card p-8 rounded-[2.5rem] shadow-sm border border-border/50 space-y-6">
                  <h3 className="font-black text-xl flex items-center gap-3 italic">
                    <CreditCard className="w-6 h-6 text-primary" />
                    Payment Method
                  </h3>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {PAYMENT_METHODS.map((method) => (
                      <div 
                        key={method.id} 
                        className={`flex items-center space-x-4 p-5 border-2 rounded-2xl transition-all cursor-pointer ${paymentMethod === method.id ? 'border-primary bg-primary/5' : 'border-border/50 bg-muted/10'}`}
                        onClick={() => setPaymentMethod(method.id)}
                      >
                        <RadioGroupItem value={method.id} id={method.id} className="sr-only" />
                        <div className={`p-3 rounded-xl ${paymentMethod === method.id ? 'bg-primary text-white' : 'bg-white text-muted-foreground shadow-sm'}`}>{method.icon}</div>
                        <div className="flex-1">
                            <Label htmlFor={method.id} className="font-black text-sm cursor-pointer">{method.name}</Label>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{method.id === 'upi' ? 'Fast & Secure' : 'Pay at Door'}</p>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>

              <div className="lg:col-span-4">
                <div className="bg-card p-10 rounded-[3rem] shadow-2xl border border-border/50 sticky top-24 space-y-8">
                  <div>
                    <h3 className="font-black text-xl italic mb-6 uppercase tracking-tighter">Order Summary</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm font-bold"><span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span></div>
                      <div className="flex justify-between text-sm font-bold text-green-500"><span>Delivery Fee</span><span>FREE</span></div>
                      <div className="flex justify-between text-sm font-bold text-muted-foreground"><span>Platform Fee</span><span>₹{platformFee}</span></div>
                      {walletDeduction > 0 && (
                        <div className="flex justify-between text-sm font-black text-primary"><span>Wallet Used</span><span>-₹{walletDeduction.toFixed(0)}</span></div>
                      )}
                    </div>
                  </div>

                  <div className="h-px bg-border/50 w-full" />
                  
                  <div className="flex justify-between items-center">
                    <span className="font-black text-sm uppercase tracking-widest text-muted-foreground">To Pay</span>
                    <span className="text-4xl font-black text-primary italic tracking-tighter">₹{total.toFixed(0)}</span>
                  </div>

                  <Button 
                    className="w-full py-8 rounded-2xl font-black text-xl shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary"
                    disabled={isVerifying}
                    onClick={() => (total > 0 && paymentMethod === 'upi') ? setShowQrModal(true) : processOrder(false)}
                  >
                    {isVerifying ? <Loader2 className="animate-spin" /> : "Confirm Order"}
                  </Button>
                  
                  <div className="flex items-center gap-2 justify-center opacity-40">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Safe & Secure Checkout</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* PhonePe QR Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-card w-full max-w-[450px] rounded-[3rem] p-10 shadow-2xl border border-border/50 relative overflow-hidden">
            {isVerifying ? (
               <div className="flex flex-col items-center justify-center py-20 gap-8">
                  <div className="relative">
                    <Loader2 className="w-20 h-20 text-primary animate-spin" />
                    <ShoppingBag className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-3xl font-black uppercase italic tracking-tighter">Finalizing Order</h3>
                    <p className="text-[10px] font-black text-muted-foreground tracking-[0.3em] uppercase">Checking Payment Status</p>
                  </div>
               </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-10">
                    <h2 className="text-3xl font-black italic tracking-tighter">PhonePe <span className="text-primary not-italic">QR</span></h2>
                    <button onClick={() => setShowQrModal(false)} className="p-2 bg-muted rounded-xl hover:bg-muted/50 transition-colors">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-col items-center gap-8">
                  <div className="bg-destructive/10 text-destructive px-6 py-2.5 rounded-full font-black text-[10px] animate-pulse flex items-center gap-2 border border-destructive/20 uppercase tracking-widest">
                    <Timer className="w-4 h-4" />
                    <span>Expires in: {Math.floor(timeLeft/60)}:{String(timeLeft%60).padStart(2,'0')}</span>
                  </div>

                  <div className="relative w-80 h-80 bg-white p-6 rounded-[2.5rem] shadow-2xl border-4 border-primary/10">
                    <Image src={qrCodeUrl} alt="UPI QR" fill className="object-contain p-4" unoptimized />
                    <div className="absolute inset-0 bg-primary/5 rounded-[2.5rem] pointer-events-none" />
                  </div>

                  <div className="text-center space-y-1">
                    <p className="text-5xl font-black text-primary italic tracking-tighter">₹{total.toFixed(2)}</p>
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.4em]">{MERCHANT_UPI_ID}</p>
                  </div>

                  <Button className="w-full py-8 rounded-2xl font-black text-xl shadow-2xl bg-primary hover:bg-primary/90" onClick={() => processOrder(true)}>
                    I Have Paid ₹{total.toFixed(0)}
                  </Button>
                  
                  <div className="flex items-center gap-2 opacity-30">
                    <Sparkles className="w-3 h-3" />
                    <p className="text-[8px] font-black uppercase tracking-[0.5em]">Powered by PhonePe Secure</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
