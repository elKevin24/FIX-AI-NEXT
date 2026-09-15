import { describe, it, expect } from 'vitest';
import {
  TicketStatus,
  isValidTransition,
  getNextStatus,
  getValidActions,
  describeTransition,
} from './ticket-state-machine';

describe('ticket-state-machine', () => {
  describe('isValidTransition', () => {
    it('take is valid from OPEN', () => {
      expect(isValidTransition(TicketStatus.OPEN, 'take')).toBe(true);
    });
    it('cancel is valid from OPEN', () => {
      expect(isValidTransition(TicketStatus.OPEN, 'cancel')).toBe(true);
    });
    it('resolve is NOT valid from OPEN', () => {
      expect(isValidTransition(TicketStatus.OPEN, 'resolve')).toBe(false);
    });
    it('deliver is NOT valid from OPEN', () => {
      expect(isValidTransition(TicketStatus.OPEN, 'deliver')).toBe(false);
    });
    it('wait_for_parts is valid from IN_PROGRESS', () => {
      expect(isValidTransition(TicketStatus.IN_PROGRESS, 'wait_for_parts')).toBe(true);
    });
    it('resolve is valid from IN_PROGRESS', () => {
      expect(isValidTransition(TicketStatus.IN_PROGRESS, 'resolve')).toBe(true);
    });
    it('resume is valid from WAITING_FOR_PARTS', () => {
      expect(isValidTransition(TicketStatus.WAITING_FOR_PARTS, 'resume')).toBe(true);
    });
    it('deliver is valid from RESOLVED', () => {
      expect(isValidTransition(TicketStatus.RESOLVED, 'deliver')).toBe(true);
    });
    it('reopen is valid from RESOLVED', () => {
      expect(isValidTransition(TicketStatus.RESOLVED, 'reopen')).toBe(true);
    });
    it('reopen is valid from CLOSED', () => {
      expect(isValidTransition(TicketStatus.CLOSED, 'reopen')).toBe(true);
    });
    it('reopen is valid from CANCELLED', () => {
      expect(isValidTransition(TicketStatus.CANCELLED, 'reopen')).toBe(true);
    });
    it('invalid action returns false', () => {
      expect(isValidTransition(TicketStatus.CLOSED, 'deliver')).toBe(false);
    });
  });

  describe('getNextStatus', () => {
    it('OPEN + take -> IN_PROGRESS', () => {
      expect(getNextStatus(TicketStatus.OPEN, 'take')).toBe(TicketStatus.IN_PROGRESS);
    });
    it('OPEN + cancel -> CANCELLED', () => {
      expect(getNextStatus(TicketStatus.OPEN, 'cancel')).toBe(TicketStatus.CANCELLED);
    });
    it('IN_PROGRESS + resolve -> RESOLVED', () => {
      expect(getNextStatus(TicketStatus.IN_PROGRESS, 'resolve')).toBe(TicketStatus.RESOLVED);
    });
    it('WAITING_FOR_PARTS + resume -> IN_PROGRESS', () => {
      expect(getNextStatus(TicketStatus.WAITING_FOR_PARTS, 'resume')).toBe(TicketStatus.IN_PROGRESS);
    });
    it('RESOLVED + deliver -> CLOSED', () => {
      expect(getNextStatus(TicketStatus.RESOLVED, 'deliver')).toBe(TicketStatus.CLOSED);
    });
    it('RESOLVED + reopen -> IN_PROGRESS', () => {
      expect(getNextStatus(TicketStatus.RESOLVED, 'reopen')).toBe(TicketStatus.IN_PROGRESS);
    });
    it('CLOSED + reopen -> IN_PROGRESS', () => {
      expect(getNextStatus(TicketStatus.CLOSED, 'reopen')).toBe(TicketStatus.IN_PROGRESS);
    });
    it('CANCELLED + reopen -> OPEN', () => {
      expect(getNextStatus(TicketStatus.CANCELLED, 'reopen')).toBe(TicketStatus.OPEN);
    });
    it('throws for invalid transition', () => {
      expect(() => getNextStatus(TicketStatus.OPEN, 'deliver')).toThrow('Invalid transition');
    });
  });

  describe('getValidActions', () => {
    it('returns [take, assign, cancel] for OPEN', () => {
      expect(getValidActions(TicketStatus.OPEN)).toEqual(['take', 'assign', 'cancel']);
    });
    it('returns [wait_for_parts, resolve, cancel] for IN_PROGRESS', () => {
      expect(getValidActions(TicketStatus.IN_PROGRESS)).toEqual(['wait_for_parts', 'resolve', 'cancel']);
    });
    it('returns [resume, cancel] for WAITING_FOR_PARTS', () => {
      expect(getValidActions(TicketStatus.WAITING_FOR_PARTS)).toEqual(['resume', 'cancel']);
    });
    it('returns [deliver, reopen, cancel] for RESOLVED', () => {
      expect(getValidActions(TicketStatus.RESOLVED)).toEqual(['deliver', 'reopen', 'cancel']);
    });
    it('returns [reopen] for CLOSED', () => {
      expect(getValidActions(TicketStatus.CLOSED)).toEqual(['reopen']);
    });
    it('returns [reopen] for CANCELLED', () => {
      expect(getValidActions(TicketStatus.CANCELLED)).toEqual(['reopen']);
    });
  });

  describe('describeTransition', () => {
    it('returns description for OPEN->take', () => {
      expect(describeTransition(TicketStatus.OPEN, 'take')).toBe('Técnico toma el ticket y comienza a trabajar');
    });
    it('returns fallback for unknown transition', () => {
      const desc = describeTransition(TicketStatus.CLOSED, 'cancel');
      expect(desc).toContain('CLOSED');
      expect(desc).toContain('cancel');
    });
  });
});
