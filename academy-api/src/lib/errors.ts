import type { ContentfulStatusCode } from 'hono/utils/http-status';

// Error de aplicación: se lanza desde rutas/servicios y el errorHandler global
// lo convierte en la respuesta uniforme { error: { code, message, fields? } }.
export class AppError extends Error {
	readonly code: string;
	readonly status: ContentfulStatusCode;
	readonly fields?: Record<string, string[]>;

	constructor(
		code: string,
		status: ContentfulStatusCode,
		message: string,
		fields?: Record<string, string[]>,
	) {
		super(message);
		this.name = 'AppError';
		this.code = code;
		this.status = status;
		this.fields = fields;
	}
}

export const unauthenticated = () =>
	new AppError('UNAUTHENTICATED', 401, 'No autenticado.');

export const forbidden = (message = 'No autorizado.') =>
	new AppError('FORBIDDEN', 403, message);

export const notFound = (message = 'Recurso no encontrado.') =>
	new AppError('NOT_FOUND', 404, message);

export const conflict = (code: string, message: string) =>
	new AppError(code, 409, message);

export const badRequest = (code: string, message: string) =>
	new AppError(code, 400, message);

export const validationError = (fields: Record<string, string[]>) =>
	new AppError('VALIDATION_ERROR', 422, 'Datos inválidos.', fields);
