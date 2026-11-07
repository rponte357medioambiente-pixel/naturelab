import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAnunciar } from '../accesibilidad/Anunciador.jsx';
import { useTituloDocumento } from '../accesibilidad/useTituloDocumento.js';
import { listarInvestigacionesConDatos } from '../almacenamiento/repositorio.js';
import { useConsulta } from '../almacenamiento/useConsulta.js';
import { useApariencia } from '../apariencia/Apariencia.jsx';
import { PALETAS } from '../apariencia/paletas.js';
import { esErrorDeModulo, importarModulo } from '../app/recargaSegura.js';
import { plural } from '../calculos/formato.js';
import { IconoAtras, IconoCompartir, IconoDescargar } from '../componentes/Iconos.jsx';
import { compartirArchivo, descargarArchivo, puedeCompartirArchivos } from '../importacion-exportacion/descargar.js';
import { convertirEnSlug } from '../importacion-exportacion/exportar.js';
import { tieneImagen, urlImagenEspecie, useCatalogo } from './catalogo.js';
import { idsSeleccionados, SeleccionEspecies, textoSeleccion } from './SeleccionEspecies.jsx';

const ordenAlfabetico = (a, b) => a.nombreComun.localeCompare(b.nombreComun, 'es', { sensitivity: 'base' });

/** Fichas de especies en PDF, para estudiar y para recortar y emparejar. */
export function PaginaFichas() {
  useTituloDocumento('Fichas para imprimir');
  const catalogo = useCatalogo();
  const investigaciones = useConsulta(listarInvestigacionesConDatos, []);
  const { paleta } = useApariencia();
  const anunciar = useAnunciar();
  const [eleccion, setEleccion] = useState({ origen: 'todo', ids: [] });
  const [ocupado, setOcupado] = useState(false);
  const [pdf, setPdf] = useState(null);

  if (catalogo.cargando || investigaciones.cargando) return <p className="texto-suave">Cargando…</p>;
  const lista = investigaciones.datos ?? [];
  const especiesCon = (ids) => catalogo.especies.filter((e) => tieneImagen(e) && (!ids || ids.has(e.id)));
  const elegidas = especiesCon(idsSeleccionados(eleccion.origen, eleccion.ids, lista)).sort(ordenAlfabetico);
  const titulo = textoSeleccion(eleccion.origen, eleccion.ids, lista);

  async function crear() {
    setOcupado(true);
    setPdf(null);
    try {
      const { generarPdfFichas, imagenParaPdf } = await importarModulo(() => import('./fichasPdf.js'));
      const blob = await generarPdfFichas(elegidas, {
        titulo,
        color: PALETAS[paleta]?.principal,
        obtenerImagen: (e) => imagenParaPdf(urlImagenEspecie(e)),
      });
      setPdf({ blob, nombre: `naturelab-fichas-${convertirEnSlug(titulo)}.pdf` });
    } catch (error) {
      anunciar(
        esErrorDeModulo(error)
          ? 'No se ha podido crear el PDF porque la app se ha actualizado. Recarga la página e inténtalo de nuevo.'
          : `No se ha podido crear el PDF: ${error.message}`,
        { tipo: 'error', duracion: 8000 },
      );
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <Link to="/catalogo" className="volver">
        <IconoAtras />
        Catálogo
      </Link>
      <header className="encabezado-pagina">
        <h1>Fichas para imprimir</h1>
        <p>
          Cada especie en una fila: su imagen con el nombre y, al lado, sus características. Sirven para estudiar y, recortadas,
          para jugar a emparejar cada imagen con su ficha.
        </p>
      </header>
      <form
        className="formulario"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (elegidas.length) crear();
        }}
      >
        <SeleccionEspecies
          nombre="fichas"
          origen={eleccion.origen}
          ids={eleccion.ids}
          investigaciones={lista}
          contar={(ids) => especiesCon(ids).length}
          alCambiar={(cambios) => setEleccion((e) => ({ ...e, ...cambios }))}
        />
        {elegidas.length === 0 ? (
          <p className="aviso aviso--ocre" role="status">
            {eleccion.origen === 'investigaciones' && eleccion.ids.length === 0
              ? 'Elige al menos una investigación.'
              : 'No hay especies con imagen para esta elección.'}
          </p>
        ) : (
          <p className="texto-suave texto-pequeno" style={{ margin: 0 }}>
            {plural(elegidas.length, 'ficha', 'fichas')}, en A4. Se imprimen mejor sin márgenes adicionales («tamaño real»).
          </p>
        )}
        <div className="acciones" style={{ marginTop: 0 }}>
          <button type="submit" className="boton" disabled={ocupado || elegidas.length === 0}>
            {ocupado ? 'Creando el PDF…' : 'Crear PDF'}
          </button>
        </div>
      </form>

      {pdf && (
        <div className="aviso panel-pdf" role="status" style={{ marginTop: '1rem' }}>
          <p>
            <strong>Fichas listas.</strong> {pdf.nombre}
          </p>
          <div className="acciones" style={{ marginTop: '0.5rem' }}>
            {puedeCompartirArchivos('application/pdf', 'fichas.pdf') && (
              <button
                type="button"
                className="boton"
                onClick={async () => {
                  try {
                    await compartirArchivo(pdf.nombre, pdf.blob, 'application/pdf', 'Fichas de especies');
                  } catch (error) {
                    if (error?.name !== 'AbortError') anunciar(`No se ha podido compartir: ${error.message}`, { tipo: 'error' });
                  }
                }}
              >
                <IconoCompartir />
                Compartir
              </button>
            )}
            <button
              type="button"
              className="boton boton--secundario"
              onClick={() => {
                descargarArchivo(pdf.nombre, pdf.blob, 'application/pdf');
                anunciar('Fichas descargadas.');
              }}
            >
              <IconoDescargar />
              Descargar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
