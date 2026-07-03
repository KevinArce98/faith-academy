const tokens = require('./src/theme/tokens');

module.exports = () => ({
  expo: {
    name: tokens.studio.name,
    slug: tokens.app.slug,
    version: tokens.app.version,
    orientation: 'portrait',
    icon: './assets/icon.png',
    scheme: tokens.app.scheme,
    userInterfaceStyle: 'light',
    ...(tokens.app.owner ? { owner: tokens.app.owner } : {}),
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: tokens.colors.background,
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: tokens.app.bundleId,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: tokens.colors.background,
      },
      package: tokens.app.bundleId,
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      [
        'expo-image-picker',
        {
          photosPermission:
            'La app necesita acceso a tus fotos para subir el comprobante de pago.',
        },
      ],
      ['expo-notifications', { color: tokens.colors.primary }],
      'expo-status-bar',
      ...(tokens.fonts.enabled && tokens.fonts.files.length
        ? [['expo-font', { fonts: tokens.fonts.files }]]
        : []),
    ],
    experiments: {
      typedRoutes: true,
    },
    ...(tokens.app.easProjectId
      ? { extra: { eas: { projectId: tokens.app.easProjectId } } }
      : {}),
  },
});
