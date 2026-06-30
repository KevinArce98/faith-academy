/**
 * BRANDING — edita este archivo para cambiar colores, nombre y tipografía.
 * Los cambios aquí se reflejan automáticamente en Tailwind y en el runtime.
 */
module.exports = {
  studio: {
    name: 'StudioFlow Academy',
    tagline: 'Academy',
    /** Texto corto para el logo si no hay imagen */
    logoText: 'SF',
    /** Ruta a la imagen del logo (require('../assets/logo.png')) o null */
    logoImage: null,
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
    fontFamily: 'System',
  },
};
