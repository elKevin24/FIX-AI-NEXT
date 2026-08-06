import { getTenantPrisma } from '@/lib/tenant-prisma';
import bcrypt from 'bcryptjs';
import { CreateUserInput, UpdateUserInput } from '@/lib/schemas';

export class CreateUserUseCase {
    static async execute(data: CreateUserInput, tenantId: string, userId: string) {
        const tenantDb = getTenantPrisma(tenantId, userId);
        
        const existingUser = await tenantDb.user.findUnique({
            where: { email: data.email }
        });

        if (existingUser) {
            throw new Error('El usuario ya existe');
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        return await tenantDb.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: hashedPassword,
                role: data.role,
                tenantId: tenantId,
            }
        });
    }
}

export class UpdateUserUseCase {
    static async execute(data: UpdateUserInput, tenantId: string, userId: string) {
        const tenantDb = getTenantPrisma(tenantId, userId);

        const existingUser = await tenantDb.user.findUnique({
            where: { id: data.userId }
        });

        if (!existingUser) {
            throw new Error('Usuario no encontrado');
        }

        if (data.email !== existingUser.email) {
             const emailTaken = await tenantDb.user.findFirst({
                 where: { email: data.email }
             });
             if (emailTaken) {
                 throw new Error('Ya existe un usuario con este email');
             }
        }

        const updateData: any = {
            name: data.name,
            email: data.email,
            role: data.role,
        };

        if (data.password && data.password.length > 0) {
            if (data.password.length < 6) {
                throw new Error('La contraseña debe tener al menos 6 caracteres');
            }
            updateData.password = await bcrypt.hash(data.password, 10);
        }

        return await tenantDb.user.update({
            where: { id: data.userId },
            data: updateData,
        });
    }
}

export class DeleteUserUseCase {
    static async execute(targetUserId: string, tenantId: string, currentUserId: string) {
        if (targetUserId === currentUserId) {
            throw new Error('No puedes eliminar tu propia cuenta');
        }

        const tenantDb = getTenantPrisma(tenantId, currentUserId);

        const existingUser = await tenantDb.user.findUnique({
            where: { id: targetUserId }
        });

        if (!existingUser) {
            throw new Error('Usuario no encontrado');
        }

        return await tenantDb.user.delete({
            where: { id: targetUserId },
        });
    }
}
