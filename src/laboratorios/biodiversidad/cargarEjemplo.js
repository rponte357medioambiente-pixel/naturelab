import { cargarModelo } from '../../modelos/cargarModelo.js';
import { modeloPorId } from '../../modelos/registro.js';
import { ID_EJEMPLO } from './ejemploSalar.js';

/** Carga (o restaura) el modelo del Salar de los Canos. Para cualquier modelo, usa cargarModelo(). */
export const cargarEjemploSalar = () => cargarModelo(modeloPorId(ID_EJEMPLO));
