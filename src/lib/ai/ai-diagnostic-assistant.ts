import { AIServiceBase, TenantAIContext, AIServiceConfig } from './ai-service.base';
import { getTenantPrisma } from '../tenant-prisma';

export interface DiagnosticInput {
  deviceType: string;
  deviceModel: string;
  symptoms: string;
  checkInNotes?: string;
  customerNotes?: string;
}

export interface SuggestedPart {
  partId: string;
  partName: string;
  sku: string;
  quantity: number;
  confidence: number;
  reason: string;
}

export interface LaborEstimate {
  serviceTemplateId: string;
  serviceName: string;
  estimatedMinutes: number;
  laborCost: number;
  confidence: number;
  reason: string;
}

export interface SafetyChecklist {
  step: number;
  action: string;
  riskLevel: 'BAJO' | 'MEDIO' | 'ALTO';
  category: 'PREVENCION' | 'HERRAMIENTA' | 'PROCEDIMIENTO' | 'VERIFICACION';
}

export interface DiagnosticResult {
  suggestedParts: SuggestedPart[];
  laborEstimates: LaborEstimate[];
  safetyChecklist: SafetyChecklist[];
  diagnosticNotes: string;
  estimatedTotalTime: number;
  estimatedTotalCost: number;
  confidenceScore: number;
  possibleCauses: string[];
  recommendedActions: string[];
}

/**
 * AI Diagnostic Assistant - Copiloto de Diagnóstico Automático
 * 
 * When a technician or receptionist enters device type, symptoms, and check-in notes,
 * this service queries Gemini to:
 * - Suggest the most likely spare parts from workshop inventory
 * - Estimate labor time based on the most appropriate service template
 * - Generate a step-by-step safety checklist for the technician
 */
export class AIDiagnosticAssistant extends AIServiceBase {
  private tenantId: string;

  constructor(tenantContext: TenantAIContext, config?: AIServiceConfig) {
    super(tenantContext, config);
    this.tenantId = tenantContext.tenantId;
  }

  /**
   * Analyzes device symptoms and suggests parts, labor estimates, and safety checklist.
   */
  async analyzeDiagnostic(input: DiagnosticInput): Promise<DiagnosticResult> {
    const tenantDb = getTenantPrisma(this.tenantId);

    // Fetch available parts and service templates from tenant's inventory
    const [availableParts, serviceTemplates] = await Promise.all([
      tenantDb.part.findMany({
        where: { quantity: { gt: 0 } },
        select: {
          id: true,
          name: true,
          sku: true,
          quantity: true,
          category: true,
        },
        take: 200,
      }),
      tenantDb.serviceTemplate.findMany({
        select: {
          id: true,
          name: true,
          category: true,
          defaultTitle: true,
          defaultDescription: true,
          estimatedDuration: true,
          laborCost: true,
        },
      }),
    ]);

    const prompt = this.buildDiagnosticPrompt(input, availableParts, serviceTemplates);
    
    const result = await this.generateJSON<DiagnosticResult>(prompt);
    
    // Validate and sanitize results
    return this.validateDiagnosticResult(result, availableParts, serviceTemplates);
  }

