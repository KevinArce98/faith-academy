const ERROR_MESSAGES: Record<string, string> = {
	// Clases
	CLASS_NOT_FOUND: 'La clase no fue encontrada',
	CLASS_FULL: 'La clase ya está llena',
	CLASS_NOT_FULL: 'La clase todavía tiene cupos disponibles',
	ALREADY_ENROLLED: 'Ya estás inscrito en esta clase',
	ALREADY_ON_WAITLIST: 'Ya estás en la lista de espera',
	NO_CREDITS: 'No tienes créditos suficientes',
	// Membresía
	NO_ACTIVE_MEMBERSHIP: 'No tienes una membresía activa',
	MEMBERSHIP_INACTIVE: 'Tu membresía está inactiva',
	// Asistencia
	NO_ACTIVE_CLASS: 'No hay una clase activa en este momento',
	ATTENDANCE_NOT_FOUND: 'El registro de asistencia no fue encontrado',
	NOT_CANCELLABLE: 'Esta inscripción ya no se puede cancelar',
	// Auth
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
		/load failed/i.test(raw);
	if (isCodeLike || isTechnical) return fallback;

	return raw;
}
