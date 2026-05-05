import { randomInt } from 'crypto';

export function generateTempPassword(): string {
	const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
	const lower = 'abcdefghjkmnpqrstuvwxyz';
	const numbers = '23456789';
	const special = '@#$%&*';
	const all = upper + lower + numbers + special;

	const required = [
		upper[randomInt(upper.length)],
		lower[randomInt(lower.length)],
		numbers[randomInt(numbers.length)],
		special[randomInt(special.length)],
	];

	const rest = Array.from({ length: 8 }, () => all[randomInt(all.length)]);

	const combined = [...required, ...rest];
	for (let i = combined.length - 1; i > 0; i--) {
		const j = randomInt(i + 1);
		[combined[i], combined[j]] = [combined[j], combined[i]];
	}

	return combined.join('');
}
