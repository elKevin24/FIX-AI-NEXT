import { ServiceCategory } from '@prisma/client';

export interface ServiceTemplateFilters {
    category?: ServiceCategory;
    isActive?: boolean;
    search?: string;
}

export interface ServiceTemplateCreateInput {
    name: string;
    category: ServiceCategory;
    defaultTitle: string;
    defaultDescription: string;
    defaultPriority?: string;
    estimatedDuration?: number | null;
    laborCost?: number | null;
    isActive?: boolean;
    color?: string | null;
    icon?: string | null;
}

export interface ServiceTemplateUpdateInput extends Partial<ServiceTemplateCreateInput> {}

export interface IServiceTemplateRepository {
    findById(id: string): Promise<any | null>;
    findByIdWithParts(id: string): Promise<any | null>;
    findMany(filters?: ServiceTemplateFilters): Promise<any[]>;
    create(data: ServiceTemplateCreateInput, createdById?: string): Promise<any>;
    update(id: string, data: ServiceTemplateUpdateInput, updatedById?: string): Promise<any>;
    delete(id: string): Promise<any>;
    count(filters?: ServiceTemplateFilters): Promise<number>;
}
