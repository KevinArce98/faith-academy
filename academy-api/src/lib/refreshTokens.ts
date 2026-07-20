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
	const tokenHash = hashToken(token);
	return db.$transaction(async (tx) => {
		const record = await tx.refreshToken.findUnique({ where: { tokenHash } });
		if (!record) return null;
		const consumed = await tx.refreshToken.updateMany({
			where: { id: record.id, revokedAt: null, expiresAt: { gt: new Date() } },
			data: { revokedAt: new Date() },
		});
		if (consumed.count !== 1) return null;
		const next = randomBytes(32).toString('hex');
		await tx.refreshToken.create({
			data: {
				userId: record.userId,
				tokenHash: hashToken(next),
				expiresAt: newExpiry(),
			},
		});
		return { userId: record.userId, token: next };
	});
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
