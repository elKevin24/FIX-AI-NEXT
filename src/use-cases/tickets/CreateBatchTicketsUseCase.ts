import { getTenantPrisma } from "@/lib/tenant-prisma";
import { CreateTicketInput } from "@/lib/schemas";
import { CustomerResolver, CustomerInfo } from "./create-ticket/CustomerResolver";
import { notifyTicketCreated } from "@/lib/ticket-notifications";
import { Prisma } from "@prisma/client";

export interface CreateBatchTicketsParams {
    ticketsData: CreateTicketInput[];
    customerInfo: CustomerInfo;
    tenantId: string;
    userId: string;
}

export interface CreateBatchTicketsDependencies {
    customerResolver?: { resolve(customerInfo: CustomerInfo): Promise<{ id: string; name: string; email?: string | null }> };
    db?: any;
    notifier?: (ticket: any) => Promise<void>;
}

export class CreateBatchTicketsUseCase {
    private readonly customerResolver: { resolve(customerInfo: CustomerInfo): Promise<{ id: string; name: string; email?: string | null }> };
    private readonly db: any;
    private readonly notifier: (ticket: any) => Promise<void>;

    constructor(
        private readonly tenantId: string,
        private readonly userId: string,
        deps?: CreateBatchTicketsDependencies
    ) {
        this.customerResolver = deps?.customerResolver ?? new CustomerResolver(tenantId, userId);
        this.db = deps?.db ?? getTenantPrisma(tenantId, userId);
        this.notifier = deps?.notifier ?? notifyTicketCreated;
    }

    async execute({ ticketsData, customerInfo }: CreateBatchTicketsParams): Promise<string[]> {
        // 1. Resolve or create customer using CustomerResolver
        const customer = await this.customerResolver.resolve(customerInfo);

        const tenantDb = this.db;

        // 2. Insert tickets within an isolated tenant transaction
        const createdTicketIds = await tenantDb.$transaction(
            async (tx: Prisma.TransactionClient) => {
                const tickets = await Promise.all(
                    ticketsData.map((ticket: CreateTicketInput) =>
                        tx.ticket.create({
                            data: {
                                title: ticket.title,
                                description: ticket.description,
                                customerId: customer.id,
                                status: "OPEN",
                                priority: ticket.priority || "MEDIUM",
                                tenantId: this.tenantId,
                                deviceType: ticket.deviceType,
                                deviceModel: ticket.deviceModel,
                                serialNumber: ticket.serialNumber,
                                accessories: ticket.accessories,
                                checkInNotes: ticket.checkInNotes,
                                createdById: this.userId,
                                updatedById: this.userId,
                            },
                            select: { id: true },
                        }),
                    ),
                );
                return tickets.map((t) => t.id);
            },
        );

        // 3. Dispatch batch notifications asynchronously (fire-and-forget)
        void this.sendBatchNotifications(tenantDb, createdTicketIds);

        return createdTicketIds;
    }

    static async execute(params: CreateBatchTicketsParams, deps?: CreateBatchTicketsDependencies): Promise<string[]> {
        const useCase = new CreateBatchTicketsUseCase(params.tenantId, params.userId, deps);
        return useCase.execute(params);
    }

    private async sendBatchNotifications(
        db: any,
        ticketIds: string[],
    ): Promise<void> {
        try {
            const tickets = await db.ticket.findMany({
                where: { id: { in: ticketIds } },
                include: { customer: true, assignedTo: true },
            });

            for (const ticket of tickets) {
                try {
                    await notifyTicketCreated({
                        id: ticket.id,
                        ticketNumber: ticket.ticketNumber,
                        title: ticket.title,
                        deviceType: ticket.deviceType,
                        deviceModel: ticket.deviceModel,
                        status: ticket.status,
                        customerId: ticket.customerId,
                        customer: {
                            id: ticket.customer.id,
                            name: ticket.customer.name,
                            email: ticket.customer.email,
                        },
                        assignedTo: ticket.assignedTo,
                        tenantId: ticket.tenantId,
                    });
                } catch (err) {
                    console.error("Failed to send batch ticket notification:", err);
                }
            }
        } catch (error) {
            console.error("Failed to fetch batch tickets for notification:", error);
        }
    }
}

