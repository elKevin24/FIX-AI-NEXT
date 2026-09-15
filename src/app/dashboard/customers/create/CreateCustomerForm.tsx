'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input, Textarea, Button, Alert } from '@/components/ui';
import styles from '@/components/ui/Form.module.css';

export default function CreateCustomerForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    dpi: '',
    nit: '',
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
          {error}
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

      <div className={styles.formRow}>
        <Input
          label="DPI (ID)"
          name="dpi"
          type="text"
          value={formData.dpi}
          onChange={handleChange}
          placeholder="1234 56789 0101"
          helper="Optional"
        />
        <Input
          label="NIT (Tax ID)"
          name="nit"
          type="text"
          value={formData.nit}
          onChange={handleChange}
          placeholder="123456-7"
          helper="Optional"
        />
      </div>

      <Textarea
        label="Address"
        name="address"
        value={formData.address}
        onChange={handleChange}
        placeholder="123 Main St, City, State 12345"
        helper="Optional"
        rows={3}
      />

      <div className={styles.actions}>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
          isLoading={isSubmitting}
        >
          Create Customer
        </Button>
      </div>
    </form>
  );
}