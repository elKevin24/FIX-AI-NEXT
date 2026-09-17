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
        if ((data.role as string) === 'SUPER_ADMIN') {
            throw new Error('No está permitido crear usuarios con el rol Super Administrador');
        }

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
        if ((data.role as string) === 'SUPER_ADMIN') {
            throw new Error('No está permitido asignar el rol Super Administrador');
        }

        const userRepo = repo || new PrismaUserRepository(tenantId, userId);
        const existingUser = await userRepo.findById(data.userId);

        if (!existingUser) {
            throw new Error('Usuario no encontrado');
        }

        // Proteger usuario SUPER_ADMIN
        if (existingUser.role === 'SUPER_ADMIN') {
            if (userId !== data.userId) {
                throw new Error('No autorizado para modificar al Super Administrador');
            }
            if (data.role && (data.role as string) !== 'SUPER_ADMIN') {
                throw new Error('No se puede revocar el rol del Super Administrador');
            }
        }

        if (data.email && data.email !== existingUser.email) {
             const emailTaken = await userRepo.findByEmail(data.email);
             if (emailTaken) {
                 throw new Error('Ya existe un usuario con este email');
             }
        }

        const updateData: {
            name?: string;
            email?: string;
            role?: any;
            password?: string;
        } = {
            name: data.name,
            email: data.email,
            role: existingUser.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : data.role,
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
        currentUserId: string,
        repo?: IUserRepository
    ) {
        if (targetUserId === currentUserId) {
            throw new Error('No puedes eliminar tu propio usuario');
        }

        const userRepo = repo || new PrismaUserRepository(tenantId, currentUserId);

        const existingUser = await userRepo.findById(targetUserId);

        if (!existingUser) {
            throw new Error('Usuario no encontrado');
        }

        if (existingUser.role === 'SUPER_ADMIN') {
            throw new Error('No es posible eliminar al Super Administrador del sistema');
        }

        return await userRepo.delete(targetUserId);
    }
}
