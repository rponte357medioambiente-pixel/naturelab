import { useRef, useState } from 'react';
import { useAnunciar } from '../accesibilidad/Anunciador.jsx';
import {
  guardarAjuste,
  guardarEspeciesPropias,
  guardarFotosCatalogo,
  listarEspeciesPropias,
  listarFotosCatalogo,
  obtenerAjuste,
} from '../almacenamiento/repositorio.js';
import { useConsulta } from '../almacenamiento/useConsulta.js';
import { formatearFecha, plural } from '../calculos/formato.js';
import { IconoDescargar, IconoSubir } from '../componentes/Iconos.jsx';
import { descargarArchivo } from '../importacion-exportacion/descargar.js';
import {
  catalogoPropioNecesitaCopia,
  construirZipCatalogoPropio,
  leerCopiaCatalogoPropio,
  nombreArchivoCatalogoPropio,
  planificarImportacionPropias,
} from './especiesPropias.js';

const CLAVE_ULTIMA_COPIA = 'catalogo-propio-ultima-copia';

/**
 * «Se añadirán 2 especies nuevas y 1 foto de campo…» (o en pasado, tras importar).
 * @param {{nuevas, actualizadas}} plan  especies de «Mi catálogo»
 * @param {{nuevas, actualizadas}} planFotos  fotos de campo de especies publicadas
 */
