/**
 * CONFIG DEL CLIENTE — único archivo a editar para rebrandear el template.
 * Controla colores, nombre, logo, identidad nativa (bundle/scheme), moneda y
 * locale. Se refleja automáticamente en Tailwind, en el runtime (`theme`) y en
 * la config nativa (`app.config.js`).
 *
 * Cliente: FAITH — Dance & Art Academy (Costa Rica). https://www.faith-cr.com
 */

const colors = {
  // Teal de marca (#008EA6). Light/Dark derivados para estados y gradientes.
  primary: '#008EA6',
  primaryLight: '#33A6BA',
  primaryDark: '#007184',
  // Neutro oscuro de marca (#231F20) + variantes para superficies/avatares.
  dark: '#231F20',
  darkMid: '#3A3536',
  darkLight: '#544D4E',
  background: '#F2F7F8',
  surface: '#FFFFFF',
  textPrimary: '#231F20',
  textMuted: '#5C6B6E',
  // Grises de UI (bordes, placeholders) — derivan del theme, no hardcodear.
  border: '#E4ECED',
  placeholder: '#9CA3AF',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#FF3B30',
};

module.exports = {
  studio: {
    name: 'Faith Dance & Art',
    tagline: 'Dance & Art Academy',
    /** Texto corto del logo (fallback si no hay imagen). */
    logoText: 'F',
    // La imagen del logo NO va acá: app.config.js carga este archivo en Node y
    // no puede require() binarios. El require() del asset vive en theme/index.ts.
  },

  /** Identidad nativa — se aplica en app.config.js (bundle, scheme, nombre). */
  app: {
    slug: 'faith-academy',
    scheme: 'faithacademy',
    bundleId: 'com.faithcr.academy',
    version: '1.0.0',
    /** Pegar tras correr `eas init` (necesario para push). null = sin push. */
    easProjectId: '070bf616-4019-4ea2-8fdb-4fcca0573f72',
    owner: 'kevinarce98',
  },

  /** Localización — moneda y formato de fechas/números. */
  locale: 'es-CR',
  currency: 'CRC',
  currencySymbol: '₡',

  colors,

  typography: {
    fontFamily: 'System',
  },

  /**
   * Fuente de marca: Lato (guía de marca FAITH). Cargada en app/_layout.tsx
   * (useFonts) + embebida en el build vía plugin expo-font (app.config.js).
   * Los require() de los .ttf están en src/lib/fonts.ts (Metro exige literales).
   * Mapeo: 400/500→Regular, 600/700/800→Bold, 900→Black.
   */
  fonts: {
    enabled: true,
    regular: 'Lato-Regular',
    bold: 'Lato-Bold',
    black: 'Lato-Black',
    files: [
      './assets/fonts/Lato-Regular.ttf',
      './assets/fonts/Lato-Bold.ttf',
      './assets/fonts/Lato-Black.ttf',
    ],
  },

  /** URLs externas a la política de privacidad / términos ya redactados del cliente. */
  legal: {
    privacyUrl: null,
    termsUrl: null,
  },

  /** Contacto de ayuda y soporte (se muestra en Mi Cuenta). */
  support: {
    email: null,
    whatsapp: null,
  },
};
