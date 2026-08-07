import { Part } from '@prisma/client';

export interface IPartRepository {
    findById(id: string): Promise<Part | null>;
    findMany(filters: PartFilters): Promise<Part[]>;
    findLowStock(tenantId: string): Promise<Part[]>;
    create(data: PartCreateInput): Promise<Part>;
    update(id: string, data: PartUpdateInput): Promise<Part>;
    updateStock(id: string, quantityChange: number): Promise<Part>;
    delete(id: string): Promise<Part>;
}

export interface PartFilters {
    tenantId: string;
    search?: string;
    category?: string;
    lowStock?: boolean;
    page?: number;
    limit?: number;
}

export interface PartCreateInput {
    name: string;
    sku?: string | null;
    quantity: number;
    cost: number;
    price: number;
    tenantId: string;
    category?: string | null;
    location?: string | null;
    minStock?: number;
    createdById: string;
    updatedById: string;
}

export interface PartUpdateInput {
    name?: string;
    sku?: string | null;
    quantity?: number;
    cost?: number;
    price?: number;
    category?: string | null;
    location?: string | null;
    minStock?: number;
    updatedById: string;
}