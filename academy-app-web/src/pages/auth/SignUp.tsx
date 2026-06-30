import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

import { VerificationCodeForm } from '@/components/auth/VerificationCodeForm';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Spinner } from '@/components/ui/Spinner';
import { useApiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth/useAuth';
import { getErrorMessage } from '@/lib/errorMessages';
import {
	type SignUpFormValues,
	type VerifyCodeFormValues,
	signUpSchema,
} from '@/lib/validations/auth';

export default function SignUp() {
	const { isSignedIn, setToken } = useAuth();
	const navigate = useNavigate();
	const api = useApiClient();
	const [error, setError] = useState<string | null>(null);
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

	const signUpMutation = useMutation({
		mutationFn: async (form: SignUpFormValues) => {
			await api('/api/v1/auth/register', {
				method: 'POST',
				body: JSON.stringify({ email: form.email, password: form.password, name: form.name }),
			});
			return { email: form.email };
		},
		onSuccess: ({ email }) => setPendingEmail(email),
		onError: (err) => setError(getErrorMessage(err, 'Error al crear la cuenta. Intenta de nuevo.')),
	});

	const verifyMutation = useMutation({
		mutationFn: (form: VerifyCodeFormValues) =>
			api<{ token: string }>('/api/v1/auth/verify-email', {
				method: 'POST',
				body: JSON.stringify({ email: pendingEmail, code: form.code }),
			}),
		onSuccess: (data) => {
			setToken(data.token);
			navigate('/', { replace: true });
		},
		onError: (err) => setError(getErrorMessage(err, 'Código inválido o expirado.')),
	});

	function onSignUp(form: SignUpFormValues) {
		setError(null);
		signUpMutation.mutate(form);
	}

	function onVerify(form: VerifyCodeFormValues) {
		if (!pendingEmail) return;
		setError(null);
		verifyMutation.mutate(form);
	}

	async function handleResendCode() {
		if (!pendingEmail) return;
		setError(null);
		try {
			await api('/api/v1/auth/resend-verification', {
				method: 'POST',
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
				isSubmitting={verifyMutation.isPending}
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

				<PasswordInput
					label="Contraseña"
					autoComplete="new-password"
					error={errors.password?.message}
					{...register('password')}
				/>

				<Button
					type="submit"
					variant="contained"
					size="lg"
					disabled={signUpMutation.isPending}
					className="w-full"
				>
					{signUpMutation.isPending ? (
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
