import { Link } from 'react-router-dom';
import { esTransecto, necesitaCopia } from '../almacenamiento/modelo.js';
import { resumirBiodiversidad } from '../calculos/biodiversidad.js';
import { resumirCobertura } from '../calculos/cobertura.js';
import { formatearFecha, formatearPorcentaje, plural } from '../calculos/formato.js';
import { FranjaAbundancia } from './FranjaAbundancia.jsx';
import { EstadoCopia } from './EstadoCopia.jsx';

/** Resumen breve para la tarjeta, según el tipo de práctica. */
function resumenTarjeta(investigacion, parcelas, observaciones) {
  if (esTransecto(investigacion)) {
    const r = resumirCobertura(parcelas, observaciones);
    const conCm = r.taxones.filter((t) => t.cm > 0);
    return {
      texto: `${plural(r.S, 'especie', 'especies')}, ${plural(parcelas.length, 'transecto', 'transectos')}${r.S ? `, cobertura ${formatearPorcentaje(r.coberturaTotal)}` : ''}`,
      // La franja usa los cm de cada especie en lugar de individuos.
      taxones: conCm.map((t) => ({ ...t, abundancia: t.cm, proporcion: t.cm / (r.sumaEspeciesCm || 1) })),
      N: r.sumaEspeciesCm,
    };
  }
  const r = resumirBiodiversidad(observaciones, parcelas);
  return {
    texto: `${plural(r.S, 'especie', 'especies')}, ${plural(r.N, 'individuo', 'individuos')}`,
    taxones: r.taxones,
    N: r.N,
  };
}

export function TarjetaInvestigacion({ investigacion, parcelas, observaciones }) {
  const resumen = resumenTarjeta(investigacion, parcelas, observaciones);
  const fecha = investigacion.fechaObservacion
    ? formatearFecha(investigacion.fechaObservacion)
    : `Actualizada el ${formatearFecha(investigacion.fechaModificacion)}`;

  return (
    <Link to={`/investigaciones/${investigacion.id}`} className="tarjeta-investigacion">
      <h3>{investigacion.titulo}</h3>
      <div className="metadatos">
        <span>{fecha}</span>
        {investigacion.lugarTexto && <span>{investigacion.lugarTexto}</span>}
        <span>{resumen.texto}</span>
        {observaciones.length > 0 && <EstadoCopia pendiente={necesitaCopia(investigacion)} />}
      </div>
      <FranjaAbundancia taxones={resumen.taxones} N={resumen.N} mini />
    </Link>
  );
}
