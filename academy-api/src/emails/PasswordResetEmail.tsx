import { Text } from '@react-email/components';

import { branding } from '../lib/branding.js';
import { EmailLayout } from './Layout.js';

type PasswordResetEmailProps = {
	code: string;
};

export function PasswordResetEmail({ code }: PasswordResetEmailProps) {
	return (
		<EmailLayout previewText={`Tu código para restablecer la contraseña: ${code}`}>
			<Text style={{ fontSize: 15, color: '#012641', textAlign: 'center' }}>
				Usa este código para restablecer tu contraseña en {branding.name}.
			</Text>
			<Text
				style={{
					fontSize: 36,
					fontWeight: 'bold',
					letterSpacing: 8,
					textAlign: 'center',
					color: branding.primaryColor,
					margin: '24px 0',
				}}
			>
				{code}
			</Text>
			<Text style={{ fontSize: 13, color: '#4B6280', textAlign: 'center' }}>
				Este código expira en 15 minutos. Si no solicitaste este cambio, ignora este correo.
			</Text>
		</EmailLayout>
	);
}
