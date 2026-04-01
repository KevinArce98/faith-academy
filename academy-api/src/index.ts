import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
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
import type { AuthVariables } from './types/auth.js'

const app = new Hono<{ Variables: AuthVariables }>()

const allowedOrigin = process.env.WEB_APP_URL ?? 'http://localhost:5173'

app.use('*', logger())
app.use('/api/*', cors({
  origin: allowedOrigin,
  allowHeaders: ['Authorization', 'Content-Type'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}))

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

// Attendance routes (mixed prefixes: /student/qr, /attendance/scan, /attendances/:id/cancel)
app.route('/api/v1', attendanceRoutes)
app.route('/api/v1/users', usersRoutes)

serve({
  fetch: app.fetch,
  port: Number(process.env.PORT ?? 3000)
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
