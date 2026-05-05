import { randomBytes, randomInt } from 'crypto';

export function generateSecureToken(): string {
	return randomBytes(32).toString('hex');
}

export function generateOtpCode(): string {
	return randomInt(100_000, 1_000_000).toString();
}
