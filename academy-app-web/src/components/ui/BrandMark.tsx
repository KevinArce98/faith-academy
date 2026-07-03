import { cn } from '@/lib/cn';
import studioConfig from '@/lib/config/studio.config';

type BrandMarkProps = {
  /** Tamaño del cuadro en px (ancho = alto). */
  size?: number;
  className?: string;
  textClassName?: string;
};

/**
 * Badge cuadrado de marca: usa la imagen del logo (studioConfig.studio.logoUrl)
 * si el cliente tiene una configurada, si no cae al logoText sobre un fondo de
 * color. Mismo mecanismo que AuthLayout usa en el login — centralizado acá
 * para que Sidebar/Settings/NoAccess muestren siempre el mismo logo.
 */
export function BrandMark({ size = 32, className, textClassName }: BrandMarkProps) {
  return (
    <div
      className={cn(
        'bg-primary flex shrink-0 items-center justify-center rounded-lg',
        className
      )}
      style={{ width: size, height: size }}
    >
      {studioConfig.studio.logoUrl ? (
        <img
          src={studioConfig.studio.logoUrl}
          alt={studioConfig.studio.name}
          style={{ width: size * 0.62, height: size * 0.62 }}
          className="object-contain"
        />
      ) : (
        <span className={cn('font-bold text-white', textClassName)}>
          {studioConfig.studio.logoText}
        </span>
      )}
    </div>
  );
}
