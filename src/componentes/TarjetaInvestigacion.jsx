import { Link } from 'react-router-dom';
import { necesitaCopia } from '../almacenamiento/modelo.js';
import { resumirBiodiversidad } from '../calculos/biodiversidad.js';
import { formatearFecha, plural } from '../calculos/formato.js';
import { FranjaAbundancia } from './FranjaAbundancia.jsx';
import { EstadoCopia } from './EstadoCopia.jsx';

export function TarjetaInvestigacion({ investigacion, parcelas, observaciones }) {
  const resumen = resumirBiodiversidad(observaciones, parcelas);
  const fecha = investigacion.fechaObservacion
    ? formatearFecha(investigacion.fechaObservacion)
    : `Actualizada el ${formatearFecha(investigacion.fechaModificacion)}`;

  return (
    <Link to={`/investigaciones/${investigacion.id}`} className="tarjeta-investigacion">
      <h3>{investigacion.titulo}</h3>
      <div className="metadatos">
        <span>{fecha}</span>
        {investigacion.lugarTexto && <span>{investigacion.lugarTexto}</span>}
        <span>
          {plural(resumen.S, 'especie', 'especies')}, {plural(resumen.N, 'individuo', 'individuos')}
        </span>
        {observaciones.length > 0 && <EstadoCopia pendiente={necesitaCopia(investigacion)} />}
      </div>
      <FranjaAbundancia taxones={resumen.taxones} N={resumen.N} mini />
    </Link>
  );
}
