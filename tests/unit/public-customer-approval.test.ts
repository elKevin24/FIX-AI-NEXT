import { describe, it, expect, vi, beforeEach } from "vitest";
import { PublicCustomerApprovalUseCase } from "@/use-cases/tickets/PublicCustomerApprovalUseCase";
import { prisma } from "@/lib/prisma";

describe("PublicCustomerApprovalUseCase (Portal del Cliente)", () => {
    it("lanza error si el ticketId es invalido o vacio", async () => {
        await expect(
            PublicCustomerApprovalUseCase.execute({
                ticketId: "",
                action: "APPROVE",
            })
        ).rejects.toThrow("ID de ticket no valido");
    });
});

