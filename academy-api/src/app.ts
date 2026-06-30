import 'dotenv/config';
import { Hono } from 'hono';
import { rateLimiter } from 'hono-rate-limiter';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';

import { clientIp } from './lib/clientIp.js';
import { validateEnv } from './lib/env.js';
import { logger } from './lib/logger.js';
import { optionalAuthMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import attendanceRoutes from './routes/attendance.js';
import authRoutes from './routes/auth.js';
import classesRoutes from './routes/classes.js';
import contentRoutes from './routes/content.js';
import dashboardRoutes from './routes/dashboard.js';
import monthlyAttendanceRoutes from './routes/monthlyAttendance.js';
import notificationsRoutes from './routes/notifications.js';
import paymentsRoutes from './routes/payments.js';
import payoutsRoutes from './routes/payouts.js';
import plansRoutes from './routes/plans.js';
import reportsRoutes from './routes/reports.js';
import sessionAttendanceRoutes from './routes/sessionAttendance.js';
import studentsRoutes from './routes/students.js';
import subscriptionsRoutes from './routes/subscriptions.js';
import teachersRoutes from './routes/teachers.js';
import usersRoutes from './routes/users.js';
import type { AuthVariables } from './types/auth.js';

if (process.env.NODE_ENV !== 'test') {
	validateEnv();
}

export const app = new Hono<{ Variables: AuthVariables }>();

const allowedOrigin = process.env.WEB_APP_URL ?? 'http://localhost:5173';

// ── Security headers ───────────────────────────────────────────────────────
app.use(
	'*',
	secureHeaders({
		xFrameOptions: 'DENY',
		xContentTypeOptions: 'nosniff',
		referrerPolicy: 'no-referrer',
		strictTransportSecurity: 'max-age=63072000; includeSubDomains',
	}),
);

// ── CORS ───────────────────────────────────────────────────────────────────
app.use(
	'/api/*',
	cors({
		origin: allowedOrigin,
		credentials: true, // necesario para la cookie httpOnly del refresh token
		allowHeaders: ['Authorization', 'Content-Type'],
		allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
	}),
);

// ── Auth context (needed before rate limiting to key by userId) ────────────
app.use('/api/v1/*', optionalAuthMiddleware);

// ── Rate limiting ──────────────────────────────────────────────────────────
// General: 300 req/min per authenticated user, or per IP when unauthenticated
app.use(
	'/api/v1/*',
	rateLimiter({
		windowMs: 60 * 1000,
		limit: 300,
		standardHeaders: 'draft-6',
		keyGenerator: (c) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const userId = (c as any).get('auth')?.userId as
				| string
				| null
				| undefined;
			return userId ?? clientIp(c);
		},
	}),
);

function ipLimiter(limit: number) {
	return rateLimiter({
		windowMs: 60 * 1000,
		limit,
		standardHeaders: 'draft-6',
		keyGenerator: (c) => clientIp(c),
	});
}

app.use('/api/v1/auth/login', ipLimiter(10));
app.use('/api/v1/auth/refresh', ipLimiter(60));
app.use('/api/v1/auth/register', ipLimiter(5));
app.use('/api/v1/auth/forgot-password', ipLimiter(5));
app.use('/api/v1/attendance/scan', ipLimiter(30));
app.use('/api/v1/payments/upload-url', ipLimiter(10));

// ── Request logging ────────────────────────────────────────────────────────
app.use('*', async (c, next) => {
	const start = Date.now();
	await next();
	logger.info({
		method: c.req.method,
		path: c.req.path,
		status: c.res.status,
		durationMs: Date.now() - start,
	});
});

// ── Routes ─────────────────────────────────────────────────────────────────
app.get('/', (c) => c.text('StudioFlow Academy API'));
app.get('/health', (c) => c.json({ ok: true }));
app.get('/api/v1/health', (c) => c.json({ ok: true }));

app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/students', studentsRoutes);
app.route('/api/v1/classes', classesRoutes);
app.route('/api/v1/payments', paymentsRoutes);
app.route('/api/v1/teachers', teachersRoutes);
app.route('/api/v1/plans', plansRoutes);
app.route('/api/v1/subscriptions', subscriptionsRoutes);
app.route('/api/v1/monthly-attendance', monthlyAttendanceRoutes);
app.route('/api/v1/session-attendance', sessionAttendanceRoutes);
app.route('/api/v1/payouts', payoutsRoutes);
app.route('/api/v1/dashboard', dashboardRoutes);
app.route('/api/v1/notifications', notificationsRoutes);
app.route('/api/v1/reports', reportsRoutes);
app.route('/api/v1/content', contentRoutes);
app.route('/api/v1/attendance', attendanceRoutes);
app.route('/api/v1/users', usersRoutes);

// ── Global error handler ───────────────────────────────────────────────────
app.onError(errorHandler);
