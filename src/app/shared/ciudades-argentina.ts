const ordenar = (ciudades: string[]) => [...ciudades].sort((a, b) => a.localeCompare(b, 'es'));

/** Provincias argentinas (y CABA) con sus principales ciudades y localidades */
export const CIUDADES_ARGENTINA: Record<string, string[]> = {
  'Buenos Aires': ordenar([
    'Adrogué', 'Avellaneda', 'Azul', 'Bahía Blanca', 'Balcarce', 'Banfield', 'Berazategui', 'Berisso',
    'Bolívar', 'Bragado', 'Campana', 'Cañuelas', 'Caseros', 'Chascomús', 'Chivilcoy', 'Dolores',
    'Ensenada', 'Escobar', 'Ezeiza', 'Florencio Varela', 'General Rodríguez', 'Hurlingham', 'Ituzaingó',
    'José C. Paz', 'Junín', 'La Plata', 'Lanús', 'Lobos', 'Lomas de Zamora', 'Luján', 'Mar del Plata',
    'Mercedes', 'Merlo', 'Monte Grande', 'Morón', 'Moreno', 'Necochea', 'Olavarría', 'Pehuajó', 'Pergamino',
    'Pilar', 'Pinamar', 'Punta Alta', 'Quilmes', 'San Fernando', 'San Isidro', 'San Justo', 'San Martín',
    'San Miguel', 'San Nicolás de los Arroyos', 'San Vicente', 'Tandil', 'Tigre', 'Trenque Lauquen',
    'Tres Arroyos', 'Vicente López', 'Villa Gesell', 'Zárate',
  ]),
  'Catamarca': ordenar([
    'Andalgalá', 'Antofagasta de la Sierra', 'Belén', 'Chumbicha', 'Fiambalá', 'Fray Mamerto Esquiú',
    'Londres', 'Pomán', 'Recreo', 'San Fernando del Valle de Catamarca', 'Santa María', 'Tinogasta', 'Valle Viejo',
  ]),
  'Chaco': ordenar([
    'Barranqueras', 'Charata', 'Fontana', 'General San Martín', 'Juan José Castelli', 'Las Breñas',
    'Machagai', 'Presidencia Roque Sáenz Peña', 'Puerto Tirol', 'Quitilipi', 'Resistencia', 'Villa Ángela',
  ]),
  'Chubut': ordenar([
    'Comodoro Rivadavia', 'Dolavon', 'Esquel', 'Gaiman', 'Puerto Madryn', 'Rada Tilly', 'Rawson',
    'Río Mayo', 'Sarmiento', 'Trelew', 'Trevelin',
  ]),
  'Ciudad Autónoma de Buenos Aires': ['Ciudad Autónoma de Buenos Aires'],
  'Córdoba': ordenar([
    'Alta Gracia', 'Arroyito', 'Bell Ville', 'Córdoba', 'Cosquín', 'Cruz del Eje', 'Deán Funes', 'Jesús María',
    'La Calera', 'La Falda', 'Laboulaye', 'Leones', 'Malagueño', 'Marcos Juárez', 'Mina Clavero', 'Morteros',
    'Oncativo', 'Río Ceballos', 'Río Cuarto', 'Río Segundo', 'Río Tercero', 'San Francisco', 'Unquillo',
    'Villa Allende', 'Villa Carlos Paz', 'Villa del Rosario', 'Villa Dolores', 'Villa General Belgrano', 'Villa María',
  ]),
  'Corrientes': ordenar([
    'Bella Vista', 'Corrientes', 'Curuzú Cuatiá', 'Empedrado', 'Esquina', 'Goya', 'Ituzaingó', 'Mercedes',
    'Monte Caseros', 'Paso de los Libres', 'Saladas', 'Santo Tomé', 'Sauce', 'Virasoro',
  ]),
  'Entre Ríos': ordenar([
    'Basavilbaso', 'Chajarí', 'Colón', 'Concepción del Uruguay', 'Concordia', 'Crespo', 'Diamante', 'Federación',
    'Federal', 'Gualeguay', 'Gualeguaychú', 'La Paz', 'Nogoyá', 'Paraná', 'Rosario del Tala', 'San José',
    'Victoria', 'Villa Elisa', 'Villaguay',
  ]),
  'Formosa': ordenar([
    'Clorinda', 'Comandante Fontana', 'El Colorado', 'Formosa', 'Herradura', 'Ibarreta', 'Ingeniero Juárez',
    'Laguna Blanca', 'Las Lomitas', 'Pirané',
  ]),
  'Jujuy': ordenar([
    'Abra Pampa', 'Calilegua', 'El Carmen', 'Fraile Pintado', 'Humahuaca', 'La Quiaca', 'Libertador General San Martín',
    'Maimará', 'Palpalá', 'Perico', 'Purmamarca', 'San Pedro de Jujuy', 'San Salvador de Jujuy', 'Tilcara',
  ]),
  'La Pampa': ordenar([
    'Catriló', 'Eduardo Castex', 'General Acha', 'General Pico', 'Guatraché', 'Ingeniero Luiggi', 'Intendente Alvear',
    'Macachín', 'Rancul', 'Realicó', 'Santa Rosa', 'Toay', 'Trenel', 'Victorica', 'Winifreda', '25 de Mayo',
  ]),
  'La Rioja': ordenar([
    'Aimogasta', 'Anillaco', 'Arauco', 'Chamical', 'Chepes', 'Chilecito', 'Famatina', 'La Rioja', 'Nonogasta',
    'Sanagasta', 'Villa Unión', 'Vinchina',
  ]),
  'Mendoza': ordenar([
    'General Alvear', 'Godoy Cruz', 'Guaymallén', 'Junín', 'Las Heras', 'Lavalle', 'Luján de Cuyo', 'Maipú',
    'Malargüe', 'Mendoza', 'Palmira', 'Rivadavia', 'San Carlos', 'San Martín', 'San Rafael', 'Santa Rosa',
    'Tunuyán', 'Tupungato', 'Uspallata',
  ]),
  'Misiones': ordenar([
    'Apóstoles', 'Aristóbulo del Valle', 'Bernardo de Irigoyen', 'Candelaria', 'Concepción de la Sierra', 'Eldorado',
    'Garupá', 'Jardín América', 'Leandro N. Alem', 'Montecarlo', 'Oberá', 'Posadas', 'Puerto Iguazú',
    'Puerto Rico', 'San Ignacio', 'San Pedro', 'San Vicente', 'Wanda',
  ]),
  'Neuquén': ordenar([
    'Aluminé', 'Añelo', 'Centenario', 'Chos Malal', 'Cutral Có', 'Junín de los Andes', 'Loncopué', 'Neuquén',
    'Picún Leufú', 'Plaza Huincul', 'Plottier', 'Rincón de los Sauces', 'San Martín de los Andes', 'Senillosa',
    'Villa La Angostura', 'Zapala',
  ]),
  'Río Negro': ordenar([
    'Allen', 'Campo Grande', 'Catriel', 'Cervantes', 'Chimpay', 'Choele Choel', 'Cinco Saltos', 'Cipolletti',
    'El Bolsón', 'Fernández Oro', 'General Roca', 'Ingeniero Jacobacci', 'Lamarque', 'Las Grutas', 'Luis Beltrán',
    'Río Colorado', 'San Antonio Oeste', 'San Carlos de Bariloche', 'Sierra Grande', 'Viedma', 'Villa Regina',
  ]),
  'Salta': ordenar([
    'Aguaray', 'Cachi', 'Cafayate', 'Campo Quijano', 'Cerrillos', 'Chicoana', 'El Carril', 'Embarcación',
    'General Güemes', 'General Mosconi', 'Hipólito Yrigoyen', 'Iruya', 'Joaquín V. González', 'La Caldera',
    'Las Lajitas', 'Metán', 'Molinos', 'Pichanal', 'Rosario de la Frontera', 'Rosario de Lerma', 'Salta',
    'Salvador Mazza', 'San Antonio de los Cobres', 'San Ramón de la Nueva Orán', 'Tartagal', 'Vaqueros',
  ]),
  'San Juan': ordenar([
    'Albardón', 'Angaco', 'Calingasta', 'Caucete', 'Chimbas', 'Jáchal', 'Media Agua', 'Pocito', 'Rawson',
    'Rivadavia', 'San Agustín de Valle Fértil', 'San Juan', 'San Martín', 'Santa Lucía', 'Ullum', 'Zonda', '25 de Mayo',
  ]),
  'San Luis': ordenar([
    'Arizona', 'Buena Esperanza', 'Candelaria', 'Concarán', 'Juana Koslay', 'Justo Daract', 'La Punta', 'Luján',
    'Merlo', 'Naschel', 'Quines', 'San Luis', 'Santa Rosa del Conlara', 'Tilisarao', 'Unión', 'Villa de la Quebrada',
    'Villa Mercedes',
  ]),
  'Santa Cruz': ordenar([
    '28 de Noviembre', 'Caleta Olivia', 'Cañadón Seco', 'Comandante Luis Piedrabuena', 'El Calafate', 'El Chaltén',
    'Gobernador Gregores', 'Las Heras', 'Los Antiguos', 'Perito Moreno', 'Pico Truncado', 'Puerto Deseado',
    'Puerto San Julián', 'Río Gallegos', 'Río Turbio',
  ]),
  'Santa Fe': ordenar([
    'Arroyo Seco', 'Avellaneda', 'Cañada de Gómez', 'Capitán Bermúdez', 'Carcarañá', 'Casilda', 'Ceres', 'Esperanza',
    'Firmat', 'Fray Luis Beltrán', 'Funes', 'Gálvez', 'Granadero Baigorria', 'Las Parejas', 'Las Rosas', 'Pérez',
    'Puerto General San Martín', 'Rafaela', 'Reconquista', 'Recreo', 'Roldán', 'Rosario', 'Rufino', 'San Cristóbal',
    'San Jorge', 'San Justo', 'San Lorenzo', 'Santa Fe', 'Santo Tomé', 'Sauce Viejo', 'Sunchales', 'Tostado',
    'Venado Tuerto', 'Vera', 'Villa Constitución', 'Villa Gobernador Gálvez',
  ]),
  'Santiago del Estero': ordenar([
    'Añatuya', 'Bandera', 'Beltrán', 'Campo Gallo', 'Clodomira', 'Fernández', 'Frías', 'La Banda', 'Loreto',
    'Monte Quemado', 'Nueva Esperanza', 'Pinto', 'Quimilí', 'Santiago del Estero', 'Suncho Corral', 'Sumampa',
    'Termas de Río Hondo', 'Villa Ojo de Agua',
  ]),
  'Tierra del Fuego': ordenar(['Río Grande', 'Tolhuin', 'Ushuaia']),
  'Tucumán': ordenar([
    'Aguilares', 'Alderetes', 'Amaicha del Valle', 'Banda del Río Salí', 'Bella Vista', 'Burruyacú', 'Concepción',
    'El Manantial', 'Famaillá', 'Graneros', 'Juan Bautista Alberdi', 'La Cocha', 'Las Talitas', 'Leales', 'Lules',
    'Monteros', 'San Miguel de Tucumán', 'Simoca', 'Tafí del Valle', 'Tafí Viejo', 'Trancas', 'Villa Carmela',
    'Yerba Buena',
  ]),
};

export const PROVINCIAS_ARGENTINA = Object.keys(CIUDADES_ARGENTINA);
