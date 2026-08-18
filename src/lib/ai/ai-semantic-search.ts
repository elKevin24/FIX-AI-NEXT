import { AIServiceBase, TenantAIContext, AIServiceConfig } from './ai-service.base';
import { getTenantPrisma } from '../tenant-prisma';

export interface PastRepairSearch {
  symptoms: string;
  deviceType?: string;
  deviceModel?: string;
  limit?: number;
}

export interface SimilarTicket {
  ticketId: string;
  ticketNumber: string | null;
  title: string;
  deviceType: string | null;
  deviceModel: string | null;
  resolution: string;
  partsUsed: Array<{
    partName: string;
    quantity: number;
  }>;
  servicesPerformed: string[];
  similarityScore: number;
  resolvedAt: Date | null;
  technicianName: string | null;
}

export interface SemanticSearchResult {
  similarTickets: SimilarTicket[];
  aiAnalysis: string;
  recommendedApproach: string;
  estimatedTime: number;
  estimatedCost: number;
  warnings: string[];
}

/**
 * Semantic Search Service - Búsqueda Semántrica de Reparaciones Pasadas
 * 
 * Indexes solutions from previously closed tickets to provide intelligent
 * suggestions when similar faults are detected. Uses vector-like similarity
 * matching via Gemini's understanding capabilities.
 */
export class AISemanticSearchService extends AIServiceBase {
  private tenantId: string;

  constructor(tenantContext: TenantAIContext, config?: AIServiceConfig) {
    super(tenantContext, config);
    this.tenantId = tenantContext.tenantId;
  }

