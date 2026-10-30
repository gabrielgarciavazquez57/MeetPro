import { User } from "./user";
import{TitulosPro} from "./titulos-pro";
import{ExperienciaPro} from "./experiencia-pro";
import{Certificado} from "./certificado";
import{Pago} from "./pago";
import{VideoProfesional} from "./video-profesional";

export interface Profesional {
    id?: string;
    profesional_userData: User
    profession: string;
    professionalId: string;
    descriptionprofesional: string;
    linkedin?: string;
    linkReunion?: string;
    direccionPresencial?: string;
    titulos: TitulosPro[];
    experiencias: ExperienciaPro[];
    certificados?: Certificado[];
    pago?: Pago;
    video?: VideoProfesional | null;
}
