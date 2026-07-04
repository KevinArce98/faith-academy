// Imagen del logo (dentro del badge de marca en el login). Vive en su PROPIO
// archivo, separado de theme/index.ts, a propósito: si el require() de un
// asset vive en theme/index.ts, se arrastra a módulos "puros" (theme, utils)
// que los tests unitarios importan transitivamente — Vitest corre en Node y
// no sabe requerir un binario (solo Metro puede), así que cualquier test que
// toque el theme rompería en cuanto un cliente active el logo.
//
// null = usa el badge con logoText (comportamiento por defecto). Para un
// logo propio:
//   export const logoImage: number | null = require('../../assets/logo.png');
export const logoImage: number | null = null;
