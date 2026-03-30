# Plan de Migración — StudioFlow Academy

> **Fecha:** 29 de marzo de 2026  
> **Proyecto:** StudioFlow Academy  
> **Stack actual:** Next.js 15 (App Router) — monolito fullstack  
> **Stack destino:** Hono API + React/Vite Frontend + React Native/Expo Mobile

---

## Tabla de Contenidos

1. [Análisis del Código Actual](#1-análisis-del-código-actual)
2. [Inventario de Dependencias](#2-inventario-de-dependencias)
3. [Mapa de Migración Archivo por Archivo](#3-mapa-de-migración-archivo-por-archivo)
4. [Identificación de Riesgos](#4-identificación-de-riesgos)
5. [Plan de Migración por Fases](#5-plan-de-migración-por-fases)
6. [Checklist Post-Migración](#6-checklist-de-verificación-post-migración)
7. [Recomendaciones Raspberry Pi 4](#7-recomendaciones-para-raspberry-pi-4)
8. [Estimación de Esfuerzo](#8-estimación-de-esfuerzo)

---

## 1. Análisis del Código Actual

### 1.1 Estructura General

El proyecto es un monolito Next.js 15 con App Router que combina:
- **16 Route Handlers** REST en `app/api/v1/`
- **4 Server Actions** en `actions/`
- **10 páginas** en route groups `(dashboard)`, `(auth)`, `teacher`
- **41 componentes** (10 UI base + 31 de negocio)
- **Prisma ORM** con 11 modelos y 6 enums
- **Clerk** para auth (`@clerk/nextjs`)
- **Cloudflare R2** para storage vía AWS SDK

### 1.2 Análisis de Route Handlers (API)

| Archivo | Propósito | Complejidad |
|---|---|---|
| `attendance/scan/route.ts` | Escaneo QR → registrar asistencia | **Muy Alta** — JWT QR, membresía, créditos, walk-in, transacción |
| `attendances/[id]/cancel/route.ts` | Cancelar asistencia | **Alta** — ventana cancelación, reembolso, promover waitlist |
| `classes/route.ts` | Crear clase(s) | Media — validación Zod, creación múltiple |
| `classes/[id]/route.ts` | PUT/DELETE clase | **Alta** — integridad, fechas |
| `classes/[id]/reserve/route.ts` | Reservar clase | **Alta** — membresía, cupo, créditos, transacción |
| `classes/[id]/waitlist/route.ts` | Unir/salir waitlist | **Alta** — verificaciones, posición |
| `payments/orders/route.ts` | Crear orden | Media |
| `payments/orders/[id]/approve/route.ts` | Aprobar orden | **Alta** — expiración, créditos, transacción |
| `payments/orders/[id]/reject/route.ts` | Rechazar orden | Baja |
| `payments/upload/route.ts` | Upload archivo a R2 | Media |
| `payments/upload-url/route.ts` | Presigned URL R2 | Media |
| `student/qr/route.ts` | Payload QR estudiante | Media |
| `students/route.ts` | Crear estudiante | **Muy Alta** — Clerk + BD + rollback |
| `students/[id]/route.ts` | PUT/DELETE estudiante | **Muy Alta** — cascada, Clerk sync |
| `teachers/route.ts` | Listar profesores | Baja |
| `teachers/[id]/route.ts` | PUT/DELETE profesor | **Alta** — Clerk sync, verificaciones |

### 1.3 Análisis de Server Actions

| Archivo | Propósito | Deps Next.js | Complejidad |
|---|---|---|---|
| `actions/auth.ts` | signInAction, createUserProfileAction | `'use server'`, `redirect`, `cookies`, `@clerk/nextjs/server` | **Alta** |
| `actions/payments.ts` | approvePayment, rejectPayment | `'use server'`, `revalidatePath` | **Alta** |
| `actions/plans.ts` | CRUD planes | `'use server'`, `revalidatePath` | Media |
| `actions/teachers.ts` | Crear profesor, cambiar rol | `'use server'`, `revalidatePath`, `@clerk/nextjs/server` | **Alta** |

### 1.4 Análisis de Páginas

| Página | Tipo | Deps Next.js | Complejidad |
|---|---|---|---|
| `(dashboard)/page.tsx` | Server Component + Server Actions inline | `redirect`, `Link`, queries Prisma directas, `'use server'` | **Muy Alta** |
| `(dashboard)/students/page.tsx` | Server → Client | `redirect`, queries Prisma | Media |
| `(dashboard)/reports/page.tsx` | Server → Client | 12 queries paralelas | **Alta** |
| `(auth)/sign-in/page.tsx` | Client Component | `useSignIn`, `useAuth` de `@clerk/nextjs` | **Alta** |
| `(auth)/sign-up/page.tsx` | Client Component | `useSignUp`, `useAuth` de `@clerk/nextjs` | **Alta** |
| `teacher/scanner/page.tsx` | Client Component | Solo `fetch` a API | Media |

### 1.5 Análisis de Componentes

- **10 UI base** (`Button`, `Input`, `Table`, etc.) → **Sin deps Next.js** — copiar directamente
- **Layout** (`DashboardShell`, `Sidebar`, `Topbar`) → Deps: `Link`, `usePathname`, `useRouter`, `useClerk`
- **Dashboard modules** (~25 archivos) → Deps: `useRouter`, `Link`, `router.refresh()`

---

## 2. Inventario de Dependencias

### 2.1 Dependencias a ELIMINAR

| Paquete | Razón |
|---|---|
| `next` | Reemplazar por Vite + React Router |
| `@clerk/nextjs` | Reemplazar por `@clerk/clerk-react` (web) y `@clerk/backend` (API) |
| `eslint-config-next` | Reemplazar por config ESLint estándar |

### 2.2 Dependencias a MANTENER (sin cambios)

| Paquete | Uso |
|---|---|
| `@prisma/client` + `prisma` | ORM |
| `@prisma/adapter-pg` + `pg` | Adaptador PostgreSQL |
| `@aws-sdk/client-s3` | Upload a Cloudflare R2 |
| `@aws-sdk/s3-request-presigner` | URLs firmadas R2 |
| `jose` | JWT para tokens QR |
| `zod` | Validaciones compartidas |
| `framer-motion` | Animaciones frontend |
| `lucide-react` | Iconos frontend |
| `recharts` | Gráficos en reportes |
| `react-hook-form` + `@hookform/resolvers` | Formularios |
| `clsx` + `tailwind-merge` | Utilidades CSS |
| `@formkit/auto-animate` | Animaciones de listas |
| `@zxing/browser` + `@zxing/library` | Scanner QR |
| `tailwindcss` + `@tailwindcss/vite` | Estilos |

### 2.3 Dependencias a REEMPLAZAR

| Actual | Nuevo | Razón |
|---|---|---|
| `@clerk/nextjs` | `@clerk/clerk-react` | Hooks Clerk para React SPA |
| `@clerk/nextjs/server` | `@clerk/backend` | Verificación tokens en API Hono |
| `next/navigation` (`useRouter`, `usePathname`, `redirect`) | `react-router-dom` v7 (`useNavigate`, `useLocation`, `Navigate`) | Routing SPA |
| `next/link` (`Link`) | `react-router-dom` (`Link`, `NavLink`) | Links SPA |
| `next/image` (`Image`) | `<img>` nativo | Imágenes |
| `next/font` | `@fontsource/inter` o Google Fonts CDN | Fuentes |
| Server Actions (`'use server'`) | `fetch` → API Hono (via TanStack Query mutations) | No existen en Vite |
| `revalidatePath` | `queryClient.invalidateQueries()` | Cache invalidation |
| `redirect()` de next | `Navigate` component o `useNavigate()` | Redirecciones |

### 2.4 Dependencias a AGREGAR

**API (Hono):**

| Paquete | Uso |
|---|---|
| `hono` | Framework HTTP |
| `@hono/node-server` | Servidor Node.js para Hono |
| `@clerk/backend` | Verificar JWT de Clerk |
| `dotenv` | Variables de entorno |
| `tsx` | Ejecutar TypeScript en desarrollo |

**Frontend (Vite):**

| Paquete | Uso |
|---|---|
| `vite` | Bundler |
| `@vitejs/plugin-react` | Plugin React para Vite |
| `react-router-dom` (v7) | Routing SPA |
| `@tanstack/react-query` | Fetching + cache |
| `@clerk/clerk-react` | Auth en SPA |
| `@fontsource/inter` | Fuente Inter |

---

## 3. Mapa de Migración Archivo por Archivo

### Leyenda de Prioridad
- 🔴 **P0 — Crítica:** Sin esto no funciona nada
- 🟠 **P1 — Alta:** Core del negocio
- 🟡 **P2 — Media:** Importante pero no bloqueante
- 🟢 **P3 — Baja:** Puede esperar

### 3.1 Infraestructura y Config

| Origen | Destino | Cambios | Prioridad |
|---|---|---|---|
| `prisma/schema.prisma` | `api/prisma/schema.prisma` | Copiar, agregar `binaryTargets` ARM64 | 🔴 P0 |
| `lib/db.ts` | `api/src/lib/db.ts` | Copiar, ajustar imports | 🔴 P0 |
| `proxy.ts` | `api/src/middleware/auth.ts` | Reescribir como middleware Hono con `@clerk/backend` | 🔴 P0 |
| `app/layout.tsx` | `web/src/App.tsx` + `web/src/main.tsx` | Separar: ClerkProvider, fonts, CSS vars, metadata | 🔴 P0 |
| `app/globals.css` | `web/src/styles/globals.css` | Copiar, ajustar `--font-inter` | 🔴 P0 |
| `config/studio.config.ts` | `shared/config/studio.config.ts` | Copiar tal cual | 🔴 P0 |
| `next.config.ts` | Eliminar | No necesario | 🔴 P0 |

### 3.2 Librería Compartida

| Origen | Destino | Cambios | Prioridad |
|---|---|---|---|
| `lib/auth.ts` | `api/src/lib/auth.ts` | **Reescribir:** `auth()` → verificar JWT `@clerk/backend`, `currentUser()` → userId de token + query BD | 🔴 P0 |
| `lib/cn.ts` | `web/src/lib/cn.ts` | Copiar | 🟢 P3 |
| `lib/qr.ts` | `api/src/lib/qr.ts` | Copiar | 🟠 P1 |
| `lib/roles.ts` | `shared/lib/roles.ts` | Copiar (usado por API y frontend) | 🔴 P0 |
| `lib/teachers.ts` | `api/src/lib/teachers.ts` | Copiar | 🟡 P2 |
| `lib/animations.ts` | `web/src/lib/animations.ts` | Copiar | 🟢 P3 |
| `lib/utils/date.ts` | `api/src/lib/utils/date.ts` | Copiar | 🟠 P1 |
| `lib/utils/waitlist.ts` | `api/src/lib/utils/waitlist.ts` | Copiar | 🟠 P1 |
| `lib/validations/*.ts` | `shared/validations/*.ts` | Copiar (5 archivos) | 🔴 P0 |
| `utils/general.ts` | `web/src/utils/general.ts` | Copiar | 🟡 P2 |
| `utils/clerk-localization.ts` | `web/src/utils/clerk-localization.ts` | Copiar | 🟡 P2 |
| `interfaces/*.ts` | `shared/interfaces/*.ts` | Copiar (3 archivos) | 🟡 P2 |

### 3.3 Route Handlers → Hono Routes

| Origen | Destino Hono | Prioridad |
|---|---|---|
| `attendance/scan/route.ts` | `POST /api/v1/attendance/scan` | 🟠 P1 |
| `attendances/[id]/cancel/route.ts` | `POST /api/v1/attendances/:id/cancel` | 🟠 P1 |
| `classes/route.ts` | `POST /api/v1/classes` | 🟠 P1 |
| `classes/[id]/route.ts` | `PUT/DELETE /api/v1/classes/:id` | 🟠 P1 |
| `classes/[id]/reserve/route.ts` | `POST /api/v1/classes/:id/reserve` | 🟠 P1 |
| `classes/[id]/waitlist/route.ts` | `POST /api/v1/classes/:id/waitlist` | 🟠 P1 |
| `payments/orders/route.ts` | `POST /api/v1/payments/orders` | 🟠 P1 |
| `payments/orders/[id]/approve/route.ts` | `POST /api/v1/payments/orders/:id/approve` | 🟠 P1 |
| `payments/orders/[id]/reject/route.ts` | `POST /api/v1/payments/orders/:id/reject` | 🟠 P1 |
| `payments/upload/route.ts` | `POST /api/v1/payments/upload` | 🟠 P1 |
| `payments/upload-url/route.ts` | `POST /api/v1/payments/upload-url` | 🟠 P1 |
| `student/qr/route.ts` | `GET /api/v1/student/qr` | 🟠 P1 |
| `students/route.ts` | `POST /api/v1/students` | 🟠 P1 |
| `students/[id]/route.ts` | `PUT/DELETE /api/v1/students/:id` | 🟠 P1 |
| `teachers/route.ts` | `GET /api/v1/teachers` | 🟡 P2 |
| `teachers/[id]/route.ts` | `PUT/DELETE /api/v1/teachers/:id` | 🟡 P2 |

**Patrón de migración:**
```typescript
// Antes (Next.js Route Handler)
export async function POST(req: NextRequest) {
  const user = await requireRole(['ADMIN']);
  const body = await req.json();
  return NextResponse.json(result);
}

// Después (Hono)
app.post('/api/v1/resource', authMiddleware, async (c) => {
  const user = await requireRole(c, ['ADMIN']);
  const body = await c.req.json();
  return c.json(result);
});
```

### 3.4 Server Actions → Endpoints API

| Origen | Destino | Prioridad |
|---|---|---|
| `actions/auth.ts` → `signInAction` | **Eliminar** — login 100% en frontend con `@clerk/clerk-react` | 🔴 P0 |
| `actions/auth.ts` → `createUserProfileAction` | `POST /api/v1/auth/profile` | 🔴 P0 |
| `actions/payments.ts` → `approvePayment` | Ya existe endpoint approve — eliminar action | 🟠 P1 |
| `actions/payments.ts` → `rejectPayment` | Ya existe endpoint reject — eliminar action | 🟠 P1 |
| `actions/plans.ts` → CRUD | `POST/PUT/DELETE/PATCH /api/v1/plans` (nuevos) | 🟠 P1 |
| `actions/teachers.ts` → `createTeacherAction` | `POST /api/v1/teachers` (nuevo) | 🟡 P2 |
| `actions/teachers.ts` → `changeUserRoleAction` | `PATCH /api/v1/users/:id/role` (nuevo) | 🟡 P2 |

### 3.5 Páginas → React Router + TanStack Query

| Origen | Destino | Cambios Clave | Prioridad |
|---|---|---|---|
| `(dashboard)/layout.tsx` | `web/src/layouts/DashboardLayout.tsx` | `auth()` → `useAuth()`, query `getCurrentUser` | 🔴 P0 |
| `(dashboard)/page.tsx` | `web/src/pages/Dashboard.tsx` | **Crear** endpoints `GET /dashboard/admin` y `/student`, consumir con TanStack | 🔴 P0 |
| `(dashboard)/students/page.tsx` | `web/src/pages/Students.tsx` | **Crear** endpoint `GET /students`, consumir | 🟠 P1 |
| `(dashboard)/classes/page.tsx` | `web/src/pages/Classes.tsx` | **Crear** endpoint `GET /classes?week=...` | 🟠 P1 |
| `(dashboard)/payments/page.tsx` | `web/src/pages/Payments.tsx` | **Crear** endpoint `GET /payments/orders` | 🟠 P1 |
| `(dashboard)/plans/page.tsx` | `web/src/pages/Plans.tsx` | **Crear** endpoint `GET /plans` | 🟡 P2 |
| `(dashboard)/teachers/page.tsx` | `web/src/pages/Teachers.tsx` | Ya existe `GET /teachers` | 🟡 P2 |
| `(dashboard)/reports/page.tsx` | `web/src/pages/Reports.tsx` | **Crear** endpoint `GET /reports` | 🟡 P2 |
| `(dashboard)/settings/page.tsx` | `web/src/pages/Settings.tsx` | Componente estático | 🟢 P3 |
| `(dashboard)/video-library/page.tsx` | `web/src/pages/VideoLibrary.tsx` | **Crear** endpoint `GET /content` | 🟡 P2 |
| `(auth)/sign-in/page.tsx` | `web/src/pages/auth/SignIn.tsx` | `@clerk/nextjs` → `@clerk/clerk-react`, `useRouter` → `useNavigate` | 🔴 P0 |
| `(auth)/sign-up/page.tsx` | `web/src/pages/auth/SignUp.tsx` | Mismo patrón | 🔴 P0 |
| `(auth)/forgot-password/page.tsx` | `web/src/pages/auth/ForgotPassword.tsx` | Mismo patrón | 🔴 P0 |
| `teacher/scanner/page.tsx` | `web/src/pages/Scanner.tsx` | URL fetch relativa → absoluta con token | 🟠 P1 |
| `no-access/page.tsx` | `web/src/pages/NoAccess.tsx` | `useClerk` → `@clerk/clerk-react` | 🟢 P3 |

### 3.6 Componentes

| Grupo | Destino | Cambios | Prioridad |
|---|---|---|---|
| `components/ui/*` (10 archivos) | `web/src/components/ui/*` | **Copiar sin cambios** | 🔴 P0 |
| `components/auth/VerificationCodeForm.tsx` | `web/src/components/auth/` | Copiar | 🔴 P0 |
| `components/layout/DashboardShell.tsx` | `web/src/components/layout/` | Copiar (solo usa framer-motion) | 🔴 P0 |
| `components/layout/Sidebar.tsx` | `web/src/components/layout/` | `Link` → `NavLink`, `usePathname` → `useLocation`, `useClerk` → `@clerk/clerk-react` | 🔴 P0 |
| `components/layout/Topbar.tsx` | `web/src/components/layout/` | `usePathname` → `useLocation` | 🔴 P0 |
| `components/dashboard/*` (~25 archivos) | `web/src/components/dashboard/*` | `router.refresh()` → `queryClient.invalidateQueries()`, URLs absolutas | 🟠 P1 |

### 3.7 Hooks e Interfaces

| Origen | Destino | Cambios | Prioridad |
|---|---|---|---|
| `hooks/useIsMobile.ts` | `web/src/hooks/` | Copiar | 🟢 P3 |
| `hooks/usePagination.ts` | `web/src/hooks/` | Copiar | 🟠 P1 |
| `interfaces/*.ts` (3 archivos) | `shared/interfaces/` | Copiar | 🟡 P2 |

---

## 4. Identificación de Riesgos

### 4.1 Riesgos Técnicos

| # | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| T1 | **Auth Clerk cross-origin**: Frontend y API en dominios distintos, tokens deben enviarse en headers | Alta | **Crítico** | CORS en Hono. `getToken()` de Clerk React → `Authorization: Bearer`. Verificar con `@clerk/backend` |
| T2 | **Server Actions a REST**: Pages con `'use server'` inline (dashboard) requieren refactor completo | Alta | **Alto** | Crear endpoints REST + `useMutation` de TanStack Query |
| T3 | **Data fetching SSR → SPA**: Páginas con queries Prisma directas deben pasar por API | Alta | **Alto** | Crear endpoints GET para dashboard, students, classes, payments, reports |
| T4 | **Prisma en ARM64**: Necesita binarios nativos para Raspberry Pi | Media | **Alto** | `binaryTargets = ["native", "linux-arm64-openssl-3.0.x"]` |
| T5 | **Tipado end-to-end**: Se pierde tipado automático entre Server/Client Components | Media | **Medio** | Paquete `shared/` con types. Considerar `hono/client` (Hono RPC) |
| T6 | **Upload archivos**: `NextRequest.formData()` → `c.req.parseBody()` de Hono | Media | **Medio** | Probar upload a R2 exhaustivamente |

### 4.2 Riesgos de Datos

| # | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| D1 | **Transacciones durante migración**: Conflictos si API vieja y nueva coexisten | Baja | **Alto** | Nunca ambos sistemas contra misma BD en producción |
| D2 | **Inconsistencia créditos**: Lógica compleja (grant, debit, refund) en múltiples archivos | Media | **Crítico** | Centralizar en `api/src/services/credits.ts`. Tests unitarios antes de migrar |
| D3 | **Sesiones activas**: Cambio de SDK podría invalidar sesiones | Baja | **Medio** | Clerk maneja sesiones independiente del framework |

### 4.3 Riesgos Operativos

| # | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| O1 | **Recursos Pi 4**: 4-8GB RAM para Node.js + Prisma Client | Alta | **Alto** | Ver sección 7. BD en Neon (nube), solo corre API |
| O2 | **Cloudflare Tunnel latencia** | Media | **Medio** | Cache agresivo TanStack Query (`staleTime`, `gcTime`) |
| O3 | **Downtime durante cutover** | Media | **Alto** | Subdominio nuevo → cambiar DNS cuando esté listo |
| O4 | **Docker ARM64**: Algunas imágenes sin soporte | Media | **Medio** | `node:20-slim` tiene ARM64. Probar en Pi antes de producción |

---

## 5. Plan de Migración por Fases

### Fase 0 — Preparación (3-4 días)

**Prerequisitos:** Acceso a Pi, Dokploy configurado, Cloudflare Tunnel activo  
**Objetivo:** Monorepo base e infraestructura

**Tareas:**
1. Crear estructura de monorepo:
   ```
   studio-flow-academy/
   ├── academy-app/     # Actual Next.js — se mantiene hasta el final
   ├── api/              # Hono API
   │   ├── src/
   │   │   ├── index.ts
   │   │   ├── middleware/
   │   │   ├── routes/
   │   │   ├── lib/
   │   │   └── services/
   │   ├── prisma/
   │   ├── package.json
   │   └── tsconfig.json
   ├── web/              # React + Vite
   │   ├── src/
   │   │   ├── main.tsx, App.tsx
   │   │   ├── pages/, components/, hooks/, lib/, utils/, styles/
   │   ├── index.html
   │   ├── package.json
   │   └── vite.config.ts
   └── shared/           # Tipos, validaciones, config
       ├── interfaces/, validations/, config/, lib/
   ```
2. Inicializar `api/package.json` con deps Hono
3. Inicializar `web/package.json` con deps Vite/React
4. Copiar `prisma/schema.prisma` → `api/prisma/` (agregar `binaryTargets` ARM64)
5. Copiar archivos compartidos a `shared/`
6. Configurar `tsconfig.json` con path aliases
7. Crear `.env.example` para API y frontend

**Criterios de éxito:**
- `pnpm install` exitoso en ambos proyectos
- `npx prisma generate` exitoso en `api/`
- TypeScript compila sin errores

**Rollback:** Eliminar carpetas `api/`, `web/`, `shared/`. El proyecto actual no se toca.

---

### Fase 1 — API Core: Auth + Infraestructura (4-5 días)

**Prerequisitos:** Fase 0 completada  
**Objetivo:** API Hono con auth Clerk y conexión a BD

**Tareas:**
1. Entry point `api/src/index.ts` con Hono + cors + logger
2. Middleware Auth: extraer `Authorization: Bearer`, verificar con `@clerk/backend` `verifyToken()`, inyectar `userId` en context
3. Middleware CORS: permitir origen del frontend
4. Copiar/adaptar `lib/db.ts` (sin cambios relevantes)
5. Reescribir `lib/auth.ts`: `getCurrentUser(c)` → userId del context + query BD; `requireRole(c, roles)` → verificar rol
6. Endpoint health check: `GET /api/v1/health`
7. Endpoint auth profile: `POST /api/v1/auth/profile`
8. Probar con Postman/curl

**Criterios de éxito:**
- Health check 200
- Profile creation con token válido crea perfil en BD
- Sin token → 401, sin rol → 403

**Rollback:** API nueva es independiente. Detener proceso Hono.

---

### Fase 2 — API: Endpoints de Negocio (7-10 días)

**Prerequisitos:** Fase 1 completada  
**Objetivo:** Todos los Route Handlers y Server Actions como endpoints Hono

**Tareas por módulo:**

1. **Students** (2 días):
   - `GET /api/v1/students` — **nuevo** (datos para página)
   - `POST /api/v1/students` — migrar
   - `PUT /api/v1/students/:id` — migrar
   - `DELETE /api/v1/students/:id` — migrar

2. **Classes** (2 días):
   - `GET /api/v1/classes` — **nuevo** (filtro por semana)
   - `POST /api/v1/classes` — migrar
   - `PUT/DELETE /api/v1/classes/:id` — migrar
   - `POST /api/v1/classes/:id/reserve` — migrar
   - `POST /api/v1/classes/:id/waitlist` — migrar

3. **Payments** (2 días):
   - `GET /api/v1/payments/orders` — **nuevo**
   - `POST /api/v1/payments/orders` — migrar
   - `POST /api/v1/payments/orders/:id/approve` — migrar
   - `POST /api/v1/payments/orders/:id/reject` — migrar
   - `POST /api/v1/payments/upload` — migrar (multipart Hono)
   - `POST /api/v1/payments/upload-url` — migrar

4. **Attendance** (1 día):
   - `POST /api/v1/attendance/scan` — migrar
   - `POST /api/v1/attendances/:id/cancel` — migrar
   - `GET /api/v1/student/qr` — migrar

5. **Plans** (1 día):
   - `GET /api/v1/plans` — **nuevo**
   - `POST/PUT/DELETE /api/v1/plans` — **nuevo** (de `actions/plans.ts`)
   - `PATCH /api/v1/plans/:id/toggle` — **nuevo**

6. **Teachers** (1 día):
   - `GET /api/v1/teachers` — migrar
   - `POST /api/v1/teachers` — **nuevo** (de `actions/teachers.ts`)
   - `PUT/DELETE /api/v1/teachers/:id` — migrar
   - `PATCH /api/v1/users/:id/role` — **nuevo**

7. **Dashboard** (1 día):
   - `GET /api/v1/dashboard/admin` — **nuevo** (extraer queries de page.tsx admin)
   - `GET /api/v1/dashboard/student` — **nuevo** (extraer `getStudentDashboardData`)

8. **Reports + Content** (1 día):
   - `GET /api/v1/reports` — **nuevo** (consolidar 12 queries)
   - `GET /api/v1/content` — **nuevo**

**Criterios de éxito:**
- Todos los endpoints responden con Postman
- Transacciones Prisma funcionan correctamente
- Upload a R2 funciona
- Scanner QR funciona con endpoint nuevo

**Rollback:** API independiente del sistema actual.

---

### Fase 3 — Frontend: Scaffolding + Auth (4-5 días)

**Prerequisitos:** Fase 1 completada (API auth lista)  
**Objetivo:** Frontend Vite funcional con auth y routing

**Tareas:**
1. Configurar `vite.config.ts` con React + Tailwind + alias
2. Entry point `main.tsx`: ClerkProvider + QueryClientProvider + BrowserRouter
3. Configurar React Router v7:
   ```
   / → DashboardLayout (protegida)
     / → Dashboard
     /students, /teachers, /classes, /payments, /plans
     /reports, /settings, /video-library
   /teacher/scanner → Scanner
   /sign-in, /sign-up, /forgot-password → AuthLayout
   /no-access → NoAccess
   ```
4. Crear helper `web/src/lib/api.ts` — fetch con token Clerk:
   ```typescript
   export function useApiClient() {
     const { getToken } = useAuth();
     return async (url: string, opts?: RequestInit) => {
       const token = await getToken();
       const res = await fetch(`${API_URL}${url}`, {
         ...opts,
         headers: { Authorization: `Bearer ${token}`, ...opts?.headers },
       });
       if (!res.ok) throw new Error((await res.json()).error);
       return res.json();
     };
   }
   ```
5. Migrar layouts: `AuthLayout`, `DashboardLayout`
6. Migrar componentes layout: `Sidebar` (`NavLink`, `useLocation`), `Topbar`, `DashboardShell`
7. Migrar páginas auth: `SignIn`, `SignUp`, `ForgotPassword` — cambiar `@clerk/nextjs` → `@clerk/clerk-react`
8. Copiar componentes UI (10 archivos, sin cambios)
9. Copiar `globals.css`, configurar `StudioCssVars`

**Criterios de éxito:**
- Login/registro E2E funciona
- Navegación entre páginas funciona
- Dashboard layout se renderiza
- Sidebar muestra items según rol

**Rollback:** Frontend es app independiente.

---

### Fase 4 — Frontend: Páginas de Negocio (7-10 días)

**Prerequisitos:** Fases 2 y 3 completadas  
**Objetivo:** Todas las páginas funcionales con datos reales

**Tareas:**

1. **Dashboard** (2 días): hooks `useAdminDashboard()`, `useStudentDashboard()`, migrar `StudentDashboard.tsx`, reescribir admin, Server Actions → `useMutation`
2. **Students** (2 días): hook `useStudents()`, migrar `StudentsClient`, modales, drawer. `router.refresh()` → `invalidateQueries`
3. **Classes** (1.5 días): hook `useClasses(weekStart)`, migrar `ClassesClient`, modales. Reserva y waitlist → `useMutation`
4. **Payments** (1.5 días): hook `usePayments()`, migrar `PaymentsClient`, `PaymentCard`, upload modal
5. **Plans** (1 día): hook `usePlans()`, migrar `PlansClient`, `PlanCard`, `PlanModal`
6. **Teachers** (1 día): hook `useTeachers()`, migrar `TeachersClient`, modales
7. **Scanner** (0.5 días): fetch URL relativa → absoluta con token
8. **Reports** (0.5 días): hook `useReports()`, migrar `ReportsClient`
9. **Video Library** (0.5 días): hook `useContent()`, migrar `VideoLibraryClient`
10. **Settings, NoAccess** (0.5 días): adaptar componentes menores

**Criterios de éxito:**
- Todas las páginas muestran datos reales
- CRUD funciona en todos los módulos
- Scanner QR registra asistencia
- Upload de comprobantes funciona

**Rollback:** Next.js sigue corriendo en paralelo. Redirigir si hay problemas.

---

### Fase 5 — Despliegue y Cutover (3-4 días)

**Prerequisitos:** Fases 0-4 completadas y probadas  
**Objetivo:** Producción en Raspberry Pi

**Tareas:**
1. Dockerfile para API (Node.js 20-slim, prisma generate, build)
2. Build frontend: `pnpm build` → `dist/` estática
3. **Desplegar frontend** → **Cloudflare Pages** (recomendado: descarga trabajo de la Pi, CDN global gratis)
4. Configurar Cloudflare Tunnel → subdominio API al puerto Hono en Pi
5. Variables de entorno en Dokploy
6. Configurar PM2 para auto-restart
7. Pruebas E2E en producción (login, CRUD, scanner, upload, reportes)
8. Cutover DNS: dominio principal → nuevo frontend
9. Monitorear 48h

**Criterios de éxito:**
- API responde vía Cloudflare Tunnel
- Frontend carga rápido desde Cloudflare Pages
- Todos los flujos funcionan en producción
- Sin errores 500 durante 48h

**Rollback:** Cambiar DNS al servidor Next.js anterior. Mantenerlo activo 1 semana post-cutover.

---

## 6. Checklist de Verificación Post-Migración

### 6.1 Autenticación y Autorización

- [ ] Login con email/password funciona
- [ ] Registro nuevo estudiante (Clerk + perfil BD)
- [ ] Verificación de email
- [ ] Reset de password
- [ ] MFA/2FA (si habilitado)
- [ ] Logout cierra sesión
- [ ] Token JWT se envía a la API correctamente
- [ ] API rechaza sin token (401)
- [ ] API rechaza rol insuficiente (403)
- [ ] Roles reflejados en sidebar/navegación
- [ ] `/no-access` para usuarios sin perfil
- [ ] Redirección post-login según rol

### 6.2 API

- [ ] Health check 200
- [ ] CORS permite requests del frontend
- [ ] Rutas protegidas requieren auth
- [ ] Transacciones Prisma consistentes
- [ ] Errores retornan `{ error: string }` consistente
- [ ] Upload a R2 funciona (directo y URL firmada)
- [ ] Token QR genera y verifica correctamente
- [ ] Créditos: grant, debit, refund — todos correctos
- [ ] Promoción waitlist al cancelar asistencia
- [ ] Walk-in en scanner
- [ ] Crear estudiante → Clerk + BD
- [ ] Eliminar estudiante → cascada Clerk + BD
- [ ] Actualizar profesor → sync Clerk + BD

### 6.3 Frontend Web

- [ ] Páginas cargan sin errores de consola
- [ ] Dashboard admin: KPIs correctos
- [ ] Dashboard student: créditos, plan, próximas clases
- [ ] Tabla estudiantes: búsqueda, filtros, paginación
- [ ] CRUD estudiantes completo
- [ ] CRUD profesores completo
- [ ] Calendario clases: vista semanal, CRUD
- [ ] Reservar clase descuenta crédito
- [ ] Lista de espera funciona
- [ ] Cancelar asistencia devuelve crédito
- [ ] Pagos: ver, aprobar, rechazar
- [ ] Upload comprobante funciona
- [ ] Crear orden de pago
- [ ] CRUD planes
- [ ] Scanner QR escanea y registra
- [ ] Reportes con gráficos
- [ ] Biblioteca videos carga contenido
- [ ] Configuración muestra feature flags
- [ ] Animaciones funcionan (framer-motion, auto-animate)
- [ ] Responsive: mobile y desktop
- [ ] Sidebar mobile abre/cierra
- [ ] Notificaciones se muestran

### 6.4 Mobile (React Native / Expo)

- [ ] App mobile apunta al nuevo API URL
- [ ] Login desde app funciona
- [ ] QR estudiante se genera
- [ ] Funcionalidades existentes operan

### 6.5 Infraestructura

- [ ] API estable en Pi por >24h sin crashes
- [ ] RAM bajo 70% de la Pi
- [ ] Cloudflare Tunnel activo y estable
- [ ] HTTPS funciona
- [ ] Logs accesibles
- [ ] Backups BD (Neon) funcionan
- [ ] Variables de entorno correctas

---

## 7. Recomendaciones para Raspberry Pi 4

### 7.1 Node.js

- Usar **Node.js 20 LTS** (soporte ARM64 nativo estable)
- **NO usar Node.js 22+** en producción — puede tener issues ARM64
- Instalar via `nvm` o imagen Docker `node:20-slim`

### 7.2 Prisma

Agregar en `schema.prisma`:
```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-arm64-openssl-3.0.x"]
}
```

- La BD está en **Neon (nube)** → la Pi solo ejecuta el Prisma Client, no PostgreSQL
- Usar **connection pooling** de Neon para reducir conexiones abiertas
- Configurar `connection_limit` en la URL: `?connection_limit=5`

### 7.3 PM2 — Gestión de Procesos

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'studioflow-api',
    script: 'dist/index.js',
    instances: 1,              // Solo 1 instancia en Pi
    exec_mode: 'fork',         // NO usar cluster
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
    },
    watch: false,
    max_restarts: 10,
    restart_delay: 5000,
  }]
};
```

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # Auto-arranque al bootear la Pi
```

### 7.4 Optimización de Memoria

- **Limitar heap Node.js:** `NODE_OPTIONS="--max-old-space-size=512"` (dejar RAM para OS y Docker)
- **Prisma query batching:** Mantener `Promise.all()` para queries paralelas (ya presente en código actual)
- **NO usar `prisma.$connect()` explícito** — Prisma maneja conexión lazy
- **Siempre paginar:** Evitar `findMany` sin `take`
- **Cache en memoria para reportes:** Los datos de `/api/v1/reports` no cambian frecuentemente. Cachear 5-10 min con `node-cache` o un `Map` simple:
  ```typescript
  const reportCache = new Map<string, { data: unknown; expiry: number }>();
  
  function getCachedReport(key: string, ttlMs = 300000) {
    const cached = reportCache.get(key);
    if (cached && cached.expiry > Date.now()) return cached.data;
    return null;
  }
  ```

### 7.5 Optimizaciones de Red y Seguridad

- **Comprimir respuestas:**
  ```typescript
  import { compress } from 'hono/compress';
  app.use('*', compress());
  ```
- **Rate limiting** para proteger la Pi:
  ```typescript
  import { rateLimiter } from 'hono-rate-limiter';
  app.use('*', rateLimiter({ windowMs: 60000, limit: 100 }));
  ```
- **Logging eficiente:** Usar `pino` en vez de `console.log` para reducir I/O
- **Healthcheck para Dokploy:** `GET /api/v1/health` para que Dokploy reinicie si no responde

### 7.6 Monitoreo

- `pm2 monit` → CPU/RAM en tiempo real
- `pm2 logs studioflow-api` → ver logs
- Configurar alerta si memoria > 80%
- Considerar `pm2-logrotate` para evitar que logs llenen disco

### 7.7 Docker en ARM64

```dockerfile
FROM node:20-slim
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod
COPY prisma ./prisma
RUN npx prisma generate
COPY dist ./dist
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

- Usar **multi-stage build** para reducir tamaño de imagen
- Imagen `node:20-slim` tiene soporte ARM64 nativo
- Instalar `openssl` para Prisma

---

## 8. Estimación de Esfuerzo

### 8.1 Resumen por Fase

| Fase | Duración | Complejidad | Archivos |
|---|---|---|---|
| Fase 0: Preparación | 3-4 días | Baja | ~15 configs/compartidos |
| Fase 1: API Auth | 4-5 días | **Alta** | ~8 nuevos |
| Fase 2: API Endpoints | 7-10 días | **Muy Alta** | ~25 (16 handlers + GET nuevos) |
| Fase 3: Frontend Scaffolding | 4-5 días | **Alta** | ~20 (layouts, auth, routing, ui) |
| Fase 4: Frontend Páginas | 7-10 días | **Alta** | ~40 (páginas + componentes) |
| Fase 5: Despliegue | 3-4 días | Media | Dockerfile, configs, DNS |
| **Total** | **28-38 días** | | **~108+ archivos** |

### 8.2 Los 10 Archivos Más Complejos de Migrar

1. **`app/(dashboard)/page.tsx`** (532 líneas) — Server Component + queries directas + Server Actions inline → crear 2 endpoints + reescribir como SPA
2. **`app/api/v1/attendance/scan/route.ts`** (157 líneas) — Transacción compleja: QR → membership → credits → attendance → walk-in
3. **`app/api/v1/students/[id]/route.ts`** (175 líneas) — Eliminación cascada + rollback Clerk
4. **`app/api/v1/students/route.ts`** (115 líneas) — Creación dual Clerk + BD con rollback
5. **`components/dashboard/students/StudentsClient.tsx`** (631 líneas) — UI compleja con filtros, paginación, modales, tabla + cards
6. **`app/(auth)/sign-in/page.tsx`** (334 líneas) — Flujo auth con MFA y múltiples estados
7. **`app/(dashboard)/reports/page.tsx`** (174 líneas) — 12 queries paralelas → consolidar en 1 endpoint
8. **`actions/auth.ts`** (107 líneas) — Login server-side → eliminar/reemplazar completamente
9. **`lib/auth.ts`** (78 líneas) — Columna vertebral de auth → reescribir para Hono
10. **`lib/utils/waitlist.ts`** (79 líneas) — Transacción multi-paso crítica

### 8.3 Archivos que se Copian Sin Cambios (~30 archivos)

- `components/ui/*` (10 archivos: Badge, Button, Card, Checkbox, Input, Pagination, ResponsiveModal, Select, Table, Textarea)
- `lib/cn.ts`, `lib/animations.ts`, `lib/utils/date.ts`, `lib/qr.ts`, `lib/db.ts`
- `lib/validations/*.ts` (5 archivos: auth, classes, payments, plans, students)
- `interfaces/*.ts` (3 archivos: plans, students, teachers)
- `hooks/useIsMobile.ts`, `hooks/usePagination.ts`
- `config/studio.config.ts`
- `utils/general.ts`, `utils/clerk-localization.ts`
- `components/auth/VerificationCodeForm.tsx`
- `components/dashboard/reports/StatCard.tsx`

### 8.4 Estimación Total

| Métrica | Valor |
|---|---|
| **Tiempo total** | **28-38 días laborales** (6-8 semanas) |
| **Complejidad global** | **Alta** |
| **Archivos totales** | ~108 |
| **Copiar sin cambios** | ~30 (28%) |
| **Cambios menores** (imports, routing) | ~35 (32%) |
| **Reescritura significativa** | ~25 (23%) |
| **Completamente nuevos** | ~18 (17%) |
| **Riesgo mayor** | Auth cross-origin Clerk (T1) y créditos/transacciones (D2) |
| **Mayor ahorro** | UI components (10) y validaciones (5) se copian directamente |

### 8.5 Orden de Trabajo Recomendado

| Semana | Fases | Foco |
|---|---|---|
| **1-2** | Fase 0 + 1 | Monorepo + API auth → validar arquitectura E2E |
| **2-4** | Fase 2 | Endpoints API → migrar toda lógica de negocio |
| **3-5** | Fase 3 + 4 | Frontend → puede empezar en paralelo con Fase 2 una vez auth lista |
| **6** | Fase 5 | Despliegue + pruebas producción |
| **7** | Buffer | Bugs, ajustes, monitoreo |

> **Nota:** Las Fases 2 y 3 pueden desarrollarse en paralelo si hay 2 personas. Una persona migra endpoints API mientras la otra scaffoldea el frontend.

---

## Notas Finales

- **No modificar código actual** hasta que la nueva arquitectura esté probada
- **Mantener Next.js corriendo** durante toda la migración como fallback
- **Priorizar auth (Fase 1)** — si Clerk cross-origin no funciona, todo se bloquea
- **Escribir tests** para lógica de créditos antes de migrar (D2 es el riesgo de datos más alto)
- **La BD no se migra** — Neon PostgreSQL se mantiene igual, solo cambia quién la consume
- **React Native / Expo** solo requiere cambiar la URL base del API

---

*Documento generado a partir del análisis exhaustivo de todos los archivos del proyecto.*
