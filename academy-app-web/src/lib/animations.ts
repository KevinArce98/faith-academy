import type { Variants, Transition } from 'framer-motion';

// Transicion base — spring suave para la mayoria de elementos
export const spring: Transition = {
  type: 'spring',
  damping: 25,
  stiffness: 200,
};

// Transicion rapida para feedback instantaneo (scanner QR)
export const springFast: Transition = {
  type: 'spring',
  damping: 20,
  stiffness: 400,
};

// Transicion suave para overlays y fondos
export const ease: Transition = {
  duration: 0.2,
  ease: 'easeInOut',
};

// Panel lateral que entra desde la derecha (detalle alumno, notificaciones)
export const slideInRight: Variants = {
  hidden: { x: '100%', opacity: 0 },
  visible: { x: 0, opacity: 1, transition: spring },
  exit: { x: '100%', opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } },
};

// Modal que aparece desde abajo con escala (modales centrales)
export const modalVariants: Variants = {
  hidden: { y: 40, opacity: 0, scale: 0.97 },
  visible: { y: 0, opacity: 1, scale: 1, transition: spring },
  exit: { y: 20, opacity: 0, scale: 0.97, transition: { duration: 0.15 } },
};

// Overlay de fondo semitransparente
export const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: ease },
  exit: { opacity: 0, transition: ease },
};

// Fade simple para paginas y secciones
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
};

// Entrada desde abajo para cards y filas de tabla
export const slideUp: Variants = {
  hidden: { y: 16, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: spring },
};
