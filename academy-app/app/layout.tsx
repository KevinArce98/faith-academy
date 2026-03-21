import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import studioConfig from '@/config/studio.config';

// NOTE: next/font requires a static import — update this import manually
// if studio.config.typography.fontFamily changes to a different Google Font.
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title:       studioConfig.metadata.title,
  description: studioConfig.metadata.description,
  keywords:    studioConfig.metadata.keywords,
  openGraph:   studioConfig.metadata.openGraph,
};

// Injects brand tokens from studio.config as private CSS vars (--studio-*).
// globals.css @theme references these via var(--studio-primary, fallback) so
// Tailwind utilities (bg-primary, text-dark, …) always resolve from the config.
function StudioCssVars() {
  const c = studioConfig.colors;
  const css = `
    :root {
      --background:           ${c.background};
      --foreground:           ${c.textPrimary};
      --studio-primary:       ${c.primary};
      --studio-primary-light: ${c.primaryLight};
      --studio-primary-dark:  ${c.primaryDark};
      --studio-dark:          ${c.dark};
      --studio-dark-mid:      ${c.darkMid};
      --studio-dark-light:    ${c.darkLight};
      --studio-surface:       ${c.surface};
      --studio-success:       ${c.success};
      --studio-warning:       ${c.warning};
      --studio-danger:        ${c.danger};
    }
  `;
  // eslint-disable-next-line react/no-danger
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="es">
        <head>
          <StudioCssVars />
        </head>
        <body className={`${inter.variable} antialiased`}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
