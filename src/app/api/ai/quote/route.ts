import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { AISmartQuoteGenerator } from '@/lib/ai';
import { z } from 'zod';

const QuoteInputSchema = z.object({
  ticketId: z.string().uuid('ID de ticket inválido'),
  technicalDiagnosis: z.string().min(10, 'El diagnóstico técnico debe tener al menos 10 caracteres'),
  partsUsed: z.array(z.object({
    partName: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
  })).optional(),
  servicesPerformed: z.array(z.object({
    serviceName: z.string(),
    laborCost: z.number().positive(),
    duration: z.number().positive(),
  })).optional(),
  additionalNotes: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = QuoteInputSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { ticketId, technicalDiagnosis, partsUsed, servicesPerformed, additionalNotes } = validationResult.data;

    // Initialize Smart Quote Generator with tenant context
    const quoteGenerator = new AISmartQuoteGenerator({
      tenantId: session.user.tenantId,
    });

    // Generate quote explanation
    const result = await quoteGenerator.generateQuote({
      ticketId,
      technicalDiagnosis,
      partsUsed: partsUsed || [],
      servicesPerformed: servicesPerformed || [],
      additionalNotes,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ [AI Quote] Error:', error);
    
    // Check if it's a configuration error
    if (error instanceof Error && error.message.includes('GOOGLE_AI_API_KEY')) {
      return NextResponse.json(
        { error: 'El servicio de IA no está configurado. Contacte al administrador.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Error al generar la cotización con IA' },
      { status: 500 }
    );
  }
}
