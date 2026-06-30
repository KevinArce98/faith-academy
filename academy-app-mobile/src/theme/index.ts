// eslint-disable-next-line @typescript-eslint/no-require-imports
const tokens = require('./tokens') as {
  studio: { name: string; tagline: string; logoText: string; logoImage: number | null };
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
  typography: { fontFamily: string };
};

export const theme = tokens;
export type Theme = typeof tokens;
export default tokens;
