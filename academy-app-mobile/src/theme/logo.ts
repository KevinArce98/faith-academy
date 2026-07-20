// Imagen del logo (dentro del badge de marca en el login). Vive en su PROPIO
// archivo, separado de theme/index.ts, para que el require() del asset no se
// arrastre a módulos "puros" (theme, utils) que los tests unitarios importan
// transitivamente — Vitest corre en Node y no sabe requerir un binario (solo
// Metro puede). Solo lo importa app/(auth)/sign-in.tsx.
export const logoImage: number | null = require('../../assets/logo.png');
