import { useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useOutletContext, useParams } from 'react-router-dom';
import { useAnunciar } from '../../accesibilidad/Anunciador.jsx';
import { useTituloDocumento } from '../../accesibilidad/useTituloDocumento.js';
import { esTransecto, necesitaCopia, TIPOS_PRACTICA } from '../../almacenamiento/modelo.js';
import {
  marcarExportada,
  obtenerDatosInvestigacion,
  obtenerFotosDeObservaciones,
} from '../../almacenamiento/repositorio.js';
import { useConsulta } from '../../almacenamiento/useConsulta.js';
import { formatearFecha, formatearNumero, plural } from '../../calculos/formato.js';
import { useCatalogo } from '../../catalogos/catalogo.js';
import { EstadoCopia } from '../../componentes/EstadoCopia.jsx';
import {
  IconoAtras,
  IconoCompartir,
  IconoDescargar,
  IconoDocumento,
  IconoEditar,
  IconoMas,
} from '../../componentes/Iconos.jsx';
import { construirZip } from '../../importacion-exportacion/copiaZip.js';
import { compartirArchivo, descargarArchivo, puedeCompartirArchivos } from '../../importacion-exportacion/descargar.js';
import { construirPaquete, nombreArchivo } from '../../importacion-exportacion/exportar.js';
import { PaginaNoEncontrada } from '../../app/PaginaNoEncontrada.jsx';

const tamanoLegible = (bytes) =>
  bytes < 1024 * 1024 ? `${formatearNumero(bytes / 1024, 0)} KB` : `${formatearNumero(bytes / 1024 / 1024, 1)} MB`;

