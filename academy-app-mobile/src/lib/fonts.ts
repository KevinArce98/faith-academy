import { cloneElement, type ReactElement } from 'react';
import { StyleSheet, Text as RNText } from 'react-native';

import { theme } from '@/theme';

/**
 * Fuente de marca. Por defecto la app usa la fuente del SISTEMA (theme.fonts
 * .enabled === false). Para una fuente propia (mismo patrón para cada cliente):
 *
 *   1) Copiá los .ttf a assets/fonts/ (un archivo por peso).
 *   2) Descomentá/ajustá los require() de abajo — Metro EXIGE rutas literales,
 *      por eso viven acá y no en tokens.js. Las keys deben coincidir con
 *      theme.fonts.regular/bold/black.
 *   3) En src/theme/tokens.js: fonts.enabled = true, los nombres, y las rutas
 *      en fonts.files (para embeberlas en el build nativo vía plugin expo-font).
 *
 * Ejemplo (Lato):
 *   'Lato-Regular': require('../../assets/fonts/Lato-Regular.ttf'),
 *   'Lato-Bold': require('../../assets/fonts/Lato-Bold.ttf'),
 *   'Lato-Black': require('../../assets/fonts/Lato-Black.ttf'),
 */
export const brandFonts: Record<string, number> = {
  // 'Brand-Regular': require('../../assets/fonts/Brand-Regular.ttf'),
  // 'Brand-Bold': require('../../assets/fonts/Brand-Bold.ttf'),
  // 'Brand-Black': require('../../assets/fonts/Brand-Black.ttf'),
};

function familyForWeight(weight?: string | number): string {
  const f = theme.fonts;
  let w = 400;
  if (typeof weight === 'number') w = weight;
  else if (typeof weight === 'string') {
    if (weight === 'bold') w = 700;
    else if (weight === 'normal') w = 400;
    else w = parseInt(weight, 10) || 400;
  }
  if (w >= 900) return f.black;
  if (w >= 600) return f.bold;
  return f.regular;
}

/**
 * Aplica la fuente de marca a TODOS los <Text> según su fontWeight, sin tocar
 * cada componente. No hace nada si theme.fonts.enabled === false (fuente del
 * sistema). Respeta la fontFamily explícita (ej. íconos). Idempotente. Llamar
 * una vez antes del primer render.
 */
export function applyBrandFont(): void {
  if (!theme.fonts.enabled) return;

  const anyText = RNText as unknown as {
    render?: (...args: unknown[]) => ReactElement<{ style?: unknown }>;
    __brandFontPatched?: boolean;
  };
  if (anyText.__brandFontPatched || typeof anyText.render !== 'function') return;

  const original = anyText.render;
  anyText.render = function patched(...args: unknown[]) {
    const el = original.apply(this, args);
    const flat = (StyleSheet.flatten(el.props.style) ?? {}) as {
      fontWeight?: string | number;
    };
    const fontFamily = familyForWeight(flat.fontWeight);
    // base marca → estilos originales (conservan color/tamaño y la fontFamily
    // de íconos) → limpiar fontWeight para no faux-boldear la cara correcta.
    return cloneElement(el, {
      style: [{ fontFamily }, el.props.style, { fontWeight: undefined }],
    });
  };
  anyText.__brandFontPatched = true;
}
