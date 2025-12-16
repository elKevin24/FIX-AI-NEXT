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

## 🚧 In Progress

### UI Components

#### 1. Dashboard de Workload (Admin View) - IN PROGRESS
**Location:** `/dashboard/technicians/workload`

**Features:**
- [ ] Workload overview card for each technician
  - [ ] Name, email, status badge
  - [ ] Current workload vs max capacity
  - [ ] Utilization percentage with progress bar
  - [ ] Available slots indicator
  - [ ] Tickets breakdown by status (OPEN, IN_PROGRESS, WAITING_FOR_PARTS)
  - [ ] Tickets breakdown by priority (URGENT, HIGH, MEDIUM, LOW)
- [ ] Summary statistics card
  - [ ] Total technicians count
  - [ ] Available technicians count
  - [ ] Fully booked technicians count
  - [ ] Unavailable technicians count
  - [ ] Overall capacity utilization
  - [ ] Total unassigned tickets
  - [ ] Unassigned tickets >48h old (alert)
- [ ] Technician status filters
- [ ] Sort by workload, name, or utilization
- [ ] Quick assign button for each technician
- [ ] View technician's assigned tickets

**Design:**
```
┌─────────────────────────────────────────────┐
│  Workload Overview                          │
├─────────────────────────────────────────────┤
│  📊 Total: 5 | ✅ Available: 3 | 🔴 Full: 1│
│  ⚠️ 2 tickets >48h unassigned               │
├─────────────────────────────────────────────┤
│  👤 Juan Pérez (AVAILABLE)                  │
│     3/5 tickets  ███░░ 60% utilization     │
│     📋 2 IN_PROGRESS | 1 WAITING_FOR_PARTS │
│     [View Tickets] [Assign New]            │
├─────────────────────────────────────────────┤
│  👤 María García (ON_VACATION)              │
│     0/5 tickets  ░░░░░ 0% utilization      │
│     🏖️ Back on: Dec 20, 2025               │
└─────────────────────────────────────────────┘
```

---

## 📋 Pending UI Components

### 2. Vista de Pool de Tickets (Technician View)
**Location:** `/dashboard/tickets/pool`

**Priority:** HIGH

**Features:**
- [ ] Filtered list of available tickets (unassigned OPEN tickets)
- [ ] Priority-based sorting (URGENT → HIGH → MEDIUM → LOW → oldest first)
- [ ] Age indicators (>24h warning, >48h alert)
- [ ] Quick preview of ticket details
- [ ] "Take Ticket" button with validation
  - [ ] Check if technician is AVAILABLE
  - [ ] Check if under maxConcurrentTickets limit
  - [ ] Immediate assignment on click
- [ ] Current workload indicator
- [ ] Filter by priority
- [ ] Search by customer name or ticket ID
- [ ] Matching indicator (if ticket matches technician's specializations)

**Design:**
```
┌─────────────────────────────────────────────┐
│  Available Tickets Pool                     │
│  Your workload: 3/5 | 2 slots available    │
├─────────────────────────────────────────────┤
│  🔴 URGENT | #1234 - Laptop HP (2 days old)│
│     Customer: John Doe                      │
│     💻 Matches your specialization         │
│     [TAKE TICKET]                          │
├─────────────────────────────────────────────┤
│  🟡 HIGH | #1235 - Printer Canon (1 day)   │
│     Customer: Jane Smith                    │
│     [TAKE TICKET]                          │
└─────────────────────────────────────────────┘
```

---

### 3. Panel de Acciones de Ticket (Ticket Detail Enhancement)
**Location:** `/dashboard/tickets/[id]` (add actions panel)

**Priority:** HIGH

**Features:**
- [ ] Dynamic actions based on current ticket status
- [ ] Status-specific action buttons
  - OPEN: [Assign] [Take] [Cancel]
  - IN_PROGRESS: [Add Parts] [Add Note] [Wait for Parts] [Resolve] [Cancel]
  - WAITING_FOR_PARTS: [Resume] [Add Note] [Cancel]
  - RESOLVED: [Deliver] [Reopen]
  - CLOSED: [Reopen] [View History]
  - CANCELLED: [Reopen]
- [ ] Quick action buttons with icons
- [ ] Validation feedback (workload limits, availability)
- [ ] Success/error toast notifications

**Design:**
```
┌─────────────────────────────────────────────┐
│  Ticket #1234 - IN_PROGRESS                │
├─────────────────────────────────────────────┤
│  📋 QUICK ACTIONS                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ 🔧 Add   │ │ ⏸️ Wait  │ │ ✅ Mark  │    │
│  │   Parts  │ │   Parts  │ │ Resolved │    │
│  └──────────┘ └──────────┘ └──────────┘   │
│  ┌──────────┐ ┌──────────┐                │
│  │ 💬 Add   │ │ ❌ Cancel│                 │
│  │   Note   │ │          │                 │
│  └──────────┘ └──────────┘                │
└─────────────────────────────────────────────┘
```

---

### 4. Diálogos de Confirmación/Entrada
**Location:** Components in `/components/tickets/actions/`

**Priority:** HIGH

**Dialogs to create:**
- [ ] `AssignTechnicianDialog.tsx` - Select technician from dropdown
  - [ ] Show technician availability
  - [ ] Show current workload
  - [ ] Disable if technician is unavailable or at capacity
- [ ] `TakeTicketDialog.tsx` - Confirm auto-assignment
  - [ ] Show current workload
  - [ ] Warn if approaching limit
- [ ] `AddPartDialog.tsx` - Add part to ticket
  - [ ] Part selection from inventory
  - [ ] Quantity input
  - [ ] Live inventory check
- [ ] `AddNoteDialog.tsx` - Add repair note
  - [ ] Text area for note content
  - [ ] Internal/external toggle
- [ ] `CancelTicketDialog.tsx` - Cancel with reason
  - [ ] Required cancellation reason text area
  - [ ] Warning about inventory restoration
- [ ] `ReopenTicketDialog.tsx` - Reopen with reason
  - [ ] Optional reopening reason
- [ ] `WaitForPartsDialog.tsx` - Pause for parts
  - [ ] Required note about missing parts
- [ ] `ResolveTicketDialog.tsx` - Mark resolved
  - [ ] Required closing note
  - [ ] Summary of work done

---

### 5. Timeline de Actividad (Activity History)
**Location:** `/dashboard/tickets/[id]` (new tab or section)

**Priority:** MEDIUM

**Features:**
- [ ] Visual timeline of all ticket actions
- [ ] Chronological display (newest first)
- [ ] Action type icons (🔄 assign, ✅ resolve, 📝 note, etc.)
- [ ] User avatar/name for each action
- [ ] Timestamp (relative: "2 hours ago" + absolute on hover)
- [ ] Expandable details for each action
- [ ] Filter by action type
- [ ] Status change highlights
- [ ] Part additions/removals
- [ ] Note entries (internal/external indicator)

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

### 6. Gestión de Disponibilidad de Técnico
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

1. **Phase 1** (Current)
   - [x] Backend API endpoints
   - [ ] Dashboard de Workload (Admin View)

2. **Phase 2** (Next Sprint)
   - [ ] Vista de Pool de Tickets (Technician View)
   - [ ] Panel de Acciones de Ticket

3. **Phase 3**
   - [ ] Diálogos de Confirmación (all 8 dialogs)
   - [ ] Timeline de Actividad

4. **Phase 4**
   - [ ] Gestión de Disponibilidad de Técnico
   - [ ] Polish and testing

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
