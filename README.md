# FAITH — Dance & Art Academy

App de gestión para **faith Dance & Art Academy** (Costa Rica) — clases, mensualidades, pagos y nómina de profesores.

Este repo es un **clon white-label** del template [`studio-flow-academy`](../studio-flow-academy). Cada cliente del template vive en su propio repo, con su propia base de datos y su propio deploy; no hay multi-tenant.

## Estructura

```
academy-api/          API (Hono + Prisma + Postgres/Neon), JWT propio, push notifications
academy-app-web/      Panel web (React + Vite), para ADMIN/TEACHER/STUDENT
academy-app-mobile/   App móvil (Expo + React Native + expo-router)
```

## Marca de este cliente (dónde vive)

| Qué | Archivo | Notas |
|---|---|---|
| Colores, nombre, tagline | `academy-app-mobile/src/theme/tokens.js` | Único archivo a editar para rebrandear mobile. Alimenta Tailwind + `app.config.js` |
| Colores, nombre, SEO, features | `academy-app-web/src/lib/config/studio.config.ts` | Único archivo a editar para rebrandear web |
| Identidad nativa (bundle/scheme) | `tokens.js` → `app.bundleId`, `app.scheme`, `app.slug` | `com.faithcr.academy` / `faithacademy` / `faith-academy` |
| Logo (símbolo) | `academy-app-web/public/logo.svg`, `favicon.svg` | Vectorial, blanco (login) y teal (favicon) |
| Logo en mobile | `academy-app-mobile/assets/{icon,adaptive-icon,splash,favicon,logo}.png` | Raster 1024², símbolo outline |
| Fuente de marca (Lato) | `academy-app-mobile/src/lib/fonts.ts` + `assets/fonts/*.ttf` | Activada vía `tokens.js` → `fonts.enabled: true` |
| Secretos, DB, R2, Resend | `.env` en cada subproyecto (gitignored, **no** está en este repo) | Ver `.env.example` en cada carpeta |

Importante: **nunca** pongas un `require()` de imagen/fuente en `tokens.js` — ese archivo lo carga Node vía `app.config.js` y no puede requerir binarios (rompe `expo run:ios`/`expo start`). Los `require()` de assets van en `theme/index.ts` (logo) o `lib/fonts.ts` (fuentes), que solo carga Metro.

## Setup local

```bash
# 1. Instalar dependencias en cada subproyecto
cd academy-api && pnpm install && cd ..
cd academy-app-web && pnpm install && cd ..
cd academy-app-mobile && pnpm install && cd ..

# 2. Base de datos (Neon propio de FAITH — nunca el del template ni otro cliente)
cd academy-api
cp .env.example .env   # completar DATABASE_URL, JWT_SECRET, R2, Resend, etc.
pnpm prisma generate
pnpm prisma migrate deploy

# 3. Primer usuario ADMIN
ADMIN_EMAIL=admin@faith-cr.com ADMIN_PASSWORD='CambiarLuego123!' \
ADMIN_NAME='Admin FAITH' pnpm tsx prisma/seed-admin.ts

# 4. Correr todo
pnpm dev                          # academy-api  (puerto 5001)
cd ../academy-app-web && pnpm dev # web
cd ../academy-app-mobile && npx expo start -c   # mobile (-c limpia caché, necesario tras cambios de fuentes)
```

`.env` de cada subproyecto es gitignored — no está en este repo. Copiá `.env.example` y completá los valores (ver comentarios en cada archivo).

## Traer actualizaciones del template

Este repo tiene el template configurado como remoto `template` (apunta a la copia local en `/Users/kevinarias/Projects/studio-flow-academy`):

```bash
git remote -v
# template  /Users/kevinarias/Projects/studio-flow-academy (fetch/push)
# origin    https://github.com/KevinArce98/faith-academy.git (fetch/push)
```

Si esa ruta local no existe en la máquina donde estés trabajando, agregala apuntando al repo remoto del template (o cloná el template ahí y ajustá la URL del remoto).

### Flujo normal

```bash
git fetch template
git merge template/main
```

Los conflictos esperables cuando el template avanza:

- **`tokens.js`** y **`studio.config.ts`**: casi siempre conflicto porque tienen la marca de FAITH. Al resolver, **conservá el lado de FAITH** en los campos de marca (colores, nombre, `bundleId`, `fonts`) y tomá del template cualquier campo/estructura **nueva** que se haya agregado (ej. una nueva key en `fonts` o `features`).
- **`app.config.js`**, **`tailwind.config.js`**, **`app/_layout.tsx`**, **`src/lib/fonts.ts`**: si el template los tocó, normalmente conviene tomar la versión del template completa y volver a aplicarle los datos de FAITH (son archivos de mecanismo, no de marca — deberían quedar iguales al template salvo por los `require()` de fuentes).
- Los `.env*` reales no generan conflicto (gitignored); solo pueden aparecer conflictos en `.env.example` si el template agregó una variable nueva — sumala también al `.env` real.

Después de mergear:

```bash
# Reinstalar por si cambiaron dependencias
cd academy-api && pnpm install && cd ..
cd academy-app-web && pnpm install && cd ..
cd academy-app-mobile && pnpm install && cd ..

# Typecheck + tests antes de pushear
cd academy-api && pnpm test && cd ..
cd academy-app-mobile && pnpm test && cd ..

# Si el template agregó migraciones de Prisma
cd academy-api && pnpm prisma migrate deploy && cd ..

git push origin main
```

### Si el merge se complica

Alternativa más controlada — traer un commit puntual del template con `cherry-pick`:

```bash
git fetch template
git log template/main --oneline   # ubicar el/los commits que querés traer
git cherry-pick <hash>
```

## Scripts útiles

| Comando | Dónde | Qué hace |
|---|---|---|
| `pnpm dev` | `academy-api` | Server con watch (tsx) |
| `pnpm test` | `academy-api`, `academy-app-mobile` | Vitest |
| `pnpm dev` | `academy-app-web` | Vite dev server |
| `pnpm build` | `academy-app-web`, `academy-api` | Build de producción |
| `npx expo start -c` | `academy-app-mobile` | Dev server (caché limpio) |
| `pnpm prisma migrate deploy` | `academy-api` | Aplica migraciones pendientes |
| `pnpm tsx prisma/seed-admin.ts` | `academy-api` | Crea/reactiva el primer ADMIN |

## Deploy (producción)

En el `.env` de `academy-api` para producción:

```
NODE_ENV=production
WEB_APP_URL=https://www.faith-cr.com
COOKIE_SAMESITE=None
COOKIE_DOMAIN=.faith-cr.com
TRUST_PROXY=true
```

Mobile: `eas build` (el `easProjectId` ya está en `tokens.js` tras `eas init`). Cada cliente tiene su propio proyecto EAS y su propia ficha en las tiendas — nunca reusar el del template ni el de otro cliente.
