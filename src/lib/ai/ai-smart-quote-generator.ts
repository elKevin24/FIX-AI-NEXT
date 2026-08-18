import { AIServiceBase, TenantAIContext, AIServiceConfig } from './ai-service.base';
import { getTenantPrisma } from '../tenant-prisma';

export interface QuoteInput {
  ticketId: string;
  technicalDiagnosis: string;
  partsUsed: Array<{
    partName: string;
    quantity: number;
    unitPrice: number;
  }>;
  servicesPerformed: Array<{
    serviceName: string;
    laborCost: number;
    duration: number;
  }>;
  additionalNotes?: string;
}

export interface ClientExplanation {
  summary: string;
  whatWasWrong: string;
  whatWasDone: string;
  whyItHappened: string;
  howToPrevent: string;
  warrantyInfo: string;
  whatsappMessage: string;
  emailSubject: string;
  emailBody: string;
}

export interface QuoteBreakdown {
  partsTotal: number;
  laborTotal: number;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  total: number;
  currency: string;
}

export interface SmartQuoteResult {
  explanation: ClientExplanation;
  breakdown: QuoteBreakdown;
  confidenceScore: number;
  estimatedDurability: string;
  riskAssessment: string;
}

/**
 * Smart Quote Generator - Generador Inteligente de Cotizaciones
 * 
 * Translates complex technical diagnosis into clear, persuasive, and
 * understandable explanations for the end client. Generates messages
 * ready for WhatsApp or Email delivery.
 */
export class AISmartQuoteGenerator extends AIServiceBase {
  private tenantId: string;

  constructor(tenantContext: TenantAIContext, config?: AIServiceConfig) {
    super(tenantContext, config);
    this.tenantId = tenantContext.tenantId;
  }

  /**
   * Generates a client-friendly explanation from technical diagnosis.
   */
  async generateQuote(input: QuoteInput): Promise<SmartQuoteResult> {
    const tenantDb = getTenantPrisma(this.tenantId);

    // Fetch tenant settings for tax rate and business info
    const tenantSettings = await tenantDb.tenantSettings.findFirst();
    const taxRate = Number(tenantSettings?.taxRate) || 0.12; // Default 12% IVA

    // Fetch ticket details for context
    const ticket = await tenantDb.ticket.findUnique({
      where: { id: input.ticketId },
      include: {
        customer: true,
      },
    });

    const prompt = this.buildQuotePrompt(input, taxRate, ticket);
    
    const result = await this.generateJSON<SmartQuoteResult>(prompt);
    
    // Validate and calculate breakdown
    return this.validateQuoteResult(result, input, taxRate);
  }

