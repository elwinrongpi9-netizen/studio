
"use client";

import { useState, useEffect } from 'react';
import { CartItem, Order } from './types';

export function useAppStore() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('karbi_cart');
      const savedOrders = localStorage.getItem('karbi_orders');
      
      if (savedCart && savedCart.trim() !== "") {
        setCart(JSON.parse(savedCart));
      }
      if (savedOrders && savedOrders.trim() !== "") {
        setOrders(JSON.parse(savedOrders));
      }
    } catch (e) {
      console.error("Failed to parse cart/orders from localStorage", e);
      // Fallback: clear invalid data
      localStorage.removeItem('karbi_cart');
      localStorage.removeItem('karbi_orders');
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('karbi_cart', JSON.stringify(cart));
    }
  }, [cart, isHydrated]);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('karbi_orders', JSON.stringify(orders));
    }
  }, [orders, isHydrated]);

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id && i.restaurantId === item.restaurantId);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i);
      }
      return [...prev, item];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const clearCart = () => setCart([]);

  const placeOrder = (restaurantName: string) => {
    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 9),
      items: [...cart],
      total: cart.reduce((acc, item) => acc + (item.price * 80) * item.quantity, 0),
      amount: cart.reduce((acc, item) => acc + (item.price * 80) * item.quantity, 0),
      status: 'Received',
      createdAt: new Date().toISOString(),
      restaurantName,
      paymentMethod: 'COD',
    };
    setOrders(prev => [newOrder, ...prev]);
    clearCart();
    return newOrder.id;
  };

  return { cart, orders, addToCart, removeFromCart, clearCart, placeOrder, isHydrated };
}
