import { useAuth, useClerk } from '@clerk/react';
import { useSignIn } from '@clerk/react/legacy';
import { isClerkAPIResponseError } from '@clerk/react/errors';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { handleClerkErrors } from '@/utils/clerk-localization';
import {
	forgotPasswordSchema,
	resetPasswordSchema,
	type ForgotPasswordFormValues,
	type ResetPasswordFormValues,
} from '@/lib/validations/auth';

export default function ForgotPassword() {
	const navigate = useNavigate();
	const { isSignedIn } = useAuth();
	const { signIn } = useSignIn();
	const [isPending, setIsPending] = useState(false);
	const { setActive } = useClerk();
	const signInResource = signIn
		? (signIn as unknown as {
				create: (params: {
					strategy: string;
					identifier: string;
				}) => Promise<unknown>;
				attemptFirstFactor: (params: {
					strategy: string;
					code: string;
					password: string;
				}) => Promise<{
					status: string;
					createdSessionId?: string;
				}>;
			})
		: null;

	const resetPasswordStrategy = 'reset_password_email_code';

	const [generalError, setGeneralError] = useState<string | null>(null);
	const [step, setStep] = useState<'request' | 'reset'>('request');
	const [requestedEmail, setRequestedEmail] = useState('');

	const {
		register: registerRequest,
		handleSubmit: handleRequestSubmit,
		formState: { errors: requestErrors },
	} = useForm<ForgotPasswordFormValues>({
		resolver: zodResolver(forgotPasswordSchema),
		defaultValues: { email: '' },
	});

	const {
		register: registerReset,
		handleSubmit: handleResetSubmit,
		formState: { errors: resetErrors },
	} = useForm<ResetPasswordFormValues>({
		resolver: zodResolver(resetPasswordSchema),
		defaultValues: { code: '', password: '', confirmPassword: '' },
	});

	useEffect(() => {
		if (isSignedIn) navigate('/', { replace: true });
	}, [isSignedIn, navigate]);

	async function onRequestReset(values: ForgotPasswordFormValues) {
		if (!signInResource) return;
		setGeneralError(null);
		setIsPending(true);

		try {
			await signInResource.create({
				strategy: resetPasswordStrategy,
				identifier: values.email,
			});
			setRequestedEmail(values.email);
			setStep('reset');
		} catch (err) {
			if (isClerkAPIResponseError(err)) {
				setGeneralError(handleClerkErrors(err.errors));
			} else {
				setGeneralError('No pudimos enviar el código. Intenta de nuevo.');
			}
		} finally {
			setIsPending(false);
		}
	}

	async function onResetPassword(values: ResetPasswordFormValues) {
		if (!signInResource) return;
		setGeneralError(null);
		setIsPending(true);

		try {
			const result = await signInResource.attemptFirstFactor({
				strategy: resetPasswordStrategy,
				code: values.code,
				password: values.password,
			});

			if (result.status === 'complete') {
				await setActive?.({ session: result.createdSessionId });
				navigate('/');
			} else {
				console.error('Password reset not complete:', result);
				setGeneralError('No pudimos restablecer la contraseña. Intenta de nuevo.');
			}
		} catch (err) {
			if (isClerkAPIResponseError(err)) {
				setGeneralError(handleClerkErrors(err.errors));
			} else {
				setGeneralError('No pudimos restablecer la contraseña. Intenta de nuevo.');
			}
		} finally {
			setIsPending(false);
		}
	}

	async function handleResendCode() {
		if (!signInResource || !requestedEmail) return;
		setGeneralError(null);

		try {
			await signInResource.create({
				strategy: resetPasswordStrategy,
				identifier: requestedEmail,
			});
		} catch (err) {
			if (isClerkAPIResponseError(err)) {
				setGeneralError(handleClerkErrors(err.errors));
			} else {
				setGeneralError('No pudimos reenviar el código. Intenta de nuevo.');
			}
		}
	}

	if (step === 'reset') {
		return (
			<>
				<h2 className='text-dark text-[28px] leading-tight font-bold'>
					Restablece tu contraseña
				</h2>
				<p className='mt-2 text-sm text-gray-400'>
					Escribe el código que enviamos a {requestedEmail} y crea una nueva
					contraseña
				</p>

				{generalError && (
					<p className='mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600'>
						{generalError}
					</p>
				)}

				<form
					onSubmit={handleResetSubmit(onResetPassword)}
					className='mt-8 flex flex-col gap-5'
				>
					<Input
						label='Código de verificación'
						placeholder='000000'
						inputMode='numeric'
						autoComplete='one-time-code'
						className='tracking-widest'
						error={resetErrors.code?.message}
						{...registerReset('code')}
					/>

					<Input
						type='password'
						label='Nueva contraseña'
						placeholder='Ingresa una nueva contraseña'
						autoComplete='new-password'
						error={resetErrors.password?.message}
						{...registerReset('password')}
					/>

					<Input
						type='password'
						label='Confirmar contraseña'
						placeholder='Repite la nueva contraseña'
						autoComplete='new-password'
						error={resetErrors.confirmPassword?.message}
						{...registerReset('confirmPassword')}
					/>

					<Button
						type='submit'
						variant='contained'
						size='lg'
						disabled={isPending}
						className='w-full'
					>
						{isPending ? 'Actualizando...' : 'Actualizar contraseña'}
					</Button>
				</form>

				<div className='mt-4 flex flex-col gap-2 text-center text-sm'>
					<button
						type='button'
						onClick={handleResendCode}
						className='text-primary hover:text-primary-dark font-semibold'
					>
						Reenviar código
					</button>
					<button
						type='button'
						onClick={() => {
							setStep('request');
							setGeneralError(null);
						}}
						className='text-gray-500 hover:text-dark'
					>
						Usar otro correo
					</button>
				</div>

				<p className='mt-6 text-center text-sm text-gray-400'>
					¿Recordaste tu contraseña?{' '}
					<Link
						to='/sign-in'
						className='text-primary hover:text-primary-dark font-semibold'
					>
						Inicia sesión
					</Link>
				</p>
			</>
		);
	}

	return (
		<>
			<h2 className='text-dark text-[28px] leading-tight font-bold'>
				¿Olvidaste tu contraseña?
			</h2>
			<p className='mt-2 text-sm text-gray-400'>
				Te enviaremos un código para que puedas restablecerla
			</p>

			{generalError && (
				<p className='mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600'>
					{generalError}
				</p>
			)}

			<form
				onSubmit={handleRequestSubmit(onRequestReset)}
				className='mt-8 flex flex-col gap-5'
			>
				<Input
					type='email'
					label='Email'
					placeholder='correo@ejemplo.com'
					autoComplete='email'
					error={requestErrors.email?.message}
					{...registerRequest('email')}
				/>

				<Button
					type='submit'
					variant='contained'
					size='lg'
					disabled={isPending}
					className='w-full'
				>
					{isPending ? 'Enviando...' : 'Enviar código'}
				</Button>
			</form>

			<p className='mt-6 text-center text-sm text-gray-400'>
				¿Ya tienes cuenta?{' '}
				<Link
					to='/sign-in'
					className='text-primary hover:text-primary-dark font-semibold'
				>
					Inicia sesión
				</Link>
			</p>
		</>
	);
}
