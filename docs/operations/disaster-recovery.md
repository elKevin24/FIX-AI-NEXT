# 🛡️ Procedimiento de Disaster Recovery y Point-in-Time Recovery (PITR)

## 1. Objetivos de Recuperación

| Parámetro | Objetivo | Mecanismo de Garantía |
| :--- | :--- | :--- |
| **RPO (Recovery Point Objective)** | **< 5 minutos** | Continuous WAL Archiving en Neon Database + Snapshots automáticos. |
| **RTO (Recovery Time Objective)** | **< 15 minutos** | Branching instantáneo Copy-on-Write y re-enrutamiento de connection string. |

---

## 2. Procedimiento de Point-in-Time Recovery (PITR) con Neon

En caso de corrupción de datos accidental o ataque destructivo:

### Paso 1: Determinar el Punto en el Tiempo Objetivo
Identificar el `timestamp` UTC exacto anterior al incidente (ejemplo: `2026-09-01T04:12:00Z`).

### Paso 2: Crear el Branch de Recuperación
Ejecutar mediante la CLI de Neon o la API de administración:
```bash
# Crear branch de recuperación exactamente en ese instante
neon branches create \
  --project-id <neon-project-id> \
  --name recovery-pitr-$(date +%s) \
  --from-timestamp "2026-09-01T04:12:00Z"
```

### Paso 3: Obtener la Nueva Connection String
```bash
neon connection-string <neon-project-id> --branch recovery-pitr-<timestamp>
```

### Paso 4: Actualizar las Variables de Producción en Vercel
```bash
vercel env add DATABASE_URL production
vercel env add DIRECT_DATABASE_URL production
vercel redeploy --prod
```

### Paso 5: Verificación de Integridad de Datos
1. Comprobar que los registros corruptos hayan sido revertidos.
2. Comprobar que `/api/health` devuelva `status: "healthy"`.
3. Notificar al equipo de operaciones la finalización de la recuperación.

---

## 3. Procedimiento de Respaldo Lógico Semanal (`pg_dump`)

Como segunda línea de defensa contra desastres en el proveedor cloud:

```bash
# Script de exportación lógica segura
pg_dump "$DIRECT_DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="backup-$(date +%Y%m%d_%H%M%S).dump"

# Cifrado GPG antes de subida a almacenamiento externo
gpg --symmetric --cipher-algo AES256 "backup-*.dump"
```
