import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { UserForm } from './components/user-form/user-form';
import { ProfesionalForm } from './components/prof-form/prof-form';
import { ProfList } from './components/prof-list/prof-list';

export const routes: Routes = [
  {
    path: '',
    component: Home
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
  }
];