import { z } from 'zod';

// Validación de entorno al arrancar: variables requeridas y formato mínimo.
const envSchema = z.object({
	DATABASE_URL: z.string().min(1),
	JWT_SECRET: z
		.string()
		.min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
	WEB_APP_URL: z.string().min(1),
	CLOUDFLARE_R2_ENDPOINT: z.string().min(1),
	CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().min(1),
	CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().min(1),
	CLOUDFLARE_R2_BUCKET_NAME: z.string().min(1),
	CLOUDFLARE_R2_PUBLIC_URL: z.string().min(1),
	RESEND_API_KEY: z.string().min(1),
	RESEND_FROM_EMAIL: z.string().min(1),
	CRON_SECRET: z
		.string()
		.min(16, 'CRON_SECRET debe tener al menos 16 caracteres'),
});

export function validateEnv(): void {
	const parsed = envSchema.safeParse(process.env);
	if (!parsed.success) {
		console.error('[startup] Invalid environment variables:');
		for (const issue of parsed.error.issues) {
			console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
		}
		process.exit(1);
	}
}
