import type { Role } from '@/lib/roles';

export type MeResponse = {
	id: string;
	name: string | null;
	role: Role;
	email: string;
	isActive: boolean;
};
