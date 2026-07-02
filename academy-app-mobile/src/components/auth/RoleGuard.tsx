import { Redirect } from 'expo-router';

import { InlineSpinner } from '@/components/ui/Spinner';
import { useMe } from '@/lib/queries';
import { canAccess } from '@/lib/roles';

type RoleGuardProps = {
  /** Ruta a validar contra ROLE_SCREEN_ACCESS, ej. '/payouts'. */
  screen: string;
  children: React.ReactNode;
};

/**
 * Defensa en capa de UI: si el rol del usuario no puede acceder a `screen`,
 * redirige al inicio en vez de renderizar la pantalla (evita exponer datos
 * sensibles alcanzables por deep-link). El backend sigue siendo la autoridad.
 */
export function RoleGuard({ screen, children }: RoleGuardProps) {
  const { data: me, isLoading } = useMe();

  if (isLoading) return <InlineSpinner />;
  if (!me || !canAccess(me.role, screen)) return <Redirect href="/(app)" />;

  return <>{children}</>;
}
