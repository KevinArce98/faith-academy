import * as SecureStore from 'expo-secure-store';
import { useCallback } from 'react';

import { useAuth } from './auth/useAuth';

const REFRESH_KEY = 'refresh_token';

// En desarrollo cae a localhost; en un build de release la variable es
// obligatoria — sin esto un binario mal configurado apuntaría en silencio
// a localhost.
function resolveApiUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (url) return url;
  if (__DEV__) return 'http://localhost:3000';
  throw new Error('EXPO_PUBLIC_API_URL no está configurada en este build.');
}

const API_URL = resolveApiUrl();

export const MOBILE_HEADERS = { 'X-Client': 'mobile' } as const;

export async function getStoredRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function storeRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_KEY, token);
}

export async function clearStoredRefreshToken(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

let refreshPromise: Promise<{ token: string; refreshToken: string } | null> | null = null;

export function refreshAccessToken(): Promise<{ token: string; refreshToken: string } | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const stored = await getStoredRefreshToken();
      if (!stored) return null;
      const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { ...MOBILE_HEADERS, 'X-Refresh-Token': stored },
      });
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      if (data?.token && data?.refreshToken) {
        await storeRefreshToken(data.refreshToken);
        return { token: data.token, refreshToken: data.refreshToken };
      }
      return null;
    })()
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function extractErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const err = (body as Record<string, unknown>).error;
    if (typeof err === 'string' && err.trim()) return err;
    if (err && typeof err === 'object') {
      const e = err as {
        code?: string;
        message?: string;
        fields?: Record<string, string[]>;
        fieldErrors?: Record<string, string[]>;
      };
      // Contrato del API: { error: { code, message, fields? } }.
      const firstField = e.fields
        ? Object.values(e.fields).flat().find(Boolean)
        : undefined;
      if (firstField) return firstField;
      if (typeof e.message === 'string' && e.message.trim()) return e.message;
      // Legacy (rutas de auth): zod flatten { fieldErrors }.
      const firstLegacy = e.fieldErrors
        ? Object.values(e.fieldErrors).flat().find(Boolean)
        : undefined;
      if (firstLegacy) return firstLegacy;
      if (typeof e.code === 'string' && e.code.trim()) return e.code;
    }
    const msg = (body as Record<string, unknown>).message;
    if (typeof msg === 'string') return msg;
  }
  return `HTTP ${status}`;
}

export function useApiClient() {
  const { getToken, setToken, clearToken } = useAuth();

  return useCallback(
    async <T = unknown>(url: string, opts?: RequestInit): Promise<T> => {
      const isFormData = opts?.body instanceof FormData;
      const build = (token: string | null): RequestInit => ({
        ...opts,
        headers: {
          ...MOBILE_HEADERS,
          ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...opts?.headers,
        },
      });

      let res = await fetch(`${API_URL}${url}`, build(getToken()));

      if (res.status === 401 && !url.includes('/auth/')) {
        const result = await refreshAccessToken();
        if (result) {
          setToken(result.token, result.refreshToken);
          res = await fetch(`${API_URL}${url}`, build(result.token));
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
