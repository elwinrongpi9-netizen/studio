
"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2, Utensils } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { personalizeMealSuggestions, PersonalizedMealSuggestionsOutput } from "@/ai/flows/personalized-meal-suggestions";
import { Button } from "@/components/ui/button";

export function AIRecommendations() {
  const [suggestions, setSuggestions] = useState<PersonalizedMealSuggestionsOutput | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      // Simulate user history and local data
      const result = await personalizeMealSuggestions({
        pastOrderHistory: "I love spicy food, frequently order Italian pasta and Indian butter chicken. I avoid excessively greasy fried foods.",
        popularLocalDishes: "Truffle Pasta, Dragon Sushi Rolls, Gourmet Wagyu Burgers, Spicy Tandoori Platter"
      });
      setSuggestions(result);
    } catch (error) {
      console.error("AI flow error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-accent/10 border-none shadow-lg overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Sparkles className="w-24 h-24" />
      </div>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Sparkles className="w-5 h-5" />
          AI-Powered Suggestions
        </CardTitle>
        <p className="text-sm text-muted-foreground">Based on your cravings and local favorites</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-medium animate-pulse">Analyzing your tastes...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions?.suggestions.map((item, idx) => (
              <div key={idx} className="bg-white/60 p-3 rounded-xl hover:bg-white transition-colors cursor-pointer group">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-sm group-hover:text-primary">{item.mealName}</h4>
                  {item.cuisine && (
                    <span className="text-[10px] bg-accent/20 text-accent font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                      {item.cuisine}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
            <Button 
              variant="outline" 
              className="w-full rounded-xl border-primary/20 hover:bg-primary/10 hover:text-primary transition-all text-sm font-bold"
              onClick={fetchSuggestions}
            >
              Refresh Recommendations
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
