import { type Context, Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { z } from 'zod';

import { getCurrentUser } from '../lib/auth.js';
import {
	REFRESH_COOKIE,
	clearRefreshCookie,
	setRefreshCookie,
} from '../lib/cookies.js';
import { db } from '../lib/db.js';
import { signAccessToken } from '../lib/jwt.js';
import {
	sendPasswordResetEmail,
	sendVerificationEmail,
} from '../lib/mailer.js';
import {
	issueRefreshToken,
	revokeAllForUser,
	revokeRefreshToken,
	rotateRefreshToken,
} from '../lib/refreshTokens.js';
import { hashPassword, verifyPassword } from '../lib/utils/hash.js';
import { generateOtpCode } from '../lib/utils/token.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import type { AuthVariables } from '../types/auth.js';

const authRoutes = new Hono<{ Variables: AuthVariables }>();

// Inicia sesión: firma el access token corto y emite el refresh token.
// Para clientes mobile (X-Client: mobile), devuelve el refresh en el body en vez de cookie.
async function startSession(
	c: Context,
	user: { id: string; email: string; role: string },
	isMobile = false,
): Promise<{ token: string; refreshToken?: string }> {
	const token = await signAccessToken({
		sub: user.id,
		email: user.email,
		role: user.role,
	});
	const refresh = await issueRefreshToken(user.id);
	if (isMobile) {
		return { token, refreshToken: refresh };
	}
	setRefreshCookie(c, refresh);
	return { token };
}

const registerSchema = z.object({
	email: z.email('Email inválido'),
	password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
	name: z.string().min(1, 'El nombre es requerido'),
});

const loginSchema = z.object({
	email: z.email('Email inválido'),
	password: z.string().min(1, 'La contraseña es requerida'),
});

const verifyEmailSchema = z.object({
	email: z.email(),
	code: z.string().length(6, 'El código debe tener 6 dígitos'),
});

const forgotPasswordSchema = z.object({
	email: z.email('Email inválido'),
});

const resetPasswordSchema = z.object({
	email: z.email(),
	code: z.string().length(6),
	password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

// GET /auth/status
authRoutes.get('/status', optionalAuthMiddleware, (c) => {
	const auth = c.get('auth');
	return c.json({ authenticated: Boolean(auth.userId), userId: auth.userId });
});

// GET /auth/me
authRoutes.get('/me', authMiddleware, async (c) => {
	const user = await getCurrentUser(c);
	if (!user) return c.json({ error: 'UNAUTHENTICATED' }, 401);

	return c.json({
		id: user.id,
		email: user.email,
		name: user.name,
		role: user.role,
		isActive: user.isActive,
		emailVerified: user.emailVerified,
	});
});

// POST /auth/register
authRoutes.post('/register', async (c) => {
	const body = await c.req.json().catch(() => null);
	const parsed = registerSchema.safeParse(body);
	if (!parsed.success) {
		return c.json(
			{ error: 'BAD_REQUEST', details: parsed.error.flatten() },
			400,
		);
	}

	const { email, password, name } = parsed.data;

	const existing = await db.userProfile.findUnique({ where: { email } });
	if (existing) {
		return c.json({ error: 'El correo ya está registrado.' }, 409);
	}

	const passwordHash = await hashPassword(password);
	const user = await db.userProfile.create({
		data: { email, name, passwordHash, role: 'STUDENT' },
	});

	const code = generateOtpCode();
	const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

	await db.emailToken.create({
		data: {
			userId: user.id,
			token: code,
			type: 'EMAIL_VERIFICATION',
			expiresAt,
		},
	});

	await sendVerificationEmail(email, code).catch(() => null);

	return c.json({ success: true, userId: user.id }, 201);
});

// POST /auth/verify-email
authRoutes.post('/verify-email', async (c) => {
	const body = await c.req.json().catch(() => null);
	const parsed = verifyEmailSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: 'BAD_REQUEST' }, 400);
	}

	const { email, code } = parsed.data;

	const user = await db.userProfile.findUnique({ where: { email } });
	if (!user) return c.json({ error: 'Código inválido o expirado.' }, 400);

	const tokenRecord = await db.emailToken.findFirst({
		where: {
			userId: user.id,
			token: code,
			type: 'EMAIL_VERIFICATION',
			usedAt: null,
			expiresAt: { gt: new Date() },
		},
	});

	if (!tokenRecord)
		return c.json({ error: 'Código inválido o expirado.' }, 400);

	await db.$transaction([
		db.emailToken.update({
			where: { id: tokenRecord.id },
			data: { usedAt: new Date() },
		}),
		db.userProfile.update({
			where: { id: user.id },
			data: { emailVerified: true },
		}),
	]);

	const isMobile = c.req.header('X-Client') === 'mobile';
	const session = await startSession(c, user, isMobile);
	return c.json(session);
});

// POST /auth/resend-verification
authRoutes.post('/resend-verification', async (c) => {
	const body = await c.req.json().catch(() => null);
	const email = body?.email as string | undefined;
	if (!email) return c.json({ error: 'BAD_REQUEST' }, 400);

	const user = await db.userProfile.findUnique({ where: { email } });
	if (!user || user.emailVerified) {
		return c.json({ success: true });
	}

	await db.emailToken.deleteMany({
		where: { userId: user.id, type: 'EMAIL_VERIFICATION', usedAt: null },
	});

	const code = generateOtpCode();
	const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

	await db.emailToken.create({
		data: {
			userId: user.id,
			token: code,
			type: 'EMAIL_VERIFICATION',
			expiresAt,
		},
	});

	await sendVerificationEmail(email, code).catch(() => null);

	return c.json({ success: true });
});

