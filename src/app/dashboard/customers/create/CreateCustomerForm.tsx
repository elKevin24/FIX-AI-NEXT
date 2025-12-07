'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input, Textarea, Button, Alert } from '@/components/ui';

export default function CreateCustomerForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create customer');
      }

      router.push('/dashboard/customers');
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
        label="Customer Name"
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
        helper="Optional - for sending notifications"
      />

      <Input
        label="Phone Number"
        name="phone"
        type="tel"
        value={formData.phone}
        onChange={handleChange}
        placeholder="+1 (555) 123-4567"
        helper="Optional"
      />

      <Textarea
        label="Address"
        name="address"
        value={formData.address}
        onChange={handleChange}
        placeholder="123 Main St, City, State 12345"
        helper="Optional"
        rows={3}
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
          {isSubmitting ? 'Creating...' : 'Create Customer'}
        </Button>
      </div>
    </form>
  );
}
