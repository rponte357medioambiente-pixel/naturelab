import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAnunciar } from '../accesibilidad/Anunciador.jsx';
import { datosFoto, generarIdFoto, modificarFotosEspecie } from '../almacenamiento/repositorio.js';
import { useConsulta } from '../almacenamiento/useConsulta.js';
import { autorReciente } from './autorReciente.js';
import { urlImagenEspecie } from './catalogo.js';
import { agregarFoto, hacerPrincipal, MAX_FOTOS, quitarFoto } from './fotosEspecie.js';
import {
  BotonesFoto,
  CamposLicencia,
  RevisionPersonas,
  textoFuente,
  textoLicencia,
  textoModificaciones,
  useEditorFoto,
  validarLicencia,
  valoresLicencia,
  VistaEncuadre,
} from './fotos/EditorFoto.jsx';
import { partesDe } from './tipos.js';

const credito = (f) => [f.imagenAutor, f.imagenLicencia].filter(Boolean).join(' · ');

/** ¿La foto principal es propia (de este dispositivo)? */
const principalPropia = (especie) => (especie.propia ? Boolean(especie.imagenUrl) : Boolean(especie.fotoLocal));

/** Fotos adicionales bajo la imagen principal de la ficha; al tocarlas, se ven en grande. */
export function MiniaturasFotos({ especie }) {
  const dialogo = useRef(null);
  const [vista, setVista] = useState(null);
  const extras = especie.imagenesExtra ?? [];
  const principal = urlImagenEspecie(especie);
  if (extras.length === 0) {
    return especie.partePrincipal ? <p className="pie-foto texto-suave texto-pequeno">{especie.partePrincipal}</p> : null;
  }
  const todas = [
    ...(principal ? [{ id: 'principal', url: principal, parte: especie.partePrincipal, imagenAutor: especie.imagenAutor, imagenLicencia: especie.imagenLicencia }] : []),
    ...extras,
  ];
  const abrir = (f) => {
    setVista(f);
    dialogo.current?.showModal?.();
  };
  return (
    <>
      <ul className="miniaturas-fotos" aria-label="Fotos de la especie">
        {todas.map((f) => (
          <li key={f.id}>
            <button type="button" onClick={() => abrir(f)} aria-label={`Ver en grande: ${f.parte ?? 'foto'}`}>
              <img src={f.url} alt="" />
            </button>
            <span className="texto-pequeno texto-suave">{f.parte ?? (f.id === 'principal' ? 'Principal' : 'Foto')}</span>
          </li>
        ))}
      </ul>
      <dialog ref={dialogo} className="visor-foto" aria-label={vista?.parte ?? 'Foto'} onClose={() => setVista(null)}>
        {vista && (
          <>
            <img src={vista.url} alt={`${especie.nombreComun}${vista.parte ? `: ${vista.parte.toLocaleLowerCase('es')}` : ''}`} />
            <p>
              <strong>{vista.parte ?? 'Foto'}</strong>
              {credito(vista) && <span className="texto-suave"> · {credito(vista)}</span>}
            </p>
          </>
        )}
        <form method="dialog">
          <button type="submit" className="boton boton--secundario">
            Cerrar
          </button>
        </form>
      </dialog>
    </>
  );
}

/**
 * Gestión de las fotos de una especie: hasta tres propias (una principal y dos
 * más). En las especies publicadas, sin principal propia se ve la del catálogo.
 */
