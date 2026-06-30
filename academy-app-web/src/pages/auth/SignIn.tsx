import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Spinner } from '@/components/ui/Spinner';
import { useApiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth/useAuth';
import { getErrorMessage } from '@/lib/errorMessages';
import { type SignInFormValues, signInSchema } from '@/lib/validations/auth';

export default function SignIn() {
	const { isSignedIn, setToken } = useAuth();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const api = useApiClient();
	const [error, setError] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		getValues,
		formState: { errors },
	} = useForm<SignInFormValues>({
		resolver: zodResolver(signInSchema),
		defaultValues: { email: '', password: '', remember: false },
	});

	const loginMutation = useMutation({
		mutationFn: (form: SignInFormValues) =>
			api<{ token: string }>('/api/v1/auth/login', {
				method: 'POST',
				body: JSON.stringify({ email: form.email, password: form.password }),
			}),
		onSuccess: (data) => {
			queryClient.clear();
			setToken(data.token);
			navigate('/', { replace: true });
		},
		onError: (err) => {
			if (err instanceof Error && err.message === 'EMAIL_NOT_VERIFIED') {
				navigate('/verify-email', { state: { email: getValues('email') } });
			} else {
				setError(getErrorMessage(err, 'Error al iniciar sesión. Intenta de nuevo.'));
			}
		},
	});

	useEffect(() => {
		if (isSignedIn) navigate('/', { replace: true });
	}, [isSignedIn, navigate]);

	function onSignIn(form: SignInFormValues) {
		setError(null);
		loginMutation.mutate(form);
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

				<PasswordInput
					label="Contraseña"
					autoComplete="current-password"
					{...register('password')}
				/>

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
					disabled={loginMutation.isPending}
					className="w-full"
				>
					{loginMutation.isPending ? (
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