  private buildDiagnosticPrompt(
    input: DiagnosticInput,
    availableParts: any[],
    serviceTemplates: any[]
  ): string {
    const partsList = availableParts.map(p => 
      `- ID: ${p.id} | Nombre: ${p.name} | SKU: ${p.sku} | Stock: ${p.quantity} | Categoría: ${p.category}`
    ).join('\n');

    const templatesList = serviceTemplates.map(t => 
      `- ID: ${t.id} | Nombre: ${t.name} | Categoría: ${t.category} | Duración: ${t.estimatedDuration} min | Costo Mano de Obra: Q${t.laborCost}`
    ).join('\n');

    return `Eres un experto técnico en reparación de dispositivos electrónicos para un taller de reparación en Guatemala.

CONTEXTO DEL DISPOSITIVO:
- Tipo de dispositivo: ${input.deviceType}
- Modelo: ${input.deviceModel}
- Síntomas reportados: ${input.symptoms}
${input.checkInNotes ? `- Notas de recepción: ${input.checkInNotes}` : ''}
${input.customerNotes ? `- Notas del cliente: ${input.customerNotes}` : ''}

REPUESTOS DISPONIBLES EN INVENTARIO:
${partsList || 'No hay repuestos registrados en el inventario.'}

PLANTILLAS DE SERVICIO DISPONIBLES:
${templatesList || 'No hay plantillas de servicio registradas.'}

Basándote en los síntomas y el dispositivo, responde SOLO con un JSON válido (sin texto adicional) con la siguiente estructura:

{
  "suggestedParts": [
    {
      "partId": "ID del repuesto del inventario o string vacío si no hay coincidencia",
      "partName": "Nombre del repuesto",
      "sku": "SKU del repuesto",
      "quantity": 1,
      "confidence": 0.85,
      "reason": "Por qué se sugiere este repuesto"
    }
  ],
  "laborEstimates": [
    {
      "serviceTemplateId": "ID de la plantilla de servicio o string vacío si no hay coincidencia",
      "serviceName": "Nombre del servicio estimado",
      "estimatedMinutes": 45,
      "laborCost": 150.00,
      "confidence": 0.80,
      "reason": "Por qué se estima este servicio"
    }
  ],
  "safetyChecklist": [
    {
      "step": 1,
      "action": "Acción de seguridad específica",
      "riskLevel": "BAJO|MEDIO|ALTO",
      "category": "PREVENCION|HERRAMIENTA|PROCEDIMIENTO|VERIFICACION"
    }
  ],
  "diagnosticNotes": "Notas técnicas del diagnóstico",
  "estimatedTotalTime": 60,
  "estimatedTotalCost": 300.00,
  "confidenceScore": 0.82,
  "possibleCauses": ["Causa probable 1", "Causa probable 2"],
  "recommendedActions": ["Acción recomendada 1", "Acción recomendada 2"]
}

REGLAS:
1. Solo sugiere repuestos que existan en el inventario disponible
2. Solo sugiere plantillas de servicio que existan en la lista
3. Asigna un nivel de confianza realista (0.0 a 1.0)
4. Incluye al menos 5 pasos de seguridad en el checklist
5. Usa moneda GTQ (Quetzales guatemaltecos)
6. Responde ÚNICAMENTE con el JSON, sin texto adicional`;
  }

  private validateDiagnosticResult(
    result: DiagnosticResult,
    availableParts: any[],
    serviceTemplates: any[]
  ): DiagnosticResult {
    // Ensure suggested parts only reference valid inventory items
    const validPartIds = new Set(availableParts.map(p => p.id));
    const validTemplateIds = new Set(serviceTemplates.map(t => t.id));

    const validatedParts = (result.suggestedParts || []).filter(part => 
      part.partId && validPartIds.has(part.partId)
    );

    const validatedLabor = (result.laborEstimates || []).filter(labor =>
      labor.serviceTemplateId && validTemplateIds.has(labor.serviceTemplateId)
    );

    // Ensure safety checklist has required fields
    const validatedChecklist = (result.safetyChecklist || []).map((step, index) => ({
      step: index + 1,
      action: step.action || 'Verificar estado del dispositivo',
      riskLevel: (['BAJO', 'MEDIO', 'ALTO'].includes(step.riskLevel) ? step.riskLevel : 'BAJO') as 'BAJO' | 'MEDIO' | 'ALTO',
      category: (['PREVENCION', 'HERRAMIENTA', 'PROCEDIMIENTO', 'VERIFICACION'].includes(step.category) ? step.category : 'PREVENCION') as 'PREVENCION' | 'HERRAMIENTA' | 'PROCEDIMIENTO' | 'VERIFICACION',
    }));

    return {
      suggestedParts: validatedParts,
      laborEstimates: validatedLabor,
      safetyChecklist: validatedChecklist,
      diagnosticNotes: result.diagnosticNotes || 'Sin notas adicionales',
      estimatedTotalTime: result.estimatedTotalTime || 0,
      estimatedTotalCost: result.estimatedTotalCost || 0,
      confidenceScore: Math.min(1, Math.max(0, result.confidenceScore || 0)),
      possibleCauses: result.possibleCauses || [],
      recommendedActions: result.recommendedActions || [],
    };
  }
}
