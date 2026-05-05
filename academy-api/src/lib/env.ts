const REQUIRED_VARS = [
	'DATABASE_URL',
	'JWT_SECRET',
	'WEB_APP_URL',
	'CLOUDFLARE_R2_ENDPOINT',
	'CLOUDFLARE_R2_ACCESS_KEY_ID',
	'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
	'CLOUDFLARE_R2_BUCKET_NAME',
	'CLOUDFLARE_R2_PUBLIC_URL',
	'QR_SECRET',
	'RESEND_API_KEY',
	'RESEND_FROM_EMAIL',
] as const;

export function validateEnv(): void {
	const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
	if (missing.length > 0) {
		console.error('[startup] Missing required environment variables:');
		missing.forEach((key) => console.error(`  - ${key}`));
		process.exit(1);
	}
}
