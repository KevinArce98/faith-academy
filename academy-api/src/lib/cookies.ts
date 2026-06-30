import type { Context } from 'hono';
import { deleteCookie, setCookie } from 'hono/cookie';

export const REFRESH_COOKIE = 'refresh_token';

const COOKIE_PATH = '/api/v1/auth';
const MAX_AGE = 30 * 24 * 60 * 60;

type SameSite = 'Strict' | 'Lax' | 'None';
const sameSite = ((process.env.COOKIE_SAMESITE as SameSite) || 'Lax') as SameSite;
const domain = process.env.COOKIE_DOMAIN || undefined;
const secure = process.env.NODE_ENV === 'production' || sameSite === 'None';

export function setRefreshCookie(c: Context, token: string): void {
	setCookie(c, REFRESH_COOKIE, token, {
		httpOnly: true,
		secure,
		sameSite,
		path: COOKIE_PATH,
		domain,
		maxAge: MAX_AGE,
	});
}

export function clearRefreshCookie(c: Context): void {
	deleteCookie(c, REFRESH_COOKIE, { path: COOKIE_PATH, domain });
}
