import { useState } from 'react';
import { enlaceMapa, leerCoordenadas, obtenerUbicacion, textoPrecision } from './coordenadas.js';

const IconoGps = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="20" height="20">
    <circle cx="12" cy="12" r="3.5" />
    <circle cx="12" cy="12" r="8" />
    <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22" />
  </svg>
);

export const IconoMapa = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z" />
    <circle cx="12" cy="10" r="2.2" />
  </svg>
);

/** Enlace «Ver en el mapa» (OpenStreetMap). */
export function EnlaceMapa({ coordenadas, children = 'Ver en el mapa' }) {
  if (!coordenadas) return null;
  return (
    <a className="enlace-mapa" href={enlaceMapa(coordenadas)} target="_blank" rel="noopener noreferrer">
      <IconoMapa />
      {children}
    </a>
  );
}

/**
 * Latitud y longitud, con el botón «Usar mi ubicación».
 * @param {{lat: string, lon: string, precision: number|null}} props.valor  campos de texto
 */
export function CamposCoordenadas({ prefijo, valor, alCambiar, errores = {} }) {
  const [buscando, setBuscando] = useState(false);
  const [estado, setEstado] = useState(null); // { tipo: 'ok'|'error', texto }
  const lectura = leerCoordenadas(valor);

  async function usarUbicacion() {
    setBuscando(true);
    setEstado(null);
    try {
      const c = await obtenerUbicacion();
      alCambiar({ lat: String(c.lat), lon: String(c.lon), precision: c.precision });
      setEstado({ tipo: 'ok', texto: `Ubicación obtenida con una precisión de ${textoPrecision(c)}.` });
    } catch (error) {
      setEstado({ tipo: 'error', texto: error.message });
    } finally {
      setBuscando(false);
    }
  }

  const campo = (clave, etiqueta) => (
    <div className="campo">
      <label htmlFor={`campo-${prefijo}${clave}`}>{etiqueta}</label>
      <input
        id={`campo-${prefijo}${clave}`}
        inputMode="decimal"
        autoComplete="off"
        value={valor[clave]}
        placeholder={clave === 'lat' ? '37.21610' : '-1.81320'}
        // Al escribir a mano, la precisión del GPS ya no se aplica.
        onChange={(e) => alCambiar({ ...valor, [clave]: e.target.value, precision: null })}
        aria-invalid={Boolean(errores[clave])}
        aria-describedby={errores[clave] ? `error-${prefijo}${clave}` : undefined}
      />
      {errores[clave] && (
        <p className="error-campo" id={`error-${prefijo}${clave}`}>
          {errores[clave]}
        </p>
      )}
    </div>
  );

  return (
    <div className="campos-coordenadas">
      <button type="button" className="boton boton--secundario" onClick={usarUbicacion} disabled={buscando}>
        <IconoGps />
        {buscando ? 'Buscando tu ubicación…' : 'Usar mi ubicación'}
      </button>
      {estado && (
        <p className={`texto-pequeno ${estado.tipo === 'error' ? 'error-campo' : 'texto-suave'}`} role="status" style={{ margin: 0 }}>
          {estado.texto}
        </p>
      )}
      <div className="fila-campos">
        {campo('lat', 'Latitud')}
        {campo('lon', 'Longitud')}
      </div>
      {lectura.valida && lectura.coordenadas && (
        <div className="campos-coordenadas__acciones">
          <EnlaceMapa coordenadas={lectura.coordenadas} />
          <button type="button" className="boton boton--sencillo" onClick={() => alCambiar({ lat: '', lon: '', precision: null })}>
            Quitar
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Ubicación de una parcela o un transecto: la de la investigación o una propia.
 * @param {{propia: boolean, lat, lon, precision}} props.valor
 */
export function UbicacionUnidad({ prefijo, nombre, valor, alCambiar, errores }) {
  return (
    <fieldset className="ubicacion-unidad">
      <legend>Ubicación {nombre}</legend>
      <label className="casilla">
        <input type="radio" name={`${prefijo}ubicacion`} checked={!valor.propia} onChange={() => alCambiar({ ...valor, propia: false })} />
        <span>La de la investigación</span>
      </label>
      <label className="casilla">
        <input type="radio" name={`${prefijo}ubicacion`} checked={valor.propia} onChange={() => alCambiar({ ...valor, propia: true })} />
        <span>Una propia</span>
      </label>
      {valor.propia && (
        <CamposCoordenadas prefijo={prefijo} valor={valor} alCambiar={(v) => alCambiar({ ...valor, ...v })} errores={errores} />
      )}
    </fieldset>
  );
}
