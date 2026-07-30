import { describe, it, expect } from 'vitest';
import {
  TicketStatus,
  isValidTransition,
  getNextStatus,
  getValidActions,
  describeTransition,
} from './ticket-state-machine';

describe('Ticket State Machine', () => {
  describe('isValidTransition', () => {
    const valid: [TicketStatus, string, string][] = [
      [TicketStatus.OPEN, 'take', TicketStatus.IN_PROGRESS],
      [TicketStatus.OPEN, 'assign', TicketStatus.IN_PROGRESS],
      [TicketStatus.OPEN, 'cancel', TicketStatus.CANCELLED],
      [TicketStatus.IN_PROGRESS, 'wait_for_parts', TicketStatus.WAITING_FOR_PARTS],
      [TicketStatus.IN_PROGRESS, 'resolve', TicketStatus.RESOLVED],
      [TicketStatus.IN_PROGRESS, 'cancel', TicketStatus.CANCELLED],
      [TicketStatus.WAITING_FOR_PARTS, 'resume', TicketStatus.IN_PROGRESS],
      [TicketStatus.WAITING_FOR_PARTS, 'cancel', TicketStatus.CANCELLED],
      [TicketStatus.RESOLVED, 'deliver', TicketStatus.CLOSED],
      [TicketStatus.RESOLVED, 'reopen', TicketStatus.IN_PROGRESS],
      [TicketStatus.RESOLVED, 'cancel', TicketStatus.CANCELLED],
      [TicketStatus.CLOSED, 'reopen', TicketStatus.IN_PROGRESS],
      [TicketStatus.CANCELLED, 'reopen', TicketStatus.OPEN],
    ];
    it.each(valid)('%s → %s → %s', (from, action, to) => {
      expect(isValidTransition(from, action as any)).toBe(true);
      expect(getNextStatus(from, action as any)).toBe(to);
      expect(describeTransition(from, action as any)).toBeTruthy();
    });

    const invalid: [TicketStatus, string][] = [
      [TicketStatus.OPEN, 'deliver'],
      [TicketStatus.OPEN, 'resolve'],
      [TicketStatus.OPEN, 'reopen'],
      [TicketStatus.OPEN, 'resume'],
      [TicketStatus.IN_PROGRESS, 'take'],
      [TicketStatus.IN_PROGRESS, 'deliver'],
      [TicketStatus.IN_PROGRESS, 'reopen'],
      [TicketStatus.WAITING_FOR_PARTS, 'resolve'],
      [TicketStatus.WAITING_FOR_PARTS, 'deliver'],
      [TicketStatus.WAITING_FOR_PARTS, 'start'],
      [TicketStatus.RESOLVED, 'take'],
      [TicketStatus.RESOLVED, 'start'],
      [TicketStatus.RESOLVED, 'wait_for_parts'],
      [TicketStatus.CLOSED, 'deliver'],
      [TicketStatus.CLOSED, 'cancel'],
      [TicketStatus.CLOSED, 'resolve'],
      [TicketStatus.CANCELLED, 'deliver'],
      [TicketStatus.CANCELLED, 'cancel'],
    ];
    it.each(invalid)('%s → %s is rejected', (from, action) => {
      expect(isValidTransition(from, action as any)).toBe(false);
      expect(() => getNextStatus(from, action as any)).toThrow('Invalid transition');
    });
  });

  describe('getValidActions', () => {
    it('OPEN allows take, assign, cancel', () => {
      expect(getValidActions(TicketStatus.OPEN).sort()).toEqual(['assign', 'cancel', 'take']);
    });
    it('IN_PROGRESS allows wait_for_parts, resolve, cancel', () => {
      expect(getValidActions(TicketStatus.IN_PROGRESS).sort()).toEqual(['cancel', 'resolve', 'wait_for_parts']);
    });
    it('WAITING_FOR_PARTS allows resume, cancel', () => {
      expect(getValidActions(TicketStatus.WAITING_FOR_PARTS).sort()).toEqual(['cancel', 'resume']);
    });
    it('RESOLVED allows deliver, reopen, cancel', () => {
      expect(getValidActions(TicketStatus.RESOLVED).sort()).toEqual(['cancel', 'deliver', 'reopen']);
    });
    it('CLOSED only allows reopen', () => {
      expect(getValidActions(TicketStatus.CLOSED)).toEqual(['reopen']);
    });
    it('CANCELLED only allows reopen', () => {
      expect(getValidActions(TicketStatus.CANCELLED)).toEqual(['reopen']);
    });
  });

  describe('full lifecycle walkthrough', () => {
    it('happy path: OPEN → IN_PROGRESS → RESOLVED → CLOSED', () => {
      let status: TicketStatus = TicketStatus.OPEN;
      status = getNextStatus(status, 'take');
      expect(status).toBe(TicketStatus.IN_PROGRESS);
      status = getNextStatus(status, 'resolve');
      expect(status).toBe(TicketStatus.RESOLVED);
      status = getNextStatus(status, 'deliver');
      expect(status).toBe(TicketStatus.CLOSED);
    });

    it('with parts wait: OPEN → IN_PROGRESS → WAITING_FOR_PARTS → IN_PROGRESS → RESOLVED → CLOSED', () => {
      let status: TicketStatus = TicketStatus.OPEN;
      status = getNextStatus(status, 'take');
      status = getNextStatus(status, 'wait_for_parts');
      expect(status).toBe(TicketStatus.WAITING_FOR_PARTS);
      status = getNextStatus(status, 'resume');
      expect(status).toBe(TicketStatus.IN_PROGRESS);
      status = getNextStatus(status, 'resolve');
      expect(status).toBe(TicketStatus.RESOLVED);
      status = getNextStatus(status, 'deliver');
      expect(status).toBe(TicketStatus.CLOSED);
    });

    it('cancel at any point is valid', () => {
      for (const status of [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_PARTS, TicketStatus.RESOLVED]) {
        expect(isValidTransition(status, 'cancel')).toBe(true);
      }
      expect(isValidTransition(TicketStatus.CLOSED, 'cancel')).toBe(false);
      expect(isValidTransition(TicketStatus.CANCELLED, 'cancel')).toBe(false);
    });

    it('reopen from CANCELLED goes to OPEN', () => {
      expect(getNextStatus(TicketStatus.CANCELLED, 'reopen')).toBe(TicketStatus.OPEN);
    });

    it('reopen from CLOSED goes to IN_PROGRESS', () => {
      expect(getNextStatus(TicketStatus.CLOSED, 'reopen')).toBe(TicketStatus.IN_PROGRESS);
    });

    it('reopen from RESOLVED goes to IN_PROGRESS', () => {
      expect(getNextStatus(TicketStatus.RESOLVED, 'reopen')).toBe(TicketStatus.IN_PROGRESS);
    });
  });
});
