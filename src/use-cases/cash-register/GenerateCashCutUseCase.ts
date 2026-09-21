import { Prisma } from "@prisma/client";
import { getTenantPrisma } from "@/lib/tenant-prisma";

export type CutType = "CORTE_X" | "CORTE_Z";

export interface GenerateCashCutInput {
    cashRegisterId: string;
    cutType: CutType;
    physicalCashReported?: number;
    tenantId: string;
    userId: string;
}

export interface PaymentBreakdown {
    method: string;
    amount: number;
    count: number;
}

export interface CashCutReport {
    cashRegisterId: string;
    registerName: string;
    cutType: CutType;
    openedAt: Date;
    generatedAt: Date;
    openedBy: string;
    generatedBy: string;
    openingBalance: number;
    totalSales: number;
    totalInflow: number;
    totalOutflow: number;
    salesByPaymentMethod: PaymentBreakdown[];
    expectedCashInDrawer: number;
    physicalCashReported: number | null;
    difference: number | null; // Sobrante (+) o Faltante (-)
    isClosed: boolean;
}

/**
 * Caso de Uso desacoplado para generar Cortes de Caja:
 * - Corte X: Arqueo parcial en tiempo real sin cerrar la sesion de caja.
 * - Corte Z: Cierre fiscal/definitivo del turno con congelamiento de balance.
 */
export class GenerateCashCutUseCase {
    static async execute(input: GenerateCashCutInput): Promise<CashCutReport> {
        const { cashRegisterId, cutType, physicalCashReported, tenantId, userId } = input;
        const tenantDb = getTenantPrisma(tenantId, userId);

        const register = await tenantDb.cashRegister.findUnique({
            where: { id: cashRegisterId },
            include: {
                openedBy: { select: { id: true, name: true, email: true } },
                transactions: {
                    where: { createdAt: { gte: new Date(0) } },
                    orderBy: { createdAt: "asc" }
                }
            }
        });

        if (!register) {
            throw new Error("Caja registradora no encontrada");
        }

        if (register.tenantId !== tenantId) {
            throw new Error("No autorizado para consultar esta caja");
        }

        const openedDate = register.openedAt ? new Date(register.openedAt) : new Date(0);

        // Obtener transacciones desde la apertura
        const transactions = (register.transactions || []).filter((tx: any) => 
            new Date(tx.createdAt) >= openedDate
        );

        let totalInflow = 0;
        let totalOutflow = 0;
        const methodsMap: Record<string, { amount: number; count: number }> = {};

        for (const tx of transactions) {
            const amount = Number(tx.amount);
            const method = "CASH"; // Metodo base para transacciones de caja

            if (!methodsMap[method]) {
                methodsMap[method] = { amount: 0, count: 0 };
            }
            methodsMap[method].amount += amount;
            methodsMap[method].count += 1;

            if (tx.type === "INCOME" || tx.type === "SALE" || tx.type === "INFLOW") {
                totalInflow += amount;
            } else if (tx.type === "EXPENSE" || tx.type === "OUTFLOW" || tx.type === "WITHDRAWAL") {
                totalOutflow += amount;
            }
        }

        const openingBalance = Number(register.openingBalance);
        const cashSales = methodsMap["CASH"]?.amount || 0;
        const expectedCashInDrawer = openingBalance + cashSales - totalOutflow;

        const breakdown: PaymentBreakdown[] = Object.entries(methodsMap).map(([method, data]) => ({
            method,
            amount: data.amount,
            count: data.count,
        }));

        const physical = typeof physicalCashReported === "number" ? physicalCashReported : null;
        const difference = physical !== null ? physical - expectedCashInDrawer : null;

        // Si es Corte Z, cerrar formalmente la caja dentro de una transaccion
        let isClosed = !register.isOpen;
        if (cutType === "CORTE_Z" && register.isOpen) {
            await tenantDb.cashRegister.update({
                where: { id: register.id },
                data: {
                    isOpen: false,
                    closingBalance: new Prisma.Decimal(physical ?? expectedCashInDrawer),
                    closedAt: new Date(),
                    closedById: userId,
                }
            });
            isClosed = true;
        }

        return {
            cashRegisterId: register.id,
            registerName: register.name,
            cutType,
            openedAt: register.openedAt || new Date(),
            generatedAt: new Date(),
            openedBy: register.openedBy?.name || register.openedBy?.email || "Desconocido",
            generatedBy: userId,
            openingBalance,
            totalSales: totalInflow,
            totalInflow,
            totalOutflow,
            salesByPaymentMethod: breakdown,
            expectedCashInDrawer,
            physicalCashReported: physical,
            difference,
            isClosed,
        };
    }
}

