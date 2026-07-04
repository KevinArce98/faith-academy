import { Body, Container, Head, Html, Img, Preview, Section, Text } from '@react-email/components';
import type { ReactNode } from 'react';

import { branding } from '../lib/branding.js';

type EmailLayoutProps = {
	previewText: string;
	children: ReactNode;
};

export function EmailLayout({ previewText, children }: EmailLayoutProps) {
	return (
		<Html lang="es">
			<Head />
			<Preview>{previewText}</Preview>
			<Body
				style={{
					backgroundColor: '#F5F8FC',
					fontFamily: 'Arial, sans-serif',
					margin: 0,
					padding: '32px 0',
				}}
			>
				<Container
					style={{
						backgroundColor: '#FFFFFF',
						borderRadius: 12,
						maxWidth: 480,
						margin: '0 auto',
						padding: '32px 40px',
					}}
				>
					<Section style={{ textAlign: 'center', marginBottom: 24 }}>
						{branding.logoUrl ? (
							<Img
								src={branding.logoUrl}
								alt={branding.name}
								width={48}
								height={48}
								style={{ margin: '0 auto', borderRadius: 10 }}
							/>
						) : (
							<Section
								style={{
									width: 48,
									height: 48,
									borderRadius: 10,
									backgroundColor: branding.primaryColor,
									margin: '0 auto',
									textAlign: 'center',
								}}
							>
								<Text
									style={{
										color: '#fff',
										fontWeight: 'bold',
										fontSize: 20,
										lineHeight: '48px',
										margin: 0,
									}}
								>
									{branding.logoText}
								</Text>
							</Section>
						)}
						<Text style={{ fontWeight: 'bold', fontSize: 16, color: '#012641', marginTop: 8 }}>
							{branding.name}
						</Text>
					</Section>
					{children}
				</Container>
			</Body>
		</Html>
	);
}
