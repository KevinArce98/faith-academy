/**
 * CONFIG DEL CLIENTE — único archivo a editar para rebrandear el template.
 * Controla colores, nombre, logo, identidad nativa (bundle/scheme), moneda y
 * locale. Se refleja automáticamente en Tailwind, en el runtime (`theme`) y en
 * la config nativa (`app.config.js`).
 */

const colors = {
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
  // Grises de UI (bordes, placeholders) — derivan del theme, no hardcodear.
  border: '#EEF2F7',
  placeholder: '#9CA3AF',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#FF3B30',
};

module.exports = {
  studio: {
    name: 'StudioFlow Academy',
    tagline: 'Academy',
    /** Texto corto del logo (fallback si no hay imagen). */
    logoText: 'SF',
    },

  /** Identidad nativa — se aplica en app.config.js (bundle, scheme, nombre). */
  app: {
    slug: 'studio-flow-academy',
    scheme: 'sfacademy',
    bundleId: 'com.studioflow.academy',
    version: '1.0.0',
    /** Pegar tras correr `eas init` (necesario para push). null = sin push. */
    easProjectId: null,
    owner: null,
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
   * Fuente de marca. Por defecto usa la del SISTEMA. Para una fuente propia:
   *   1) Copiá los .ttf a assets/fonts/ (un archivo por peso).
   *   2) En src/lib/fonts.ts descomentá/ajustá los require() (Metro exige rutas
   *      literales) usando estos mismos nombres como keys.
   *   3) Poné enabled: true, los nombres regular/bold/black, y las rutas en files.
   * Muchas fuentes no traen Medium(500)/SemiBold(600): la app mapea
   * 400/500→regular, 600/700/800→bold, 900→black.
   */
  fonts: {
    enabled: false,
    regular: 'Brand-Regular',
    bold: 'Brand-Bold',
    black: 'Brand-Black',
    /** Rutas de los .ttf para embeber en el build nativo (plugin expo-font). */
    files: [],
  },
};
