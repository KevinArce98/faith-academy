const ERROR_MESSAGES: Record<string, string> = {
  CLASS_NOT_FOUND: 'La clase no fue encontrada',
  CLASS_FULL: 'La clase ya está llena',
  ALREADY_ENROLLED: 'Ya estás inscrito en esta clase',
  NO_ACTIVE_MEMBERSHIP: 'No tienes una membresía activa',
  MEMBERSHIP_INACTIVE: 'Tu membresía está inactiva',
  NO_ACTIVE_CLASS: 'No hay una clase activa en este momento',
  ATTENDANCE_NOT_FOUND: 'El registro de asistencia no fue encontrado',
  NOT_CANCELLABLE: 'Esta inscripción ya no se puede cancelar',
  UNAUTHENTICATED: 'Debes iniciar sesión',
  UNAUTHORIZED: 'No tienes permiso para realizar esta acción',
  FORBIDDEN: 'Acceso denegado',
  BAD_REQUEST: 'Revisa los datos e intenta de nuevo',
  EMAIL_NOT_VERIFIED: 'Tu correo aún no está verificado',
};

export function getErrorMessage(error: unknown, fallback: string): string {
  const raw = (error instanceof Error ? error.message : String(error)).trim();
  if (!raw) return fallback;
  if (ERROR_MESSAGES[raw]) return ERROR_MESSAGES[raw];
  const isCodeLike = /^[A-Z][A-Z0-9_]+$/.test(raw);
  const isTechnical =
    /^HTTP \d+$/.test(raw) ||
    /failed to fetch/i.test(raw) ||
    /networkerror/i.test(raw) ||
    /network request failed/i.test(raw);
  if (isCodeLike || isTechnical) return fallback;
  return raw;
}
