
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
  prompt: `You are a helpful AI assistant specialized in recommending food for users in Karbi Anglong.
  Your goal is to provide personalized meal suggestions based strictly on the user's past order history and the local dishes provided.
  
  User's Past Order History:
  {{{pastOrderHistory}}}
  
  Popular Local Dishes:
  {{{popularLocalDishes}}}
  
  Instructions:
  - If the User's Past Order History is empty, return an empty list of suggestions.
  - Do not suggest generic items like "Margherita Pizza" or "Truffle Mushroom" unless they are in the user's history or local dishes.
  - Provide 2-3 suggestions that align with the user's likely preferences based ONLY on the provided context.
  `,
});

const personalizeMealSuggestionsFlow = ai.defineFlow(
  {
    name: 'personalizeMealSuggestionsFlow',
    inputSchema: PersonalizedMealSuggestionsInputSchema,
    outputSchema: PersonalizedMealSuggestionsOutputSchema,
  },
  async (input) => {
    // Return empty if no history to avoid hallucinations
    if (!input.pastOrderHistory || input.pastOrderHistory.trim() === "") {
      return { suggestions: [] };
    }
    const {output} = await personalizeMealSuggestionsPrompt(input);
    return output!;
  }
);

/**
 * Fallback suggestions to use if the AI service fails or no data exists.
 * Set to empty to ensure only admin-added or real history items appear.
 */
const fallbackSuggestions: PersonalizedMealSuggestionsOutput = {
  suggestions: []
};

export async function personalizeMealSuggestions(input: PersonalizedMealSuggestionsInput): Promise<PersonalizedMealSuggestionsOutput> {
  try {
    const result = await personalizeMealSuggestionsFlow(input);
    return result;
  } catch (error) {
    console.error("GenAI Error: No suggestions found or service unavailable.");
    return fallbackSuggestions;
  }
}
