import { useCallback } from 'react';

import { useAuth } from '@/lib/auth/AuthContext';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// Saca el mensaje más útil del cuerpo de error del API, soportando:
//  - { error: "texto" }
//  - { error: { fieldErrors, formErrors } }  (validación zod)
//  - { message: "texto" }
function extractErrorMessage(body: unknown, status: number): string {
	if (body && typeof body === 'object') {
		const err = (body as Record<string, unknown>).error;
		if (typeof err === 'string' && err.trim()) return err;
		if (err && typeof err === 'object') {
			const fieldErrors = (err as { fieldErrors?: Record<string, string[]> })
				.fieldErrors;
			const firstField = fieldErrors
				? Object.values(fieldErrors)
						.flat()
						.find((m) => !!m)
				: undefined;
			if (firstField) return firstField;
			const formErrors = (err as { formErrors?: string[] }).formErrors;
			if (formErrors?.length) return formErrors[0];
		}
		const message = (body as Record<string, unknown>).message;
		if (typeof message === 'string' && message.trim()) return message;
	}
	return `HTTP ${status}`;
}

export function useApiClient() {
	const { getToken } = useAuth();

	return useCallback(
		async <T = unknown>(url: string, opts?: RequestInit): Promise<T> => {
			const token = getToken();
			// Con FormData el navegador debe poner el Content-Type (multipart con
			// boundary). Si forzamos application/json, el server no puede parsearlo.
			const isFormData = opts?.body instanceof FormData;
			const res = await fetch(`${API_URL}${url}`, {
				...opts,
				headers: {
					...(isFormData ? {} : { 'Content-Type': 'application/json' }),
					...(token ? { Authorization: `Bearer ${token}` } : {}),
					...opts?.headers,
				},
			});

			if (!res.ok) {
				const body = await res.json().catch(() => null);
				const message =
					res.status >= 500
						? 'Ocurrió un error en el servidor. Intenta de nuevo en un momento.'
						: extractErrorMessage(body, res.status);
				throw new Error(message);
			}

			return res.json() as Promise<T>;
		},
		[getToken],
	);
}

export const apiUrl = (path: string) => `${API_URL}${path}`;
