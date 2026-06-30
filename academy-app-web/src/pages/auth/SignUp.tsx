import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

import { VerificationCodeForm } from '@/components/auth/VerificationCodeForm';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/lib/auth/AuthContext';
import { getErrorMessage } from '@/lib/errorMessages';
import {
	type SignUpFormValues,
	type VerifyCodeFormValues,
	signUpSchema,
} from '@/lib/validations/auth';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export default function SignUp() {
	const { isSignedIn, setToken } = useAuth();
	const navigate = useNavigate();
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isPending, setIsPending] = useState(false);
	const [pendingEmail, setPendingEmail] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<SignUpFormValues>({
		resolver: zodResolver(signUpSchema),
		defaultValues: { name: '', email: '', password: '' },
	});

	useEffect(() => {
		if (isSignedIn) navigate('/', { replace: true });
	}, [isSignedIn, navigate]);

	async function onSignUp(form: SignUpFormValues) {
		setError(null);
		setIsPending(true);
		try {
			const res = await fetch(`${API_URL}/api/v1/auth/register`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: form.email,
					password: form.password,
					name: form.name,
				}),
			});

			const data = await res.json();

			if (!res.ok) {
				setError(
					getErrorMessage(
						data.error,
						'Error al crear la cuenta. Intenta de nuevo.',
					),
				);
				return;
			}

			setPendingEmail(form.email);
		} catch {
			setError('Error de conexión. Intenta de nuevo.');
		} finally {
			setIsPending(false);
		}
	}

	async function onVerify(form: VerifyCodeFormValues) {
		if (!pendingEmail) return;
		setError(null);
		setIsPending(true);
		try {
			const res = await fetch(`${API_URL}/api/v1/auth/verify-email`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: pendingEmail, code: form.code }),
			});

			const data = await res.json();

			if (!res.ok) {
				setError(getErrorMessage(data.error, 'Código inválido o expirado.'));
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

	async function handleResendCode() {
		if (!pendingEmail) return;
		setError(null);
		try {
			await fetch(`${API_URL}/api/v1/auth/resend-verification`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: pendingEmail }),
			});
		} catch {
			setError('No se pudo reenviar el código. Intenta de nuevo.');
		}
	}

	if (pendingEmail) {
		return (
			<VerificationCodeForm
				title="Verifica tu correo"
				description={`Enviamos un código de 6 dígitos a ${pendingEmail}`}
				onSubmit={onVerify}
				isSubmitting={isPending}
				submitLabel="Verificar cuenta"
				submittingLabel="Verificando..."
				generalError={error}
				onResend={handleResendCode}
				resendLabel="Reenviar"
				resendHint="¿No recibiste el código?"
				placeholder="000000"
				inputLabel="Código de verificación"
			/>
		);
	}

	return (
		<>
			<h2 className="text-dark text-[28px] leading-tight font-bold">
				Crea tu cuenta
			</h2>
			<p className="mt-2 text-sm text-gray-400">
				Ingresa tus datos para comenzar
			</p>

			{error && (
				<p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
					{error}
				</p>
			)}

			<form
				onSubmit={handleSubmit(onSignUp)}
				className="mt-8 flex flex-col gap-5"
			>
				<Input
					label="Nombre completo"
					placeholder="Juan Pérez"
					autoComplete="name"
					error={errors.name?.message}
					{...register('name')}
				/>

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
							autoComplete="new-password"
							className="text-dark focus:border-primary focus:ring-primary/20 h-11 w-full rounded-lg border border-gray-200 px-4 pr-12 text-sm transition-colors outline-none placeholder:text-gray-400 focus:ring-2"
							{...register('password')}
						/>
						<Button
							type="button"
							onClick={() => setShowPassword((v) => !v)}
							variant="text"
							color="neutral"
							className="h-auto absolute top-1/2 right-4 -translate-y-1/2 p-0 hover:bg-transparent border-transparent"
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
					{errors.password && (
						<p className="text-danger text-xs">{errors.password?.message}</p>
					)}
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
							Creando cuenta...
						</>
					) : (
						'Crear cuenta'
					)}
				</Button>
			</form>

			<p className="mt-6 text-center text-sm text-gray-400">
				¿Ya tienes cuenta?{' '}
				<Link
					to="/sign-in"
					className="text-primary hover:text-primary-dark font-semibold transition-colors"
				>
					Inicia sesión
				</Link>
			</p>
		</>
	);
}
