import { describe, it, expect } from 'vitest';
import {
  CreateUserSchema,
  UpdateUserSchema,
  UserActionCreateSchema,
  UserActionUpdateSchema,
} from './schemas';

describe('Unified User Schemas', () => {
  describe('CreateUserSchema & UserActionCreateSchema', () => {
    it('should export UserActionCreateSchema as an alias to CreateUserSchema', () => {
      expect(UserActionCreateSchema).toBe(CreateUserSchema);
    });

    it('should validate successfully when full name is provided', () => {
      const result = CreateUserSchema.safeParse({
        name: 'Carlos Mendoza',
        email: 'carlos@example.com',
        role: 'TECHNICIAN',
        password: 'Password123!',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Carlos Mendoza');
        expect(result.data.firstName).toBe('Carlos');
        expect(result.data.lastName).toBe('Mendoza');
        expect(result.data.email).toBe('carlos@example.com');
        expect(result.data.role).toBe('TECHNICIAN');
      }
    });

    it('should validate successfully when firstName and lastName are provided', () => {
      const result = CreateUserSchema.safeParse({
        firstName: 'María',
        lastName: 'Gómez',
        email: 'maria@example.com',
        role: 'ADMIN',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('María Gómez');
        expect(result.data.firstName).toBe('María');
        expect(result.data.lastName).toBe('Gómez');
        expect(result.data.password).toBe('');
      }
    });

    it('should reject when neither name nor firstName is provided', () => {
      const result = CreateUserSchema.safeParse({
        email: 'test@example.com',
        role: 'VIEWER',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toBe('El nombre es requerido');
      }
    });

    it('should reject invalid email', () => {
      const result = CreateUserSchema.safeParse({
        name: 'Valid Name',
        email: 'invalid-email',
        role: 'VIEWER',
      });

      expect(result.success).toBe(false);
    });

    it('should reject short password when provided', () => {
      const result = CreateUserSchema.safeParse({
        name: 'Valid Name',
        email: 'valid@example.com',
        password: '123',
        role: 'VIEWER',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('UpdateUserSchema & UserActionUpdateSchema', () => {
    it('should export UserActionUpdateSchema as an alias to UpdateUserSchema', () => {
      expect(UserActionUpdateSchema).toBe(UpdateUserSchema);
    });

    it('should validate and parse with name', () => {
      const result = UpdateUserSchema.safeParse({
        userId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Ana Silva',
        email: 'ana@example.com',
        role: 'MANAGER',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Ana Silva');
        expect(result.data.firstName).toBe('Ana');
        expect(result.data.lastName).toBe('Silva');
      }
    });

    it('should validate and parse with firstName and lastName', () => {
      const result = UpdateUserSchema.safeParse({
        userId: '123e4567-e89b-12d3-a456-426614174000',
        firstName: 'Pedro',
        lastName: 'Ramírez',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Pedro Ramírez');
        expect(result.data.firstName).toBe('Pedro');
        expect(result.data.lastName).toBe('Ramírez');
      }
    });
  });
});
