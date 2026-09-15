import React from 'react';
import { Badge } from '@/components/ui/Badge';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_PARTS' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';

interface TicketStatusBadgeProps {
  status: string;
  className?: string;
}

export function TicketStatusBadge({ status, className }: TicketStatusBadgeProps) {
  const getVariant = (s: string) => {
    switch (s) {
      case 'OPEN': return 'primary'; // Blue
      case 'IN_PROGRESS': return 'warning'; // Yellow/Orange
      case 'WAITING_FOR_PARTS': return 'info'; // Purple mapped to info or custom
      case 'RESOLVED': return 'success'; // Green
      case 'CLOSED': return 'gray'; // Gray
      case 'CANCELLED': return 'error'; // Red
      default: return 'gray';
    }
  };

  const getLabel = (s: string) => {
    return s.replace(/_/g, ' ');
  };

  // Special mapping for waiting for parts if 'info' isn't purple enough
  // For now, we stick to the design system variants. 
  // Ideally, Badge.module.css should have a 'purple' variant if needed.
  
  return (
    <Badge variant={getVariant(status)} className={className}>
      {getLabel(status)}
    </Badge>
  );
}
