# Deploy Guide — Studio Flow Academy (Monorepo)

Este repositorio usa `pnpm workspace` con paquetes:
- `academy-api`
- `academy-app-web`
- `shared` (`@academy/shared`)

> Importante: para que `@academy/shared` funcione, el build debe ejecutarse en contexto del repo completo (raíz del monorepo), no solo con una subcarpeta aislada.

---

## 1) Web en Vercel (`academy-app-web`)

### 1.1 Crear proyecto en Vercel
1. Conecta el repo en Vercel.
2. En el proyecto, configura para construir desde la **raíz del repo**.

### 1.2 Configuración recomendada (Project Settings)
- **Framework Preset:** `Vite`
- **Install Command:**
  ```bash
  pnpm install --frozen-lockfile
  ```
- **Build Command:**
  ```bash
  pnpm --filter academy-app-web build
  ```
- **Output Directory:**
  ```bash
  academy-app-web/dist
  ```

### 1.3 Variables de entorno (Vercel)
Configura al menos:
- `VITE_API_URL=https://api.tudominio.com`
- `VITE_CLERK_PUBLISHABLE_KEY=<tu_clerk_publishable_key>`
- `VITE_APP_NAME=StudioFlow Academy` (opcional)

### 1.4 Dominio
- Asigna tu dominio/subdominio del frontend (ej. `app.tudominio.com`).

---

## 2) API en Dokploy (`academy-api`)

### 2.1 Tipo de app
Usa deploy Node (buildpack/nixpacks) o equivalente en Dokploy, pero con comandos ejecutados desde la **raíz del repo**.

### 2.2 Configuración recomendada (Build/Run)
- **Working Directory:** raíz del repo (`/` del checkout)
- **Install Command:**
  ```bash
  pnpm install --frozen-lockfile
  ```
- **Build Command:**
  ```bash
  pnpm --filter academy-api prisma:generate && pnpm --filter academy-api build
  ```
- **Start Command:**
  ```bash
  pnpm --filter academy-api start
  ```

### 2.3 Variables de entorno (Dokploy)
Mínimas para API:
- `NODE_ENV=production`
- `PORT=3000`
- `DATABASE_URL=<neon_postgres_url>`
- `WEB_APP_URL=https://app.tudominio.com`
- `CLERK_SECRET_KEY=<tu_clerk_secret_key>`
- `QR_SECRET=<random_string_segura>`

Si usarás pagos/upload (R2):
- `CLOUDFLARE_R2_ENDPOINT`
- `CLOUDFLARE_R2_ACCESS_KEY_ID`
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
- `CLOUDFLARE_R2_BUCKET_NAME`
- `CLOUDFLARE_R2_PUBLIC_URL`

### 2.4 Healthcheck
Usa:
- `GET /api/v1/health`

---

## 3) Orden recomendado de despliegue
1. Deploy de API en Dokploy.
2. Verificar `https://api.tudominio.com/api/v1/health`.
3. Configurar `VITE_API_URL` en Vercel con esa URL.
4. Deploy de Web en Vercel.
5. Verificar login y llamadas CORS.

---

## 4) Checklist rápido post-deploy
- API responde `200` en `/api/v1/health`.
- Web carga y apunta al API correcto (`VITE_API_URL`).
- CORS permitido desde `WEB_APP_URL`.
- `GET /api/v1/auth/status` responde desde frontend.
- Logs sin errores de `@academy/shared` no resuelto.

---

## 5) Problemas comunes

### Error: no encuentra `@academy/shared`
Causa: build ejecutado en subcarpeta aislada.

Solución: ejecutar install/build desde la raíz del monorepo con comandos `pnpm --filter ...`.

### Error Prisma Client no generado
Causa: faltó `prisma generate` en build de API.

Solución: mantener en Build Command:
```bash
pnpm --filter academy-api prisma:generate && pnpm --filter academy-api build
```

### Error CORS
Causa: `WEB_APP_URL` en API no coincide con dominio real del frontend.

Solución: actualizar `WEB_APP_URL` en Dokploy y redeploy.