  private buildQuotePrompt(
    input: QuoteInput,
    taxRate: number,
    ticket: any
  ): string {
    const partsList = input.partsUsed.map(p => 
      `- ${p.partName} x${p.quantity} @ Q${p.unitPrice.toFixed(2)} = Q${(p.quantity * p.unitPrice).toFixed(2)}`
    ).join('\n');

    const servicesList = input.servicesPerformed.map(s => 
      `- ${s.serviceName}: ${s.duration} min @ Q${s.laborCost.toFixed(2)}`
    ).join('\n');

    return `Eres un experto en comunicación cliente-taller para un taller de reparación en Guatemala.

CONTEXTO DEL TICKET:
- Dispositivo: ${ticket?.deviceType || 'No especificado'} ${ticket?.deviceModel || ''}
- Cliente: ${ticket?.customer?.name || 'Cliente'}

DIAGNÓSTICO TÉCNICO:
${input.technicalDiagnosis}

REPUESTOS UTILIZADOS:
${partsList || 'No se utilizaron repuestos.'}

SERVICIOS REALIZADOS:
${servicesList || 'No se especificaron servicios.'}

${input.additionalNotes ? `NOTAS ADICIONALES:\n${input.additionalNotes}` : ''}

TASA DE IMPUESTO (IVA): ${(taxRate * 100).toFixed(0)}%

Crea una explicación clara, persuasiva y profesional para el cliente. Responde SOLO con un JSON válido (sin texto adicional) con la siguiente estructura:

{
  "explanation": {
    "summary": "Resumen de una línea del problema y solución",
    "whatWasWrong": "Explicación clara del problema encontrado, sin jerga técnica",
    "whatWasDone": "Descripción de las reparaciones realizadas en lenguaje simple",
    "whyItHappened": "Posibles causas del problema explicadas de forma comprensible",
    "howToPrevent": "Recomendaciones para prevenir el problema en el futuro",
    "warrantyInfo": "Información sobre la garantía del servicio (30 días estándar)",
    "whatsappMessage": "Mensaje completo y formateado listo para enviar por WhatsApp, incluyendo emoji sutilmente",
    "emailSubject": "Asunto del email para el cliente",
    "emailBody": "Cuerpo del email con formato HTML básico, profesional y amigable"
  },
  "breakdown": {
    "partsTotal": 0,
    "laborTotal": 0,
    "taxRate": ${taxRate},
    "taxAmount": 0,
    "subtotal": 0,
    "total": 0,
    "currency": "GTQ"
  },
  "confidenceScore": 0.90,
  "estimatedDurability": "Estimación de durabilidad de la reparación",
  "riskAssessment": "Evaluación de riesgos o posibles problemas futuros"
}

REGLAS:
1. Usa lenguaje simple que un cliente no técnico pueda entender
2. Sé positivo pero honesto sobre el estado del dispositivo
3. El mensaje de WhatsApp no debe exceder 500 caracteres por segmento
4. Incluye siempre información de garantía estándar (30 días)
5. El email debe ser profesional pero cercano
6. Calcula correctamente los montos en Quetzales (GTQ)
7. Responde ÚNICAMENTE con el JSON, sin texto adicional`;
  }

  private validateQuoteResult(
    result: SmartQuoteResult,
    input: QuoteInput,
    taxRate: number
  ): SmartQuoteResult {
    // Calculate correct totals
    const partsTotal = input.partsUsed.reduce(
      (sum, part) => sum + (part.quantity * part.unitPrice), 0
    );
    const laborTotal = input.servicesPerformed.reduce(
      (sum, service) => sum + service.laborCost, 0
    );
    const subtotal = partsTotal + laborTotal;
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    // Validate explanation fields exist
    const explanation = {
      summary: result.explanation?.summary || 'Reparación completada exitosamente.',
      whatWasWrong: result.explanation?.whatWasWrong || 'Se identificó el problema con el dispositivo.',
      whatWasDone: result.explanation?.whatWasDone || 'Se realizó la reparación correspondiente.',
      whyItHappened: result.explanation?.whyItHappened || 'El problema pudo haber sido causado por uso normal.',
      howToPrevent: result.explanation?.howToPrevent || 'Se recomienda mantener el dispositivo en condiciones adecuadas.',
      warrantyInfo: result.explanation?.warrantyInfo || 'Su reparación cuenta con 30 días de garantía.',
      whatsappMessage: result.explanation?.whatsappMessage || '',
      emailSubject: result.explanation?.emailSubject || 'Actualización de su reparación - Taller FIX-AI',
      emailBody: result.explanation?.emailBody || '',
    };

    // Ensure WhatsApp message is within limits
    if (explanation.whatsappMessage.length > 1500) {
      explanation.whatsappMessage = explanation.whatsappMessage.substring(0, 1497) + '...';
    }

    return {
      explanation,
      breakdown: {
        partsTotal,
        laborTotal,
        taxRate,
        taxAmount,
        subtotal,
        total,
        currency: 'GTQ',
      },
      confidenceScore: Math.min(1, Math.max(0, result.confidenceScore || 0.8)),
      estimatedDurability: result.estimatedDurability || 'La reparación es estable y duradera.',
      riskAssessment: result.riskAssessment || 'Riesgo bajo de problemas futuros.',
    };
  }
}
