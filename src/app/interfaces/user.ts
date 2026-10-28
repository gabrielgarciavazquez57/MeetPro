import { Address } from "./address";

export interface User {
    id?: string | number;
    isProfesional: boolean;
    isAdmin: boolean;
    username: string;
    /** Solo se usa al registrarse o cambiar la contraseña; nunca se guarda en la tabla */
    password?: string;
    /** Id de la cuenta en Supabase Auth */
    auth_id?: string;
    name: string;   
    lastname: string;
    dateOfBirth: Date;  
    age: number;        
    email: string;
    phoneNumber: string;
    dni: string;
    gender: string;
    nationality: string;
    fotoPerfil?: string;
    address: Address;
}
