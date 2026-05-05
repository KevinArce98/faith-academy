import { useCallback } from 'react';

import { useAuth } from '@/lib/auth/AuthContext';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function useApiClient() {
	const { getToken } = useAuth();

	return useCallback(
		async <T = unknown>(url: string, opts?: RequestInit): Promise<T> => {
			const token = getToken();
			const res = await fetch(`${API_URL}${url}`, {
				...opts,
				headers: {
					'Content-Type': 'application/json',
					...(token ? { Authorization: `Bearer ${token}` } : {}),
					...opts?.headers,
				},
			});

			if (!res.ok) {
				const errorBody = await res
					.json()
					.catch(() => ({ error: res.statusText }));
				throw new Error(errorBody.error ?? `HTTP ${res.status}`);
			}

			return res.json() as Promise<T>;
		},
		[getToken],
	);
}

export const apiUrl = (path: string) => `${API_URL}${path}`;
