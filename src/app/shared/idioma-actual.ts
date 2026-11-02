export type Idioma = 'es' | 'en';

let actual: Idioma = 'es';

/** Idioma que se está usando (lo fija IdiomaService; sirve para código que no es un servicio) */
export const idiomaActual = (): Idioma => actual;

export const fijarIdioma = (idioma: Idioma): void => {
  actual = idioma;
};

/** Configuración regional para fechas y números según el idioma elegido */
export const localeActual = (): string => (actual === 'en' ? 'en-US' : 'es-AR');
