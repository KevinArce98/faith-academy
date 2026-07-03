export type OpenGraphMetadata = {
  title?: string;
  description?: string;
  images?: string[];
  [key: string]: unknown;
};

export type FamilyDiscountRule = {
  position: number;
  pct: number;
};

export type StudioConfig = {
  studio: {
    name: string;
    tagline: string;
    logoText: string;
    logoUrl?: string;
    favicon?: string;
  };
  colors: {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    dark: string;
    darkMid: string;
    darkLight: string;
    background: string;
    surface: string;
    textPrimary: string;
    textMuted: string;
    success: string;
    warning: string;
    danger: string;
  };
  typography: {
    fontFamily: string;
    fontFamilyMono: string;
    googleFontsUrl?: string;
  };
  features: {
    lms: boolean;
    reports: boolean;
  };
  familyDiscounts: FamilyDiscountRule[];
  metadata: {
    title: string;
    description: string;
    keywords?: string[];
    openGraph?: OpenGraphMetadata;
  };
};

// Cliente: FAITH — Dance & Art Academy (Costa Rica). https://www.faith-cr.com
const studioConfig: StudioConfig = {
  studio: {
    name: 'Faith',
    tagline: 'Dance & Art Academy',
    logoText: 'f',
    logoUrl: '/logo.svg',
    favicon: '/favicon.svg',
  },
  colors: {
    primary: '#008EA6',
    primaryLight: '#33A6BA',
    primaryDark: '#007184',
    dark: '#231F20',
    darkMid: '#3A3536',
    darkLight: '#544D4E',
    background: '#F2F7F8',
    surface: '#FFFFFF',
    textPrimary: '#231F20',
    textMuted: '#5C6B6E',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#FF3B30',
  },
  typography: {
    fontFamily: 'Lato',
    fontFamilyMono: 'JetBrains Mono',
    googleFontsUrl:
      'https://fonts.googleapis.com/css2?family=Lato:wght@400;500;700;900&display=swap',
  },
  features: {
    lms: false,
    reports: false,
  },
  familyDiscounts: [
    { position: 2, pct: 10 },
    { position: 3, pct: 20 },
  ],
  metadata: {
    title: 'Faith Dance & Art Academy',
    description:
      'Plataforma de gestión de Faith Dance & Art Academy — clases, mensualidades y pagos.',
    keywords: ['academia', 'danza', 'arte', 'clases', 'faith'],
  },
};

export default studioConfig;
