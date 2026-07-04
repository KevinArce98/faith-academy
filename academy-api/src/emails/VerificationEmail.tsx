import { Text } from '@react-email/components';

import { branding } from '../lib/branding.js';
import { EmailLayout } from './Layout.js';

type VerificationEmailProps = {
	code: string;
};

export function VerificationEmail({ code }: VerificationEmailProps) {
	return (
		<EmailLayout previewText={`Tu código de verificación: ${code}`}>
			<Text style={{ fontSize: 15, color: '#012641', textAlign: 'center' }}>
				Verifica tu correo electrónico para activar tu cuenta en {branding.name}.
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
				Este código expira en 24 horas.
			</Text>
		</EmailLayout>
	);
}
