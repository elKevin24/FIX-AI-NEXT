export abstract class DomainError extends Error {
    abstract readonly code: string;
    abstract readonly statusCode: number;

    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class NotFoundError extends DomainError {
    readonly code = 'NOT_FOUND';
    readonly statusCode = 404;

    constructor(resource: string, id?: string) {
        super(`${resource} no encontrado${id ? ` (${id})` : ''}`);
    }
}

export class ValidationError extends DomainError {
    readonly code = 'VALIDATION_ERROR';
    readonly statusCode = 400;

    constructor(message: string, public readonly field?: string) {
        super(message);
    }
}

export class AuthorizationError extends DomainError {
    readonly code: string;
    readonly statusCode: number;

    constructor(message = 'No autorizado', code = 'FORBIDDEN', statusCode = 403) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
    }
}

export class ForbiddenError extends DomainError {
    readonly code = 'FORBIDDEN';
    readonly statusCode = 403;

    constructor(message = 'Acceso denegado') {
        super(message);
    }
}

export class BusinessRuleError extends DomainError {
    readonly code = 'BUSINESS_RULE_VIOLATION';
    readonly statusCode = 422;

    constructor(message: string) {
        super(message);
    }
}

export class ConflictError extends DomainError {
    readonly code = 'CONFLICT';
    readonly statusCode = 409;

    constructor(message: string) {
        super(message);
    }
}

export class InternalError extends DomainError {
    readonly code = 'INTERNAL_ERROR';
    readonly statusCode = 500;

    constructor(message = 'Error interno del servidor', public override readonly cause?: Error) {
        super(message);
    }
}

export function isDomainError(error: unknown): error is DomainError {
    return error instanceof DomainError;
}

export function toDomainError(error: unknown): DomainError {
    if (isDomainError(error)) return error;
    if (error instanceof Error) {
        return new InternalError(error.message, error);
    }
    return new InternalError('Error desconocido');
}

/**
 * Produce a safe, user-facing error message without leaking internal details
 * (stack traces, driver metadata, DB constraint values, PII) to the client.
 * Curated DomainError messages are preserved; anything else maps to a generic fallback.
 */
export function toClientMessage(error: unknown, fallback: string): string {
    if (isDomainError(error)) {
        return error.message;
    }
    if (error instanceof Error && (error as any).code === 'P2025') {
        return 'El registro no existe o no tiene permisos.';
    }
    return fallback;
}