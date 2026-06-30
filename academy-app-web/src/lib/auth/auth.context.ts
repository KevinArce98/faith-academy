import { createContext } from 'react';

type AuthState = {
	token: string | null;
	isLoaded: boolean;
	isSignedIn: boolean;
};

export type AuthContextValue = AuthState & {
	setToken: (token: string) => void;
	clearToken: () => void;
	getToken: () => string | null;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
