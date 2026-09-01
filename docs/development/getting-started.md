# Getting Started — FIX-AI NEXT

Guía de onboarding para un desarrollador nuevo. Basada en scripts y código reales (`package.json`, `prisma/seed.ts`, `.env.example`).

## 1. Clonar

```bash
git clone <repo-url> && cd fix-ai-next
```

Usamos `develop` como rama de trabajo. Ramas de feature: `feature/<nombre>`.

## 2. Instalar

```bash
npm install
```

`postinstall` ejecuta `npx prisma generate` (necesita `DATABASE_URL` en el entorno o tolerará su ausencia en CI).

## 3. Configurar environment

```bash
cp .env.example .env.local
# edita .env.local
```

Mínimo:
- `DATABASE_URL` — cadena de conexión Postgres (para local usar la de tu contenedor).
- `AUTH_SECRET` — genera con `npx auth secret`.
- `NEXT_PUBLIC_APP_URL` — `http://localhost:3000` en dev.

Para features: `EMAIL_PROVIDER=log` (o SMTP real), `UPSTASH_REDIS_*`, `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`, `SUPERADMIN_EMAILS`.

## 4. Base de datos

**Local (Docker):**

```bash
npm run db:start      # docker compose up
npm run db:migrate    # prisma migrate dev
npm run db:seed       # crea tenants + usuarios demo
```

**Neon (producción):** configura `DATABASE_URL` con la pooled URL de Neon y usa:

```bash
npm run neon:migrate   # bash scripts/neon-migrate-retry.sh
npm run neon:seed
npm run neon:superadmin  # crea el SUPER_ADMIN global
```

## 5. Ejecutar en desarrollo

```bash
npm run dev
# http://localhost:3000
```

Login con las credenciales demo (tenant electrofix): `admin@electrofix.com` (ADMIN), `manager@electrofix.com` (MANAGER), `miguel@electrofix.com` / `lucia@electrofix.com` (TECHNICIAN), `recepcion@electrofix.com` (VIEWER).

## 6. Tests

```bash
npm test                 # vitest run (unit + integración)
npm run test:coverage    # con cobertura
npx playwright test      # e2e (tests/e2e)
```

## 7. Lint

```bash
npm run lint
```

## 8. Build (producción)

```bash
npm run build
```

Chequea todo de una vez: `npm run check:all` (tipos + lint + test + build).

## 9. Entender la arquitectura

Lee antes de tocar código:
- `docs/architecture/ARCHITECTURE.md` — vistas general.
- `docs/security/tenant-isolation.md` — **crítico** para tocar la BD.
- `docs/security/rbac.md` — permisos por rol.
- `docs/development/rules.md` — reglas obligatorias.
- `README.md` — mapa de carpetas y stack.

## 10. Hacer tu primer cambio

1. `git checkout -b feature/<tus-iniciales>-descripcion`
2. Identifica el flujo: la mayoría va **UI (componente en `src/app/**` o `src/components/`) → Server Action (`src/lib/actions/` o `src/lib/*-actions.ts`) → `getTenantPrisma`**.
3. Si es un formulario, usa: componente `ui/` → schema Zod (reutiliza `src/lib/schemas.ts`) → Server Action con `useActionState`.
4. Aplica permisos (RBAC) y tenant en la acción.
5. `npm test` + `npm run lint` + `npx tsc --noEmit` antes de commitear.

---

## Problemas comunes (ver `docs/development/troubleshooting.md`)

- **`prisma generate` falla en CI sin DATABASE_URL** — proceso de `postinstall`; configurar en el CI el env o ajustar el script.
- **Login no conecta / "401"** — revisa `AUTH_SECRET` y `DATABASE_URL`.
- **Migraciones no aplican en Neon** — usar la URL directa/pooled correcta según `scripts/neon-migrate-retry.sh`.
