export type TipoVideo = 'link' | 'archivo';

/** Video de presentación del profesional: un link externo o un archivo subido a Storage */
export interface VideoProfesional {
  tipo: TipoVideo;
  url: string;
  /** Nombre del archivo subido (solo cuando tipo es "archivo") */
  nombre?: string;
}