export function GaleriaFotos({ especie }) {
  const editor = useEditorFoto();
  const anunciar = useAnunciar();
  const { datos: autor } = useConsulta(() => autorReciente().catch(() => ''), []);
  const extras = especie.imagenesExtra ?? [];
  const conPrincipal = principalPropia(especie);
  const total = (conPrincipal ? 1 : 0) + extras.length;
  const publicada = !especie.propia;

  async function aplicar(cambio, mensaje) {
    try {
      await modificarFotosEspecie(especie, cambio);
      anunciar(mensaje);
    } catch (error) {
      anunciar(`No se ha podido cambiar: ${error.message}`, { tipo: 'error' });
    }
  }

  function quitar(id, parte) {
    const texto =
      id === 'principal' && publicada
        ? '¿Quitar tu foto principal? Volverá a verse la imagen del catálogo.'
        : `¿Quitar esta foto${parte ? ` (${parte.toLocaleLowerCase('es')})` : ''}?`;
    if (window.confirm(texto)) aplicar((r) => quitarFoto(r, id, { publicada }), 'Foto quitada de este dispositivo.');
  }

  if (editor.foto) {
    return (
      <section className="panel foto-campo" aria-labelledby="titulo-foto-campo">
        <EdicionFoto especie={especie} editor={editor} autorInicial={autor ?? ''} principalPorDefecto={!conPrincipal} />
      </section>
    );
  }

  return (
    <section className="panel foto-campo" aria-labelledby="titulo-foto-campo">
      <h2 id="titulo-foto-campo">
        Fotos ({total} de {MAX_FOTOS})
      </h2>
      <p className="texto-suave texto-pequeno">
        Por ejemplo, la planta entera, la flor y el fruto. Se guardan solo en este dispositivo y entran en la copia de
        seguridad de «Mi catálogo».
      </p>
      <ul className="lista lista-fotos">
        {conPrincipal ? (
          <li>
            <img src={especie.imagenUrl} alt="" />
            <span>
              <strong>Principal{especie.partePrincipal ? ` · ${especie.partePrincipal}` : ''}</strong>
              <span className="texto-suave texto-pequeno">{credito(especie)}</span>
            </span>
            <span className="lista-fotos__acciones">
              <button type="button" className="boton boton--sencillo" onClick={() => quitar('principal', especie.partePrincipal)}>
                {publicada ? 'Volver a la del catálogo' : 'Quitar'}
              </button>
            </span>
          </li>
        ) : (
          publicada &&
          urlImagenEspecie(especie) && (
            <li>
              <img src={urlImagenEspecie(especie)} alt="" />
              <span>
                <strong>Principal · imagen del catálogo</strong>
                <span className="texto-suave texto-pequeno">{especie.imagenTipo === 'ilustracion' ? 'Ilustración esquemática' : credito(especie)}</span>
              </span>
            </li>
          )
        )}
        {extras.map((x) => (
          <li key={x.id}>
            <img src={x.url} alt="" />
            <span>
              <strong>{x.parte ?? 'Foto'}</strong>
              <span className="texto-suave texto-pequeno">{credito(x)}</span>
            </span>
            <span className="lista-fotos__acciones">
              <button
                type="button"
                className="boton boton--sencillo"
                onClick={() => aplicar((r) => hacerPrincipal(r, x.id, { generarId: generarIdFoto }), 'Foto principal cambiada.')}
              >
                Hacer principal
              </button>
              <button type="button" className="boton boton--sencillo" onClick={() => quitar(x.id, x.parte)}>
                Quitar
              </button>
            </span>
          </li>
        ))}
      </ul>
      {total < MAX_FOTOS ? (
        <>
          <p className="texto-pequeno" style={{ margin: '0.25rem 0 0' }}>
            <strong>Añadir foto</strong>
          </p>
          <BotonesFoto editor={editor} conCamara textoElegir="De la galería" />
          {editor.errorFoto && <p className="error-campo">{editor.errorFoto}</p>}
        </>
      ) : (
        <p className="texto-suave texto-pequeno" style={{ margin: 0 }}>
          Ya tiene {MAX_FOTOS} fotos. Quita una para añadir otra.
        </p>
      )}
    </section>
  );
}

