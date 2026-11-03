/** Lado mayor máximo de la foto de perfil, en píxeles */
export const LADO_MAXIMO_FOTO = 400;

/**
 * Reduce una imagen (data URL) para que la foto de perfil pese unas decenas de KB en vez de varios MB.
 * Mantiene la proporción y la guarda como JPEG; si no se puede procesar, devuelve la original.
 */
export function reducirImagen(dataUrl: string, ladoMaximo = LADO_MAXIMO_FOTO): Promise<string> {
  return new Promise((resolver) => {
    const imagen = new Image();
    imagen.onload = () => {
      const escala = Math.min(1, ladoMaximo / Math.max(imagen.width, imagen.height));
      const ancho = Math.max(1, Math.round(imagen.width * escala));
      const alto = Math.max(1, Math.round(imagen.height * escala));
      const lienzo = document.createElement('canvas');
      lienzo.width = ancho;
      lienzo.height = alto;
      const ctx = lienzo.getContext('2d');
      if (!ctx) {
        resolver(dataUrl);
        return;
      }
      // El JPEG no tiene transparencia: se rellena de blanco para que un PNG transparente no quede negro
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, ancho, alto);
      ctx.drawImage(imagen, 0, 0, ancho, alto);
      resolver(lienzo.toDataURL('image/jpeg', 0.82));
    };
    imagen.onerror = () => resolver(dataUrl);
    imagen.src = dataUrl;
  });
}
