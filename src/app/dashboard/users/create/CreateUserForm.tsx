'use client';

import { useActionState, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input, Select, Button, Alert } from '@/components/ui';
import type { SelectOption } from '@/components/ui';
import styles from '@/components/ui/Form.module.css';
import { createUser, PASSWORD_POLICY } from '@/lib/user-actions';
import { ROLE_LABELS, ROLE_DESCRIPTIONS, getSelectableRoles } from '@/lib/auth-utils';
import type { UserRole } from '@prisma/client';

interface CreateUserFormProps {
  currentUserRole?: UserRole;
}

export default function CreateUserForm({ currentUserRole = 'ADMIN' }: CreateUserFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createUser, {
    success: false,
    message: '',
  });

  const [generatePassword, setGeneratePassword] = useState(true);
  const [password, setPassword] = useState('');

  // Build role options based on current user's role
  const roleOptions: SelectOption[] = getSelectableRoles().map((role) => ({
    value: role,
    label: ROLE_LABELS[role],
  }));

  useEffect(() => {
    if (state.success) {
      // Show temporary password if generated
      if (state.data?.temporaryPassword) {
        alert(`Usuario creado exitosamente!\n\nContraseña temporal: ${state.data.temporaryPassword}\n\nEl usuario deberá cambiarla en su primer inicio de sesión.`);
      }
      router.push('/dashboard/users');
      router.refresh();
    }
  }, [state.success, state.data, router]);

  return (
    <form action={formAction}>
      {state.message && !state.success && (
        <Alert variant="error">
          {state.message}
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Nombre"
          name="firstName"
          type="text"
          placeholder="Juan"
          required
          error={state.errors?.firstName?.[0]}
        />

        <Input
          label="Apellido"
          name="lastName"
          type="text"
          placeholder="Pérez"
          required
          error={state.errors?.lastName?.[0]}
        />
      </div>

      <Input
        label="Correo Electrónico"
        name="email"
        type="email"
        placeholder="juan.perez@ejemplo.com"
        helper="El usuario iniciará sesión con este correo"
        required
        error={state.errors?.email?.[0]}
      />

      <div className="my-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={generatePassword}
            onChange={(e) => setGeneratePassword(e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">
            Generar contraseña temporal automáticamente
          </span>
        </label>
        <p className="text-xs text-gray-500 mt-1 ml-6">
          El usuario deberá cambiar la contraseña en su primer inicio de sesión
        </p>
      </div>

      {!generatePassword && (
        <div>
          <Input
            label="Contraseña"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            error={state.errors?.password?.[0]}
          />
          <div className="mt-2 text-xs text-gray-500 space-y-1">
            <p className="font-medium">Requisitos de contraseña:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Mínimo {PASSWORD_POLICY.minLength} caracteres</li>
              <li>Al menos una mayúscula</li>
              <li>Al menos una minúscula</li>
              <li>Al menos un número</li>
              <li>Al menos un carácter especial (!@#$%^&*...)</li>
            </ul>
          </div>
        </div>
      )}

      <Select
        label="Rol"
        name="role"
        defaultValue="TECHNICIAN"
        options={roleOptions}
        helper="Define los permisos del usuario"
      />

      <div className="mt-2 mb-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
        <p className="font-medium mb-2">Descripción de roles:</p>
        <ul className="space-y-1">
          {getSelectableRoles().map((role) => (
            <li key={role}>
              <strong>{ROLE_LABELS[role]}:</strong> {ROLE_DESCRIPTIONS[role]}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.actions}>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isPending}
          isLoading={isPending}
        >
          Crear Usuario
        </Button>
      </div>
    </form>
  );
}
