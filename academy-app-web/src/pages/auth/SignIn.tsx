import { useAuth } from '@clerk/react';
import { useSignIn } from '@clerk/react/legacy';
import { isClerkAPIResponseError } from '@clerk/react/errors';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Eye, EyeOff } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { VerificationCodeForm } from '@/components/auth/VerificationCodeForm';
import { handleClerkErrors } from '@/utils/clerk-localization';
import {
	signInSchema,
	type SignInFormValues,
	type VerifyCodeFormValues,
} from '@/lib/validations/auth';

export default function SignIn() {
	const { isSignedIn } = useAuth();
	const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
	const navigate = useNavigate();
	const [showPassword, setShowPassword] = useState(false);
	const [clerkError, setClerkError] = useState<string | null>(null);
	const [isPending, setIsPending] = useState(false);
	const [showMfa, setShowMfa] = useState(false);

	const {
		register: registerSignIn,
		handleSubmit: handleSignInSubmit,
		formState: { errors: signInErrors },
	} = useForm<SignInFormValues>({
		resolver: zodResolver(signInSchema),
		defaultValues: { email: '', password: '', remember: false },
	});

	useEffect(() => {
		if (isSignedIn) navigate('/', { replace: true });
	}, [isSignedIn, navigate]);

	async function onSignIn(form: SignInFormValues) {
		if (!signIn) return;
		setClerkError(null);
		setIsPending(true);
		try {
			const result = await signIn.create({
				strategy: 'password',
				identifier: form.email,
				password: form.password,
			});

			if (result.status === 'complete') {
				await setActive?.({ session: result.createdSessionId });
				navigate('/', { replace: true });
			} else if (result.status === 'needs_second_factor') {
				const emailCodeFactor = result.supportedSecondFactors?.find(
					(f) => f.strategy === 'email_code',
				);
				if (emailCodeFactor) {
					await signIn.prepareSecondFactor({ strategy: 'email_code' });
					setShowMfa(true);
				}
			} else {
				console.error('Sign-in not complete:', result.status);
			}
		} catch (err) {
			if (isClerkAPIResponseError(err)) {
				setClerkError(handleClerkErrors(err.errors));
			} else {
				setClerkError('Error al iniciar sesión. Intenta de nuevo.');
			}
		} finally {
			setIsPending(false);
		}
	}

	async function onVerify(form: VerifyCodeFormValues) {
		if (!signIn) return;
		setClerkError(null);
		setIsPending(true);
		try {
			const result = await signIn.attemptSecondFactor({
				strategy: 'email_code',
				code: form.code,
			});
			if (result.status === 'complete') {
				await setActive?.({ session: result.createdSessionId });
				navigate('/', { replace: true });
			} else {
				console.error('Sign-in not complete after MFA:', result.status);
			}
		} catch (err) {
			if (isClerkAPIResponseError(err)) {
				setClerkError(handleClerkErrors(err.errors));
			} else {
				setClerkError('Error al verificar el código. Intenta de nuevo.');
			}
		} finally {
			setIsPending(false);
		}
	}

	async function handleResendMfaCode() {
		if (!signIn) return;
		setClerkError(null);
		try {
			await signIn.prepareSecondFactor({ strategy: 'email_code' });
		} catch (err) {
			if (isClerkAPIResponseError(err)) {
				setClerkError(handleClerkErrors(err.errors));
			} else {
				setClerkError('No se pudo reenviar el código. Intenta de nuevo.');
			}
		}
	}

	/* ── Guard: wait for Clerk to initialize ───────────────────────── */
	if (!signInLoaded || !signIn) {
		return (
			<div className='flex items-center justify-center p-12'>
				<Spinner size='sm' />
			</div>
		);
	}

	/* ── Verification step (needs_second_factor) ── */
	if (showMfa) {
		return (
			<VerificationCodeForm
				title='Verifica tu identidad'
				description='Ingresa el código que enviamos a tu correo electrónico'
				onSubmit={onVerify}
				isSubmitting={isPending}
				submitLabel='Verificar'
				submittingLabel='Verificando...'
				onResend={handleResendMfaCode}
				generalError={clerkError}
				secondaryActions={
					<Button
						variant='text'
						color='neutral'
						onClick={() => {
							setShowMfa(false);
							setClerkError(null);
						}}
						className='h-auto p-0 text-sm hover:bg-transparent'
					>
						Volver al inicio de sesión
					</Button>
				}
			/>
		);
	}

	/* ── Main sign-in form ───────────────────────────────────────── */
	return (
		<>
			{/* Encabezado del formulario */}
			<h2 className='text-dark text-[28px] leading-tight font-bold'>
				Bienvenido de nuevo
			</h2>
			<p className='mt-2 text-sm text-gray-400'>
				Ingresa tus credenciales para continuar
			</p>

			{clerkError && (
				<p className='mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600'>
					{clerkError}
				</p>
			)}

			<form
				onSubmit={handleSignInSubmit(onSignIn)}
				className='mt-8 flex flex-col gap-5'
			>
				{/* Email */}
				<Input
					type='email'
					label='Email'
					placeholder='correo@ejemplo.com'
					autoComplete='email'
					error={signInErrors.email?.message}
					{...registerSignIn('email')}
				/>

				{/* Contraseña */}
				<div className='flex flex-col gap-1'>
					<label htmlFor='password' className='text-dark text-sm font-medium'>
						Contraseña
					</label>
					<div className='relative'>
						<input
							id='password'
							type={showPassword ? 'text' : 'password'}
							autoComplete='current-password'
							className='text-dark focus:border-primary focus:ring-primary/20 h-11 w-full rounded-lg border border-gray-200 px-4 pr-12 text-sm transition-colors outline-none placeholder:text-gray-400 focus:ring-2'
							{...registerSignIn('password')}
						/>
						<Button
							type='button'
							onClick={() => setShowPassword((v) => !v)}
							variant='text'
							color='neutral'
							className='absolute top-1/2 right-4 h-auto -translate-y-1/2 border-transparent p-0 hover:bg-transparent'
							aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
						>
							{showPassword ? (
								<EyeOff className='h-5 w-5' />
							) : (
								<Eye className='h-5 w-5' />
							)}
						</Button>
					</div>
				</div>

				{/* Recordarme + ¿Olvidaste tu contraseña? */}
				<div className='flex items-center justify-between'>
					<label className='flex cursor-pointer items-center gap-2 select-none'>
						<input
							type='checkbox'
							className='accent-primary h-4 w-4 rounded border-gray-300'
							{...registerSignIn('remember')}
						/>
						<span className='text-sm text-gray-500'>Recordarme</span>
					</label>
					<Link
						to='/forgot-password'
						className='text-primary hover:text-primary-dark text-sm font-medium transition-colors'
					>
						¿Olvidaste tu contraseña?
					</Link>
				</div>

				{/* Botón Iniciar Sesión */}
				<Button
					type='submit'
					variant='contained'
					size='lg'
					disabled={isPending}
					className='w-full'
				>
					{isPending ? (
						<>
							<Spinner size='xs' className='border-white/40 border-t-white' />
							Iniciando sesión...
						</>
					) : (
						'Iniciar Sesión'
					)}
				</Button>
			</form>

			{/* Separador */}
			<p className='mt-6 text-center text-sm text-gray-400'>
				¿No tienes cuenta?{' '}
				<Link
					to='/sign-up'
					className='text-primary hover:text-primary-dark font-semibold transition-colors'
				>
					Regístrate
				</Link>
			</p>
		</>
	);
}
