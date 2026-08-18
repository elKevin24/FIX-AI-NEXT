import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { AISemanticSearchService } from '@/lib/ai';
import { z } from 'zod';

const SearchInputSchema = z.object({
  symptoms: z.string().min(5, 'Los síntomas deben tener al menos 5 caracteres'),
  deviceType: z.string().optional(),
  deviceModel: z.string().optional(),
  limit: z.number().int().min(1).max(10).optional(),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = SearchInputSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { symptoms, deviceType, deviceModel, limit } = validationResult.data;

    // Initialize Semantic Search Service with tenant context
    const searchService = new AISemanticSearchService({
      tenantId: session.user.tenantId,
    });

    // Search for similar repairs
    const result = await searchService.searchSimilarRepairs({
      symptoms,
      deviceType,
      deviceModel,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ [AI Search] Error:', error);
    
    // Check if it's a configuration error
    if (error instanceof Error && error.message.includes('GOOGLE_AI_API_KEY')) {
      return NextResponse.json(
        { error: 'El servicio de IA no está configurado. Contacte al administrador.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Error al buscar reparaciones similares' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const ticketId = searchParams.get('ticketId');

  if (!ticketId) {
    return NextResponse.json(
      { error: 'ticketId es requerido' },
      { status: 400 }
    );
  }

  try {
    const searchService = new AISemanticSearchService({
      tenantId: session.user.tenantId,
    });

    const result = await searchService.indexResolvedTicket(ticketId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ [AI Search Index] Error:', error);
    return NextResponse.json(
      { error: 'Error al indexar el ticket' },
      { status: 500 }
    );
  }
}
