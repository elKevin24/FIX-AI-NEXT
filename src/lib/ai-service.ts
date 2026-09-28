import 'server-only';
import { GoogleGenAI } from "@google/genai";

interface GenerateTextParams {
  prompt: string;
  modelName?: string;
  temperature?: number;
}

/**
 * Generates text using Google's Gemini models if an API key is present.
 * Returns null if no API key is configured.
 */
export async function generateAIResponse({ 
  prompt, 
  modelName = "gemini-2.5-flash", 
  temperature = 0.7 
}: GenerateTextParams): Promise<string | null> {
  const apiKey = process.env['GEMINI_API_KEY'] || process.env['GOOGLE_AI_API_KEY'];
  
  if (!apiKey) {
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        temperature,
      },
    });

    return response.text ?? null;
  } catch (error) {
    console.error("❌ [AI Service] Error generating content:", error);
    throw error;
  }
}
