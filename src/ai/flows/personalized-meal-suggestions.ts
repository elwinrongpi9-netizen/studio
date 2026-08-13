'use server';
/**
 * @fileOverview A flow for generating personalized meal suggestions.
 *
 * - personalizeMealSuggestions - A function that generates personalized meal suggestions.
 * - PersonalizedMealSuggestionsInput - The input type for the personalizeMealSuggestions function.
 * - PersonalizedMealSuggestionsOutput - The return type for the personalizeMealSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedMealSuggestionsInputSchema = z.object({
  pastOrderHistory: z.string().describe('A detailed description of the user\'s past food order history, including cuisine types, specific dishes, and preferences.'),
  popularLocalDishes: z.string().describe('A list or description of popular local dishes and restaurants in the area.'),
});
export type PersonalizedMealSuggestionsInput = z.infer<typeof PersonalizedMealSuggestionsInputSchema>;

const PersonalizedMealSuggestionsOutputSchema = z.object({
  suggestions: z.array(z.object({
    mealName: z.string().describe('The name of the suggested meal.'),
    description: z.string().describe('A brief description of the suggested meal, highlighting why it might be a good fit.'),
    cuisine: z.string().optional().describe('The cuisine type of the suggested meal.'),
  })).describe('A list of personalized meal suggestions.'),
});
export type PersonalizedMealSuggestionsOutput = z.infer<typeof PersonalizedMealSuggestionsOutputSchema>;

const personalizeMealSuggestionsPrompt = ai.definePrompt({
  name: 'personalizeMealSuggestionsPrompt',
  input: {schema: PersonalizedMealSuggestionsInputSchema},
  output: {schema: PersonalizedMealSuggestionsOutputSchema},
  prompt: `You are a helpful AI assistant specialized in recommending food.
  Your goal is to provide personalized meal suggestions based on the user's past order history and popular local dishes.
  
  User's Past Order History:
  {{{pastOrderHistory}}}
  
  Popular Local Dishes:
  {{{popularLocalDishes}}}
  
  Based on this information, suggest 3-5 meal options that the user might enjoy. For each suggestion, provide the meal name, a brief description, and its cuisine type.
  The suggestions should be new and exciting options while still aligning with the user's likely preferences.
  `,
});

const personalizeMealSuggestionsFlow = ai.defineFlow(
  {
    name: 'personalizeMealSuggestionsFlow',
    inputSchema: PersonalizedMealSuggestionsInputSchema,
    outputSchema: PersonalizedMealSuggestionsOutputSchema,
  },
  async (input) => {
    const {output} = await personalizeMealSuggestionsPrompt(input);
    return output!;
  }
);

/**
 * Fallback suggestions to use if the AI service fails.
 * Updated to be generic as per admin request to remove mock items.
 */
const fallbackSuggestions: PersonalizedMealSuggestionsOutput = {
  suggestions: [
    {
      mealName: "Chef's Daily Special",
      description: "A fresh and unique preparation using local seasonal ingredients.",
      cuisine: "Fusion"
    },
    {
      mealName: "Premium House Platter",
      description: "A selection of our kitchen's best offerings curated just for you.",
      cuisine: "Gourmet"
    },
    {
      mealName: "Local Favorite Dish",
      description: "The most popular dish currently trending in the Diphu market.",
      cuisine: "Traditional"
    }
  ]
};

export async function personalizeMealSuggestions(input: PersonalizedMealSuggestionsInput): Promise<PersonalizedMealSuggestionsOutput> {
  try {
    return await personalizeMealSuggestionsFlow(input);
  } catch (error) {
    console.error("GenAI Error: Falling back to generic suggestions.", error);
    return fallbackSuggestions;
  }
}
