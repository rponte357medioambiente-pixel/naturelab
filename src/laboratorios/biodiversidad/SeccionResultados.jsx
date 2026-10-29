import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { resumirBiodiversidad } from '../../calculos/biodiversidad.js';
import { formatearFecha, formatearNumero, formatearPorcentaje, plural } from '../../calculos/formato.js';
import { FranjaAbundancia } from '../../componentes/FranjaAbundancia.jsx';
import { IconoDescargar } from '../../componentes/Iconos.jsx';
import { descargarArchivo } from '../../importacion-exportacion/descargar.js';
import { csvObservaciones, csvResultados, nombreArchivo } from '../../importacion-exportacion/exportar.js';

export function SeccionResultados() {
  const { investigacion, parcelas, observaciones, catalogo } = useOutletContext();
  const [ambito, setAmbito] = useState('todas');

  const parcelaElegida = parcelas.find((p) => p.id === ambito) ?? null;
  const etiquetaAmbito = parcelaElegida
    ? `la parcela ${parcelaElegida.codigo}`
    : parcelas.length === 1
      ? `la parcela ${parcelas[0].codigo}`
      : 'el conjunto de parcelas';

  const resumen = useMemo(() => {
    const r = resumirBiodiversidad(observaciones, parcelas, parcelaElegida?.id ?? null);
    // Nombres actualizados desde el catálogo cuando la especie está en él.
    const taxones = r.taxones.map((t) => {
      const especie = catalogo.buscarEspecie(t.especieId);
      return especie ? { ...t, nombreComun: especie.nombreComun, nombreCientifico: especie.nombreCientifico } : t;
    });
    return { ...r, taxones, dominante: taxones[0] ?? null };
  }, [observaciones, parcelas, parcelaElegida, catalogo]);

  function descargarResultados() {
    descargarArchivo(
      nombreArchivo(investigacion, 'resultados', 'csv'),
      csvResultados(resumen, etiquetaAmbito),
      'text/csv;charset=utf-8',
    );
  }

  function descargarObservaciones() {
    descargarArchivo(
      nombreArchivo(investigacion, 'observaciones', 'csv'),
      csvObservaciones({ parcelas, observaciones }, catalogo.buscarEspecie),
      'text/csv;charset=utf-8',
    );
  }

  if (resumen.N === 0 && observaciones.length === 0) {
    return (
      <div className="vacio">
        <FranjaAbundancia taxones={[]} N={0} />
        <p style={{ marginTop: '1rem' }}>
          Los resultados aparecerán al registrar observaciones. Se recalculan solos cada vez que cambian los datos.
        </p>
      </div>
    );
  }

  const { N, S, shannon, pielou, dominante } = resumen;

  return (
    <section aria-labelledby="titulo-resultados">
      <h2 id="titulo-resultados" className="solo-lectores">
        Resultados
      </h2>

      {parcelas.length > 1 && (
        <div className="campo no-imprimir" style={{ marginBottom: '1.25rem' }}>
          <label htmlFor="ambito">Calcular para</label>
          <select id="ambito" value={ambito} onChange={(e) => setAmbito(e.target.value)}>
            <option value="todas">Todas las parcelas</option>
            {parcelas.map((p) => (
              <option key={p.id} value={p.id}>
                Parcela {p.codigo}
              </option>
            ))}
          </select>
        </div>
      )}
      <p className="solo-impresion">Resultados para {etiquetaAmbito}.</p>

      {N === 0 ? (
        <p className="texto-suave">No hay observaciones en {etiquetaAmbito}.</p>
      ) : (
        <>
          <h3>Composición</h3>
          <FranjaAbundancia taxones={resumen.taxones} N={N} conLeyenda />

          <dl className="indicadores">
            <div className="indicador">
              <dt>Riqueza (S)</dt>
              <dd>
                {formatearNumero(S)}
                <small>{S === 1 ? 'especie' : 'especies'}</small>
              </dd>
            </div>
            <div className="indicador">
              <dt>Abundancia (N)</dt>
              <dd>
                {formatearNumero(N)}
                <small>individuos</small>
              </dd>
            </div>
            <div className="indicador">
              <dt>Shannon (H′)</dt>
              <dd>
                {formatearNumero(shannon, 3)}
                <small>máximo posible: {formatearNumero(Math.log(S), 3)}</small>
              </dd>
            </div>
            <div className="indicador">
              <dt>Pielou (J′)</dt>
              <dd>
                {pielou === null ? 'No aplicable' : formatearNumero(pielou, 3)}
                <small>de 0 a 1</small>
              </dd>
            </div>
            <div className="indicador">
              <dt>Especie dominante</dt>
              <dd>
                {formatearPorcentaje(dominante.proporcion, 2)}
                <small>{dominante.nombreComun}</small>
              </dd>
            </div>
            <div className="indicador">
              <dt>Densidad</dt>
              <dd>
                {resumen.densidadM2 === null ? '—' : formatearNumero(resumen.densidadM2, 2)}
                <small>
                  {resumen.densidadM2 === null
                    ? 'falta la superficie'
                    : `individuos/m² en ${formatearNumero(resumen.superficieM2, 1)} m²`}
                </small>
              </dd>
            </div>
          </dl>

          {resumen.taxonesPendientes > 0 && (
            <div className="aviso aviso--ocre">
              <p>
                {plural(resumen.taxonesPendientes, 'especie tiene', 'especies tienen')} la identificación pendiente de
                revisar (rayado en la franja). Los índices pueden cambiar al confirmarlos.
              </p>
            </div>
          )}

          <h3>Qué significan</h3>
          <p>
            El índice de Shannon combina cuántas especies hay y lo repartidos que están sus individuos. Vale 0 si solo
            hay una especie y crece con más especies y un reparto más equilibrado.
            {S > 1 && ` Con ${S} especies, el máximo posible es ln(${S}) = ${formatearNumero(Math.log(S), 3)}.`}
          </p>
          <p>
            {pielou === null
              ? 'La equitatividad de Pielou necesita al menos dos especies.'
              : `La equitatividad de Pielou compara H′ con ese máximo: cuanto más cerca de 1, más igualado el reparto. Aquí vale ${formatearNumero(pielou, 3)}, y ${dominante.nombreComun} reúne el ${formatearPorcentaje(dominante.proporcion)} de los individuos.`}
          </p>

          <div className="tabla-desplazable">
            <table>
              <caption>Cálculo paso a paso</caption>
              <thead>
                <tr>
                  <th scope="col">Especie</th>
                  <th scope="col" className="num">
                    nᵢ
                  </th>
                  <th scope="col" className="num">
                    pᵢ
                  </th>
                  <th scope="col" className="num">
                    −pᵢ·ln(pᵢ)
                  </th>
                </tr>
              </thead>
              <tbody>
                {resumen.taxones.map((t) => (
                  <tr key={t.clave}>
                    <th scope="row" style={{ fontWeight: 400, color: 'inherit' }}>
                      {t.nombreComun}
                    </th>
                    <td className="num">{formatearNumero(t.abundancia)}</td>
                    <td className="num">{formatearNumero(t.proporcion, 4)}</td>
                    <td className="num">{formatearNumero(t.terminoShannon, 4)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Total</th>
                  <td className="num">
                    <strong>{formatearNumero(N)}</strong>
                  </td>
                  <td className="num">1</td>
                  <td className="num">
                    <strong>{formatearNumero(shannon, 4)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="formula">
            pᵢ = nᵢ / N. La suma de la última columna es H′ = −Σ pᵢ·ln(pᵢ), con logaritmo natural. J′ = H′ / ln(S), cuando S &gt; 1. Las plantas identificadas solo hasta género (sp.) o
            sin identificar cuentan como especies distintas.
          </p>

          <div className="panel">
            <h3>Conclusión</h3>
            <p>
              En {etiquetaAmbito} se han registrado {plural(S, 'especie', 'especies')} y{' '}
              {plural(N, 'individuo', 'individuos')}. El más abundante es {dominante.nombreComun}, con el{' '}
              {formatearPorcentaje(dominante.proporcion)} del total. El índice de Shannon es{' '}
              {formatearNumero(shannon, 3)}
              {pielou === null ? '.' : ` y la equitatividad de Pielou, ${formatearNumero(pielou, 3)}.`}
            </p>
            <p className="texto-suave" style={{ marginBottom: 0 }}>
              Estos valores describen la muestra registrada, no todo el espacio natural. Para comparar parcelas o
              fechas, usa el mismo método y la misma superficie.
            </p>
          </div>
        </>
      )}

      <div className="acciones no-imprimir">
        <button type="button" className="boton boton--secundario" onClick={descargarResultados} disabled={N === 0}>
          <IconoDescargar />
          CSV de resultados
        </button>
        <button type="button" className="boton boton--secundario" onClick={descargarObservaciones}>
          <IconoDescargar />
          CSV de observaciones
        </button>
      </div>

      <p className="solo-impresion texto-pequeno">
        Informe generado el {formatearFecha(new Date().toISOString())} con NaturaLab. Catálogo provisional, pendiente de
        revisión botánica.
      </p>
    </section>
  );
}
