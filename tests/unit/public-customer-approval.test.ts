import { describe, it, expect, vi, beforeEach } from "vitest";
import { PublicCustomerApprovalUseCase } from "@/use-cases/tickets/PublicCustomerApprovalUseCase";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
    prisma: {
        ticket: {
            findFirst: vi.fn(),
            update: vi.fn(),
        },
    },
}));

vi.mock("@/lib/tenant-prisma", () => ({
    getTenantPrisma: vi.fn(() => ({
        $transaction: vi.fn(async (cb) => cb({
            partUsage: {
                findMany: vi.fn().mockResolvedValue([]),
                update: vi.fn(),
            },
            ticket: {
                update: vi.fn().mockResolvedValue({ id: "ticket-1", status: "IN_PROGRESS" }),
            },
            auditLog: {
                create: vi.fn(),
            },
            ticketNote: {
                create: vi.fn(),
            },
        })),
    })),
}));

describe("PublicCustomerApprovalUseCase (Portal del Cliente - Blindaje Criptográfico)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("lanza error si el ticketId es invalido o vacio", async () => {
        await expect(
            PublicCustomerApprovalUseCase.execute({
                ticketId: "",
                token: "valid-token-123456",
                action: "APPROVE",
            })
        ).rejects.toThrow("ID de ticket no valido");
    });

    it("lanza error si el token de aprobacion es invalido o menor a 8 caracteres", async () => {
        await expect(
            PublicCustomerApprovalUseCase.execute({
                ticketId: "ticket-1",
                token: "short",
                action: "APPROVE",
            })
        ).rejects.toThrow("Token de autorizacion invalido o ausente");
    });

    it("lanza error si el ticket no existe", async () => {
        vi.mocked(prisma.ticket.findFirst).mockResolvedValue(null);

        await expect(
            PublicCustomerApprovalUseCase.execute({
                ticketId: "ticket-not-found",
                token: "valid-token-123456",
                action: "APPROVE",
            })
        ).rejects.toThrow("Ticket no encontrado");
    });

    it("lanza error si el token no coincide con el registrado en el ticket", async () => {
        vi.mocked(prisma.ticket.findFirst).mockResolvedValue({
            id: "ticket-1",
            ticketNumber: "TK-1001",
            status: "WAITING_APPROVAL",
            approvalToken: "real-secret-token-777",
            approvalTokenExpiresAt: new Date(Date.now() + 3600000),
            tenantId: "tenant-1",
            customer: { name: "Juan" },
            partsUsed: [],
        } as any);

        await expect(
            PublicCustomerApprovalUseCase.execute({
                ticketId: "ticket-1",
                token: "wrong-token-999999",
                action: "APPROVE",
            })
        ).rejects.toThrow("Token de aprobacion no valido o no autorizado");
    });

    it("lanza error si el token ha expirado", async () => {
        vi.mocked(prisma.ticket.findFirst).mockResolvedValue({
            id: "ticket-1",
            ticketNumber: "TK-1001",
            status: "WAITING_APPROVAL",
            approvalToken: "real-secret-token-777",
            approvalTokenExpiresAt: new Date(Date.now() - 3600000), // Expired
            tenantId: "tenant-1",
            customer: { name: "Juan" },
            partsUsed: [],
        } as any);

        await expect(
            PublicCustomerApprovalUseCase.execute({
                ticketId: "ticket-1",
                token: "real-secret-token-777",
                action: "APPROVE",
            })
        ).rejects.toThrow("El enlace de autorizacion ha expirado");
    });

    it("aprueba el ticket con token valido y consume el token", async () => {
        vi.mocked(prisma.ticket.findFirst).mockResolvedValue({
            id: "ticket-1",
            ticketNumber: "TK-1001",
            status: "WAITING_APPROVAL",
            approvalToken: "real-secret-token-777",
            approvalTokenExpiresAt: new Date(Date.now() + 3600000),
            tenantId: "tenant-1",
            customer: { name: "Juan" },
            partsUsed: [],
        } as any);

        const result = await PublicCustomerApprovalUseCase.execute({
            ticketId: "ticket-1",
            token: "real-secret-token-777",
            action: "APPROVE",
        });

        expect(result.success).toBe(true);
        expect(result.newStatus).toBe("IN_PROGRESS");
    });
});


