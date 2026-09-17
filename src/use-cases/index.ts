// Use Cases - Clean Architecture Layer
// 
// This directory contains application-level business logic organized by domain.
// Each use case represents a single, focused business transaction.
//
// Key Principles:
// - No direct Prisma imports (dependency injection only)
// - Depends on repository abstractions (interfaces)
// - Single Responsibility Principle
// - Fully testable with mock repositories
// - Framework-agnostic

export * from './invoices';
export * from './cash-register';
export * from './service-templates';
export * from './users';
export * from './quotations';
export * from './pos';
export * from './credit-notes';


