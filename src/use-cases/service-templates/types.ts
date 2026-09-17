import { ServiceCategory } from '@prisma/client';
import type { getTenantPrisma } from '@/lib/tenant-prisma';

export type TenantPrismaClient = ReturnType<typeof getTenantPrisma>;

export interface ServiceTemplateFormData {
  name: string;
  category: ServiceCategory;
  defaultTitle: string;
  defaultDescription: string;
  defaultPriority: string;
  estimatedDuration?: number;
  laborCost?: number;
  isActive?: boolean;
  color?: string;
  icon?: string;
}

export interface TemplateAnalytics {
  summary: {
    totalTemplates: number;
    activeTemplates: number;
    totalTicketsCreated: number;
    totalRevenueFromTemplates: number;
  };
  templateUsage: {
    id: string;
    name: string;
    category: ServiceCategory;
    icon: string | null;
    color: string | null;
    ticketCount: number;
    lastUsed: Date | null;
    laborCost: number;
    totalRevenue: number;
  }[];
  categoryBreakdown: {
    category: ServiceCategory;
    count: number;
    ticketCount: number;
    revenue: number;
  }[];
  recentActivity: {
    id: string;
    ticketNumber: string | null;
    title: string;
    templateName: string;
    templateIcon: string | null;
    customerName: string;
    createdAt: Date;
    status: string;
  }[];
  monthlyTrend: {
    month: string;
    ticketCount: number;
    revenue: number;
  }[];
}

export type TemplateWithParts = NonNullable<
  Awaited<ReturnType<TenantPrismaClient['serviceTemplate']['findUnique']>>
> & {
  defaultParts: Array<{
    partId: string;
    quantity: number;
    required: boolean;
    part: { name: string };
  }>;
};
