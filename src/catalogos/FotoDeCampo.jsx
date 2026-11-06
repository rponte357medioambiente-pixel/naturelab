import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAnunciar } from '../accesibilidad/Anunciador.jsx';
import { eliminarFotoCatalogo, guardarFotoCatalogo } from '../almacenamiento/repositorio.js';
import { useConsulta } from '../almacenamiento/useConsulta.js';
import { autorReciente } from './autorReciente.js';
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

/** Qué se recupera al quitar la foto de campo. */
function textoVolver(especie) {
  const original = especie.imagenOriginal;
  if (original?.imagenTipo === 'ilustracion' && original.imagen) return 'Volver a la ilustración';
  if (original?.imagen && original.imagenLicencia) return 'Volver a la imagen del catálogo';
  return 'Quitar mi foto';
}

/**
 * Sustituir, en este dispositivo, la imagen de una especie del catálogo publicado
 * por una foto hecha en campo. Pasa por el mismo encuadre, revisión de personas y
 * autoría que el resto de fotos de la app.
 */
export function FotoDeCampo({ especie }) {
  const editor = useEditorFoto();
  const { datos: autor } = useConsulta(() => autorReciente().catch(() => ''), []);

  return (
    <section className="panel foto-campo" aria-labelledby="titulo-foto-campo">
      {editor.foto ? (
        <EdicionFoto especie={especie} editor={editor} autorInicial={autor ?? ''} />
      ) : (
        <>
          <h2 id="titulo-foto-campo">{especie.fotoLocal ? 'Tu foto de campo' : 'Sustituir por tu foto'}</h2>
          <p className="texto-suave texto-pequeno">
            {especie.fotoLocal
              ? 'Esta foto sustituye a la imagen de la especie solo en este dispositivo. Entra en la copia de seguridad de «Mi catálogo».'
              : `Pasa por el encuadre y la revisión de personas. Se guarda solo en este dispositivo y entra en la copia de seguridad de «Mi catálogo».${especie.imagen ? ' Siempre podrás volver a la imagen actual.' : ''}`}
          </p>
          <BotonesFoto editor={editor} conCamara textoElegir="De la galería" />
          {editor.errorFoto && <p className="error-campo">{editor.errorFoto}</p>}
          {especie.fotoLocal && <BotonVolver especie={especie} />}
        </>
      )}
    </section>
  );
}

function BotonVolver({ especie }) {
  const anunciar = useAnunciar();
  const texto = textoVolver(especie);

  async function volver() {
    if (!window.confirm(`¿Quitar tu foto de ${especie.nombreComun}? ${texto === 'Quitar mi foto' ? '' : 'Volverá a verse la imagen del catálogo.'}`)) {
      return;
    }
    try {
      await eliminarFotoCatalogo(especie.id);
      anunciar('Tu foto se ha quitado de este dispositivo.');
    } catch (error) {
      anunciar(`No se ha podido quitar: ${error.message}`, { tipo: 'error' });
    }
  }

  return (
    <div className="acciones" style={{ marginTop: '0.5rem' }}>
      <button type="button" className="boton boton--sencillo" onClick={volver}>
        {texto}
      </button>
    </div>
  );
}

function EdicionFoto({ especie, editor, autorInicial }) {
  const anunciar = useAnunciar();
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
      await guardarFotoCatalogo(especie.id, {
        foto: { blob: generada.blob, ancho: generada.ancho, alto: generada.alto },
        imagenAutor: licencia.autor.trim(),
        imagenFuente: licencia.fuente.trim(),
        imagenLicencia: textoLicencia(licencia),
        imagenModificaciones: textoModificaciones(generada.pixeladas),
      });
      editor.descartar();
      anunciar(`Tu foto de ${especie.nombreComun} se ha guardado en este dispositivo.`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      anunciar(`No se ha podido guardar: ${error.message}`, { tipo: 'error', duracion: 6000 });
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} noValidate className="formulario">
      <h2 id="titulo-foto-campo">Tu foto de {especie.nombreComun}</h2>

      <div>
        <h3>Encuadre</h3>
        <p className="texto-suave texto-pequeno">Arrastra la imagen o usa los controles. Así se verá en el catálogo (4:3).</p>
        <VistaEncuadre editor={editor} etiqueta={`Vista previa del encuadre de ${especie.nombreComun}`} />
      </div>

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
          {guardando ? 'Guardando…' : 'Usar esta foto'}
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
      <p className="texto-suave texto-pequeno" style={{ margin: 0 }}>
        Para que la vean también otros dispositivos, prepárala para el catálogo publicado con{' '}
        <Link to={`/catalogo/fotos?especie=${especie.id}`}>Preparar fotos del catálogo</Link>.
      </p>
    </form>
  );
}
