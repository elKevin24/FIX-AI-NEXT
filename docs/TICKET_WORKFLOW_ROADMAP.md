# Ticket Workflow System - UI Implementation Roadmap

## ✅ Completed (Backend)

### Database Schema
- [x] TicketPriority enum (LOW, MEDIUM, HIGH, URGENT)
- [x] TechnicianStatus enum (AVAILABLE, UNAVAILABLE, ON_VACATION, ON_LEAVE, IN_TRAINING, SICK_LEAVE)
- [x] Specialization enum (LAPTOPS, DESKTOPS, PRINTERS, NETWORKING, etc.)
- [x] User model extensions (status, maxConcurrentTickets, availability dates)
- [x] TechnicianSpecialization model
- [x] TechnicianUnavailability model
- [x] Database indexes for pool queries and workload tracking

### API Endpoints
- [x] POST `/api/tickets/[id]/actions` - Ticket workflow actions
  - [x] take: Auto-assignment by technician
  - [x] assign: Manual assignment by admin
  - [x] start: Begin work
  - [x] wait_for_parts: Pause for parts
  - [x] resume: Continue work
  - [x] resolve: Mark as completed
  - [x] deliver: Mark as delivered
  - [x] cancel: Cancel with inventory restoration
  - [x] reopen: Reactivate ticket
- [x] GET `/api/tickets/pool` - Available tickets pool with priority queues
- [x] GET `/api/technicians/workload` - Workload overview for all technicians
- [x] GET `/api/technicians/[id]/availability` - Get technician availability
- [x] PATCH `/api/technicians/[id]/availability` - Update technician status
- [x] POST `/api/technicians/[id]/availability` - Create unavailability period

### Business Logic
- [x] Automatic workload validation
- [x] Technician availability checking
- [x] Priority-based ticket queuing
- [x] Aging detection (>24h, >48h alerts)
- [x] Inventory restoration on cancellation
- [x] Comprehensive audit logging

---

## ✅ Recently Completed (Frontend)

### UI Components

#### 1. Dashboard de Workload (Admin View) - COMPLETED
**Location:** `/dashboard/technicians/workload`

**Features:**
- [x] Workload overview card for each technician
  - [x] Name, email, status badge
  - [x] Current workload vs max capacity
  - [x] Utilization percentage with progress bar
  - [x] Available slots indicator
  - [x] Tickets breakdown by status (OPEN, IN_PROGRESS, WAITING_FOR_PARTS)
  - [x] Tickets breakdown by priority (URGENT, HIGH, MEDIUM, LOW)
- [x] Summary statistics card
  - [x] Total technicians count
  - [x] Available technicians count
  - [x] Fully booked technicians count
  - [x] Unavailable technicians count
  - [x] Overall capacity utilization
  - [x] Total unassigned tickets
  - [x] Unassigned tickets >48h old (alert)
- [x] Technician status filters
- [x] Sort by workload, name, or utilization
- [x] Quick assign button for each technician
- [x] View technician's assigned tickets

#### 2. Vista de Pool de Tickets (Technician View) - COMPLETED
**Location:** `/dashboard/tickets/pool`

**Features:**
- [x] Filtered list of available tickets (unassigned OPEN tickets)
- [x] Priority-based sorting (URGENT → HIGH → MEDIUM → LOW → oldest first)
- [x] Age indicators (>24h warning, >48h alert)
- [x] Quick preview of ticket details
- [x] "Take Ticket" button with validation
  - [x] Check if technician is AVAILABLE
  - [x] Check if under maxConcurrentTickets limit
  - [x] Immediate assignment on click
