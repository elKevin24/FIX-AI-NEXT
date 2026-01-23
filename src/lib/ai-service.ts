import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_AI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;

if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
} else {
  console.warn("⚠️ GOOGLE_AI_API_KEY is not set. AI features will be disabled.");
}

interface GenerateTextParams {
  prompt: string;
  modelName?: "gemini-pro" | "gemini-1.5-flash" | "gemini-1.5-pro";
  temperature?: number;
}

/**
 * Generates text using Google's Gemini models.
 * Returns null if the API key is not configured.
 */
export async function generateAIResponse({ 
  prompt, 
  modelName = "gemini-1.5-flash",
  temperature = 0.7 
}: GenerateTextParams): Promise<string | null> {
  if (!genAI) {
    console.error("❌ [AI Service] Attempted to generate text but API Key is missing.");
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        temperature,
      } 
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("❌ [AI Service] Error generating content:", error);
    throw error;
  }
}
