# Guía de Resolución de Problemas (Troubleshooting / Bitácora de Errores)

Este documento (también conocido como *Troubleshooting Guide*, *Runbook* o *Knowledge Base*) sirve como bitácora para registrar errores recurrentes en el desarrollo del proyecto FIX-AI-NEXT, sus causas raíz y sus soluciones exactas.

## 1. Fallos en GitHub Actions (Database Check) por falta de `DATABASE_URL`

**Síntoma:**
El workflow de GitHub Actions (ej. `database-check.yml`, `security.yml`, o `codeql.yml`) falla en el paso de `Install dependencies` (`npm ci`) con el siguiente error:
\`\`\`text
Error: PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL.
\`\`\`

**Causa Raíz:**
En la arquitectura de Next.js y Vercel, el script de instalación (`npm ci`) ejecuta automáticamente el hook `postinstall`, el cual lanza `npx prisma generate`. A partir de versiones recientes de Prisma, la evaluación del esquema (`schema.prisma`) es muy estricta y exige que la variable de entorno `DATABASE_URL` exista durante la validación inicial, incluso si no se realiza ninguna conexión real a la base de datos en ese paso. Como GitHub Actions corre en un entorno limpio sin archivo `.env`, Prisma falla y detiene el flujo de trabajo completo.

**Solución Documentada:**
Se debe inyectar de forma explícita una variable de entorno `DATABASE_URL` ficticia (dummy) exclusivamente en el paso que ejecuta `npm ci` dentro de los archivos `.github/workflows/*.yml`.

**Implementación en `.github/workflows/*.yml`:**
\`\`\`yaml
      - name: Install dependencies
        run: npm ci
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/testdb
\`\`\`

---

## 2. Fallo de Formato de Prisma en CI (`npx prisma format --check`)

**Síntoma:**
Después de superar la instalación de dependencias, un workflow de validación estricta (como Database Check) falla en el paso de chequeo de formato con el error:
\`\`\`text
Run npx prisma format --check
Loaded Prisma config from prisma.config.ts.
Prisma schema loaded from prisma/schema.prisma.
! There are unformatted files. Run prisma format to format them.
\`\`\`

**Causa Raíz:**
El código fuente de `prisma/schema.prisma` fue modificado manualmente o por alguna herramienta y se guardó con problemas de indentación o espacios incorrectos. El comando `--check` utilizado en integración continua (CI) rechaza la ejecución si el archivo no coincide bit-a-bit con el estándar oficial de Prisma.

**Solución Documentada:**
1. Ejecutar en local el auto-formateador oficial:
   \`\`\`bash
   npx prisma format
   \`\`\`
2. Confirmar los cambios de indentación con un commit nuevo y hacer push:
   \`\`\`bash
   git add prisma/schema.prisma
   git commit -m "chore: format prisma schema to fix CI format check"
   git push
   \`\`\`
