// Mapa de respaldo: el API ya envía un `message` legible en el contrato
// { error: { code, message } }, así que esto solo cubre códigos sueltos
// (rutas de auth con formato legacy).
const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: 'Debes iniciar sesión',
  FORBIDDEN: 'Acceso denegado',
  NOT_FOUND: 'Recurso no encontrado',
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
