const tokens = require('./src/theme/tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: tokens.colors.primary,
        'primary-light': tokens.colors.primaryLight,
        'primary-dark': tokens.colors.primaryDark,
        dark: tokens.colors.dark,
        'dark-mid': tokens.colors.darkMid,
        'dark-light': tokens.colors.darkLight,
        surface: tokens.colors.surface,
        background: tokens.colors.background,
        success: tokens.colors.success,
        warning: tokens.colors.warning,
        danger: tokens.colors.danger,
        'text-primary': tokens.colors.textPrimary,
        'text-muted': tokens.colors.textMuted,
      },
      fontFamily: {
        sans: [tokens.typography.fontFamily],
      },
    },
  },
  plugins: [],
};
