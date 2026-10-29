import { useRef, useState } from 'react';
import { useAnunciar } from '../accesibilidad/Anunciador.jsx';
import {
  guardarAjuste,
  guardarEspeciesPropias,
  listarEspeciesPropias,
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

/** «Se añadirán 2 especies nuevas y se actualizará 1…» (o en pasado, tras importar). */
function describirPlan(plan, hecho = false) {
  const n = plan.nuevas.length;
  const a = plan.actualizadas.length;
  const verbo = (singular, pluralTexto, cantidad) => (cantidad === 1 ? singular : pluralTexto);
  const frases = [];
  if (n) {
    const v = hecho ? verbo('se ha añadido', 'se han añadido', n) : verbo('se añadirá', 'se añadirán', n);
    frases.push(`${v} ${plural(n, 'especie nueva', 'especies nuevas')}`);
  }
  if (a) {
    const v = hecho ? verbo('se ha actualizado', 'se han actualizado', a) : verbo('se actualizará', 'se actualizarán', a);
    frases.push(`${v} ${plural(a, 'especie', 'especies')} con cambios más recientes`);
  }
  const texto = frases.join(' y ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Copia de seguridad de «Mi catálogo»: descargarla y recuperarla en este u otro dispositivo. */
export function CopiaMiCatalogo({ total }) {
  const anunciar = useAnunciar();
  const entrada = useRef(null);
  const [ocupado, setOcupado] = useState(false);
  const [errores, setErrores] = useState(null);
  const estado = useConsulta(async () => {
    const [registros, ultima] = await Promise.all([listarEspeciesPropias(), obtenerAjuste(CLAVE_ULTIMA_COPIA)]);
    return { pendiente: catalogoPropioNecesitaCopia(registros, ultima), ultima };
  }, []);

  async function descargarCopia() {
    setOcupado(true);
    try {
      const registros = await listarEspeciesPropias();
      const zip = await construirZipCatalogoPropio(registros);
      descargarArchivo(nombreArchivoCatalogoPropio(), zip, 'application/zip');
      await guardarAjuste(CLAVE_ULTIMA_COPIA, new Date().toISOString());
      const conFoto = registros.filter((r) => r.foto?.blob).length;
      anunciar(
        `Copia descargada: ${plural(registros.length, 'especie', 'especies')}${conFoto ? `, ${plural(conFoto, 'foto', 'fotos')}` : ''}.`,
        { duracion: 5000 },
      );
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
      const plan = planificarImportacionPropias(resultado.especies, await listarEspeciesPropias());
      if (plan.nuevas.length + plan.actualizadas.length === 0) {
        anunciar('Tu catálogo ya tenía todas las especies de esta copia.', { duracion: 5000 });
        return;
      }
      const resto = plan.sinCambios.length
        ? ` ${plural(plan.sinCambios.length, 'especie se queda', 'especies se quedan')} como ${plan.sinCambios.length === 1 ? 'está' : 'están'} en este dispositivo.`
        : '';
      if (!window.confirm(`${describirPlan(plan)}.${resto} ¿Continuar?`)) return;
      await guardarEspeciesPropias([...plan.nuevas, ...plan.actualizadas]);
      anunciar([`${describirPlan(plan, true)}.`, ...resultado.avisos].join(' '), { duracion: 6000 });
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
        La copia es un archivo ZIP con tus especies y sus fotos. Sirve para no perderlas si se borran los datos del
        navegador y para llevarlas a otro dispositivo.
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
