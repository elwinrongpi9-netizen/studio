
'use server';
/**
 * @fileOverview A flow for generating personalized meal suggestions based strictly on history.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedMealSuggestionsInputSchema = z.object({
  pastOrderHistory: z.string().describe('A detailed description of the user\'s past food order history.'),
  popularLocalDishes: z.string().describe('A list or description of popular local dishes in the area.'),
});
export type PersonalizedMealSuggestionsInput = z.infer<typeof PersonalizedMealSuggestionsInputSchema>;

const PersonalizedMealSuggestionsOutputSchema = z.object({
  suggestions: z.array(z.object({
    mealName: z.string().describe('The name of the suggested meal.'),
    description: z.string().describe('Why it fits the user.'),
    cuisine: z.string().optional().describe('Cuisine type.'),
  })).describe('Personalized suggestions.'),
});
export type PersonalizedMealSuggestionsOutput = z.infer<typeof PersonalizedMealSuggestionsOutputSchema>;

const personalizeMealSuggestionsPrompt = ai.definePrompt({
  name: 'personalizeMealSuggestionsPrompt',
  input: {schema: PersonalizedMealSuggestionsInputSchema},
  output: {schema: PersonalizedMealSuggestionsOutputSchema},
  prompt: `You are a helpful AI assistant for food recommendations in Karbi Anglong.
  Provide personalized suggestions based ONLY on the user's past history and local favorites provided.
  
  User's History:
  {{{pastOrderHistory}}}
  
  Local Context:
  {{{popularLocalDishes}}}
  
  Instructions:
  - Suggest items from the provided context only.
  - Do not hallucinate items that aren't in the provided history or local list.
  - If no context is given, return an empty list.
  `,
});

const personalizeMealSuggestionsFlow = ai.defineFlow(
  {
    name: 'personalizeMealSuggestionsFlow',
    inputSchema: PersonalizedMealSuggestionsInputSchema,
    outputSchema: PersonalizedMealSuggestionsOutputSchema,
  },
  async (input) => {
    if (!input.pastOrderHistory || input.pastOrderHistory.trim() === "") {
      return { suggestions: [] };
    }
    const {output} = await personalizeMealSuggestionsPrompt(input);
    return output!;
  }
);

export async function personalizeMealSuggestions(input: PersonalizedMealSuggestionsInput): Promise<PersonalizedMealSuggestionsOutput> {
  try {
    return await personalizeMealSuggestionsFlow(input);
  } catch (error) {
    return { suggestions: [] };
  }
}
