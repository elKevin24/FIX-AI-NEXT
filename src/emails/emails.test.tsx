import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import TicketCreatedEmail from './TicketCreated';
import TicketStatusChangedEmail from './TicketStatusChanged';
import PartsApprovalRequiredEmail from './PartsApprovalRequired';
import TechnicianAssignedEmail from './TechnicianAssigned';
import SLABreachEmail from './SLABreach';
import LowStockEmail from './LowStock';
import ResetPasswordEmail from './ResetPasswordEmail';

describe('Transactional Email Templates', () => {
  describe('TicketCreatedEmail', () => {
    it('renders with default and custom props', () => {
      const { container } = render(
        <TicketCreatedEmail
          customerName="Alice"
          ticketNumber="TICK-1001"
          ticketTitle="Screen Repair"
          deviceType="Phone"
          deviceModel="iPhone 13"
          ticketLink="https://example.com/tickets/1"
        />
      );
      expect(container.textContent).toContain('Alice');
      expect(container.textContent).toContain('#TICK-1001');
      expect(container.textContent).toContain('Screen Repair');
      expect(container.textContent).toContain('Phone - iPhone 13');
    });

    it('renders with default props', () => {
      const { container } = render(<TicketCreatedEmail customerName="Bob" ticketTitle="Test" ticketLink="#" />);
      expect(container.textContent).toContain('Bob');
    });
  });

  describe('TicketStatusChangedEmail', () => {
    it('renders status transition details and notes', () => {
      const { container } = render(
        <TicketStatusChangedEmail
          customerName="Charlie"
          ticketNumber="TICK-2002"
          ticketTitle="Battery replacement"
          oldStatus="OPEN"
          newStatus="IN_PROGRESS"
          note="Technician started diagnostics"
          ticketLink="https://example.com/tickets/2"
        />
      );
      expect(container.textContent).toContain('Charlie');
      expect(container.textContent).toContain('#TICK-2002');
      expect(container.textContent).toContain('Technician started diagnostics');
    });
  });

  describe('PartsApprovalRequiredEmail', () => {
    it('renders parts list, costs, and approval link', () => {
      const { container } = render(
        <PartsApprovalRequiredEmail
          customerName="David"
          ticketNumber="TICK-3003"
          ticketTitle="MacBook Screen"
          partName="OLED Display"
          partSku="DISP-123"
          quantity={1}
          priceAtProposal={150}
          total={150}
          ticketLink="https://example.com/approve/3"
        />
      );
      expect(container.textContent).toContain('David');
      expect(container.textContent).toContain('TICK-3003');
      expect(container.textContent).toContain('OLED Display');
      expect(container.textContent).toContain('Q150.00');
    });
  });

  describe('TechnicianAssignedEmail', () => {
    it('renders technician assignment notification', () => {
      const { container } = render(
        <TechnicianAssignedEmail
          technicianName="Carlos Tech"
          ticketNumber="TICK-4004"
          ticketTitle="MacBook Logic Board"
          assignedBy="Admin Workshop"
          ticketLink="https://example.com/tickets/4"
        />
      );
      expect(container.textContent).toContain('Carlos Tech');
      expect(container.textContent).toContain('#TICK-4004');
    });
  });

  describe('SLABreachEmail', () => {
    it('renders SLA breach warning', () => {
      const { container } = render(
        <SLABreachEmail
          ticketNumber="TICK-5005"
          title="Critical Server Unit"
          status="CRITICAL"
          timeRemaining="0h (Vencido)"
          ticketLink="https://example.com/tickets/5"
        />
      );
      expect(container.textContent).toContain('TICK-5005');
      expect(container.textContent).toContain('CRITICAL');
    });
  });

  describe('LowStockEmail', () => {
    it('renders low stock alert with parts table', () => {
      const { container } = render(
        <LowStockEmail
          partName="USB-C Charging Port"
          currentQuantity={2}
          tenantName="Taller Central"
        />
      );
      expect(container.textContent).toContain('USB-C Charging Port');
      expect(container.textContent).toContain('2 unidades');
      expect(container.textContent).toContain('Taller Central');
    });
  });

  describe('ResetPasswordEmail', () => {
    it('renders password reset instructions and button', () => {
      const { container } = render(
        <ResetPasswordEmail
          userEmail="frank@example.com"
          resetLink="https://example.com/reset?token=xyz"
        />
      );
      expect(container.textContent).toContain('frank@example.com');
      expect(container.textContent).toContain('Restablecer Contraseña');
    });
  });
});
