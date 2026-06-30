import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react';

import { refreshAccessToken } from '@/lib/api';
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

	const setToken = useCallback((token: string) => {
		tokenRef.current = token;
		setState({ token, isLoaded: true, isSignedIn: true });
	}, []);

	const clearToken = useCallback(() => {
		tokenRef.current = null;
		setState({ token: null, isLoaded: true, isSignedIn: false });
	}, []);

	const getToken = useCallback(() => tokenRef.current, []);

	const didBootstrap = useRef(false);
	useEffect(() => {
		if (didBootstrap.current) return;
		didBootstrap.current = true;
		refreshAccessToken().then((token) => {
			if (token) setToken(token);
			else clearToken();
		});
	}, [setToken, clearToken]);

	return (
		<AuthContext.Provider value={{ ...state, setToken, clearToken, getToken }}>
			{children}
		</AuthContext.Provider>
	);
}
