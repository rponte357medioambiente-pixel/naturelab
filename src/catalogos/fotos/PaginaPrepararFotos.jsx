import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAnunciar } from '../../accesibilidad/Anunciador.jsx';
import { useTituloDocumento } from '../../accesibilidad/useTituloDocumento.js';
import { guardarAjuste, obtenerAjuste } from '../../almacenamiento/repositorio.js';
import { useConsulta } from '../../almacenamiento/useConsulta.js';
import { formatearFecha, formatearNumero, plural } from '../../calculos/formato.js';
import { IconoAtras, IconoDescargar, IconoPapelera } from '../../componentes/Iconos.jsx';
import { descargarArchivo } from '../../importacion-exportacion/descargar.js';
import { useCatalogo } from '../catalogo.js';
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
} from './EditorFoto.jsx';
import { aplicarCambiosCatalogo, CLAVE_PREPARADAS, tamanoSalida } from './procesarImagen.js';


const kb = (bytes) => `${formatearNumero(bytes / 1024, 0)} KB`;

export function PaginaPrepararFotos() {
  useTituloDocumento('Preparar fotos del catálogo');
  const { cargando, error, catalogo, especies: todas, buscarEspecie } = useCatalogo();
  // Solo el catálogo publicado: las especies de «Mi catálogo» no van a especies.json.
  const especies = todas.filter((e) => !e.propia);
  const { datos: preparadas } = useConsulta(() => obtenerAjuste(CLAVE_PREPARADAS), []);
  const [parametros] = useSearchParams();
  const [especieId, setEspecieId] = useState(parametros.get('especie') ?? '');
  const [claveFormulario, setClaveFormulario] = useState(0);

  const listaPreparadas = Object.values(preparadas ?? {}).sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <>
      <Link to="/catalogo" className="volver">
        <IconoAtras />
        Catálogo
      </Link>
      <header className="encabezado-pagina">
        <h1>Preparar fotos del catálogo</h1>
        <p>
          Herramienta para responsables. Recorta la foto de referencia, comprueba que no aparezcan personas y anota su
          autoría y licencia. Nada se publica desde aquí: descargarás los archivos para copiarlos en el proyecto.
        </p>
      </header>

      {error && (
        <div className="aviso aviso--error" role="alert">
          <p>No se ha podido cargar el catálogo.</p>
        </div>
      )}

      {!cargando && catalogo && (
        <>
          <section className="herramienta-paso" aria-labelledby="paso-especie">
            <h2 id="paso-especie">1. Especie</h2>
            <div className="campo">
              <label htmlFor="especie-foto">Especie del catálogo</label>
              <select id="especie-foto" value={especieId} onChange={(e) => setEspecieId(e.target.value)}>
                <option value="">Elige una especie</option>
                {especies.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombreComun} ({e.nombreCientifico})
                    {preparadas?.[e.id] ? ', preparada' : e.imagen && e.imagenLicencia ? ', ya tiene foto' : ''}
                  </option>
                ))}
              </select>
              {especieId && buscarEspecie(especieId)?.imagen && (
                <p className="ayuda">Esta especie ya tiene foto. Si preparas otra, la sustituirá.</p>
              )}
            </div>
          </section>

          {especieId && (
            <FormularioFoto
              key={`${especieId}-${claveFormulario}`}
              especie={buscarEspecie(especieId)}
              preparadas={preparadas ?? {}}
              alTerminar={() => setClaveFormulario((n) => n + 1)}
            />
          )}

          <ListaPreparadas lista={listaPreparadas} catalogo={catalogo} preparadas={preparadas ?? {}} buscarEspecie={buscarEspecie} />
        </>
      )}
    </>
  );
}

