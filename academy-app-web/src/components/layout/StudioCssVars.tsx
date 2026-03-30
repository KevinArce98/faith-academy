import studioConfig from '@shared/config/studio.config';
import { useEffect } from 'react';

export function StudioCssVars() {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--studio-primary', studioConfig.colors.primary);
    root.style.setProperty('--studio-primary-light', studioConfig.colors.primaryLight);
    root.style.setProperty('--studio-primary-dark', studioConfig.colors.primaryDark);
    root.style.setProperty('--studio-dark', studioConfig.colors.dark);
    root.style.setProperty('--studio-dark-mid', studioConfig.colors.darkMid);
    root.style.setProperty('--studio-dark-light', studioConfig.colors.darkLight);
    root.style.setProperty('--background', studioConfig.colors.background);
    root.style.setProperty('--studio-surface', studioConfig.colors.surface);
    root.style.setProperty('--foreground', studioConfig.colors.textPrimary);
    root.style.setProperty('--studio-success', studioConfig.colors.success);
    root.style.setProperty('--studio-warning', studioConfig.colors.warning);
    root.style.setProperty('--studio-danger', studioConfig.colors.danger);
  }, []);
  return null;
}