export function PaginaInvestigacion() {
  const { id } = useParams();
  const { datos, cargando, error } = useConsulta(() => obtenerDatosInvestigacion(id), [id]);
  const catalogo = useCatalogo();
  const anunciar = useAnunciar();
  const [ocupado, setOcupado] = useState(null); // 'copia' | 'pdf' | null
  const [pdf, setPdf] = useState(null); // { blob, nombre }
  useTituloDocumento(datos?.investigacion.titulo ?? 'Investigación');

  if (cargando) return <p className="texto-suave">Cargando…</p>;
  if (error) {
    return (
      <div className="aviso aviso--error" role="alert">
        <p>No se han podido leer los datos del dispositivo: {error.message}</p>
      </div>
    );
  }
  if (!datos) {
    return (
      <PaginaNoEncontrada
        titulo="Investigación no encontrada"
        texto="No está en este dispositivo. Si tienes una copia exportada, impórtala desde Investigaciones."
      />
    );
  }

  const { investigacion, parcelas, observaciones } = datos;
  const pendiente = necesitaCopia(investigacion);
  const conTransectos = esTransecto(investigacion);

  async function guardarCopia() {
    setOcupado('copia');
    try {
      const fotos = await obtenerFotosDeObservaciones(observaciones);
      const paquete = construirPaquete(datos, catalogo.catalogo, new Set(fotos.map((f) => f.id)));
      const dibujos = datos.dibujos ?? [];
      const zip = await construirZip(paquete, fotos, dibujos);
      descargarArchivo(nombreArchivo(investigacion, 'copia', 'zip'), zip, 'application/zip');
      await marcarExportada(investigacion.id);
      const partes = [
        fotos.length && plural(fotos.length, 'foto', 'fotos'),
        dibujos.length && plural(dibujos.length, 'dibujo', 'dibujos'),
      ].filter(Boolean);
      anunciar(`Copia descargada${partes.length ? ` con ${partes.join(' y ')}` : ''}.`, { duracion: 5000 });
    } catch (e) {
      anunciar(`No se ha podido crear la copia: ${e.message}`, { tipo: 'error', duracion: 6000 });
    } finally {
      setOcupado(null);
    }
  }

  async function generarPdf() {
    setOcupado('pdf');
    setPdf(null);
    try {
      const [{ generarPdfCuaderno }, { prepararFotoParaPdf }] = await Promise.all([
        import('../../importacion-exportacion/pdfCuaderno.js'),
        import('../../fotos/procesarFoto.js'),
      ]);
      const blob = await generarPdfCuaderno(datos, {
        buscarEspecie: catalogo.buscarEspecie,
        obtenerFotos: obtenerFotosDeObservaciones,
        prepararFoto: prepararFotoParaPdf,
      });
      setPdf({ blob, nombre: nombreArchivo(investigacion, 'cuaderno', 'pdf') });
    } catch (e) {
      anunciar(`No se ha podido generar el PDF: ${e.message}`, { tipo: 'error', duracion: 6000 });
    } finally {
      setOcupado(null);
    }
  }

  async function compartirPdf() {
    const resultado = await compartirArchivo(pdf.nombre, pdf.blob, 'application/pdf', investigacion.titulo);
    if (resultado === 'compartido') anunciar('Cuaderno compartido.');
    if (resultado === 'descargado') anunciar('Este navegador no permite compartirlo. Se ha descargado el PDF.');
  }

  return (
    <>
      <Link to="/investigaciones" className="volver">
        <IconoAtras />
        Investigaciones
      </Link>

      <header className="encabezado-pagina">
        <h1>{investigacion.titulo}</h1>
        <div className="tarjeta-investigacion" style={{ padding: 0 }}>
          <div className="metadatos">
            {investigacion.fechaObservacion && <span>{formatearFecha(investigacion.fechaObservacion)}</span>}
            {investigacion.lugarTexto && <span>{investigacion.lugarTexto}</span>}
            {investigacion.equipoAlias && <span>{investigacion.equipoAlias}</span>}
            <span>{TIPOS_PRACTICA[investigacion.tipoPractica ?? 'parcela']?.nombre}</span>
            <span className="no-imprimir">
              <EstadoCopia pendiente={pendiente} />
            </span>
          </div>
        </div>
        {investigacion.descripcion && <p>{investigacion.descripcion}</p>}
      </header>

      <div className="acciones no-imprimir" style={{ marginTop: 0 }}>
        <button type="button" className="boton boton--secundario" onClick={generarPdf} disabled={ocupado !== null}>
          <IconoDocumento />
          {ocupado === 'pdf' ? 'Generando PDF…' : 'Cuaderno en PDF'}
        </button>
        <button type="button" className="boton boton--secundario" onClick={guardarCopia} disabled={ocupado !== null}>
          <IconoDescargar />
          {ocupado === 'copia' ? 'Preparando copia…' : 'Copia de seguridad'}
        </button>
        <Link className="boton boton--sencillo" to={`/investigaciones/${investigacion.id}/editar`}>
          <IconoEditar />
          Editar
        </Link>
      </div>

      {pdf && (
        <div className="aviso panel-pdf no-imprimir" role="status">
          <p>
            <strong>Cuaderno listo.</strong>
            {pdf.nombre}, {tamanoLegible(pdf.blob.size)}. Revisa las fotos antes de compartirlo
            fuera del taller.
          </p>
          <div className="acciones" style={{ marginTop: '0.5rem' }}>
            {puedeCompartirArchivos('application/pdf', 'cuaderno.pdf') && (
              <button type="button" className="boton" onClick={compartirPdf}>
                <IconoCompartir />
                Compartir
              </button>
            )}
            <button
              type="button"
              className="boton boton--secundario"
              onClick={() => {
                descargarArchivo(pdf.nombre, pdf.blob, 'application/pdf');
                anunciar('Cuaderno descargado.');
              }}
            >
              <IconoDescargar />
              Descargar
            </button>
            <button type="button" className="boton boton--sencillo" onClick={() => setPdf(null)}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      <nav className="pestanas" aria-label="Apartados de la investigación">
        {conTransectos ? (
          <>
            <NavLink to="transectos">Transectos</NavLink>
            <NavLink to="cobertura">Resultados</NavLink>
            <NavLink to="dibujos">Dibujos</NavLink>
          </>
        ) : (
          <>
            <NavLink to="parcelas">Parcelas</NavLink>
            <NavLink to="observaciones">Observaciones</NavLink>
            <NavLink to="resultados">Resultados</NavLink>
            <NavLink to="dibujos">Dibujos</NavLink>
          </>
        )}
      </nav>

      <Outlet context={{ ...datos, catalogo }} />

      {!conTransectos && parcelas.length > 0 && (
        <div className="accion-fija no-imprimir">
          <Link className="boton" to={`/investigaciones/${investigacion.id}/observar`}>
            <IconoMas />
            Registrar observación
          </Link>
        </div>
      )}
    </>
  );
}

/** Apartado inicial de la investigación según su tipo de práctica. */
export function IndiceInvestigacion() {
  const { investigacion } = useOutletContext();
  return <Navigate to={esTransecto(investigacion) ? 'transectos' : 'observaciones'} replace />;
}

/**
 * Muestra un apartado solo en investigaciones del tipo indicado; si no, lleva al
 * apartado inicial (por ejemplo, al abrir «parcelas» en una de transectos).
 */
export function SoloTipo({ tipo, children }) {
  const { investigacion } = useOutletContext();
  const actual = esTransecto(investigacion) ? 'transecto' : 'parcela';
  if (actual !== tipo) return <Navigate to={actual === 'transecto' ? '../transectos' : '../observaciones'} replace />;
  return children;
}
