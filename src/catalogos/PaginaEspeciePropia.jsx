import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAnunciar } from '../accesibilidad/Anunciador.jsx';
import { useTituloDocumento } from '../accesibilidad/useTituloDocumento.js';
import { crearEspeciePropia } from '../almacenamiento/modelo.js';
import {
  guardarEspeciePropia,
  listarEspeciesPropias,
  obtenerAjuste,
  obtenerEspeciePropia,
} from '../almacenamiento/repositorio.js';
import { useConsulta } from '../almacenamiento/useConsulta.js';
import { PaginaNoEncontrada } from '../app/PaginaNoEncontrada.jsx';
import { IconoAtras } from '../componentes/Iconos.jsx';
import {
  BotonesFoto,
  CamposLicencia,
  RevisionPersonas,
  textoLicencia,
  textoModificaciones,
  useEditorFoto,
  validarLicencia,
  valoresLicencia,
  VistaEncuadre,
} from './fotos/EditorFoto.jsx';
import { CLAVE_PREPARADAS } from './fotos/procesarImagen.js';

/** Autor de la foto más reciente, para no tener que escribirlo cada vez. */
async function autorReciente() {
  const propias = await listarEspeciesPropias();
  const ultima = propias
    .filter((p) => p.imagenAutor)
    .sort((a, b) => String(b.fechaModificacion).localeCompare(String(a.fechaModificacion)))[0];
  if (ultima) return ultima.imagenAutor;
  const preparadas = (await obtenerAjuste(CLAVE_PREPARADAS)) ?? {};
  return Object.values(preparadas)[0]?.imagenAutor ?? '';
}

/** Añadir una especie a «Mi catálogo» (sin especieId) o editar una existente. */
export function PaginaEspeciePropia() {
  const { especieId } = useParams();
  const esEdicion = Boolean(especieId);
  useTituloDocumento(esEdicion ? 'Editar especie' : 'Añadir a mi catálogo');
  const especie = useConsulta(() => (esEdicion ? obtenerEspeciePropia(especieId) : Promise.resolve(null)), [especieId]);
  const autor = useConsulta(() => autorReciente().catch(() => ''), []);

  if (especie.cargando || autor.cargando) return <p className="texto-suave">Cargando…</p>;
  if (especie.error) {
    return (
      <div className="aviso aviso--error" role="alert">
        <p>No se han podido leer los datos del dispositivo: {especie.error.message}</p>
      </div>
    );
  }
  if (esEdicion && !especie.datos) {
    return <PaginaNoEncontrada titulo="Especie no encontrada" texto="No está en «Mi catálogo» de este dispositivo." />;
  }

  return (
    <>
      <Link to={esEdicion ? `/catalogo/${especieId}` : '/catalogo'} className="volver">
        <IconoAtras />
        {esEdicion ? especie.datos.nombreComun : 'Catálogo'}
      </Link>
      <header className="encabezado-pagina">
        <h1>{esEdicion ? 'Editar especie' : 'Añadir a mi catálogo'}</h1>
        <p>
          {esEdicion
            ? 'Los cambios se guardan en este dispositivo.'
            : 'Guarda una planta que encuentres en tus salidas, con su foto y el nombre que quieras darle.'}
        </p>
      </header>
      <FormularioEspeciePropia key={especie.datos?.id ?? 'nueva'} registro={especie.datos} autorInicial={autor.datos ?? ''} />
    </>
  );
}

/** URL temporal de un Blob guardado, liberada al cambiarlo o al salir. */
function useUrlBlob(blob) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => url && URL.revokeObjectURL(url), [url]);
  return url;
}

const ID_CAMPO_ERROR = {
  nombre: 'especie-nombre',
  autor: 'foto-autor',
  licencia: 'foto-licencia-otra',
  fuente: 'foto-fuente',
};

