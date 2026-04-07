import { GoogleGenAI } from "@google/genai";

const getClient = () => {
    // Only initialize if API key exists.
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
}

export const processBrainDump = async (text: string): Promise<string> => {
  const client = getClient();
  if (!client) return "API Key missing. Cannot process.";

  try {
    const response = await client.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this brain dump item: "${text}". 
      Categorize it into one of these types: [Task], [Event], [Note], [Idea].
      Provide a brief suggested action.
      Format: Type: Suggested Action`,
    });
    return response.text || "Could not process.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error processing request.";
  }
};

export const suggestMealPlan = async (preferences: string): Promise<string> => {
  const client = getClient();
  if (!client) return "API Key missing.";

  try {
    const response = await client.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Create a simple 1-day meal plan (Lunch and Dinner) based on these preferences: "${preferences}". Keep it healthy and simple.`,
    });
    return response.text || "Could not generate meal plan.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating plan.";
  }
};

export const suggestDua = async (topic: string): Promise<string> => {
    const client = getClient();
    if (!client) return "API Key missing.";
  
    try {
      const response = await client.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Suggest a short, authentic Dua (supplication) related to: "${topic}". Include Arabic (if possible) and English translation.`,
      });
      return response.text || "Could not find dua.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Error fetching dua.";
    }
  };