function FormularioFoto({ especie, preparadas, alTerminar }) {
  const anunciar = useAnunciar();
  const editor = useEditorFoto();
  const [licencia, setLicencia] = useState(() =>
    valoresLicencia({ autor: preparadas[Object.keys(preparadas)[0]]?.imagenAutor ?? '' }),
  );
  const [errores, setErrores] = useState({});
  const [generando, setGenerando] = useState(false);
  const { foto, ancho, alto, recorte } = editor;

  async function preparar(evento) {
    evento.preventDefault();
    const nuevos = { ...validarLicencia(licencia) };
    if (!foto) nuevos.foto = 'Elige una foto.';
    if (!editor.revisada) nuevos.revisada = 'Confirma que has revisado la foto.';
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;

    setGenerando(true);
    try {
      const { blob, extension, ancho: anchoSalida, alto: altoSalida, pixeladas } = await editor.generar();
      const archivo = `${especie.id}.${extension}`;
      descargarArchivo(archivo, blob, blob.type);

      const entradaCatalogo = {
        especieId: especie.id,
        archivo,
        imagen: `imagenes/especies/${archivo}`,
        imagenAutor: licencia.autor.trim(),
        imagenFuente: licencia.fuente.trim(),
        imagenLicencia: textoLicencia(licencia),
        imagenModificaciones: textoModificaciones(pixeladas),
        fecha: new Date().toISOString(),
        tamano: blob.size,
        ancho: anchoSalida,
        alto: altoSalida,
        blob,
      };
      const actuales = (await obtenerAjuste(CLAVE_PREPARADAS)) ?? {};
      await guardarAjuste(CLAVE_PREPARADAS, { ...actuales, [especie.id]: entradaCatalogo });
      anunciar(`Foto descargada: ${archivo} (${kb(blob.size)}).`, { duracion: 5000 });
      alTerminar();
    } catch (error) {
      anunciar(`No se ha podido preparar la foto: ${error.message}`, { tipo: 'error', duracion: 6000 });
      setGenerando(false);
    }
  }

  return (
    <form onSubmit={preparar} noValidate>
      <section className="herramienta-paso" aria-labelledby="paso-foto">
        <h2 id="paso-foto">2. Foto de {especie.nombreComun}</h2>
        <BotonesFoto editor={editor} />
        {foto && (
          <p className="texto-suave texto-pequeno" style={{ marginTop: '0.5rem' }}>
            {foto.nombre}, {ancho} × {alto} píxeles
          </p>
        )}
        {editor.errorFoto && <p className="error-campo">{editor.errorFoto}</p>}
        {errores.foto && <p className="error-campo">{errores.foto}</p>}
      </section>

      {foto && (
        <>
          <section className="herramienta-paso" aria-labelledby="paso-encuadre">
            <h2 id="paso-encuadre">3. Encuadre</h2>
            <p className="texto-suave texto-pequeno">
              Arrastra la imagen o usa los controles. Así se verá en las fichas del catálogo (proporción 4:3).
            </p>
            <VistaEncuadre editor={editor} etiqueta={`Vista previa del encuadre de ${especie.nombreComun}`} />
          </section>

          <section className="herramienta-paso" aria-labelledby="paso-personas">
            <h2 id="paso-personas">4. Personas y datos identificables</h2>
            <RevisionPersonas editor={editor} error={errores.revisada} />
          </section>

          <section className="herramienta-paso formulario" aria-labelledby="paso-licencia">
            <h2 id="paso-licencia">5. Autoría y licencia</h2>
            <CamposLicencia
              valores={licencia}
              alCambiar={setLicencia}
              errores={errores}
              ayudaFuente="Para fotos de Wikimedia Commons, pega la dirección de la página de la imagen."
            />

            <div className="acciones" style={{ marginTop: 0 }}>
              <button type="submit" className="boton" disabled={generando || editor.analizando}>
                <IconoDescargar />
                Preparar y descargar foto
              </button>
            </div>
            {recorte && (
              <p className="texto-suave texto-pequeno" style={{ margin: 0 }}>
                Se generará {especie.id}.webp (o .jpg si el navegador no admite WebP) de{' '}
                {tamanoSalida(recorte).ancho} × {tamanoSalida(recorte).alto} píxeles, sin datos de ubicación.
              </p>
            )}
          </section>
        </>
      )}
    </form>
  );
}

