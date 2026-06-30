import * as SecureStore from 'expo-secure-store';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import { refreshAccessToken, storeRefreshToken, clearStoredRefreshToken } from '@/lib/api';
import { AuthContext } from './auth.context';

type AuthState = {
  token: string | null;
  isLoaded: boolean;
  isSignedIn: boolean;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    isLoaded: false,
    isSignedIn: false,
  });
  const tokenRef = useRef<string | null>(null);

  const setToken = useCallback((token: string, refreshToken?: string) => {
    tokenRef.current = token;
    setState({ token, isLoaded: true, isSignedIn: true });
    if (refreshToken) storeRefreshToken(refreshToken);
  }, []);

  const clearToken = useCallback(() => {
    tokenRef.current = null;
    setState({ token: null, isLoaded: true, isSignedIn: false });
    clearStoredRefreshToken();
  }, []);

  const getToken = useCallback(() => tokenRef.current, []);

  const didBootstrap = useRef(false);
  useEffect(() => {
    if (didBootstrap.current) return;
    didBootstrap.current = true;
    refreshAccessToken().then((result) => {
      if (result) setToken(result.token, result.refreshToken);
      else clearToken();
    });
  }, [setToken, clearToken]);

  return (
    <AuthContext.Provider value={{ ...state, setToken, clearToken, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

// Re-export SecureStore helpers needed by the rest of the app
export { SecureStore };
