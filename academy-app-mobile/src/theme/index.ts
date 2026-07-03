// eslint-disable-next-line @typescript-eslint/no-require-imports
const tokens = require('./tokens') as {
  studio: { name: string; tagline: string; logoText: string };
  app: {
    slug: string;
    scheme: string;
    bundleId: string;
    version: string;
    easProjectId: string | null;
    owner: string | null;
  };
  locale: string;
  currency: string;
  currencySymbol: string;
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
    border: string;
    placeholder: string;
    success: string;
    warning: string;
    danger: string;
  };
  typography: { fontFamily: string };
  fonts: {
    enabled: boolean;
    regular: string;
    bold: string;
    black: string;
    files: string[];
  };
};

export const theme = tokens;
export type Theme = typeof tokens;
export default tokens;

export const logoImage: number | null = require('../../assets/logo.png');
