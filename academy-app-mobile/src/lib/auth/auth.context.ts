import { createContext } from 'react';

type AuthState = {
  token: string | null;
  isLoaded: boolean;
  isSignedIn: boolean;
};

export type AuthContextValue = AuthState & {
  /** Guarda el access token en memoria y opcionalmente persiste el refresh token. */
  setToken: (token: string, refreshToken?: string) => void;
  clearToken: () => void;
  getToken: () => string | null;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
