import { getConnInfo } from '@hono/node-server/conninfo';
import type { Context } from 'hono';

const trustProxy = process.env.TRUST_PROXY === 'true';

export function clientIp(c: Context): string {
	if (trustProxy) {
		const xff = c.req.header('x-forwarded-for');
		if (xff) return xff.split(',')[0]?.trim() || 'unknown';
		const xri = c.req.header('x-real-ip');
		if (xri) return xri;
	}
	try {
		return getConnInfo(c).remote.address ?? 'unknown';
	} catch {
		return 'unknown';
	}
}
