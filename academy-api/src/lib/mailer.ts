import { Resend } from 'resend';

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
		html: `
      <p>Tu código de verificación es:</p>
      <h1 style="letter-spacing:8px;font-size:36px;">${code}</h1>
      <p>Expira en 24 horas.</p>
    `,
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
		html: `
      <p>Tu código para restablecer la contraseña es:</p>
      <h1 style="letter-spacing:8px;font-size:36px;">${code}</h1>
      <p>Expira en 15 minutos.</p>
    `,
	});
}
