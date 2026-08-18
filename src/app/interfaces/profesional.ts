import { User } from "./user";
import{TitulosPro} from "./titulos-pro";
import{ExperienciaPro} from "./experiencia-pro";

export interface Profesional {
    profesional_userData: User
    profession: string; 
    professionalId: string;
    descriptionprofesional: string;
    titulos: TitulosPro[];
    experiencias: ExperienciaPro[];
}
