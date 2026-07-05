import type { Role } from '@/lib/roles';

export type MeResponse = {
  id: string;
  name: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  email: string;
  isActive: boolean;
  emailVerified: boolean;
  notificationsEnabled: boolean;
};
