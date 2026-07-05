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
  legal: {
    privacyUrl?: string;
    termsUrl?: string;
  };
  support: {
    email?: string;
    whatsapp?: string;
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
    reports: false,
  },
  familyDiscounts: [
    { position: 2, pct: 10 },
    { position: 3, pct: 20 },
  ],
  metadata: {
    title: 'StudioFlow Academy',
    description: 'Plataforma de gestión para estudios de danza y artes escénicas.',
    keywords: ['academia', 'danza', 'clases', 'studio'],
  },
  legal: {
    privacyUrl: undefined,
    termsUrl: undefined,
  },
  support: {
    email: undefined,
    whatsapp: undefined,
  },
};

export default studioConfig;
