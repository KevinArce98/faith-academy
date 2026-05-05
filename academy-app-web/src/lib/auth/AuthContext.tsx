import {
	type ReactNode,
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from 'react';

const TOKEN_KEY = 'auth_token';

type AuthState = {
	token: string | null;
	isLoaded: boolean;
	isSignedIn: boolean;
};

type AuthContextValue = AuthState & {
	setToken: (token: string) => void;
	clearToken: () => void;
	getToken: () => string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [state, setState] = useState<AuthState>({
		token: null,
		isLoaded: false,
		isSignedIn: false,
	});

	useEffect(() => {
		const token = localStorage.getItem(TOKEN_KEY);
		setState({ token, isLoaded: true, isSignedIn: Boolean(token) });
	}, []);

	const setToken = useCallback((token: string) => {
		localStorage.setItem(TOKEN_KEY, token);
		setState({ token, isLoaded: true, isSignedIn: true });
	}, []);

	const clearToken = useCallback(() => {
		localStorage.removeItem(TOKEN_KEY);
		setState({ token: null, isLoaded: true, isSignedIn: false });
	}, []);

	const getToken = useCallback(() => localStorage.getItem(TOKEN_KEY), []);

	return (
		<AuthContext.Provider value={{ ...state, setToken, clearToken, getToken }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error('useAuth must be used within AuthProvider');
	return ctx;
}
