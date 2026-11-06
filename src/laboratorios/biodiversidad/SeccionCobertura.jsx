import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { resumirCobertura } from '../../calculos/cobertura.js';
import { formatearFecha, formatearNumero, formatearPorcentaje, plural } from '../../calculos/formato.js';
import { colorTaxon } from '../../componentes/FranjaAbundancia.jsx';
import { FranjaTransecto } from '../../componentes/FranjaTransecto.jsx';
import { IconoDescargar } from '../../componentes/Iconos.jsx';
import { descargarArchivo } from '../../importacion-exportacion/descargar.js';
import { csvAnotaciones, csvCobertura, nombreArchivo } from '../../importacion-exportacion/exportar.js';

const cm = (valor) => `${formatearNumero(valor, valor % 1 ? 1 : 0)} cm`;

export function SeccionCobertura() {
  const { investigacion, parcelas: transectos, observaciones, catalogo } = useOutletContext();
  const [ambito, setAmbito] = useState('todos');
  const elegido = transectos.find((t) => t.id === ambito) ?? (transectos.length === 1 ? transectos[0] : null);
  const etiquetaAmbito = elegido ? `el transecto ${elegido.codigo}` : 'el conjunto de transectos';
  const varios = !elegido && transectos.length > 1;

  const resumen = useMemo(() => {
    const r = resumirCobertura(transectos, observaciones, elegido?.id ?? null);
    const taxones = r.taxones.map((t) => {
      const especie = catalogo.buscarEspecie(t.especieId);
      return especie ? { ...t, nombreComun: especie.nombreComun, nombreCientifico: especie.nombreCientifico } : t;
    });
    return { ...r, taxones, dominante: taxones.find((t) => t.cm > 0) ?? null };
  }, [transectos, observaciones, elegido, catalogo]);

  const conCobertura = resumen.taxones.filter((t) => t.cm > 0);

  function descargarResultados() {
    descargarArchivo(
      nombreArchivo(investigacion, 'cobertura', 'csv'),
      csvCobertura(resumen, etiquetaAmbito),
      'text/csv;charset=utf-8',
    );
  }

  function descargarAnotaciones() {
    descargarArchivo(
      nombreArchivo(investigacion, 'anotaciones', 'csv'),
      csvAnotaciones({ parcelas: transectos, observaciones }, catalogo.buscarEspecie),
      'text/csv;charset=utf-8',
    );
  }

  if (conCobertura.length === 0) {
    return (
      <div className="vacio">
        <p>Los resultados aparecerán al anotar las manchas de cada especie. Se recalculan solos cada vez que cambian.</p>
      </div>
    );
  }

  const { S, coberturaTotal, suelo, sueloCm, solapeCm, faltanCm, dominante, L } = resumen;

  return (
    <section aria-labelledby="titulo-cobertura">
      <h2 id="titulo-cobertura" className="solo-lectores">
        Resultados
      </h2>

      {transectos.length > 1 && (
        <div className="pastillas no-imprimir" role="group" aria-label="Calcular para">
          <button type="button" aria-pressed={ambito === 'todos'} onClick={() => setAmbito('todos')}>
            Todos los transectos
          </button>
          {transectos.map((t) => (
            <button key={t.id} type="button" aria-pressed={ambito === t.id} onClick={() => setAmbito(t.id)}>
              {t.codigo} · {t.orientacion}
            </button>
          ))}
        </div>
      )}
      <p className="texto-suave texto-pequeno">
        Resultados para {etiquetaAmbito}: {cm(L)} de línea
        {varios && ` en ${plural(transectos.length, 'transecto', 'transectos')}`}.
      </p>

      <dl className="indicadores">
        <div className="indicador">
          <dt>Especies</dt>
          <dd>
            {formatearNumero(S)}
            <small>con cobertura</small>
          </dd>
        </div>
        <div className="indicador">
          <dt>Cobertura total</dt>
          <dd>
            {formatearPorcentaje(coberturaTotal)}
            <small>{cm(resumen.cubiertoCm)} cubiertos</small>
          </dd>
        </div>
        <div className="indicador">
          <dt>Suelo desnudo</dt>
          <dd>
            {formatearPorcentaje(suelo)}
            <small>{cm(sueloCm)}</small>
          </dd>
        </div>
        <div className="indicador">
          <dt>Especie dominante</dt>
          <dd>
            {formatearPorcentaje(dominante.proporcion)}
            <small>{dominante.nombreComun}</small>
          </dd>
        </div>
      </dl>

      {faltanCm > 0 && (
        <div className="aviso aviso--ocre">
          <p>
            Faltan {cm(faltanCm)} por anotar. Mientras tanto, la cobertura total solo cuenta lo anotado y puede estar
            por debajo de la real.
          </p>
        </div>
      )}
      {resumen.taxonesPendientes > 0 && (
        <div className="aviso aviso--ocre">
          <p>
            {plural(resumen.taxonesPendientes, 'especie tiene', 'especies tienen')} la identificación pendiente de
            revisar.
          </p>
        </div>
      )}

      <h3>Cobertura por especie</h3>
      <ul className="barras-cobertura">
        {conCobertura.map((t, i) => (
          <li key={t.clave}>
            <div className="barras-cobertura__texto">
              <strong>{t.nombreComun}</strong>
              <span>
                {cm(t.cm)} · {formatearPorcentaje(t.proporcion)}
              </span>
            </div>
            <div className="barras-cobertura__barra" aria-hidden="true">
              <span style={{ width: `${Math.min(100, t.proporcion * 100)}%`, background: colorTaxon(i) }} />
            </div>
            {varios && (
              <span className="texto-pequeno texto-suave">
                Aparece en {t.frecuencia} de {transectos.length} transectos
              </span>
            )}
          </li>
        ))}
      </ul>

      {elegido?.modoAnotacion === 'tramos' && (
        <div className="panel" style={{ marginTop: '1rem' }}>
          <h3 style={{ marginTop: 0 }}>Franja del transecto {elegido.codigo}</h3>
          <FranjaTransecto L={elegido.longitudCm} taxones={resumen.taxones} />
        </div>
      )}

      <h3>Qué significan</h3>
      <p>
        La cobertura de cada especie es la parte de la cuerda que queda bajo ella: sus centímetros divididos entre la
        longitud de la línea. La cobertura total es lo que no es suelo desnudo.
        {solapeCm > 0
          ? ` Aquí hay ${cm(solapeCm)} en los que dos especies se solapan, así que la suma de coberturas pasa del 100 %.`
          : ' Cuando dos plantas se solapan, cuentan las dos, y la suma puede pasar del 100 %.'}
      </p>

      <div className="tabla-desplazable">
        <table>
          <caption>Cálculo paso a paso</caption>
          <thead>
            <tr>
              <th scope="col">Especie</th>
              <th scope="col" className="num">
                Manchas
              </th>
              <th scope="col" className="num">
                cm
              </th>
              <th scope="col" className="num">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {conCobertura.map((t) => (
              <tr key={t.clave}>
                <th scope="row" style={{ fontWeight: 400, color: 'inherit' }}>
                  {t.nombreComun}
                </th>
                <td className="num">{formatearNumero(t.numeroManchas)}</td>
                <td className="num">{formatearNumero(t.cm, t.cm % 1 ? 1 : 0)}</td>
                <td className="num">{formatearNumero(t.proporcion * 100, 1)}</td>
              </tr>
            ))}
            <tr>
              <th scope="row" style={{ fontWeight: 400, color: 'inherit' }}>
                Suelo desnudo
              </th>
              <td className="num" />
              <td className="num">{formatearNumero(sueloCm, sueloCm % 1 ? 1 : 0)}</td>
              <td className="num">{formatearNumero(suelo * 100, 1)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Longitud de la línea</th>
              <td className="num" />
              <td className="num">
                <strong>{formatearNumero(L, L % 1 ? 1 : 0)}</strong>
              </td>
              <td className="num">100</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="formula">
        Cobertura (%) = cm de la especie ÷ longitud de la línea × 100.
        {varios && ' Con varios transectos, se suman los cm de cada especie en todas las líneas y se divide entre la longitud total.'}
      </p>

      <div className="panel">
        <h3>Conclusión</h3>
        <p>
          En {etiquetaAmbito} se han anotado {plural(S, 'especie', 'especies')}. La cobertura vegetal es del{' '}
          {formatearPorcentaje(coberturaTotal)}
          {sueloCm > 0 ? ` y el suelo desnudo ocupa el ${formatearPorcentaje(suelo)}` : ', sin suelo desnudo'}. Domina{' '}
          {dominante.nombreComun}, que cubre el {formatearPorcentaje(dominante.proporcion)} de la línea.
        </p>
        <p className="texto-suave" style={{ marginBottom: 0 }}>
          Estos valores describen las líneas medidas, no todo el espacio natural. Para comparar zonas o fechas, usa la
          misma longitud y las mismas orientaciones.
        </p>
      </div>

      <div className="acciones no-imprimir">
        <button type="button" className="boton boton--secundario" onClick={descargarResultados}>
          <IconoDescargar />
          CSV de resultados
        </button>
        <button type="button" className="boton boton--secundario" onClick={descargarAnotaciones}>
          <IconoDescargar />
          CSV de anotaciones
        </button>
      </div>

      <p className="solo-impresion texto-pequeno">
        Informe generado el {formatearFecha(new Date().toISOString())} con NaturaLab.
      </p>
    </section>
  );
}
