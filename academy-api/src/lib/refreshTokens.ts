import { createHash, randomBytes } from 'crypto';

import { db } from './db.js';

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

function newExpiry(): Date {
	return new Date(Date.now() + REFRESH_TTL_MS);
}

export async function issueRefreshToken(userId: string): Promise<string> {
	const token = randomBytes(32).toString('hex');
	await db.refreshToken.create({
		data: { userId, tokenHash: hashToken(token), expiresAt: newExpiry() },
	});
	return token;
}

export async function rotateRefreshToken(
	token: string,
): Promise<{ userId: string; token: string } | null> {
	const record = await db.refreshToken.findUnique({
		where: { tokenHash: hashToken(token) },
	});
	if (!record || record.revokedAt || record.expiresAt <= new Date()) {
		return null;
	}
	const next = randomBytes(32).toString('hex');
	await db.$transaction([
		db.refreshToken.update({
			where: { id: record.id },
			data: { revokedAt: new Date() },
		}),
		db.refreshToken.create({
			data: {
				userId: record.userId,
				tokenHash: hashToken(next),
				expiresAt: newExpiry(),
			},
		}),
	]);
	return { userId: record.userId, token: next };
}

export async function revokeRefreshToken(token: string): Promise<void> {
	await db.refreshToken.updateMany({
		where: { tokenHash: hashToken(token), revokedAt: null },
		data: { revokedAt: new Date() },
	});
}

export async function revokeAllForUser(userId: string): Promise<void> {
	await db.refreshToken.updateMany({
		where: { userId, revokedAt: null },
		data: { revokedAt: new Date() },
	});
}
