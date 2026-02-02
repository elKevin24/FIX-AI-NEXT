'use server';

import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getTenantPrisma } from '@/lib/tenant-prisma';
import { CreateUnavailabilitySchema } from '@/lib/schemas';
import { revalidatePath } from 'next/cache';

export async function createUnavailability(prevState: any, formData: FormData) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return { success: false, message: 'No autorizado' };
  }

  // Parse fields manually to handle Dates
  const rawData = {
    userId: formData.get('userId') as string,
    startDate: formData.get('startDate') as string,
    endDate: formData.get('endDate') as string,
    reason: formData.get('reason') as string,
    notes: formData.get('notes') as string,
  };

  const validation = CreateUnavailabilitySchema.safeParse(rawData);

  if (!validation.success) {
    return {
      success: false,
      message: 'Error de validación',
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const { userId, startDate, endDate, reason, notes } = validation.data;
  
  // Security check: Only Admins can set for others. Technicians set for themselves.
  if (userId && userId !== session.user.id && session.user.role !== 'ADMIN') {
      return { success: false, message: 'No tienes permisos para modificar la disponibilidad de otro usuario.' };
  }

  const targetUserId = userId || session.user.id;

  try {
    const tenantDb = getTenantPrisma(session.user.tenantId, session.user.id);

    // Check for overlaps
    const overlaps = await tenantDb.technicianUnavailability.findFirst({
        where: {
            userId: targetUserId,
            isActive: true,
            OR: [
                {
                    startDate: { lte: endDate },
                    endDate: { gte: startDate }
                }
            ]
        }
    });

    if (overlaps) {
        return { success: false, message: 'El rango de fechas seleccionado entra en conflicto con una ausencia existente.' };
    }

    await tenantDb.technicianUnavailability.create({
      data: {
        userId: targetUserId,
        startDate,
        endDate,
        reason: reason as any,
        notes,
        isActive: true,
      },
    });

    // If the absence starts today, update the user's main status
    const now = new Date();
    if (startDate <= now && endDate >= now) {
         await tenantDb.user.update({
             where: { id: targetUserId },
             data: { 
                 status: reason as any,
                 statusReason: notes
             }
         });
    }

    revalidatePath(`/dashboard/technicians/${targetUserId}/availability`);
    return { success: true, message: 'Ausencia registrada correctamente' };
  } catch (error) {
    console.error('Error creating unavailability:', error);
    return { success: false, message: 'Error al registrar ausencia' };
  }
}

export async function deleteUnavailability(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.tenantId) {
        return { success: false, message: 'No autorizado' };
    }

    const id = formData.get('id') as string;
    if (!id) return { success: false, message: 'ID requerido' };

    try {
        const tenantDb = getTenantPrisma(session.user.tenantId, session.user.id);
        
        // Check ownership or admin
        const record = await tenantDb.technicianUnavailability.findUnique({
            where: { id }
        });

        if (!record) return { success: false, message: 'Registro no encontrado' };

        if (record.userId !== session.user.id && session.user.role !== 'ADMIN') {
             return { success: false, message: 'No autorizado' };
        }

        await tenantDb.technicianUnavailability.delete({
            where: { id }
        });

        // If this was the ACTIVE one (happening now), reset user status to AVAILABLE
        const now = new Date();
        if (record.startDate <= now && record.endDate >= now) {
             await tenantDb.user.update({
                 where: { id: record.userId },
                 data: { 
                     status: 'AVAILABLE',
                     statusReason: null
                 }
             });
        }

        revalidatePath(`/dashboard/technicians/${record.userId}/availability`);
        return { success: true, message: 'Registro eliminado' };
    } catch (error) {
        console.error('Error deleting unavailability:', error);
        return { success: false, message: 'Error al eliminar registro' };
    }
}
