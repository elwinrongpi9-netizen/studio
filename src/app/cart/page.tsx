
"use client";

import { Navbar } from "@/components/navbar";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Minus, ShoppingBag, MapPin, CreditCard, Loader2, Smartphone, Building2, Wallet, ShieldCheck, CheckCircle, QrCode, X, Info, Timer } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Exact merchant details for Rongpi Chinese wok
const MERCHANT_UPI_ID = "rongpichinesewok@ybl";
const MERCHANT_NAME = "Rongpi Chinese wok";

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
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [showQrModal, setShowQrModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds

  // Subtotal calculation
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.price * 80) * item.quantity, 0);
  }, [cart]);

  const deliveryFee = subtotal > 0 ? 40 : 0;
  const platformFee = subtotal > 0 ? 5 : 0;
  const total = subtotal + deliveryFee + platformFee;

  // Optimized UPI URI for maximum compatibility
  const upiUrl = useMemo(() => {
    const amount = total.toFixed(2);
    // Standard UPI URI format: upi://pay?pa=<vpa>&pn=<name>&am=<amount>&cu=INR
    return `upi://pay?pa=${MERCHANT_UPI_ID}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${amount}&cu=INR`;
  }, [total]);

  // QR API requires the entire data string to be URL encoded
  const qrCodeUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(upiUrl)}`;
  }, [upiUrl]);

  // Timer logic for QR Modal
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showQrModal && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setShowQrModal(false);
      toast({
        title: "Session Expired",
        description: "Payment window timed out. Please try again.",
        variant: "destructive"
      });
    }

    return () => clearInterval(timer);
  }, [showQrModal, timeLeft, toast]);

  // Reset timer when modal opens
  useEffect(() => {
    if (showQrModal) {
      setTimeLeft(300);
    }
  }, [showQrModal]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isHydrated) return null;

  const processOrder = async (confirmedPayment = false) => {
    if (!user) {
      toast({ title: "Please Sign In", variant: "destructive" });
      return;
    }

    const orderId = Math.random().toString(36).substr(2, 9).toUpperCase();
    
    // Logic for payment status:
    // 1. If COD: Status is 'Pending'
    // 2. If UPI & user confirmed payment: Status is 'Paid' (subject to verification)
    // 3. Otherwise: 'Pending'
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
      .then(() => {
        clearCart();
        toast({
          title: "Order Placed Successfully!",
          description: paymentMethod === 'cod' 
            ? `Order #${orderId} received. Please pay ₹${total.toFixed(0)} at delivery.` 
            : `Your order #${orderId} has been received.`,
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
  };

  const handleCheckout = async () => {
    if (!user) {
      toast({ title: "Please Sign In", variant: "destructive" });
      return;
    }
    if (cart.length === 0) return;

    if (paymentMethod === 'upi') {
      setShowQrModal(true);
    } else {
      setIsPlacingOrder(true);
      // For COD and others, we simulate a small processing time then confirm
      setTimeout(() => processOrder(false), 1500);
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
              <div className="bg-primary/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
              <Link href="/">
                <Button className="rounded-2xl px-10 py-6 text-lg font-black shadow-xl shadow-primary/20">Find Food</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-6">
                <div className="bg-card p-8 rounded-3xl shadow-sm border space-y-4">
                  <h3 className="font-black text-lg flex items-center gap-2 mb-2">
                    <MapPin className="w-6 h-6 text-primary" />
                    Delivery Address
                  </h3>
                  <div className="pl-8 border-l-2 border-primary/10 ml-3">
                    <p className="font-black text-foreground">Home</p>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      {user?.email || "User Account"}<br />
                      Diphu, Karbi Anglong, Assam - 782462
                    </p>
                  </div>
                </div>

                <div className="bg-card p-8 rounded-3xl shadow-sm border space-y-6">
                  <h3 className="font-black text-lg">Order Items</h3>
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.id} className="flex gap-4 items-center border-b border-muted pb-4 last:border-0 last:pb-0">
                        <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 shadow-md">
                          <Image src={item.image} alt={item.name} fill className="object-cover" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-black text-base">{item.name}</h4>
                          <p className="text-sm font-bold text-primary mt-0.5">₹{item.price * 80}</p>
                        </div>
                        <div className="flex items-center gap-4 bg-muted/30 rounded-2xl p-2 px-3 border">
                          <button 
                            className="text-primary hover:scale-110 transition-transform disabled:opacity-30" 
                            disabled={item.quantity <= 1}
                            onClick={() => addToCart({...item, quantity: -1})}
                          >
                            <Minus className="w-5 h-5" />
                          </button>
                          <span className="text-base font-black w-6 text-center">{item.quantity}</span>
                          <button 
                            className="text-primary hover:scale-110 transition-transform" 
                            onClick={() => addToCart({...item, quantity: 1})}
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-xl transition-all"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
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
                        className={`flex items-center space-x-3 p-4 border-2 rounded-2xl transition-all cursor-pointer ${
                          paymentMethod === method.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50 border-transparent bg-muted/20'
                        }`}
                        onClick={() => setPaymentMethod(method.id)}
                      >
                        <RadioGroupItem value={method.id} id={method.id} className="sr-only" />
                        <div className={`p-2 rounded-xl transition-colors ${paymentMethod === method.id ? 'bg-primary text-white' : 'bg-white text-muted-foreground shadow-sm'}`}>
                          {method.icon}
                        </div>
                        <Label htmlFor={method.id} className="font-black text-sm cursor-pointer flex-1">
                          {method.name}
                        </Label>
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
                    <div className="flex justify-between font-bold">
                      <span className="text-muted-foreground">Item Total</span>
                      <span>₹{subtotal.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-muted-foreground">Delivery Charge</span>
                      <span className="text-green-600">₹{deliveryFee.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-muted-foreground">Platform Fee</span>
                      <span>₹{platformFee.toFixed(0)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between font-black text-2xl mb-8">
                    <span>Total Amount</span>
                    <span className="text-primary">₹{total.toFixed(0)}</span>
                  </div>
                  <Button 
                    className="w-full py-8 rounded-2xl font-black text-xl shadow-2xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    onClick={handleCheckout}
                    disabled={isPlacingOrder}
                  >
                    {isPlacingOrder ? (
                      <div className="flex items-center gap-3">
                        <Loader2 className="animate-spin w-6 h-6" />
                        <span>Processing...</span>
                      </div>
                    ) : (
                      paymentMethod === 'upi' ? 'Scan & Pay Now' : 'Place Order'
                    )}
                  </Button>
                  <div className="flex items-center justify-center gap-2 mt-6 text-[10px] text-muted-foreground font-bold uppercase tracking-widest text-center">
                    <ShieldCheck className="w-3 h-3 text-primary" />
                    100% Secure Transaction
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* UPI QR Modal */}
      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="sm:max-w-[420px] rounded-[2.5rem] p-8 overflow-hidden">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-3xl font-black text-center">Scan to Pay</DialogTitle>
            <DialogDescription className="text-center font-bold text-muted-foreground">
              Merchant: <span className="text-primary">{MERCHANT_NAME}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-2 rounded-full font-black text-sm animate-pulse">
              <Timer className="w-4 h-4" />
              <span>Payment expires in: {formatTime(timeLeft)}</span>
            </div>

            <Alert className="bg-primary/5 border-primary/20 rounded-2xl py-2">
              <Info className="h-4 w-4 text-primary" />
              <AlertTitle className="text-xs font-black uppercase">Payment Tip</AlertTitle>
              <AlertDescription className="text-[10px] font-medium">
                Scan using PhonePe, Google Pay, or Paytm to complete payment.
              </AlertDescription>
            </Alert>

            <div className="relative w-72 h-72 bg-white p-6 rounded-3xl shadow-2xl border-4 border-primary/10">
              <Image 
                src={qrCodeUrl} 
                alt="UPI Payment QR" 
                fill 
                className="object-contain p-2"
                unoptimized
              />
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-4xl font-black text-primary">₹{total.toFixed(0)}</p>
              <div className="flex items-center justify-center gap-2 bg-muted/50 px-4 py-1.5 rounded-full">
                <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-[10px] font-black text-muted-foreground tracking-widest uppercase">{MERCHANT_UPI_ID}</p>
              </div>
            </div>

            <div className="w-full space-y-3 pt-2">
              <Button 
                className="w-full py-7 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 transition-all"
                onClick={() => {
                  setShowQrModal(false);
                  setIsPlacingOrder(true);
                  setTimeout(() => processOrder(true), 1200);
                }}
              >
                I have paid ₹{total.toFixed(0)}
              </Button>
              <Button 
                variant="ghost" 
                className="w-full rounded-2xl text-muted-foreground font-bold hover:bg-transparent"
                onClick={() => setShowQrModal(false)}
              >
                Cancel Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
