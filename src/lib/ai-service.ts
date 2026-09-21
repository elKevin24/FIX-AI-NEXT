import 'server-only';
import { GoogleGenerativeAI } from "@google/generative-ai";

interface GenerateTextParams {
  prompt: string;
  modelName?: "gemini-pro" | "gemini-1.5-flash" | "gemini-1.5-pro";
  temperature?: number;
}

/**
 * Generates text using Google's Gemini models if an API key is present.
 * Returns null if no API key is configured.
 */
export async function generateAIResponse({ 
  prompt, 
  modelName = "gemini-1.5-flash",
  temperature = 0.7 
}: GenerateTextParams): Promise<string | null> {
  const apiKey = process.env['GEMINI_API_KEY'] || process.env['GOOGLE_AI_API_KEY'];
  
  if (!apiKey) {
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
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
