import { describe, it, expect, vi } from "vitest";
import { GenerateCashCutUseCase } from "@/use-cases/cash-register/GenerateCashCutUseCase";
import { getTenantPrisma } from "@/lib/tenant-prisma";

vi.mock("@/lib/tenant-prisma", () => ({
    getTenantPrisma: vi.fn().mockReturnValue({
        cashRegister: {
            findUnique: vi.fn().mockResolvedValue(null),
        }
    })
}));

describe("GenerateCashCutUseCase (Corte X y Corte Z)", () => {
    it("valida existencia de la caja registradora", async () => {
        await expect(
            GenerateCashCutUseCase.execute({
                cashRegisterId: "non-existent",
                cutType: "CORTE_X",
                tenantId: "tenant-1",
                userId: "user-1",
            })
        ).rejects.toThrow("Caja registradora no encontrada");
    });
});

