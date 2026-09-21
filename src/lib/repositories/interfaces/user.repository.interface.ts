import { User, UserRole } from '@prisma/client';

export { UserRole };

export interface IUserRepository {
    findById(id: string): Promise<User | null>;
    findByEmail(email: string, tenantId?: string): Promise<User | null>;
    findMany(filters: UserFilters): Promise<User[]>;
    create(data: UserCreateInput): Promise<User>;
    update(id: string, data: UserUpdateInput): Promise<User>;
    updateStatus(id: string, isActive: boolean): Promise<User>;
    delete(id: string): Promise<User>;
    count(filters: UserFilters): Promise<number>;
}

export interface UserFilters {
    tenantId: string;
    role?: UserRole;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
}

export interface UserCreateInput {
    email: string;
    password: string;
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
    role: UserRole;
    tenantId: string;
    isActive?: boolean;
    passwordMustChange?: boolean;
    createdById?: string;
    updatedById?: string;
}

export interface UserUpdateInput {
    name?: string;
    email?: string;
    firstName?: string | null;
    lastName?: string | null;
    role?: UserRole;
    isActive?: boolean;
    passwordMustChange?: boolean;
    password?: string | null;
    updatedById?: string;
}