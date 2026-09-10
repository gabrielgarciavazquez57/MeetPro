import { Address } from "./address";

export interface User {
    id?: string | number;
    isProfesional: boolean;
    username: string;
    password: string;
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