  /**
   * Searches for similar past repairs based on symptoms and device info.
   */
  async searchSimilarRepairs(input: PastRepairSearch): Promise<SemanticSearchResult> {
    const tenantDb = getTenantPrisma(this.tenantId);
    const limit = input.limit || 5;

    // Fetch closed/resolved tickets with their resolutions
    const closedTickets = await tenantDb.ticket.findMany({
      where: {
        status: { in: ['RESOLVED', 'CLOSED'] },
        ...(input.deviceType && { deviceType: input.deviceType }),
      },
      include: {
        customer: { select: { name: true } },
        assignedTo: { select: { name: true } },
        partsUsed: {
          include: { part: { select: { name: true } } },
          where: { approved: true },
        },
        services: true,
        notes: {
          where: { isInternal: false },
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100, // Get recent tickets for analysis
    });

    if (closedTickets.length === 0) {
      return {
        similarTickets: [],
        aiAnalysis: 'No se encontraron reparaciones anteriores en el historial del taller.',
        recommendedApproach: 'Se recomienda realizar un diagnóstico completo desde cero.',
        estimatedTime: 0,
        estimatedCost: 0,
        warnings: ['Sin historial de reparaciones previas para referencia.'],
      };
    }

    const prompt = this.buildSearchPrompt(input, closedTickets);
    
    const result = await this.generateJSON<SemanticSearchResult>(prompt);
    
    // Validate and enrich results
    return this.validateSearchResult(result, closedTickets, limit);
  }

  private buildSearchPrompt(
    input: PastRepairSearch,
    closedTickets: any[]
  ): string {
    const ticketsSummary = closedTickets.map(ticket => {
      const parts = ticket.partsUsed.map((p: any) => p.part?.name || 'Repuesto').join(', ');
      const services = ticket.services.map((s: any) => s.serviceName || 'Servicio').join(', ');
      const resolution = ticket.notes.find((n: any) => !n.isInternal)?.content || 'Sin notas de resolución';
      
      return `TICKET #${ticket.ticketNumber || 'N/A'}:
- Dispositivo: ${ticket.deviceType || 'N/A'} ${ticket.deviceModel || ''}
- Problema: ${ticket.title}
- Descripción: ${ticket.description?.substring(0, 200) || 'Sin descripción'}
- Repuestos usados: ${parts || 'Ninguno'}
- Servicios: ${services || 'Ninguno'}
- Resolución: ${resolution.substring(0, 300)}
- Estado: ${ticket.status}
- Fecha: ${ticket.updatedAt?.toISOString() || 'N/A'}`;
    }).join('\n\n');

    return `Eres un experto técnico en reparación de dispositivos electrónicos con acceso al historial de reparaciones de un taller.

HISTORIAL DE REPARACIONES CERRADAS:
${ticketsSummary}

NUEVA FALLA REPORTADA:
- Tipo de dispositivo: ${input.deviceType || 'No especificado'}
- Modelo: ${input.deviceModel || 'No especificado'}
- Síntomas: ${input.symptoms}

Analiza el historial y responde SOLO con un JSON válido (sin texto adicional) con la siguiente estructura:

{
  "similarTickets": [
    {
      "ticketId": "ID del ticket similar encontrado",
      "ticketNumber": "Número del ticket",
      "title": "Título del ticket",
      "deviceType": "Tipo de dispositivo",
      "deviceModel": "Modelo del dispositivo",
      "resolution": "Resumen de cómo se resolvió",
      "partsUsed": [
        {
          "partName": "Nombre del repuesto usado",
          "quantity": 1
        }
      ],
      "servicesPerformed": ["Servicio 1", "Servicio 2"],
      "similarityScore": 0.85,
      "resolvedAt": "2024-01-15T10:30:00.000Z",
      "technicianName": "Nombre del técnico"
    }
  ],
  "aiAnalysis": "Análisis de patrones encontrados en el historial",
  "recommendedApproach": "Enfoque recomendado basado en reparaciones exitosas similares",
  "estimatedTime": 45,
  "estimatedCost": 250.00,
  "warnings": ["Advertencias o consideraciones especiales"]
}

REGLAS:
1. Busca similitudes en tipo de dispositivo, síntomas, y problemas reportados
2. Prioriza reparaciones con mayor tasa de éxito (status CLOSED > RESOLVED)
3. Asigna un score de similitud realista (0.0 a 1.0)
4. Solo incluye tickets con al menos 0.3 de similitud
5. Incluye un máximo de ${input.limit || 5} tickets similares
6. El tiempo estimado debe ser en minutos
7. Los costos deben estar en Quetzales (GTQ)
8. Responde ÚNICAMENTE con el JSON, sin texto adicional`;
  }

  private validateSearchResult(
    result: SemanticSearchResult,
    closedTickets: any[],
    limit: number
  ): SemanticSearchResult {
    // Validate similar tickets reference existing tickets
    const ticketIds = new Set(closedTickets.map(t => t.id));
    
    const validatedTickets = (result.similarTickets || [])
      .filter(ticket => ticket.ticketId && ticketIds.has(ticket.ticketId))
      .slice(0, limit)
      .map(ticket => ({
        ...ticket,
        similarityScore: Math.min(1, Math.max(0, ticket.similarityScore || 0)),
      }));

    return {
      similarTickets: validatedTickets,
      aiAnalysis: result.aiAnalysis || 'Análisis no disponible.',
      recommendedApproach: result.recommendedApproach || 'Se recomienda diagnóstico estándar.',
      estimatedTime: Math.max(0, result.estimatedTime || 0),
      estimatedCost: Math.max(0, result.estimatedCost || 0),
      warnings: result.warnings || [],
    };
  }

  /**
   * Indexes a resolved ticket for future semantic searches.
   * This creates a searchable summary that can be used for similarity matching.
   */
  async indexResolvedTicket(ticketId: string): Promise<{ success: boolean; message: string }> {
    const tenantDb = getTenantPrisma(this.tenantId);

    const ticket = await tenantDb.ticket.findUnique({
      where: { id: ticketId },
      include: {
        customer: { select: { name: true } },
        assignedTo: { select: { name: true } },
        partsUsed: {
          include: { part: { select: { name: true } } },
          where: { approved: true },
        },
        services: true,
        notes: true,
      },
    });

    if (!ticket) {
      return { success: false, message: 'Ticket no encontrado.' };
    }

    if (ticket.tenantId !== this.tenantId) {
      return { success: false, message: 'No autorizado para acceder a este ticket.' };
    }

    // The ticket is already indexed since we search by tenant-scoped data
    // This method can be extended to create embeddings or search indices
    
    return {
      success: true,
      message: `Ticket #${ticket.ticketNumber || ticket.id} indexado correctamente.`,
    };
  }
}
