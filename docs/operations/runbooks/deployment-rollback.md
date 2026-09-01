# 📘 Runbook: Reversión Inmediata de Despliegues (Rollback)

## Severidad: P1 / P2
**Objetivo:** Revertir una versión defectuosa en producción a un estado estable previo en menos de 5 minutos.

---

### 1. Reversión de Frontend / Servidor en Vercel

#### Opción A: Desde la Consola de Vercel (Recomendado)
1. Ingresar a `https://vercel.com/` -> Proyecto `fix-ai-next`.
2. Ir a la pestaña **Deployments**.
3. Localizar el último despliegue estable (marcado en verde).
4. Hacer clic en los tres puntos `(...)` -> **Promote to Production** (o **Instant Rollback**).
5. El tráfico se redirige instantáneamente a nivel Edge CDN (zero downtime).

#### Opción B: Mediante Vercel CLI
```bash
# Listar despliegues recientes
vercel list fix-ai-next --prod

# Promover el deployment ID estable previo
vercel alias set <previous-deployment-url.vercel.app> fix-ai-next.vercel.app
```

---

### 2. Reversión de Migraciones de Base de Datos (Prisma)

> [!WARNING]
> Las migraciones destructivas (eliminar columnas o renombrar tablas) no deben ejecutarse directamente en producción sin un plan de migración en dos fases (expand & contract).

Si una migración falló durante el despliegue:
1. Identificar la migración conflictiva en `prisma/migrations/`.
2. En Neon Console, si es necesario, restaurar al snapshot previo:
   ```bash
   neon branches create --name rollback-pre-migration --from-timestamp "<timestamp-pre-deploy>"
   ```
3. Para resolver el estado en Prisma Migrate:
   ```bash
   npx prisma migrate resolve --rolled-back "<migration_name>"
   ```