function EdicionFoto({ especie, editor, autorInicial, principalPorDefecto }) {
  const anunciar = useAnunciar();
  const partes = partesDe(especie.tipo);
  const [parte, setParte] = useState(null);
  const [principal, setPrincipal] = useState(principalPorDefecto);
  const [licencia, setLicencia] = useState(() => valoresLicencia({ autor: autorInicial }));
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  async function guardar(evento) {
    evento.preventDefault();
    const nuevos = { ...validarLicencia(licencia) };
    if (!editor.revisada) nuevos.revisada = 'Confirma que has revisado la foto.';
    setErrores(nuevos);
    if (Object.keys(nuevos).length) {
      const campo = ['autor', 'fuente', 'licencia'].find((c) => nuevos[c]);
      const id = { autor: 'foto-autor', fuente: 'foto-fuente', licencia: 'foto-licencia-otra' }[campo];
      if (id) document.getElementById(id)?.focus();
      return;
    }
    setGuardando(true);
    try {
      const generada = await editor.generar();
      const nueva = {
        foto: datosFoto(generada),
        parte,
        imagenAutor: licencia.autor.trim(),
        imagenFuente: textoFuente(licencia),
        imagenLicencia: textoLicencia(licencia),
        imagenModificaciones: textoModificaciones(generada.pixeladas),
      };
      await modificarFotosEspecie(especie, (r) => agregarFoto(r, nueva, { principal, generarId: generarIdFoto }));
      editor.descartar();
      anunciar(`Foto de ${especie.nombreComun} guardada en este dispositivo.`);
    } catch (error) {
      anunciar(`No se ha podido guardar: ${error.message}`, { tipo: 'error', duracion: 6000 });
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} noValidate className="formulario">
      <h2 id="titulo-foto-campo">Foto de {especie.nombreComun}</h2>

      <div>
        <h3>Encuadre</h3>
        <p className="texto-suave texto-pequeno">Arrastra la imagen o usa los controles. Así se verá en el catálogo (4:3).</p>
        <VistaEncuadre editor={editor} etiqueta={`Vista previa del encuadre de ${especie.nombreComun}`} />
      </div>

      <fieldset className="selector-parte">
        <legend>¿Qué se ve en la foto?</legend>
        <div className="pastillas">
          {partes.map((p) => (
            <button key={p} type="button" aria-pressed={parte === p} onClick={() => setParte(parte === p ? null : p)}>
              {p}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="casilla">
        <input type="checkbox" checked={principal} onChange={(e) => setPrincipal(e.target.checked)} />
        <span>
          Usar como foto principal
          <span className="texto-suave texto-pequeno" style={{ display: 'block' }}>
            Es la que se ve en el catálogo, en el juego y en las fichas para imprimir.
          </span>
        </span>
      </label>

      <div>
        <h3>Personas y datos identificables</h3>
        <RevisionPersonas
          editor={editor}
          error={errores.revisada}
          textoSinDetector="Sin conexión a Internet no se puede usar la primera vez; quedará guardado en cuanto lo uses con conexión. Revisa la foto con atención antes de guardarla."
        />
      </div>

      <div className="formulario">
        <h3>Autoría y licencia</h3>
        <CamposLicencia valores={licencia} alCambiar={setLicencia} errores={errores} />
      </div>

      <div className="acciones" style={{ marginTop: 0 }}>
        <button type="submit" className="boton" disabled={guardando || editor.analizando}>
          {guardando ? 'Guardando…' : 'Guardar foto'}
        </button>
        <button type="button" className="boton boton--sencillo" onClick={editor.descartar}>
          Cancelar
        </button>
      </div>
      {editor.analizando && (
        <p className="texto-suave texto-pequeno" role="status">
          Esperando a que termine la revisión de la foto…
        </p>
      )}
      {!especie.propia && (
        <p className="texto-suave texto-pequeno" style={{ margin: 0 }}>
          Para que la vean también otros dispositivos, prepárala para el catálogo publicado con{' '}
          <Link to={`/catalogo/fotos?especie=${especie.id}`}>Preparar fotos del catálogo</Link>.
        </p>
      )}
    </form>
  );
}