function describirPlan(plan, planFotos, hecho = false) {
  const verbo = (singular, pluralTexto, cantidad) => (cantidad === 1 ? singular : pluralTexto);
  const anadir = (n) => (hecho ? verbo('se ha añadido', 'se han añadido', n) : verbo('se añadirá', 'se añadirán', n));
  const actualizar = (n) =>
    hecho ? verbo('se ha actualizado', 'se han actualizado', n) : verbo('se actualizará', 'se actualizarán', n);
  const frases = [];
  const n = plan.nuevas.length;
  const a = plan.actualizadas.length;
  const fn = planFotos.nuevas.length;
  const fa = planFotos.actualizadas.length;
  if (n) frases.push(`${anadir(n)} ${plural(n, 'especie nueva', 'especies nuevas')}`);
  if (a) frases.push(`${actualizar(a)} ${plural(a, 'especie', 'especies')} con cambios más recientes`);
  if (fn) frases.push(`${anadir(fn)} ${plural(fn, 'foto de campo', 'fotos de campo')}`);
  if (fa) frases.push(`${actualizar(fa)} ${plural(fa, 'foto de campo', 'fotos de campo')} más recientes`);
  const texto = frases.length > 1 ? `${frases.slice(0, -1).join(', ')} y ${frases.at(-1)}` : frases[0];
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Copia de seguridad de «Mi catálogo»: tus especies y tus fotos de campo de
 * especies publicadas. Descargarla y recuperarla en este u otro dispositivo.
 */
export function CopiaMiCatalogo() {
  const anunciar = useAnunciar();
  const entrada = useRef(null);
  const [ocupado, setOcupado] = useState(false);
  const [errores, setErrores] = useState(null);
  const estado = useConsulta(async () => {
    const [registros, fotos, ultima] = await Promise.all([
      listarEspeciesPropias(),
      listarFotosCatalogo(),
      obtenerAjuste(CLAVE_ULTIMA_COPIA),
    ]);
    return {
      pendiente: catalogoPropioNecesitaCopia([...registros, ...fotos], ultima),
      ultima,
      total: registros.length + fotos.length,
    };
  }, []);
  const total = estado.datos?.total ?? 0;

  async function descargarCopia() {
    setOcupado(true);
    try {
      const [registros, fotos] = await Promise.all([listarEspeciesPropias(), listarFotosCatalogo()]);
      const zip = await construirZipCatalogoPropio(registros, fotos);
      descargarArchivo(nombreArchivoCatalogoPropio(), zip, 'application/zip');
      await guardarAjuste(CLAVE_ULTIMA_COPIA, new Date().toISOString());
      const partes = [
        registros.length && plural(registros.length, 'especie', 'especies'),
        fotos.length && plural(fotos.length, 'foto de campo', 'fotos de campo'),
      ].filter(Boolean);
      anunciar(`Copia descargada: ${partes.join(' y ')}.`, { duracion: 5000 });
    } catch (error) {
      anunciar(`No se ha podido crear la copia: ${error.message}`, { tipo: 'error', duracion: 6000 });
    } finally {
      setOcupado(false);
    }
  }

  async function alElegirArchivo(evento) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;
    setErrores(null);
    setOcupado(true);
    try {
      const resultado = await leerCopiaCatalogoPropio(archivo);
      if (!resultado.ok) {
        setErrores({ lista: resultado.errores, total: resultado.totalErrores, nombre: archivo.name });
        return;
      }
      const [locales, fotosLocales] = await Promise.all([listarEspeciesPropias(), listarFotosCatalogo()]);
      const plan = planificarImportacionPropias(resultado.especies, locales);
      const planFotos = planificarImportacionPropias(resultado.fotosCatalogo, fotosLocales, 'especieId');
      const cambios = plan.nuevas.length + plan.actualizadas.length + planFotos.nuevas.length + planFotos.actualizadas.length;
      if (cambios === 0) {
        anunciar('Tu catálogo ya tenía todo lo que trae esta copia.', { duracion: 5000 });
        return;
      }
      const iguales = plan.sinCambios.length + planFotos.sinCambios.length;
      const resto = iguales
        ? ` ${plural(iguales, 'elemento se queda', 'elementos se quedan')} como ${iguales === 1 ? 'está' : 'están'} en este dispositivo.`
        : '';
      if (!window.confirm(`${describirPlan(plan, planFotos)}.${resto} ¿Continuar?`)) return;
      await guardarEspeciesPropias([...plan.nuevas, ...plan.actualizadas]);
      await guardarFotosCatalogo([...planFotos.nuevas, ...planFotos.actualizadas]);
      anunciar([`${describirPlan(plan, planFotos, true)}.`, ...resultado.avisos].join(' '), { duracion: 6000 });
    } catch (error) {
      anunciar(`No se ha podido importar: ${error.message}`, { tipo: 'error', duracion: 6000 });
    } finally {
      setOcupado(false);
    }
  }

  const { pendiente, ultima } = estado.datos ?? {};

  return (
    <div className="panel copia-catalogo">
      <p className="copia-catalogo__estado">
        <strong>Guardado solo en este dispositivo</strong>
        {total > 0 &&
          (pendiente ? (
            <span className="estado estado--ocre">Cambios sin copia</span>
          ) : (
            <span className="estado">Copia al día</span>
          ))}
      </p>
      <p className="texto-suave texto-pequeno">
        La copia es un archivo ZIP con tus especies, sus fotos y tus fotos de campo de especies del catálogo. Sirve
        para no perderlas si se borran los datos del navegador y para llevarlas a otro dispositivo.
        {ultima && ` Última copia: ${formatearFecha(ultima)}.`}
      </p>
      <input
        ref={entrada}
        type="file"
        accept=".zip,application/zip"
        className="solo-lectores"
        tabIndex={-1}
        aria-hidden="true"
        onChange={alElegirArchivo}
      />
      <div className="acciones" style={{ marginTop: '0.75rem' }}>
        <button type="button" className="boton boton--secundario" onClick={descargarCopia} disabled={ocupado || total === 0}>
          <IconoDescargar />
          Descargar copia
        </button>
        <button type="button" className="boton boton--secundario" onClick={() => entrada.current?.click()} disabled={ocupado}>
          <IconoSubir />
          Importar copia
        </button>
      </div>
      {errores && (
        <div className="aviso aviso--error" role="alert" style={{ marginTop: '0.75rem' }}>
          <p>
            <strong>No se ha podido importar «{errores.nombre}».</strong>
          </p>
          <ul>
            {errores.lista.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          {errores.total > errores.lista.length && (
            <p className="texto-pequeno">Y {plural(errores.total - errores.lista.length, 'problema más', 'problemas más')}.</p>
          )}
        </div>
      )}
    </div>
  );
}
