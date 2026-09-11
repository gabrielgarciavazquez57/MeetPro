import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { UserForm } from './components/user-form/user-form';
import { ProfesionalForm } from './components/prof-form/prof-form';
import { ProfList } from './components/prof-list/prof-list';
import { PerfilUser } from './components/perfil-user/perfil-user';
import { PerfilProfesional } from './components/perfil-prof/perfil-prof';
import { Login } from './components/login/login';
import { ListaTurnos } from './components/lista-turnos/lista-turnos';
import { TurnoForm } from './components/turno-form/turno-form';
import { ListaTurnosExistentes } from './components/lista-turnos-existentes/lista-turnos-existentes';
import { ProfesionalesConsultados } from './components/profesionales-consultados/profesionales-consultados';
import { FormularioConsulta } from './components/formulario-consulta/formulario-consulta';
import { Valoraciones } from './components/valoraciones/valoraciones';
import { InformacionProfesionalComponent } from './components/informacion-profesional/informacion-profesional';

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
    path: 'editar-usuario/:id',
    title: 'Editar perfil',
    component: UserForm,
    data: { editar: true }
  },
  {
    path: 'CreateProfesional/:userId',
    title: 'Create Profesional',
    component: ProfesionalForm
  },
  {
    path: 'editar-profesional/:userId',
    title: 'Editar perfil profesional',
    component: ProfesionalForm,
    data: { editar: true }
  },
  {
    path: 'profesionales-lista',
    title: 'Profesionales Lista',
    component: ProfList
  },
  {
    path: 'turnos/:profesionalId',
    title: 'Turnos disponibles',
    component: ListaTurnos
  },
  {
    path: 'turno-form/:profesionalId',
    title: 'Nuevo turno',
    component: TurnoForm
  },
  {
    path: 'turnos-existentes/:userId',
    title: 'Turnos existentes',
    component: ListaTurnosExistentes
  },
  {
    path: 'profesionales-consultados/:userId',
    title: 'Profesionales consultados',
    component: ProfesionalesConsultados
  },
  {
    path: 'consulta',
    title: 'Nueva consulta',
    component: FormularioConsulta
  },
  {
    path: 'valoraciones/:profesionalId',
    title: 'Valoraciones',
    component: Valoraciones
  },
  {
    path: 'informacion-profesional/:profesionalId',
    title: 'Información Profesional',
    component: InformacionProfesionalComponent
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