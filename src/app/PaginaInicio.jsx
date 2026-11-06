import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTituloDocumento } from '../accesibilidad/useTituloDocumento.js';
import { esTransecto } from '../almacenamiento/modelo.js';
import { listarInvestigacionesConDatos } from '../almacenamiento/repositorio.js';
import { useConsulta } from '../almacenamiento/useConsulta.js';
import { resumirBiodiversidad } from '../calculos/biodiversidad.js';
import { formatearPorcentaje } from '../calculos/formato.js';
import { FranjaAbundancia } from '../componentes/FranjaAbundancia.jsx';
import { IconoMas } from '../componentes/Iconos.jsx';
import { TarjetaInvestigacion } from '../componentes/TarjetaInvestigacion.jsx';
import { crearEjemploSalar } from '../laboratorios/biodiversidad/ejemploSalar.js';

export function PaginaInicio() {
  useTituloDocumento(null);
  const { datos, cargando } = useConsulta(listarInvestigacionesConDatos, []);

  const recientes = (datos ?? []).slice(0, 3);
  // La franja de la portada cuenta individuos: solo sirve con recuentos en parcela.
  const conDatos = (datos ?? []).find((d) => !esTransecto(d.investigacion) && d.observaciones.length > 0);

  // La portada muestra la composición de la investigación más reciente con datos
  // o, si todavía no hay ninguna, la del ejercicio del Salar de los Canos.
  const portada = useMemo(() => {
    const fuente = conDatos ?? crearEjemploSalar();
    const resumen = resumirBiodiversidad(fuente.observaciones, fuente.parcelas);
    const dominante = resumen.dominante;
    const pie = conDatos
      ? `Composición de «${fuente.investigacion.titulo}»: ${dominante.nombreComun} reúne el ${formatearPorcentaje(dominante.proporcion)} de los individuos.`
      : `Así se ve el ejercicio del Salar de los Canos: el albardín reúne el ${formatearPorcentaje(dominante.proporcion)} de los individuos.`;
    return { resumen, pie };
  }, [conDatos]);

  return (
    <>
      <section className="portada">
        <h1>Tu cuaderno de campo</h1>
        <p>
          Registra las plantas que encuentras en parcelas o a lo largo de un transecto y obtén al momento sus
          resultados. Todo se guarda en este dispositivo y funciona sin conexión.
        </p>
        <FranjaAbundancia taxones={portada.resumen.taxones} N={portada.resumen.N} animada />
        <p className="pie-franja">{portada.pie}</p>
        <div className="acciones">
          <Link className="boton" to="/investigaciones/nueva">
            <IconoMas />
            Nueva investigación
          </Link>
          <Link className="boton boton--secundario" to="/catalogo">
            Consultar el catálogo
          </Link>
        </div>
      </section>

      <section className="seccion" aria-labelledby="titulo-recientes">
        <h2 id="titulo-recientes">Investigaciones recientes</h2>
        {cargando && <p className="texto-suave">Cargando…</p>}
        {!cargando && recientes.length === 0 && (
          <div className="panel">
            <p>
              Aún no hay investigaciones en este dispositivo. Crea una o carga un modelo, como el Salar de los Canos o
              Río Antas, para ver cómo se calculan los resultados.
            </p>
            <Link className="boton boton--secundario" to="/modelos">
              Cargar un modelo
            </Link>
          </div>
        )}
        {recientes.length > 0 && (
          <ul className="lista lista-panel">
            {recientes.map((d) => (
              <li key={d.investigacion.id}>
                <TarjetaInvestigacion {...d} />
              </li>
            ))}
          </ul>
        )}
        {(datos?.length ?? 0) > recientes.length && (
          <p style={{ marginTop: '0.75rem' }}>
            <Link to="/investigaciones">Ver todas las investigaciones</Link>
          </p>
        )}
      </section>
    </>
  );
}
