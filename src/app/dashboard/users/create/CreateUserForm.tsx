'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input, Select, Button, Alert } from '@/components/ui';
import type { SelectOption } from '@/components/ui';

const roleOptions: SelectOption[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'TECHNICIAN', label: 'Technician' },
  { value: 'RECEPTIONIST', label: 'Receptionist' },
];

export default function CreateUserForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'TECHNICIAN',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      router.push('/dashboard/users');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <Alert variant="error">
          <strong>Error:</strong> {error}
        </Alert>
      )}

      <Input
        label="Full Name"
        name="name"
        type="text"
        value={formData.name}
        onChange={handleChange}
        placeholder="John Doe"
        required
      />

      <Input
        label="Email Address"
        name="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        placeholder="john@example.com"
        helper="User will use this email to log in"
        required
      />

      <Input
        label="Password"
        name="password"
        type="password"
        value={formData.password}
        onChange={handleChange}
        placeholder="Min. 8 characters"
        helper="Must be at least 8 characters long"
        required
      />

      <Select
        label="Role"
        name="role"
        value={formData.role}
        onChange={handleChange}
        options={roleOptions}
        helper="Choose the user's access level"
      />

      <div className="flex gap-4" style={{ marginTop: 'var(--spacing-6)' }}>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          style={{ flex: 1 }}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
          style={{ flex: 1 }}
        >
          {isSubmitting ? 'Creating...' : 'Create User'}
        </Button>
      </div>
    </form>
  );
}
