import { GoogleGenAI, Type } from "@google/genai";
import { Hand, Card, AIHint } from '../types';

if (!process.env.API_KEY) {
    console.error("API_KEY environment variable not set.");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const formatHandForPrompt = (hand: Hand): string => {
  return hand.map(card => `${card.rank}${card.suit}`).join(', ');
};

export const getAIHint = async (playerHand: Hand): Promise<AIHint> => {
    const handString = formatHandForPrompt(playerHand);
    
    const systemInstruction = `You are a three-card poker expert. Your advice must be strategic and clear.
The most crucial rule to consider is that the **Dealer must have Queen-high or better to 'qualify'**. If the dealer does not qualify, the player wins their Ante bet even with a losing hand.
The standard baseline strategy is to 'Play' any hand of Queen-6-4 or better.

Analyze the player's hand based on its absolute strength (pairs, flush/straight potential) and its relative strength against the dealer's qualification requirement.

Categorize your recommendation:
- 'Strong Play': For hands that are statistically favored to win (e.g., any pair or better).
- 'Marginal Play': For hands very close to the Q-6-4 threshold. For these, explicitly mention the dealer not qualifying as a key factor in the risk/reward analysis.
- 'Fold': For hands clearly weaker than the baseline.

Provide a concise, one or two-sentence explanation for your choice.`;
    
    const prompt = `The player has the hand: ${handString}.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        recommendation: {
                            type: Type.STRING,
                            description: "The recommended action: 'Strong Play', 'Marginal Play', or 'Fold'.",
                            enum: ['Strong Play', 'Marginal Play', 'Fold']
                        },
                        reason: {
                            type: Type.STRING,
                            description: "A detailed explanation of the hand's strength, weaknesses, and the risk/reward of playing it."
                        }
                    },
                    required: ["recommendation", "reason"]
                },
                 temperature: 0.2,
            },
        });

        const jsonText = response.text.trim();
        const hint = JSON.parse(jsonText) as AIHint;
        return hint;

    } catch (error) {
        console.error("Gemini API call failed:", error);
        throw new Error("Failed to get a hint from the AI.");
    }
};