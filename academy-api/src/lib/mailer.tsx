import { Resend } from 'resend';

import { PasswordResetEmail } from '../emails/PasswordResetEmail.js';
import { VerificationEmail } from '../emails/VerificationEmail.js';

let _resend: Resend | null = null;

function getResend(): Resend {
	if (_resend) return _resend;
	const apiKey = process.env.RESEND_API_KEY;
	if (!apiKey) throw new Error('RESEND_API_KEY is required');
	_resend = new Resend(apiKey);
	return _resend;
}

function getFrom(): string {
	return process.env.RESEND_FROM_EMAIL!;
}

export async function sendVerificationEmail(
	to: string,
	code: string,
): Promise<void> {
	await getResend().emails.send({
		from: getFrom(),
		to,
		subject: 'Verifica tu correo electrónico',
		react: <VerificationEmail code={code} />,
	});
}

export async function sendPasswordResetEmail(
	to: string,
	code: string,
): Promise<void> {
	await getResend().emails.send({
		from: getFrom(),
		to,
		subject: 'Restablece tu contraseña',
		react: <PasswordResetEmail code={code} />,
	});
}
