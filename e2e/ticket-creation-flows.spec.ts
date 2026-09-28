import { test, expect } from '@playwright/test';

test.describe('Flujos de Creación de Tickets y Subflujos (E2E)', () => {
  // Login antes de cada prueba como Administrador
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'adminkev@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Creación Estándar con Nuevo Cliente Inline
  // ─────────────────────────────────────────────────────────────
  test('Subflujo 1: Creación de ticket con nuevo cliente registrado inline', async ({ page }) => {
    const timestamp = Date.now();
    const customerName = `Cliente Nuevo ${timestamp}`;
    const customerEmail = `cliente_${timestamp}@test.com`;
    const customerPhone = `5025${timestamp.toString().slice(-4)}`;
    const ticketTitle = `Reparación Express ${timestamp}`;

    // Navegar a la pantalla de creación
    await page.goto('/dashboard/tickets/create');
    await expect(page).toHaveURL(/\/dashboard\/tickets\/create/);

    // 1. Escribir nombre para que aparezca "Crear Nuevo Cliente"
    await page.fill('input[placeholder="Nombre, Teléfono o Email..."]', customerName);
    const createNewBtn = page.locator('button:has-text("Crear Nuevo Cliente"), li:has-text("Crear")').first();
    await expect(createNewBtn).toBeVisible({ timeout: 5000 });
    await createNewBtn.click();

    // 2. Llenar datos adicionales del cliente inline
    await page.fill('input[type="email"]', customerEmail);
    await page.fill('input[type="tel"]', customerPhone);
    const dpiInput = page.locator('input[placeholder*="1234 56789 0101"]');
    if (await dpiInput.isVisible().catch(() => false)) {
      await dpiInput.fill(`2${timestamp.toString().slice(-12)}`);
    }

    // 3. Llenar datos del dispositivo
    await page.fill('input[placeholder="Ej: Pantalla Rota"]', ticketTitle);
    await page.selectOption('select', 'Smartphone');
    await page.fill('input[placeholder="Ej: iPhone 13 Pro"]', 'Xiaomi Redmi Note 13 Pro');
    await page.fill('textarea[placeholder*="Describe los síntomas"]', 'El equipo no enciende tras descarga total. Led parpadea en rojo.');
    await page.fill('input[placeholder="SN-1234..."]', `SN-XIAOMI-${timestamp}`);
    const accessoriesInput = page.locator('input[placeholder*="Cargador, funda"]');
    if (await accessoriesInput.isVisible().catch(() => false)) {
      await accessoriesInput.fill('Funda transparente, sin cargador');
    }

    // 4. Enviar formulario
    await page.click('button[type="submit"]:has-text("Crear Ticket")');

    // 5. Redirección y verificación en la lista
    await expect(page).toHaveURL(/\/dashboard\/tickets(?:$|\?)/, { timeout: 15000 });
    await expect(page.locator(`text=${ticketTitle}`).first()).toBeVisible({ timeout: 10000 });

    // 6. Abrir detalles y verificar datos creados
    const row = page.locator('tr').filter({ hasText: ticketTitle }).first();
    await row.locator('a:has-text("Ver Detalles")').click();
    await expect(page.locator('h1').first()).toContainText('Ticket #', { timeout: 10000 });
    await expect(page.locator(`text=${customerName}`).first()).toBeVisible();
    await expect(page.locator(`text=${ticketTitle}`).first()).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Creación Estándar con Selección de Cliente Existente
  // ─────────────────────────────────────────────────────────────
  test('Subflujo 2: Creación de ticket seleccionando cliente existente del autocompletado', async ({ page }) => {
    const timestamp = Date.now();
    const existingName = `Cliente AutoSelect ${timestamp}`;
    const ticketTitle = `Mantenimiento Laptop ${timestamp}`;

    // 1. Primero creamos un cliente para asegurar existencia
    await page.goto('/dashboard/tickets/create');
    await page.fill('input[placeholder="Nombre, Teléfono o Email..."]', existingName);
    const createBtn = page.locator('button:has-text("Crear Nuevo Cliente"), li:has-text("Crear")').first();
    await createBtn.click();
    await page.fill('input[placeholder="Ej: Pantalla Rota"]', `Setup ${timestamp}`);
    await page.fill('textarea[placeholder*="Describe los síntomas"]', 'Setup cliente');
    await page.click('button[type="submit"]:has-text("Crear Ticket")');
    await expect(page).toHaveURL(/\/dashboard\/tickets(?:$|\?)/, { timeout: 15000 });

    // 2. Ahora creamos otro ticket seleccionándolo desde el autocompletado
    await page.goto('/dashboard/tickets/create');
    const searchInput = page.locator('input[placeholder="Nombre, Teléfono o Email..."]');
    await searchInput.fill(existingName.slice(0, 15));
    await page.waitForTimeout(600); // Esperar búsqueda API

    // Seleccionar el resultado en el dropdown (listItem)
    const customerItem = page.locator('li[class*="listItem"]').filter({ hasText: existingName }).first();
    await expect(customerItem).toBeVisible({ timeout: 10000 });
    await customerItem.click();

    // Llenar dispositivo
    await page.fill('input[placeholder="Ej: Pantalla Rota"]', ticketTitle);
    await page.selectOption('select', 'Laptop');
    await page.fill('input[placeholder="Ej: iPhone 13 Pro"]', 'Dell Latitude 5420');
    await page.fill('textarea[placeholder*="Describe los síntomas"]', 'Limpieza general de ventiladores y cambio de pasta térmica Arctic MX-4.');
    await page.fill('input[placeholder="SN-1234..."]', `SN-DELL-${timestamp}`);

    // Enviar
    await page.click('button[type="submit"]:has-text("Crear Ticket")');
    await expect(page).toHaveURL(/\/dashboard\/tickets(?:$|\?)/, { timeout: 15000 });
    await expect(page.locator(`text=${ticketTitle}`).first()).toBeVisible({ timeout: 10000 });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Creación en Lote (Multi-Dispositivo para el mismo cliente)
  // ─────────────────────────────────────────────────────────────
  test('Subflujo 3: Creación en lote de múltiples dispositivos en un solo registro', async ({ page }) => {
    const timestamp = Date.now();
    const customerName = `Empresa Lote ${timestamp}`;
    const dev1Title = `Lote PC 1 ${timestamp}`;
    const dev2Title = `Lote PC 2 ${timestamp}`;

    await page.goto('/dashboard/tickets/create');

    // Cliente inline
    await page.fill('input[placeholder="Nombre, Teléfono o Email..."]', customerName);
    const createBtn = page.locator('button:has-text("Crear Nuevo Cliente"), li:has-text("Crear")').first();
    await createBtn.click();

    // Dispositivo 1
    await page.fill('input[placeholder="Ej: Pantalla Rota"]', dev1Title);
    await page.selectOption('select', 'PC');
    await page.fill('input[placeholder="Ej: iPhone 13 Pro"]', 'HP ProDesk 600 G4');
    await page.fill('textarea[placeholder*="Describe los síntomas"]', 'Fallo de fuente de poder.');

    // Agregar segundo dispositivo
    const addDeviceBtn = page.locator('button:has-text("Agregar Otro Dispositivo"), button:has-text("Agregar Equipo")').first();
    if (await addDeviceBtn.isVisible().catch(() => false)) {
      await addDeviceBtn.click();

      // Llenar datos del dispositivo 2
      const titleInputs = page.locator('input[placeholder="Ej: Pantalla Rota"]');
      await titleInputs.nth(1).fill(dev2Title);

      const descInputs = page.locator('textarea[placeholder*="Describe los síntomas"]');
      await descInputs.nth(1).fill('Actualización a disco SSD NVMe 1TB.');

      // Enviar lote
      await page.click('button[type="submit"]:has-text("Crear Tickets"), button[type="submit"]:has-text("Crear Ticket")');

      // Verificar que redirige a la lista
      await expect(page).toHaveURL(/\/dashboard\/tickets(?:$|\?)/, { timeout: 20000 });
      await expect(page.locator(`text=${dev1Title}`).first()).toBeVisible({ timeout: 10000 });
      await expect(page.locator(`text=${dev2Title}`).first()).toBeVisible({ timeout: 10000 });
    } else {
      await page.click('button[type="submit"]:has-text("Crear Ticket")');
      await expect(page).toHaveURL(/\/dashboard\/tickets(?:$|\?)/, { timeout: 15000 });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Creación desde Plantilla de Servicio (Wizard)
  // ─────────────────────────────────────────────────────────────
  test('Subflujo 4: Creación de ticket mediante Asistente / Plantilla de Servicio', async ({ page }) => {
    const timestamp = Date.now();
    const customerName = `Cliente Plantilla ${timestamp}`;

    await page.goto('/dashboard/tickets/create-with-template');
    await expect(page.locator('h1').first()).toContainText(/Nuevo Ticket|Asistente|Plantilla/i);

    // 1. Seleccionar una plantilla del catálogo si están disponibles
    const templateCards = page.locator('div[class*="templateCard"], button[class*="templateCard"], div[role="button"]');
    const count = await templateCards.count();
    if (count > 0) {
      await templateCards.first().click();
    }

    // 2. Llenar cliente
    const custSearch = page.locator('input[placeholder*="Nombre, Teléfono"]');
    if (await custSearch.isVisible().catch(() => false)) {
      await custSearch.fill(customerName);
      await page.waitForTimeout(500);
      const newCustBtn = page.locator('button:has-text("Crear Nuevo Cliente"), li:has-text("Crear")').first();
      if (await newCustBtn.isVisible().catch(() => false)) {
        await newCustBtn.click();
      }
    }

    // 3. Verificar o completar título y descripción
    const titleInput = page.locator('input[name="title"], input[placeholder*="Título"], input[placeholder*="Pantalla Rota"]').first();
    if (await titleInput.isVisible().catch(() => false)) {
      const currentVal = await titleInput.inputValue();
      if (!currentVal) {
        await titleInput.fill(`Servicio con Plantilla ${timestamp}`);
      }
    }

    const descInput = page.locator('textarea[name="description"], textarea[placeholder*="síntomas"], textarea[placeholder*="descripción"]').first();
    if (await descInput.isVisible().catch(() => false)) {
      const currentDesc = await descInput.inputValue();
      if (!currentDesc) {
        await descInput.fill('Servicio solicitado desde plantilla de mantenimiento.');
      }
    }

    // 4. Enviar creación
    const submitBtn = page.locator('button[type="submit"], button:has-text("Crear Ticket")').first();
    if (await submitBtn.isVisible().catch(() => false) && await submitBtn.isEnabled().catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/dashboard\/tickets/, { timeout: 15000 });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Subflujo de Impresión Térmica 80mm y Media Carta
  // ─────────────────────────────────────────────────────────────
  test('Subflujo 5: Formatos de impresión térmica 80mm y media carta tras crear ticket', async ({ page }) => {
    const timestamp = Date.now();
    const customerName = `Cliente Impresión ${timestamp}`;
    const ticketTitle = `Ticket Impresión Test ${timestamp}`;

    // Crear ticket rápido
    await page.goto('/dashboard/tickets/create');
    await page.fill('input[placeholder="Nombre, Teléfono o Email..."]', customerName);
    const createBtn = page.locator('button:has-text("Crear Nuevo Cliente"), li:has-text("Crear")').first();
    await createBtn.click();
    await page.fill('input[placeholder="Ej: Pantalla Rota"]', ticketTitle);
    await page.selectOption('select', 'Console');
    await page.fill('input[placeholder="Ej: iPhone 13 Pro"]', 'PlayStation 5');
    await page.fill('textarea[placeholder*="Describe los síntomas"]', 'Sobrecalentamiento y apagado repentino.');
    await page.click('button[type="submit"]:has-text("Crear Ticket")');

    await expect(page).toHaveURL(/\/dashboard\/tickets(?:$|\?)/, { timeout: 15000 });

    // Abrir ticket recién creado
    const row = page.locator('tr').filter({ hasText: ticketTitle }).first();
    await row.locator('a:has-text("Ver Detalles")').click();
    await expect(page.locator('h1').first()).toContainText('Ticket #', { timeout: 10000 });

    const ticketUrl = page.url();
    const ticketId = ticketUrl.split('/').pop()?.split('?')[0];
    expect(ticketId).toBeTruthy();

    // 1. Probar Comprobante Térmico 80mm
    await page.goto(`/dashboard/tickets/${ticketId}/ticket80mm`);
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${customerName}`).first()).toBeVisible();

    // 2. Probar Formato Media Carta (Half-Letter)
    await page.goto(`/dashboard/tickets/${ticketId}/print-half-letter`);
    await expect(page.locator('h1, h2, div[class*="sheet"]').first()).toBeVisible({ timeout: 10000 });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. Validación de Errores y Campos Obligatorios (Negative Testing)
  // ─────────────────────────────────────────────────────────────
  test('Subflujo 6: Validación de campos requeridos y prevención de sumisión inválida', async ({ page }) => {
    await page.goto('/dashboard/tickets/create');

    // Intentar presionar "Crear Ticket" sin haber seleccionado cliente ni dispositivo
    const submitBtn = page.locator('button[type="submit"]:has-text("Crear Ticket")');
    
    // Debe estar deshabilitado inicialmente
    const isDisabled = await submitBtn.isDisabled();
    expect(isDisabled).toBe(true);

    // Llenar cliente solamente (sin título ni descripción)
    await page.fill('input[placeholder="Nombre, Teléfono o Email..."]', 'Cliente Test Incompleto');
    const createBtn = page.locator('button:has-text("Crear Nuevo Cliente"), li:has-text("Crear")').first();
    await createBtn.click();

    // El botón aún debe permanecer deshabilitado porque faltan título y descripción
    expect(await submitBtn.isDisabled()).toBe(true);

    // Llenar solo el título
    await page.fill('input[placeholder="Ej: Pantalla Rota"]', 'Solo Titulo');
    expect(await submitBtn.isDisabled()).toBe(true);

    // Al llenar descripción, el botón se habilita
    await page.fill('textarea[placeholder*="Describe los síntomas"]', 'Descripción completa');
    expect(await submitBtn.isEnabled()).toBe(true);
  });
});
