import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/lib/auth/AuthContext';
import { type SignInFormValues, signInSchema } from '@/lib/validations/auth';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export default function SignIn() {
	const { isSignedIn, setToken } = useAuth();
	const navigate = useNavigate();
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isPending, setIsPending] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<SignInFormValues>({
		resolver: zodResolver(signInSchema),
		defaultValues: { email: '', password: '', remember: false },
	});

	useEffect(() => {
		if (isSignedIn) navigate('/', { replace: true });
	}, [isSignedIn, navigate]);

	async function onSignIn(form: SignInFormValues) {
		setError(null);
		setIsPending(true);
		try {
			const res = await fetch(`${API_URL}/api/v1/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: form.email, password: form.password }),
			});

			const data = await res.json();

			if (!res.ok) {
				if (data.error === 'EMAIL_NOT_VERIFIED') {
					navigate('/verify-email', { state: { email: form.email } });
					return;
				}
				setError(data.error ?? 'Error al iniciar sesión. Intenta de nuevo.');
				return;
			}

			setToken(data.token);
			navigate('/', { replace: true });
		} catch {
			setError('Error de conexión. Intenta de nuevo.');
		} finally {
			setIsPending(false);
		}
	}

	return (
		<>
			<h2 className="text-dark text-[28px] leading-tight font-bold">
				Bienvenido de nuevo
			</h2>
			<p className="mt-2 text-sm text-gray-400">
				Ingresa tus credenciales para continuar
			</p>

			{error && (
				<p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
					{error}
				</p>
			)}

			<form
				onSubmit={handleSubmit(onSignIn)}
				className="mt-8 flex flex-col gap-5"
			>
				<Input
					type="email"
					label="Email"
					placeholder="correo@ejemplo.com"
					autoComplete="email"
					error={errors.email?.message}
					{...register('email')}
				/>

				<div className="flex flex-col gap-1">
					<label htmlFor="password" className="text-dark text-sm font-medium">
						Contraseña
					</label>
					<div className="relative">
						<input
							id="password"
							type={showPassword ? 'text' : 'password'}
							autoComplete="current-password"
							className="text-dark focus:border-primary focus:ring-primary/20 h-11 w-full rounded-lg border border-gray-200 px-4 pr-12 text-sm transition-colors outline-none placeholder:text-gray-400 focus:ring-2"
							{...register('password')}
						/>
						<Button
							type="button"
							onClick={() => setShowPassword((v) => !v)}
							variant="text"
							color="neutral"
							className="absolute top-1/2 right-4 h-auto -translate-y-1/2 border-transparent p-0 hover:bg-transparent"
							aria-label={
								showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
							}
						>
							{showPassword ? (
								<EyeOff className="h-5 w-5" />
							) : (
								<Eye className="h-5 w-5" />
							)}
						</Button>
					</div>
				</div>

				<div className="flex items-center justify-between">
					<label className="flex cursor-pointer items-center gap-2 select-none">
						<input
							type="checkbox"
							className="accent-primary h-4 w-4 rounded border-gray-300"
							{...register('remember')}
						/>
						<span className="text-sm text-gray-500">Recordarme</span>
					</label>
					<Link
						to="/forgot-password"
						className="text-primary hover:text-primary-dark text-sm font-medium transition-colors"
					>
						¿Olvidaste tu contraseña?
					</Link>
				</div>

				<Button
					type="submit"
					variant="contained"
					size="lg"
					disabled={isPending}
					className="w-full"
				>
					{isPending ? (
						<>
							<Spinner size="xs" className="border-white/40 border-t-white" />
							Iniciando sesión...
						</>
					) : (
						'Iniciar Sesión'
					)}
				</Button>
			</form>

			<p className="mt-6 text-center text-sm text-gray-400">
				¿No tienes cuenta?{' '}
				<Link
					to="/sign-up"
					className="text-primary hover:text-primary-dark font-semibold transition-colors"
				>
					Regístrate
				</Link>
			</p>
		</>
	);
}
