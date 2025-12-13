# Ticket Wizard Feature (Archived)

Este módulo contiene una implementación de un "Asistente paso a paso" para la creación de tickets. Fue archivado a favor de `SimpleTicketForm` para la versión MVP, ya que el formulario simple resultó ser más rápido y eficiente para el flujo de trabajo actual de los técnicos.

## Estado
- **Lógica:** Funcional (basada en `useTicketWizard.ts`).
- **UI:** Requiere refactorización. El archivo `TicketWizard.tsx` original utilizaba clases de utilidad (Tailwind) que no son compatibles con el sistema de diseño actual (CSS Modules). Se creó un `TicketWizard.module.css` preliminar, pero no se ha integrado completamente.

## Pasos para Reactivar
1. Mover los archivos de vuelta a `src/app/dashboard/tickets/create/` o crear una nueva ruta.
2. Refactorizar `TicketWizard.tsx` para reemplazar las clases de utilidad con las clases definidas en `TicketWizard.module.css`.
3. Actualizar los imports de componentes UI (`Button`, `Input`, etc.) para asegurar que apunten a las versiones más recientes en `src/components/ui/`.
4. Integrar con el Server Action `createBatchTickets` (ya soportado).

## Archivos
- `TicketWizard.tsx`: Componente de React con la lógica visual del stepper.
- `useTicketWizard.ts`: Hook personalizado para manejar el estado del wizard (pasos, validación).
- `TicketWizard.module.css`: Hoja de estilos (necesita revisión).
