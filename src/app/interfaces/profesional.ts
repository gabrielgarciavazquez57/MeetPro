import { User } from "./user";
import{TitulosPro} from "./titulos-pro";
import{ExperienciaPro} from "./experiencia-pro";
import{Certificado} from "./certificado";

export interface Profesional {
    id?: string;
    profesional_userData: User
    profession: string;
    professionalId: string;
    descriptionprofesional: string;
    linkedin?: string;
    titulos: TitulosPro[];
    experiencias: ExperienciaPro[];
    certificados?: Certificado[];
}
