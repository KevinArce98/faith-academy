import { useCallback } from 'react';

import { useAuth } from '@/lib/auth/useAuth';
import { env } from '@/lib/config/env';

const API_URL = env.API_URL;

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

let refreshPromise: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
	if (!refreshPromise) {
		refreshPromise = fetch(`${API_URL}/api/v1/auth/refresh`, {
			method: 'POST',
			credentials: 'include',
		})
			.then((r) => (r.ok ? r.json() : null))
			.then((d: { token?: string } | null) => d?.token ?? null)
			.catch(() => null)
			.finally(() => {
				refreshPromise = null;
			});
	}
	return refreshPromise;
}

export function useApiClient() {
	const { getToken, setToken, clearToken } = useAuth();

	return useCallback(
		async <T = unknown>(url: string, opts?: RequestInit): Promise<T> => {
			const isFormData = opts?.body instanceof FormData;
			const build = (token: string | null): RequestInit => ({
				...opts,
				credentials: 'include',
				headers: {
					...(isFormData ? {} : { 'Content-Type': 'application/json' }),
					...(token ? { Authorization: `Bearer ${token}` } : {}),
					...opts?.headers,
				},
			});

			let res = await fetch(`${API_URL}${url}`, build(getToken()));

			if (res.status === 401 && !url.includes('/auth/')) {
				const newToken = await refreshAccessToken();
				if (newToken) {
					setToken(newToken);
					res = await fetch(`${API_URL}${url}`, build(newToken));
				} else {
					clearToken();
				}
			}

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
		[getToken, setToken, clearToken],
	);
}

export const apiUrl = (path: string) => `${API_URL}${path}`;
