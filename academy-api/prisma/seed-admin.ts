/**
 * Crea (o reactiva) el primer usuario ADMIN. Necesario para arrancar una
 * instancia nueva, ya que /auth/register solo crea STUDENT.
 *
 * Uso:
 *   ADMIN_EMAIL=admin@faith-cr.com ADMIN_PASSWORD='TempPass123!' \
 *   ADMIN_NAME='Admin FAITH' pnpm tsx prisma/seed-admin.ts
 *
 * El admin queda con emailVerified=true; cambiá la contraseña al primer login.
 */
import 'dotenv/config';

import { db } from '../src/lib/db.js';
import { hashPassword } from '../src/lib/utils/hash.js';

async function main() {
	const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
	const password = process.env.ADMIN_PASSWORD;
	const name = process.env.ADMIN_NAME?.trim() || 'Admin';

	if (!email || !password) {
		console.error(
			'Faltan ADMIN_EMAIL y/o ADMIN_PASSWORD. Ver el encabezado del script.',
		);
		process.exit(1);
	}
	if (password.length < 8) {
		console.error('ADMIN_PASSWORD debe tener al menos 8 caracteres.');
		process.exit(1);
	}

	const passwordHash = await hashPassword(password);

	const admin = await db.userProfile.upsert({
		where: { email },
		update: { role: 'ADMIN', isActive: true, emailVerified: true },
		create: { email, name, role: 'ADMIN', passwordHash, emailVerified: true },
		select: { id: true, email: true, role: true },
	});

	console.log(`ADMIN listo: ${admin.email} (${admin.id})`);
	await db.$disconnect();
}

main().catch(async (err) => {
	console.error(err);
	await db.$disconnect();
	process.exit(1);
});
