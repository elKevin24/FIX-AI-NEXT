import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { AIDiagnosticAssistant } from '@/lib/ai';
import { z } from 'zod';

const DiagnosticInputSchema = z.object({
  deviceType: z.string().min(1, 'El tipo de dispositivo es requerido'),
  deviceModel: z.string().min(1, 'El modelo del dispositivo es requerido'),
  symptoms: z.string().min(10, 'Los síntomas deben tener al menos 10 caracteres'),
  checkInNotes: z.string().optional(),
  customerNotes: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = DiagnosticInputSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { deviceType, deviceModel, symptoms, checkInNotes, customerNotes } = validationResult.data;

    // Initialize AI Diagnostic Assistant with tenant context
    const diagnosticAssistant = new AIDiagnosticAssistant({
      tenantId: session.user.tenantId,
    });

    // Analyze diagnostic
    const result = await diagnosticAssistant.analyzeDiagnostic({
      deviceType,
      deviceModel,
      symptoms,
      checkInNotes,
      customerNotes,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ [AI Diagnostic] Error:', error);
    
    // Check if it's a configuration error
    if (error instanceof Error && error.message.includes('GOOGLE_AI_API_KEY')) {
      return NextResponse.json(
        { error: 'El servicio de IA no está configurado. Contacte al administrador.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Error al procesar el diagnóstico con IA' },
      { status: 500 }
    );
  }
}
