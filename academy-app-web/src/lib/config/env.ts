function requiredEnv(key: string): string {
	const value = import.meta.env[key];
	if (!value) {
		throw new Error(`Missing required environment variable: ${key}`);
	}
	return value;
}

function optionalEnv(key: string, fallback: string): string {
	return import.meta.env[key] || fallback;
}

export const env = {
	APP_NAME: optionalEnv('VITE_APP_NAME', 'StudioFlow Academy'),
	API_URL: optionalEnv('VITE_API_URL', 'http://localhost:3000'),
} as const;

// Ensure requiredEnv is available for future use
void requiredEnv;
