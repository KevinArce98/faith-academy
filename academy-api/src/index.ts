import 'dotenv/config'
import { validateEnv } from './lib/env.js'
validateEnv()

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { rateLimiter } from 'hono-rate-limiter'
import authRoutes from './routes/auth.js'
import attendanceRoutes from './routes/attendance.js'
import classesRoutes from './routes/classes.js'
import contentRoutes from './routes/content.js'
import dashboardRoutes from './routes/dashboard.js'
import paymentsRoutes from './routes/payments.js'
import plansRoutes from './routes/plans.js'
import notificationsRoutes from './routes/notifications.js'
import reportsRoutes from './routes/reports.js'
import studentsRoutes from './routes/students.js'
import teachersRoutes from './routes/teachers.js'
import usersRoutes from './routes/users.js'
import { errorHandler } from './middleware/errorHandler.js'
import { logger } from './lib/logger.js'
import type { AuthVariables } from './types/auth.js'

const app = new Hono<{ Variables: AuthVariables }>()

const allowedOrigin = process.env.WEB_APP_URL ?? 'http://localhost:5173'

const keyGenerator = (c: Parameters<typeof rateLimiter>[0]['keyGenerator'] extends (c: infer C) => unknown ? C : never) =>
  c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown'

// ── Security headers ───────────────────────────────────────────────────────
app.use('*', secureHeaders({
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'no-referrer',
  strictTransportSecurity: 'max-age=63072000; includeSubDomains',
}))

// ── CORS ───────────────────────────────────────────────────────────────────
app.use('/api/*', cors({
  origin: allowedOrigin,
  allowHeaders: ['Authorization', 'Content-Type'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}))

// ── Rate limiting ──────────────────────────────────────────────────────────
app.use('/api/v1/auth/*', rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-6',
  keyGenerator: (c) => c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown',
}))

app.use('/api/v1/attendance/scan', rateLimiter({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-6',
  keyGenerator: (c) => c.req.header('x-forwarded-for') ?? 'unknown',
}))

app.use('/api/v1/payments/upload-url', rateLimiter({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-6',
  keyGenerator: (c) => c.req.header('x-forwarded-for') ?? 'unknown',
}))

// ── Request logging ────────────────────────────────────────────────────────
app.use('*', async (c, next) => {
  const start = Date.now()
  await next()
  logger.info({
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    durationMs: Date.now() - start,
  })
})

// ── Routes ─────────────────────────────────────────────────────────────────
app.get('/', (c) => c.text('StudioFlow Academy API'))
app.get('/health', (c) => c.json({ ok: true }))
app.get('/api/v1/health', (c) => c.json({ ok: true }))

app.route('/api/v1/auth', authRoutes)
app.route('/api/v1/students', studentsRoutes)
app.route('/api/v1/classes', classesRoutes)
app.route('/api/v1/payments', paymentsRoutes)
app.route('/api/v1/teachers', teachersRoutes)
app.route('/api/v1/plans', plansRoutes)
app.route('/api/v1/dashboard', dashboardRoutes)
app.route('/api/v1/notifications', notificationsRoutes)
app.route('/api/v1/reports', reportsRoutes)
app.route('/api/v1/content', contentRoutes)
app.route('/api/v1', attendanceRoutes)
app.route('/api/v1/users', usersRoutes)

// ── Global error handler ───────────────────────────────────────────────────
app.onError(errorHandler)

// ── Server ─────────────────────────────────────────────────────────────────
serve({
  fetch: app.fetch,
  port: Number(process.env.PORT ?? 3000),
}, (info) => {
  logger.info(`Server is running on http://localhost:${info.port}`)
})
