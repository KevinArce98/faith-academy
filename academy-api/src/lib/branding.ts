// Datos de marca para los correos transaccionales (Resend). Espeja
// studioConfig (web) / tokens.js (mobile), pero vive acá porque la API no
// comparte paquete con esos dos. Cada cliente edita este archivo directamente.
export const branding = {
	name: 'Faith',
	logoText: 'f',
	primaryColor: '#008EA6',
	// URL absoluta a un PNG servido por el web app. null = usa el badge con
	// logoText en vez de imagen. Los clientes de correo no soportan SVG de
	// forma confiable (Outlook no lo renderiza), así que a diferencia de
	// studioConfig.logoUrl esto requiere un PNG real.
	logoUrl: 'https://www.faith-cr.com/logo.png' as string | null,
};