- [x] Current workload indicator
- [x] Filter by priority
- [x] Search by customer name or ticket ID
- [x] Matching indicator (if ticket matches technician's specializations)

---

## 📋 Pending UI Components

### 1. Panel de Acciones de Ticket (Ticket Detail Enhancement)
**Location:** `/dashboard/tickets/[id]` (add actions panel)

**Priority:** HIGH

**Features:**
- [x] Dynamic actions based on current ticket status
- [x] Status-specific action buttons
  - OPEN: [Assign] [Take] [Cancel]
  - IN_PROGRESS: [Add Parts] [Add Note] [Wait for Parts] [Resolve] [Cancel]
  - WAITING_FOR_PARTS: [Resume] [Add Note] [Cancel]
  - RESOLVED: [Deliver] [Reopen]
  - CLOSED: [Reopen] [View History]
  - CANCELLED: [Reopen]
- [x] Quick action buttons with icons
- [x] Validation feedback (workload limits, availability)
- [x] Success/error toast notifications

---

### 2. Diálogos de Confirmación/Entrada
**Location:** Components in `/components/tickets/actions/`

**Priority:** HIGH

**Dialogs:**
- [x] `AssignTechnicianDialog.tsx` - Select technician from dropdown
  - [x] Show technician availability
  - [x] Show current workload
  - [x] Disable if technician is unavailable or at capacity
- [x] `TakeTicketDialog.tsx` - Confirm auto-assignment
  - [x] Show current workload
  - [x] Warn if approaching limit
- [x] `AddPartDialog.tsx` - Add part to ticket
- [x] `AddNoteDialog.tsx` - Add repair note
- [x] `CancelTicketDialog.tsx` - Cancel with reason
  - [x] Required cancellation reason text area
  - [x] Warning about inventory restoration
- [x] `ReopenTicketDialog.tsx` - Reopen with reason
  - [x] Optional reopening reason
- [x] `WaitForPartsDialog.tsx` - Pause for parts
  - [x] Required note about missing parts
- [x] `ResolveTicketDialog.tsx` - Mark resolved
  - [x] Required closing note
  - [x] Summary of work done

---

### 3. Timeline de Actividad (Activity History)
**Location:** `/dashboard/tickets/[id]` (sección integrada)

**Priority:** MEDIUM

**Features:**
- [x] Visual timeline of all ticket actions
- [x] Chronological display (newest first)
- [x] Action type icons (🔄 assign, ✅ resolve, 📝 note, etc.)
- [x] User avatar/name for each action
- [x] Timestamp (relative + absolute)
- [x] Expandable details for each action
- [x] Status change highlights
- [x] Part additions/removals
- [x] Note entries (internal/external indicator)

**Design:**
```
┌─────────────────────────────────────────────┐
│  Activity Timeline                          │
├─────────────────────────────────────────────┤
│  ● Today 10:30 - Juan Pérez                 │
│    ✅ Marked as RESOLVED                    │
│    "Replaced LCD screen, tested OK"         │
├─────────────────────────────────────────────┤
│  ● Today 09:15 - Juan Pérez                 │
│    🔧 Added part: LCD Screen (1x)           │
├─────────────────────────────────────────────┤
│  ● Yesterday 14:20 - Admin                  │
│    🔄 Assigned to Juan Pérez                │
│    Status: OPEN → IN_PROGRESS              │
├─────────────────────────────────────────────┤
│  ● 2 days ago - María García                │
│    📝 Created ticket                         │
└─────────────────────────────────────────────┘
```

---

### 4. Gestión de Disponibilidad de Técnico
**Location:** `/dashboard/technicians/[id]/availability` or `/dashboard/settings/availability`

**Priority:** MEDIUM

**Features:**
- [ ] Current status display with badge
- [ ] Status change dropdown (AVAILABLE, UNAVAILABLE, ON_VACATION, etc.)
- [ ] Status reason text field
- [ ] Max concurrent tickets slider/input
- [ ] Unavailability period scheduler
  - [ ] Start date picker
  - [ ] End date picker
  - [ ] Reason dropdown
  - [ ] Notes text area
- [ ] List of scheduled unavailabilities
  - [ ] Edit/delete functionality
  - [ ] Active/upcoming/past indicator
- [ ] Specializations manager
  - [ ] Add/remove specializations
  - [ ] Checkboxes for each specialization type

**Design:**
```
┌─────────────────────────────────────────────┐
│  Technician Availability - Juan Pérez       │
├─────────────────────────────────────────────┤
│  Current Status: ✅ AVAILABLE               │
│  Max Concurrent: [5] tickets                │
│                                             │
│  Schedule Unavailability:                   │
│  From: [2025-12-20] To: [2025-12-27]       │
│  Reason: [ON_VACATION ▼]                   │
│  Notes: [Annual vacation...]               │
│  [Schedule]                                │
├─────────────────────────────────────────────┤
│  Upcoming Absences:                         │
│  🏖️ Dec 20-27: Vacation                    │
│     [Edit] [Cancel]                         │
├─────────────────────────────────────────────┤
│  Specializations:                           │
│  ☑ Laptops  ☑ Desktops  ☐ Printers        │
│  ☑ Networking  ☐ Mobile  ☐ Servers         │
└─────────────────────────────────────────────┘
```

---

## 🎨 Design System Considerations

### Colors for Status Badges
- **AVAILABLE**: Green (#10b981)
- **UNAVAILABLE**: Gray (#6b7280)
- **ON_VACATION**: Blue (#3b82f6)
- **ON_LEAVE**: Yellow (#f59e0b)
- **IN_TRAINING**: Purple (#8b5cf6)
- **SICK_LEAVE**: Red (#ef4444)

### Priority Colors
- **URGENT**: Red (#dc2626)
- **HIGH**: Orange (#ea580c)
- **MEDIUM**: Yellow (#ca8a04)
- **LOW**: Gray (#6b7280)

### Workload Indicators
- 0-60%: Green (healthy)
- 61-85%: Yellow (busy)
- 86-100%: Red (at capacity)

---

## 🚀 Implementation Order

1. **Phase 1** ✅ COMPLETED
   - [x] Backend API endpoints
   - [x] Dashboard de Workload (Admin View)
   - [x] Vista de Pool de Tickets (Technician View)

2. **Phase 2** (Current - Next Sprint)
   - [ ] Panel de Acciones de Ticket
   - [ ] Diálogos de Confirmación (all 8 dialogs)

3. **Phase 3**
   - [ ] Timeline de Actividad
   - [ ] Gestión de Disponibilidad de Técnico

4. **Phase 4**
   - [ ] Polish and testing
   - [ ] Integration testing of complete workflow

---

## 📝 Notes

- All components should use the existing design system (CSS variables from DESIGN_SYSTEM.md)
- Maintain Liquid Glass design aesthetic
- Include loading states and error handling
- Add optimistic UI updates where appropriate
- Ensure mobile responsiveness
- Add accessibility attributes (ARIA labels, keyboard navigation)
- Include comprehensive TypeScript types

---

**Last Updated:** December 15, 2025
**Status:** Backend Complete | UI In Progress
