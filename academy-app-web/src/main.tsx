import '@fontsource/lato/latin-400.css';
import '@fontsource/lato/latin-700.css';
import '@fontsource/lato/latin-900.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { AuthProvider } from '@/lib/auth/AuthContext';
import studioConfig from '@/lib/config/studio.config';

import App from './App.tsx';
import './index.css';

// Aplicar CSS vars antes del primer render para evitar FOUC
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 min
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </AuthProvider>
  </StrictMode>
);
