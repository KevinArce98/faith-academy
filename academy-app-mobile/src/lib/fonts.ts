import { cloneElement, type ReactElement } from 'react';
import { StyleSheet, Text as RNText } from 'react-native';

import { theme } from '@/theme';

/**
 * Fuente de marca (Lato). Metro exige rutas literales en require(), por eso los
 * archivos se listan acá. Las keys deben coincidir con theme.fonts
 * .regular/bold/black. Se cargan con useFonts(brandFonts) en el layout raíz.
 */
export const brandFonts: Record<string, number> = {
  'Lato-Regular': require('../../assets/fonts/Lato-Regular.ttf'),
  'Lato-Bold': require('../../assets/fonts/Lato-Bold.ttf'),
  'Lato-Black': require('../../assets/fonts/Lato-Black.ttf'),
};

// Lato no trae Medium(500)/SemiBold(600): 400/500 → regular, 600/700/800 →
// bold, 900 → black.
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
