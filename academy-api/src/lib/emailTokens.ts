import { timingSafeEqual } from 'node:crypto';

import { db } from './db.js';

const MAX_ATTEMPTS = 5;

function equalCode(left: string, right: string): boolean {
	const a = Buffer.from(left);
	const b = Buffer.from(right);
	return a.length === b.length && timingSafeEqual(a, b);
}

export async function consumeEmailToken(
	userId: string,
	type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET',
	code: string,
) {
	return db.$transaction(async (tx) => {
		const record = await tx.emailToken.findFirst({
			where: {
				userId,
				type,
				usedAt: null,
				expiresAt: { gt: new Date() },
				attempts: { lt: MAX_ATTEMPTS },
			},
			orderBy: { createdAt: 'desc' },
		});
		if (!record) return null;
		if (!equalCode(record.token, code)) {
			await tx.emailToken.update({
				where: { id: record.id },
				data: { attempts: { increment: 1 } },
			});
			return null;
		}
		const consumed = await tx.emailToken.updateMany({
			where: { id: record.id, usedAt: null, attempts: { lt: MAX_ATTEMPTS } },
			data: { usedAt: new Date() },
		});
		return consumed.count === 1 ? record : null;
	});
}