function Miniatura({ blob, alt }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!blob) return undefined;
    const nueva = URL.createObjectURL(blob);
    setUrl(nueva);
    return () => URL.revokeObjectURL(nueva);
  }, [blob]);
  return url ? <img className="miniatura" src={url} alt={alt} /> : <span className="miniatura" aria-hidden="true" />;
}

function ListaPreparadas({ lista, catalogo, preparadas, buscarEspecie }) {
  const anunciar = useAnunciar();
  if (lista.length === 0) return null;

  async function quitar(especieId) {
    const resto = { ...preparadas };
    delete resto[especieId];
    await guardarAjuste(CLAVE_PREPARADAS, resto);
  }

  async function vaciar() {
    if (!window.confirm('¿Vaciar la lista? Hazlo después de copiar las fotos y el catálogo en el proyecto.')) return;
    await guardarAjuste(CLAVE_PREPARADAS, {});
    anunciar('Lista vaciada.');
  }

  function descargarCatalogo() {
    const nuevo = aplicarCambiosCatalogo(catalogo, lista);
    descargarArchivo('especies.json', `${JSON.stringify(nuevo, null, 2)}\n`, 'application/json');
    anunciar('Catálogo descargado: especies.json.');
  }

  const comandos = [
    ...lista.map((p) => `cp ~/Downloads/${p.archivo} public/imagenes/especies/`),
    'cp ~/Downloads/especies.json public/data/especies.json',
  ].join('\n');

  return (
    <section className="herramienta-paso" aria-labelledby="titulo-preparadas">
      <h2 id="titulo-preparadas">Fotos preparadas en este dispositivo</h2>
      <ul className="lista lista-panel">
        {lista.map((p) => {
          const especie = buscarEspecie(p.especieId);
          return (
            <li key={p.especieId} className="fila-preparada">
              <Miniatura blob={p.blob} alt={especie?.nombreComun ?? p.especieId} />
              <div>
                <strong>{especie?.nombreComun ?? p.especieId}</strong>
                <span className="texto-suave texto-pequeno" style={{ display: 'block' }}>
                  {p.archivo}, {kb(p.tamano)}, {formatearFecha(p.fecha)}
                </span>
                <span className="texto-suave texto-pequeno" style={{ display: 'block' }}>
                  {p.imagenAutor}. {p.imagenLicencia}.
                </span>
                <div className="herramientas" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                  <button
                    type="button"
                    className="boton boton--sencillo"
                    onClick={() => descargarArchivo(p.archivo, p.blob, p.blob.type)}
                  >
                    <IconoDescargar />
                    Descargar de nuevo
                  </button>
                  <button type="button" className="boton boton--sencillo" onClick={() => quitar(p.especieId)}>
                    <IconoPapelera />
                    Quitar
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="acciones">
        <button type="button" className="boton" onClick={descargarCatalogo}>
          <IconoDescargar />
          Descargar especies.json ({plural(lista.length, 'cambio', 'cambios')})
        </button>
      </div>

      <h3 style={{ marginTop: '1.5rem' }}>Copiar en el proyecto</h3>
      <p className="texto-suave texto-pequeno">
        En la terminal, dentro de la carpeta del proyecto. Si el navegador ha renombrado algún archivo al descargarlo
        (por ejemplo, «especies (1).json»), ajusta el nombre.
      </p>
      <pre className="codigo">{comandos}</pre>
      <p className="texto-suave texto-pequeno">
        Después, recarga la app para ver las fotos en el catálogo y vacía esta lista.
      </p>
      <button type="button" className="boton boton--sencillo" onClick={vaciar}>
        Vaciar la lista
      </button>
    </section>
  );
}
