import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { UserForm } from './components/user-form/user-form';
import { ProfesionalForm } from './components/prof-form/prof-form';
import { ProfList } from './components/prof-list/prof-list';
import { PerfilUser } from './components/perfil-user/perfil-user';
import { PerfilProfesional } from './components/perfil-prof/perfil-prof';
import { Login } from './components/login/login';

export const routes: Routes = [
  {
    path: '',
    component: Home
  },
  {
    path: 'login',
    title: 'Iniciar sesión',
    component: Login
  },
  {
    path: 'CreateUser',
    title: 'Create User',
    component: UserForm
  },
  {
    path: 'CreateProfesional/:userId', 
    title: 'Create Profesional',
    component: ProfesionalForm
  },
  {
    path: 'profesionales-lista',
    title: 'Profesionales Lista',
    component: ProfList
  },
  {
  path: 'perfil-user/:id',
  title: 'Perfil de Usuario',
  component: PerfilUser,
},
{
  path: 'perfil-prof/:id',
  title: 'Perfil Profesional',
  component: PerfilProfesional,
}
];