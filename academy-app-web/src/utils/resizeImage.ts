// Redimensiona/comprime una imagen en el navegador antes de subirla (foto de
// perfil): recorte centrado a cuadrado + máx. 512x512 + JPEG calidad 0.8.
// Sin dependencias, solo Canvas API — evita instalar `sharp` en la API para
// esto ya que la subida es directa del cliente a R2 (presigned URL).
export function resizeImageToSquare(file: File, size = 512, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo procesar la imagen.'));
        return;
      }
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('No se pudo procesar la imagen.'));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo leer la imagen.'));
    };

    img.src = objectUrl;
  });
}
