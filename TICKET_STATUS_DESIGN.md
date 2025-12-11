# Documento de Diseño: Portal de Estado de Tickets

**Versión:** 1.0
**Autor:** Gemini AI
**Fecha:** 10 de diciembre de 2025

## 1. Resumen

El portal de estado de tickets es una funcionalidad pública diseñada para que los clientes puedan consultar el progreso de sus tickets de servicio sin necesidad de autenticarse en el sistema. Proporciona una interfaz limpia y de fácil acceso para mejorar la transparencia y la experiencia del cliente.

La funcionalidad consta de dos puntos de entrada principales: una página de búsqueda interactiva y una página de acceso directo a través de una URL específica.

## 2. Objetivos

*   **Mejorar la Experiencia del Cliente:** Ofrecer a los clientes una forma rápida y sencilla de rastrear el estado de sus reparaciones.
*   **Reducir la Carga de Soporte:** Disminuir el número de consultas (llamadas, correos) sobre el estado de los servicios.
*   **Aumentar la Transparencia:** Proporcionar información clara y actualizada sobre el progreso del ticket.
*   **Acceso Universal:** Permitir la consulta desde cualquier dispositivo con un navegador web, sin necesidad de una cuenta de usuario.

## 3. Flujo de Usuario

Existen dos flujos principales para el usuario:

### Flujo A: Búsqueda por ID

1.  El usuario navega a la página `/tickets/status`.
2.  Se le presenta una interfaz con un único campo para introducir el ID de su ticket.
3.  El usuario introduce el ID y hace clic en "Buscar".
    *   Mientras la búsqueda se procesa, el botón de búsqueda se deshabilita y muestra un indicador de carga.
4.  **Caso de Éxito:** Si el ticket se encuentra, la tarjeta de estado (`TicketStatusCard`) aparece dinámicamente en la misma página, debajo del buscador.
5.  **Caso de Error (No Encontrado):** Si el ID no es válido o no existe, se muestra un mensaje de error justo debajo del campo de búsqueda.
6.  **Caso de Error (Conectividad):** Si hay un problema de red, se muestra un mensaje de error genérico.

### Flujo B: Acceso Directo por URL

1.  El usuario accede a una URL directa con el formato `/tickets/status/[id]`, donde `[id]` es el ID completo del ticket.
2.  **Caso de Éxito:** El servidor procesa la solicitud, obtiene los datos del ticket y renderiza directamente la página con el componente `TicketStatusCard` mostrando la información.
3.  **Caso de Carga:** Durante la obtención de datos, Next.js muestra una pantalla de carga estandarizada (`loading.tsx`).
4.  **Caso de Error (No Encontrado):** Si el ticket con ese `id` no existe, Next.js renderiza una página de "No Encontrado" (`not-found.tsx`) con un mensaje claro y un enlace para volver a la página de búsqueda.

## 4. Arquitectura y Componentes

La funcionalidad está construida sobre Next.js App Router, combinando componentes de servidor (RSC) y de cliente (CSR).

### 4.1. Archivos Principales

*   `src/app/tickets/status/page.tsx`:
    *   **Tipo:** Componente de Cliente (`'use client'`).
    *   **Responsabilidad:** Renderiza la página de búsqueda. Gestiona el estado del formulario (ID del ticket, carga, errores) usando el hook `useState`. Llama a la `server action` `searchTicket` para obtener los datos.

*   `src/app/tickets/status/[id]/page.tsx`:
    *   **Tipo:** Componente de Servidor (Async).
    *   **Responsabilidad:** Maneja el acceso directo. Obtiene el `id` de los parámetros de la URL, llama a la `server action` `getTicketById` y pasa los datos al componente `TicketStatusCard`.

*   `src/components/tickets/TicketStatusCard.tsx`:
    *   **Tipo:** Componente de Cliente (`'use client'`).
    *   **Responsabilidad:** Es el componente de UI principal. Recibe los datos de un ticket como `props` y los renderiza en un formato de tarjeta estructurado y legible. Es reutilizado por ambos flujos.

*   `src/app/tickets/status/[id]/loading.tsx`:
    *   **Tipo:** Componente de Servidor.
    *   **Responsabilidad:** UI de carga estándar de Next.js. Muestra un spinner mientras los datos del ticket se obtienen en el servidor para el acceso directo.

*   `src/app/tickets/status/[id]/not-found.tsx`:
    *   **Tipo:** Componente de Servidor.
    *   **Responsabilidad:** UI de error estándar de Next.js. Se muestra cuando `getTicketById` no devuelve ningún ticket.

### 4.2. Lógica de Datos

*   `src/lib/actions.ts`:
    *   Contiene las `server actions` que interactúan con la base de datos a través de Prisma.
    *   `searchTicket(id)`: Busca un ticket por su ID corto.
    *   `getTicketById(id)`: Busca un ticket por su ID completo.

## 5. Diseño de Interfaz (UI/UX)

El diseño es minimalista, enfocado en la funcionalidad y la claridad.

*   **Página de Búsqueda:**
    *   Layout centrado con un título claro, un subtítulo descriptivo y el formulario de búsqueda como elemento principal.
    *   Uso de un degradado suave en el fondo para una estética agradable.
    *   El feedback de error se muestra de forma no intrusiva y contextual.

*   **TicketStatusCard:**
    *   **Jerarquía Visual:** La información está organizada para una lectura rápida.
        *   **Encabezado:** Título del ticket y un `Badge` de estado con un código de colores intuitivo.
        *   **Metadatos:** ID del ticket y nombre del taller.
        *   **Grid de Datos Clave:** Una fila con la información más relevante (Fecha de Creación, Última Actualización, Técnico Asignado, Modelo).
        *   **Cuerpo:** Descripción detallada del problema y secciones adicionales para accesorios o notas de ingreso.
        *   **Pie de Página:** Marca del sistema y un enlace al login del personal.
    *   **Código de Colores para Estados:**
        *   `OPEN`: Azul
        *   `IN_PROGRESS`: Ámbar
        *   `RESOLVED`: Verde
        *   `CLOSED`: Gris
        *   `CANCELLED`: Rojo
        *   `WAITING_FOR_PARTS`: Púrpura

*   **Estados de Carga y Error:**
    *   La página de carga (`loading.tsx`) y la de no encontrado (`not-found.tsx`) son visualmente consistentes con el resto del diseño, evitando cambios bruscos y proporcionando una experiencia de usuario fluida y profesional.

## 6. Detalles Técnicos

*   **Framework:** Next.js 14+ (App Router)
*   **Estilos:** Se utiliza una combinación de `inline styles` para el layout principal y la lógica de estilos dinámica, junto con CSS Modules para los estados de `loading` y `not-found`.
*   **Renderizado:** Híbrido. La página de búsqueda es interactiva en el cliente, mientras que la página de acceso directo se pre-renderiza en el servidor para un rendimiento óptimo y SEO.
*   **Acceso a Datos:** Se utilizan `Server Actions` para encapsular la lógica de acceso a la base de datos, garantizando que el código del cliente permanezca limpio y seguro.
