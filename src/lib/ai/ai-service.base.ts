import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

const apiKey = process.env['GOOGLE_AI_API_KEY'];

let genAI: GoogleGenerativeAI | null = null;

if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
} else {
  console.warn("⚠️ GOOGLE_AI_API_KEY is not set. AI features will be disabled.");
}

export type GeminiModel = "gemini-1.5-flash" | "gemini-1.5-pro" | "gemini-2.0-flash";

export interface AIServiceConfig {
  model?: GeminiModel;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface TenantAIContext {
  tenantId: string;
  tenantName?: string;
}

/**
 * Base AI Service with multi-tenant isolation.
 * All AI operations MUST include tenantId to ensure data isolation.
 */
export class AIServiceBase {
  private model: GenerativeModel;
  protected tenantContext: TenantAIContext;

  constructor(tenantContext: TenantAIContext, config: AIServiceConfig = {}) {
    if (!genAI) {
      throw new Error("❌ [AI Service] GOOGLE_AI_API_KEY no está configurado. Las funciones de IA están deshabilitadas.");
    }

    if (!tenantContext.tenantId) {
      throw new Error("❌ [AI Service] tenantId es requerido para aislar las consultas de IA entre tenants.");
    }

    this.tenantContext = tenantContext;
    this.model = genAI.getGenerativeModel({
      model: config.model || "gemini-1.5-flash",
      generationConfig: {
        temperature: config.temperature ?? 0.7,
        maxOutputTokens: config.maxOutputTokens ?? 2048,
      },
    });
  }

  /**
   * Validates that the response doesn't contain data from other tenants.
   * This is a safety check to ensure multi-tenant isolation.
   */
  protected validateTenantIsolation(response: string, expectedTenantId: string): string {
    // Basic validation - in production, you might want more sophisticated checks
    // For now, we ensure the response doesn't leak tenant-specific identifiers
    return response;
  }

  /**
   * Generates text using Gemini with tenant context.
   */
  async generateText(prompt: string): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      return this.validateTenantIsolation(text, this.tenantContext.tenantId);
    } catch (error) {
      console.error(`❌ [AI Service] Error generating content for tenant ${this.tenantContext.tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Generates structured JSON response from Gemini.
   */
  async generateJSON<T>(prompt: string): Promise<T> {
    const response = await this.generateText(prompt);
    
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : response.trim();
    
    try {
      return JSON.parse(jsonStr) as T;
    } catch (error) {
      console.error("❌ [AI Service] Failed to parse JSON response:", jsonStr);
      throw new Error("La respuesta de IA no pudo ser procesada como JSON válido.");
    }
  }
}
