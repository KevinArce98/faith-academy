import 'dotenv/config';

import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const resolveJsAsTs: Plugin = {
	name: 'resolve-js-as-ts',
	enforce: 'pre',
	async resolveId(source, importer) {
		if (importer && source.startsWith('.') && source.endsWith('.js')) {
			const resolved = await this.resolve(
				source.slice(0, -3) + '.ts',
				importer,
				{ skipSelf: true },
			);
			if (resolved) return resolved;
		}
		return null;
	},
};

export default defineConfig({
	plugins: [resolveJsAsTs],
	test: {
		environment: 'node',
		include: ['src/**/*.test.ts'],
		env: {
			NODE_ENV: 'test',
			DATABASE_URL:
				process.env.TEST_DATABASE_URL ??
				'postgresql://test:test@localhost:5432/test',
			JWT_SECRET:
				process.env.JWT_SECRET ?? 'test-secret-test-secret-test-secret-0123',
		},
	},
});
