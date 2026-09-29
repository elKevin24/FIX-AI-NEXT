import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardBody, CardFooter } from './Card';

describe('Card compound components', () => {
  it('renders full card layout with header, title, description, body, and footer', () => {
    render(
      <Card interactive className="custom-card">
        <CardHeader>
          <CardTitle>Repair Order #123</CardTitle>
          <CardDescription>Customer: John Doe</CardDescription>
        </CardHeader>
        <CardBody>
          <p>Device details and diagnostic notes</p>
        </CardBody>
        <CardFooter>
          <button>Proceed</button>
        </CardFooter>
      </Card>
    );

    expect(screen.getByRole('heading', { level: 3, name: /repair order #123/i })).toBeDefined();
    expect(screen.getByText('Customer: John Doe')).toBeDefined();
    expect(screen.getByText('Device details and diagnostic notes')).toBeDefined();
    expect(screen.getByRole('button', { name: /proceed/i })).toBeDefined();
  });
});