// POST /auth/login
authRoutes.post('/login', async (c) => {
	const body = await c.req.json().catch(() => null);
	const parsed = loginSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: 'Credenciales inválidas.' }, 400);
	}

	const { email, password } = parsed.data;

	const user = await db.userProfile.findUnique({ where: { email } });

	// Constant-time: always verify even if user not found or account inactive
	const dummyHash =
		'$argon2id$v=19$m=65536,t=3,p=4$dummydummydummy$dummydummydummydummydummydummy';
	const valid = user
		? await verifyPassword(user.passwordHash, password)
		: await verifyPassword(dummyHash, password)
				.then(() => false)
				.catch(() => false);

	// Merge inactive check here: inactive accounts get same 401 as wrong password
	if (!user || !valid || !user.isActive) {
		return c.json({ error: 'Credenciales inválidas.' }, 401);
	}

	if (!user.emailVerified) {
		return c.json({ error: 'EMAIL_NOT_VERIFIED', userId: user.id }, 403);
	}

	const isMobile = c.req.header('X-Client') === 'mobile';
	const session = await startSession(c, user, isMobile);
	return c.json(session);
});

// POST /auth/forgot-password
authRoutes.post('/forgot-password', async (c) => {
	const body = await c.req.json().catch(() => null);
	const parsed = forgotPasswordSchema.safeParse(body);
	if (!parsed.success) return c.json({ success: true }); // Always 200

	const { email } = parsed.data;
	const user = await db.userProfile.findUnique({ where: { email } });

	if (user) {
		await db.emailToken.deleteMany({
			where: { userId: user.id, type: 'PASSWORD_RESET', usedAt: null },
		});

		const code = generateOtpCode();
		const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

		await db.emailToken.create({
			data: { userId: user.id, token: code, type: 'PASSWORD_RESET', expiresAt },
		});

		await sendPasswordResetEmail(email, code).catch(() => null);
	}

	return c.json({ success: true });
});

// POST /auth/reset-password
authRoutes.post('/reset-password', async (c) => {
	const body = await c.req.json().catch(() => null);
	const parsed = resetPasswordSchema.safeParse(body);
	if (!parsed.success) {
		return c.json(
			{ error: 'BAD_REQUEST', details: parsed.error.flatten() },
			400,
		);
	}

	const { email, code, password } = parsed.data;

	const user = await db.userProfile.findUnique({ where: { email } });
	if (!user) return c.json({ error: 'Código inválido o expirado.' }, 400);

	const tokenRecord = await db.emailToken.findFirst({
		where: {
			userId: user.id,
			token: code,
			type: 'PASSWORD_RESET',
			usedAt: null,
			expiresAt: { gt: new Date() },
		},
	});

	if (!tokenRecord)
		return c.json({ error: 'Código inválido o expirado.' }, 400);

	const passwordHash = await hashPassword(password);

	await db.$transaction([
		db.emailToken.update({
			where: { id: tokenRecord.id },
			data: { usedAt: new Date() },
		}),
		db.userProfile.update({ where: { id: user.id }, data: { passwordHash } }),
	]);

	// Resetear contraseña cierra todas las sesiones previas.
	await revokeAllForUser(user.id);

	const isMobile = c.req.header('X-Client') === 'mobile';
	const session = await startSession(c, user, isMobile);
	return c.json(session);
});

// POST /auth/refresh — rota el refresh token y entrega un access token nuevo.
// Mobile: lee el refresh de la cabecera X-Refresh-Token y lo devuelve en el body.
// Web: lee/escribe el refresh via cookie httpOnly.
authRoutes.post('/refresh', async (c) => {
	const isMobile = c.req.header('X-Client') === 'mobile';
	const current = isMobile
		? (c.req.header('X-Refresh-Token') ?? undefined)
		: getCookie(c, REFRESH_COOKIE);

	if (!current) return c.json({ error: 'NO_REFRESH' }, 401);

	const rotated = await rotateRefreshToken(current);
	if (!rotated) {
		if (!isMobile) clearRefreshCookie(c);
		return c.json({ error: 'INVALID_REFRESH' }, 401);
	}

	const user = await db.userProfile.findUnique({
		where: { id: rotated.userId },
	});
	if (!user || !user.isActive) {
		await revokeAllForUser(rotated.userId);
		if (!isMobile) clearRefreshCookie(c);
		return c.json({ error: 'INVALID_REFRESH' }, 401);
	}

	const token = await signAccessToken({
		sub: user.id,
		email: user.email,
		role: user.role,
	});

	if (isMobile) {
		return c.json({ token, refreshToken: rotated.token });
	}

	setRefreshCookie(c, rotated.token);
	return c.json({ token });
});

// POST /auth/logout — revoca el refresh token y limpia la cookie (web) o responde vacío (mobile).
authRoutes.post('/logout', async (c) => {
	const isMobile = c.req.header('X-Client') === 'mobile';
	const current = isMobile
		? ((await c.req.json().catch(() => null))?.refreshToken as string | undefined)
		: getCookie(c, REFRESH_COOKIE);

	if (current) await revokeRefreshToken(current);
	if (!isMobile) clearRefreshCookie(c);
	return c.json({ success: true });
});

export default authRoutes;
