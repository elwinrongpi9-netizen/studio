
"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { personalizeMealSuggestions, PersonalizedMealSuggestionsOutput } from "@/ai/flows/personalized-meal-suggestions";
import { Button } from "@/components/ui/button";
import { useUser, useFirestore, useCollection } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { useMemo } from "react";

export function AIRecommendations() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [suggestions, setSuggestions] = useState<PersonalizedMealSuggestionsOutput | null>(null);

  const ordersQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "users", user.uid, "orders"),
      orderBy("createdAt", "desc"),
      limit(5)
    );
  }, [firestore, user]);

  const { data: pastOrders } = useCollection<any>(ordersQuery);

  const fetchSuggestions = async () => {
    const historyString = pastOrders?.length 
      ? pastOrders.map(o => o.items.map((i: any) => i.name).join(", ")).join("; ")
      : "No order history yet. User is looking for local favorites.";

    try {
      const result = await personalizeMealSuggestions({
        pastOrderHistory: historyString,
        popularLocalDishes: "Local Karbi favorites and trending items from Diphu market."
      });
      setSuggestions(result);
    } catch (error) {
      console.error("AI flow error:", error);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, [pastOrders]);

  return (
    <Card className="bg-white border-none shadow-xl overflow-hidden relative rounded-3xl group">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity">
        <Sparkles className="w-24 h-24 text-primary" />
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-primary font-black text-2xl tracking-tight">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          Smart Picks
        </CardTitle>
        <p className="text-sm text-muted-foreground font-medium italic">Tailored for your taste</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {suggestions?.suggestions.map((item, idx) => (
            <div key={idx} className="bg-primary/[0.03] p-4 rounded-2xl hover:bg-primary/[0.08] transition-all cursor-pointer group/item border border-primary/5 hover:scale-[1.02] active:scale-[0.98]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-black text-sm group-hover/item:text-primary transition-colors uppercase italic">{item.mealName}</h4>
                {item.cuisine && (
                  <span className="text-[9px] bg-accent text-white font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">
                    {item.cuisine}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed font-medium italic opacity-70">{item.description}</p>
            </div>
          )) || <p className="text-xs font-bold text-muted-foreground animate-pulse text-center py-4 uppercase">Personalizing...</p>}
          <Button 
            variant="outline" 
            className="w-full rounded-2xl border-primary/20 hover:bg-primary hover:text-white transition-all text-xs font-black uppercase tracking-widest py-6 mt-2 shadow-sm"
            onClick={fetchSuggestions}
          >
            Refresh Suggestions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
