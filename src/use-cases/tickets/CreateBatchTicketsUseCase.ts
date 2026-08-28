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

export class CreateBatchTicketsUseCase {
    private readonly customerResolver: CustomerResolver;

    constructor(
        private readonly tenantId: string,
        private readonly userId: string
    ) {
        this.customerResolver = new CustomerResolver(tenantId, userId);
    }

    async execute({ ticketsData, customerInfo }: CreateBatchTicketsParams): Promise<string[]> {
        // 1. Resolve or create customer using CustomerResolver
        const customer = await this.customerResolver.resolve(customerInfo);

        const tenantDb = getTenantPrisma(this.tenantId, this.userId);

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

    static async execute(params: CreateBatchTicketsParams): Promise<string[]> {
        const useCase = new CreateBatchTicketsUseCase(params.tenantId, params.userId);
        return useCase.execute(params);
    }

    private async sendBatchNotifications(
        db: ReturnType<typeof getTenantPrisma>,
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

