'use server';

/**
 * Report Server Actions (Thin Controller)
 * Delegating multi-domain data aggregation to GetReportDataUseCase.
 */

import { auth } from '@/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { DateRangeSchema } from '@/lib/schemas';
import { GetReportDataUseCase } from '@/use-cases/reports';

export async function getReportData(startDate?: Date, endDate?: Date) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error('No autorizado');
  }

  // RBAC: Solo ADMIN puede ver reportes financieros y de rendimiento
  if (session.user.role !== 'ADMIN') {
    throw new Error('Solo los administradores pueden generar reportes');
  }

  // Validación Zod de fechas (convertir Date → ISO string para el schema)
  const validatedDates = DateRangeSchema.parse({
    startDate: startDate?.toISOString(),
    endDate: endDate?.toISOString(),
  });

  const db = getTenantPrisma(session.user.tenantId, session.user.id);
  return await GetReportDataUseCase.execute(
    {
      startDate: validatedDates.startDate ? new Date(validatedDates.startDate) : undefined,
      endDate: validatedDates.endDate ? new Date(validatedDates.endDate) : undefined,
    },
    session.user.tenantId,
    db
  );
}