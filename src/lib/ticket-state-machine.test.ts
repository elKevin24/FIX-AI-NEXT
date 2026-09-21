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
      [TicketStatus.WAITING_APPROVAL, 'approve', TicketStatus.IN_PROGRESS],
      [TicketStatus.WAITING_APPROVAL, 'reject', TicketStatus.REJECTED],
      [TicketStatus.WAITING_APPROVAL, 'cancel', TicketStatus.CANCELLED],
      [TicketStatus.REJECTED, 'reopen', TicketStatus.OPEN],
      [TicketStatus.OPEN, 'delete', TicketStatus.DELETED],
      [TicketStatus.IN_PROGRESS, 'delete', TicketStatus.DELETED],
      [TicketStatus.WAITING_FOR_PARTS, 'delete', TicketStatus.DELETED],
      [TicketStatus.RESOLVED, 'delete', TicketStatus.DELETED],
      [TicketStatus.CLOSED, 'delete', TicketStatus.DELETED],
      [TicketStatus.CANCELLED, 'delete', TicketStatus.DELETED],
      [TicketStatus.REJECTED, 'delete', TicketStatus.DELETED],
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
      [TicketStatus.CLOSED, 'resolve'],
      [TicketStatus.CANCELLED, 'deliver'],
      [TicketStatus.CANCELLED, 'cancel'],
      [TicketStatus.WAITING_APPROVAL, 'take'],
      [TicketStatus.WAITING_APPROVAL, 'deliver'],
      [TicketStatus.WAITING_APPROVAL, 'resolve'],
      [TicketStatus.WAITING_APPROVAL, 'reopen'],
      [TicketStatus.WAITING_APPROVAL, 'resume'],
      [TicketStatus.WAITING_APPROVAL, 'wait_for_parts'],
      [TicketStatus.REJECTED, 'cancel'],
      [TicketStatus.REJECTED, 'deliver'],
      [TicketStatus.REJECTED, 'resolve'],
      [TicketStatus.REJECTED, 'take'],
      [TicketStatus.DELETED, 'reopen'],
      [TicketStatus.DELETED, 'cancel'],
      [TicketStatus.DELETED, 'delete'],
    ];
    it.each(invalid)('%s → %s is rejected', (from, action) => {
      expect(isValidTransition(from, action as any)).toBe(false);
      expect(() => getNextStatus(from, action as any)).toThrow('Invalid transition');
    });
  });

  describe('getValidActions', () => {
    it('OPEN allows take, assign, cancel, delete', () => {
      expect(getValidActions(TicketStatus.OPEN).sort()).toEqual(['assign', 'cancel', 'delete', 'take']);
    });
    it('IN_PROGRESS allows wait_for_parts, resolve, cancel, delete', () => {
      expect(getValidActions(TicketStatus.IN_PROGRESS).sort()).toEqual(['cancel', 'delete', 'resolve', 'wait_for_parts']);
    });
    it('WAITING_FOR_PARTS allows resume, cancel, delete', () => {
      expect(getValidActions(TicketStatus.WAITING_FOR_PARTS).sort()).toEqual(['cancel', 'delete', 'resume']);
    });
    it('RESOLVED allows deliver, reopen, cancel, delete', () => {
      expect(getValidActions(TicketStatus.RESOLVED).sort()).toEqual(['cancel', 'delete', 'deliver', 'reopen']);
    });
    it('CLOSED allows reopen, cancel, delete', () => {
      expect(getValidActions(TicketStatus.CLOSED).sort()).toEqual(['cancel', 'delete', 'reopen']);
    });
    it('CANCELLED only allows reopen, delete', () => {
      expect(getValidActions(TicketStatus.CANCELLED).sort()).toEqual(['delete', 'reopen']);
    });
    it('WAITING_APPROVAL allows approve, reject, cancel, delete', () => {
      expect(getValidActions(TicketStatus.WAITING_APPROVAL).sort()).toEqual(['approve', 'cancel', 'delete', 'reject']);
    });
    it('REJECTED only allows reopen, delete', () => {
      expect(getValidActions(TicketStatus.REJECTED).sort()).toEqual(['delete', 'reopen']);
    });
    it('DELETED is terminal (no actions)', () => {
      expect(getValidActions(TicketStatus.DELETED)).toEqual([]);
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
      for (const status of [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_PARTS, TicketStatus.RESOLVED, TicketStatus.CLOSED]) {
        expect(isValidTransition(status, 'cancel')).toBe(true);
      }
      expect(isValidTransition(TicketStatus.CANCELLED, 'cancel')).toBe(false);
    });

    it('delete at any point is valid and terminal', () => {
      for (const status of [TicketStatus.OPEN, TicketStatus.WAITING_APPROVAL, TicketStatus.IN_PROGRESS, TicketStatus.WAITING_FOR_PARTS, TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.CANCELLED, TicketStatus.REJECTED]) {
        expect(isValidTransition(status, 'delete')).toBe(true);
        expect(getNextStatus(status, 'delete')).toBe(TicketStatus.DELETED);
      }
      expect(getValidActions(TicketStatus.DELETED)).toEqual([]);
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

    it('approval flow: WAITING_APPROVAL → approve → IN_PROGRESS → RESOLVED', () => {
      let status: TicketStatus = TicketStatus.WAITING_APPROVAL;
      status = getNextStatus(status, 'approve');
      expect(status).toBe(TicketStatus.IN_PROGRESS);
      status = getNextStatus(status, 'resolve');
      expect(status).toBe(TicketStatus.RESOLVED);
    });

    it('rejection flow: WAITING_APPROVAL → reject → REJECTED → reopen → OPEN', () => {
      let status: TicketStatus = TicketStatus.WAITING_APPROVAL;
      status = getNextStatus(status, 'reject');
      expect(status).toBe(TicketStatus.REJECTED);
      status = getNextStatus(status, 'reopen');
      expect(status).toBe(TicketStatus.OPEN);
    });

    it('cancellation while waiting approval: WAITING_APPROVAL → cancel → CANCELLED', () => {
      expect(getNextStatus(TicketStatus.WAITING_APPROVAL, 'cancel')).toBe(TicketStatus.CANCELLED);
    });
  });
});
