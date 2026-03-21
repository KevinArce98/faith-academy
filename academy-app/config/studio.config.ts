// Este es el ÚNICO archivo que cambia por cliente

import type { Metadata } from 'next';

export type FamilyDiscountRule = {
  position: number; // posicion del hijo (2 = segundo hijo, 3 = tercero...)
  pct: number; // porcentaje de descuento (10 = 10%)
};

export type StudioConfig = {
  studio: {
    name: string;
    tagline: string;
    logoText: string; // iniciales para el cuadrado del logo (ej. "SF")
    logoUrl?: string; // URL de imagen de logo (sobreescribe logoText)
    favicon?: string;
  };
  colors: {
    primary: string; // "#EE005A"
    primaryLight: string; // "#FF4D85"
    primaryDark: string; // "#C4004A"
    dark: string; // "#012641"
    darkMid: string; // "#01325A"
    darkLight: string; // "#024A85"
    background: string; // "#F5F8FC"
    surface: string; // "#FFFFFF"
    textPrimary: string; // "#012641"
    textMuted: string; // "#4B6280"
    success: string; // "#10B981"
    warning: string; // "#F59E0B"
    danger: string; // "#FF3B30"
  };
  typography: {
    fontFamily: string; // "Inter"
    fontFamilyMono: string; // "JetBrains Mono"
    googleFontsUrl?: string;
  };
  features: {
    lms: boolean;
    attendanceScanner: boolean;
    streaks: boolean;
    familyAccounts: boolean;
    reports: boolean;
    waitlist: boolean;
  };
  // Reglas de descuento por posicion del hijo en la familia
  familyDiscounts: FamilyDiscountRule[];
  // Metadata SEO
  metadata: {
    title: string;
    description: string;
    keywords?: string[];
    openGraph?: Metadata['openGraph'];
  };
};

const studioConfig: StudioConfig = {
  studio: {
    name: 'StudioFlow Academy',
    tagline: 'Academy',
    logoText: 'SF',
    logoUrl: '/logo.svg',
    favicon: undefined,
  },
  colors: {
    primary: '#EE005A',
    primaryLight: '#FF4D85',
    primaryDark: '#C4004A',
    dark: '#012641',
    darkMid: '#01325A',
    darkLight: '#024A85',
    background: '#F5F8FC',
    surface: '#FFFFFF',
    textPrimary: '#012641',
    textMuted: '#4B6280',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#FF3B30',
  },
  typography: {
    fontFamily: 'Inter',
    fontFamilyMono: 'JetBrains Mono',
    googleFontsUrl: undefined,
  },
  features: {
    lms: false,
    attendanceScanner: false,
    streaks: false,
    familyAccounts: false,
    reports: false,
    waitlist: false,
  },
  familyDiscounts: [
    { position: 2, pct: 10 },
    { position: 3, pct: 20 },
  ],
  metadata: {
    title: 'StudioFlow Academy',
    description:
      'Plataforma de gestión para estudios de danza y artes escénicas.',
    keywords: ['academia', 'danza', 'clases', 'studio'],
  },
};

export default studioConfig;
