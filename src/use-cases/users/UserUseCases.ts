import bcrypt from 'bcryptjs';
import { CreateUserInput, UpdateUserInput } from '@/lib/schemas';
import { IUserRepository, PrismaUserRepository } from '@/lib/repositories';

export class CreateUserUseCase {
    static async execute(
        data: CreateUserInput,
        tenantId: string,
        userId: string,
        repo?: IUserRepository
    ) {
        const userRepo = repo || new PrismaUserRepository(tenantId, userId);
        const existingUser = await userRepo.findByEmail(data.email);

        if (existingUser) {
            throw new Error('El usuario ya existe');
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        return await userRepo.create({
            name: data.name,
            email: data.email,
            password: hashedPassword,
            role: data.role,
            tenantId: tenantId,
        });
    }
}

export class UpdateUserUseCase {
    static async execute(
        data: UpdateUserInput,
        tenantId: string,
        userId: string,
        repo?: IUserRepository
    ) {
        const userRepo = repo || new PrismaUserRepository(tenantId, userId);
        const existingUser = await userRepo.findById(data.userId);

        if (!existingUser) {
            throw new Error('Usuario no encontrado');
        }

        if (data.email !== existingUser.email) {
             const emailTaken = await userRepo.findByEmail(data.email);
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

        return await userRepo.update(data.userId, updateData);
    }
}

export class DeleteUserUseCase {
    static async execute(
        targetUserId: string,
        tenantId: string,
        userId: string,
        repo?: IUserRepository
    ) {
        const userRepo = repo || new PrismaUserRepository(tenantId, userId);
        
        if (targetUserId === userId) {
            throw new Error('No puedes eliminar tu propio usuario');
        }

        const userToDelete = await userRepo.findById(targetUserId);

        if (!userToDelete) {
            throw new Error('Usuario no encontrado');
        }

        if (userToDelete.role === 'ADMIN') {
            const adminCount = await userRepo.count({
                where: {
                    tenantId: tenantId,
                    role: 'ADMIN',
                }
            });

            if (adminCount <= 1) {
                throw new Error('No se puede eliminar el único administrador del sistema');
            }
        }

        return await userRepo.delete(targetUserId);
    }
}
