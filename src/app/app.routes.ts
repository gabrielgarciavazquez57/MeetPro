import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { UserForm } from './components/user-form/user-form';
import { ProfesionalForm } from './components/prof-form/prof-form';
import { ProfList } from './components/prof-list/prof-list';
import { PerfilUser } from './components/perfil-user/perfil-user';
import { PerfilProfesional } from './components/perfil-prof/perfil-prof';
import { Login } from './components/login/login';
import { ListaTurnos } from './components/lista-turnos/lista-turnos';
import { AgendaProfesional } from './components/agenda-profesional/agenda-profesional';
import { ListaUsuarios } from './components/lista-usuarios/lista-usuarios';
import { ListaTurnosExistentes } from './components/lista-turnos-existentes/lista-turnos-existentes';
import { ProfesionalesConsultados } from './components/profesionales-consultados/profesionales-consultados';
import { ListadoClientes } from './components/listado-clientes/listado-clientes';
import { FormularioConsulta } from './components/formulario-consulta/formulario-consulta';
import { Valoraciones } from './components/valoraciones/valoraciones';
import { InformacionProfesionalComponent } from './components/informacion-profesional/informacion-profesional';
import { ContenidoClienteProfesional } from './components/contenido-cliente-profesional/contenido-cliente-profesional';
import { PagoComponent } from './components/pago/pago';
import { ListaNotificaciones } from './components/lista-notificaciones/lista-notificaciones';
import { ListaConsultas } from './components/lista-consultas/lista-consultas';
import { HistorialPagos } from './components/historial-pagos/historial-pagos';

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
    path: 'usuarios',
    title: 'Usuarios',
    component: ListaUsuarios
  },
  {
    path: 'agenda/:profesionalId',
    title: 'Mi agenda',
    component: AgendaProfesional
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
    path: 'listado-clientes/:profesionalId',
    title: 'Listado de clientes',
    component: ListadoClientes
  },
  {
    path: 'consulta/:profesionalId',
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
    path: 'contenido-cliente-profesional/:profesionalId',
    title: 'Contenido: Cliente - Profesional',
    component: ContenidoClienteProfesional
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
},
{
  path: 'pago/:profesionalId',
  title: 'Realizar pago - Mensual',
  component: PagoComponent,
},
{
  path: 'notificaciones',
  title: 'Notificaciones',
  component: ListaNotificaciones,
},
{
  path: 'consultas',
  title: 'Consultas',
  component: ListaConsultas,
},
{
  path: 'pagos-realizados',
  title: 'Pagos realizados',
  component: HistorialPagos,
  data: { modo: 'realizados' },
},
{
  path: 'pagos-recibidos',
  title: 'Pagos recibidos',
  component: HistorialPagos,
  data: { modo: 'recibidos' },
}
];