function FormularioEspeciePropia({ registro, autorInicial }) {
  const navegar = useNavigate();
  const anunciar = useAnunciar();
  const editor = useEditorFoto();

  const [datos, setDatos] = useState({
    nombreComun: registro?.nombreComun ?? '',
    nombreCientifico: registro?.nombreCientifico ?? '',
    familia: registro?.familia ?? '',
    lugarTexto: registro?.lugarTexto ?? '',
    notas: registro?.notas ?? '',
    comprobada: registro?.estadoValidacion === 'validada',
  });
  // Foto ya guardada: 'conservar' | 'quitar' | 'ninguna'. Una foto nueva del editor la sustituye.
  const [fotoGuardada, setFotoGuardada] = useState(registro?.foto?.blob ? 'conservar' : 'ninguna');
  const urlGuardada = useUrlBlob(fotoGuardada === 'conservar' ? registro?.foto?.blob : null);
  const [licencia, setLicencia] = useState(() =>
    registro?.foto
      ? valoresLicencia({
          autor: registro.imagenAutor,
          fuente: registro.imagenFuente,
          licencia: registro.imagenLicencia,
          derechos: true,
        })
      : valoresLicencia({ autor: autorInicial }),
  );
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  const fotoNueva = Boolean(editor.foto);
  const conFoto = fotoNueva || fotoGuardada === 'conservar';
  const cambiar = (campo) => (evento) =>
    setDatos((d) => ({ ...d, [campo]: evento.target.type === 'checkbox' ? evento.target.checked : evento.target.value }));

  async function guardar(evento) {
    evento.preventDefault();
    const nuevos = {};
    if (!datos.nombreComun.trim()) nuevos.nombre = 'Escribe un nombre para la especie.';
    if (fotoNueva && !editor.revisada) nuevos.revisada = 'Confirma que has revisado la foto.';
    if (conFoto) Object.assign(nuevos, validarLicencia(licencia));
    setErrores(nuevos);
    const claves = Object.keys(nuevos);
    if (claves.length) {
      const id = claves.map((c) => ID_CAMPO_ERROR[c]).find((i) => i && document.getElementById(i));
      if (id) document.getElementById(id).focus();
      else anunciar('Revisa los campos marcados.', { tipo: 'error' });
      return;
    }

    setGuardando(true);
    try {
      let cambioFoto; // sin indicar: se conserva la foto guardada
      let modificaciones = registro?.imagenModificaciones ?? '';
      if (fotoNueva) {
        const generada = await editor.generar();
        cambioFoto = { blob: generada.blob, ancho: generada.ancho, alto: generada.alto };
        modificaciones = textoModificaciones(generada.pixeladas);
      } else if (fotoGuardada === 'quitar') {
        cambioFoto = null;
      }
      const especie = {
        ...(registro ?? crearEspeciePropia()),
        nombreComun: datos.nombreComun.trim(),
        nombreCientifico: datos.nombreCientifico.trim(),
        familia: datos.familia.trim(),
        lugarTexto: datos.lugarTexto.trim(),
        notas: datos.notas.trim(),
        estadoValidacion: datos.comprobada ? 'validada' : 'pendiente',
        imagenAutor: conFoto ? licencia.autor.trim() : '',
        imagenFuente: conFoto ? licencia.fuente.trim() : '',
        imagenLicencia: conFoto ? textoLicencia(licencia) : '',
        imagenModificaciones: conFoto ? modificaciones : '',
      };
      const guardada = await guardarEspeciePropia(especie, { foto: cambioFoto });
      anunciar(
        registro ? 'Cambios guardados en este dispositivo.' : `${guardada.nombreComun} se ha añadido a tu catálogo.`,
      );
      navegar(`/catalogo/${guardada.id}`, { replace: true });
    } catch (error) {
      anunciar(`No se ha podido guardar: ${error.message}`, { tipo: 'error', duracion: 6000 });
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} noValidate>
      <section className="herramienta-paso" aria-labelledby="titulo-foto" style={{ marginTop: 0 }}>
        <h2 id="titulo-foto">Foto</h2>
        {!fotoNueva && urlGuardada && <img className="vista-foto" src={urlGuardada} alt="Foto guardada de la especie" />}
        {fotoNueva && (
          <p className="texto-suave texto-pequeno" style={{ marginTop: 0 }}>
            {editor.foto.nombre}, {editor.ancho} × {editor.alto} píxeles
          </p>
        )}
        <BotonesFoto editor={editor} conCamara textoElegir="Elegir de la galería" />
        <div className="herramientas-foto">
          {fotoNueva && (
            <button type="button" className="boton boton--sencillo" onClick={editor.descartar}>
              {fotoGuardada === 'conservar' ? 'Descartar y mantener la foto anterior' : 'Descartar esta foto'}
            </button>
          )}
          {!fotoNueva && fotoGuardada === 'conservar' && (
            <button type="button" className="boton boton--sencillo" onClick={() => setFotoGuardada('quitar')}>
              Quitar foto
            </button>
          )}
          {!fotoNueva && fotoGuardada === 'quitar' && (
            <p className="texto-suave texto-pequeno" style={{ margin: 0 }}>
              La foto se quitará al guardar.{' '}
              <button type="button" className="boton boton--sencillo" onClick={() => setFotoGuardada('conservar')}>
                Mantenerla
              </button>
            </p>
          )}
        </div>
        {editor.errorFoto && <p className="error-campo">{editor.errorFoto}</p>}
        {!conFoto && (
          <p className="ayuda texto-suave texto-pequeno">
            La foto es opcional. Se guarda solo en este dispositivo, sin datos de ubicación. Fotografía la planta y
            evita caras, matrículas y datos personales.
          </p>
        )}
      </section>

      {fotoNueva && (
        <>
          <section className="herramienta-paso" aria-labelledby="titulo-encuadre">
            <h2 id="titulo-encuadre">Encuadre</h2>
            <p className="texto-suave texto-pequeno">
              Arrastra la imagen o usa los controles. Así se verá en tu catálogo (proporción 4:3).
            </p>
            <VistaEncuadre editor={editor} etiqueta="Vista previa del encuadre de la foto" />
          </section>

          <section className="herramienta-paso" aria-labelledby="titulo-personas">
            <h2 id="titulo-personas">Personas y datos identificables</h2>
            <RevisionPersonas
              editor={editor}
              error={errores.revisada}
              textoSinDetector="Sin conexión a Internet no se puede usar la primera vez; quedará guardado en cuanto lo uses con conexión. Revisa la foto con atención antes de guardarla."
            />
          </section>
        </>
      )}

      <section className="herramienta-paso formulario" aria-labelledby="titulo-datos">
        <h2 id="titulo-datos">Datos de la especie</h2>
        <div className="campo">
          <label htmlFor="especie-nombre">Nombre</label>
          <input
            id="especie-nombre"
            value={datos.nombreComun}
            onChange={cambiar('nombreComun')}
            maxLength={200}
            autoComplete="off"
            aria-invalid={Boolean(errores.nombre)}
            aria-describedby={`ayuda-especie-nombre${errores.nombre ? ' error-especie-nombre' : ''}`}
          />
          <p className="ayuda" id="ayuda-especie-nombre">
            El que tú uses: común, local o provisional, por ejemplo «Cardo de la rambla».
          </p>
          {errores.nombre && (
            <p className="error-campo" id="error-especie-nombre">
              {errores.nombre}
            </p>
          )}
        </div>
        <div className="campo">
          <label htmlFor="especie-cientifico">Nombre científico (opcional)</label>
          <input
            id="especie-cientifico"
            value={datos.nombreCientifico}
            onChange={cambiar('nombreCientifico')}
            maxLength={200}
            autoComplete="off"
            autoCapitalize="sentences"
          />
        </div>
        <div className="campo">
          <label htmlFor="especie-familia">Familia (opcional)</label>
          <input id="especie-familia" value={datos.familia} onChange={cambiar('familia')} maxLength={200} autoComplete="off" />
        </div>
        <div className="campo">
          <label htmlFor="especie-lugar">Dónde la encontraste (opcional)</label>
          <input
            id="especie-lugar"
            value={datos.lugarTexto}
            onChange={cambiar('lugarTexto')}
            maxLength={200}
            autoComplete="off"
            aria-describedby="ayuda-especie-lugar"
          />
          <p className="ayuda" id="ayuda-especie-lugar">
            Descríbelo en general, por ejemplo «Cabo de Gata, rambla». NaturaLab no usa el GPS.
          </p>
        </div>
        <div className="campo">
          <label htmlFor="especie-notas">Notas (opcional)</label>
          <textarea
            id="especie-notas"
            rows={3}
            value={datos.notas}
            onChange={cambiar('notas')}
            maxLength={2000}
            placeholder="Rasgos, hábitat, época de floración, dudas…"
          />
        </div>
        <label className="casilla">
          <input type="checkbox" checked={datos.comprobada} onChange={cambiar('comprobada')} />
          <span>
            Identificación comprobada
            <span className="texto-suave texto-pequeno" style={{ display: 'block' }}>
              Márcala cuando hayas confirmado la especie con una guía o con una persona experta.
            </span>
          </span>
        </label>
      </section>

      {conFoto && (
        <section className="herramienta-paso formulario" aria-labelledby="titulo-licencia">
          <h2 id="titulo-licencia">Autoría y licencia de la foto</h2>
          <CamposLicencia valores={licencia} alCambiar={setLicencia} errores={errores} />
        </section>
      )}

      <div className="acciones">
        <button type="submit" className="boton" disabled={guardando || editor.analizando}>
          {guardando ? 'Guardando…' : registro ? 'Guardar cambios' : 'Guardar en mi catálogo'}
        </button>
        <Link className="boton boton--sencillo" to={registro ? `/catalogo/${registro.id}` : '/catalogo'}>
          Cancelar
        </Link>
      </div>
      {editor.analizando && (
        <p className="texto-suave texto-pequeno" role="status">
          Esperando a que termine la revisión de la foto…
        </p>
      )}
    </form>
  );
}
