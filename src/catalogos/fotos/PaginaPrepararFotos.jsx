import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAnunciar } from '../../accesibilidad/Anunciador.jsx';
import { useTituloDocumento } from '../../accesibilidad/useTituloDocumento.js';
import { guardarAjuste, obtenerAjuste } from '../../almacenamiento/repositorio.js';
import { useConsulta } from '../../almacenamiento/useConsulta.js';
import { formatearFecha, formatearNumero, plural } from '../../calculos/formato.js';
import { IconoAtras, IconoDescargar, IconoPapelera, IconoSubir } from '../../componentes/Iconos.jsx';
import { descargarArchivo } from '../../importacion-exportacion/descargar.js';
import { useCatalogo } from '../catalogo.js';
import { detectarPersonas } from './detectorPersonas.js';
import {
  aplicarCambiosCatalogo,
  calcularRecorte,
  codificarImagen,
  dibujarRecorte,
  moverEncuadre,
  normalizarEncuadre,
  prepararLienzoAnalisis,
  tamanoSalida,
} from './procesarImagen.js';

const CLAVE_PREPARADAS = 'catalogo-fotos-preparadas';
const ENCUADRE_INICIAL = { zoom: 1, centroX: 0.5, centroY: 0.5 };
const ANCHO_VISTA = 800;
const ALTO_VISTA = 600;

const LICENCIAS = [
  { id: 'propia', etiqueta: 'Fotografía propia (todos los derechos reservados)', texto: 'Todos los derechos reservados' },
  { id: 'cc-by', etiqueta: 'CC BY 4.0', texto: 'CC BY 4.0' },
  { id: 'cc-by-sa', etiqueta: 'CC BY-SA 4.0', texto: 'CC BY-SA 4.0' },
  { id: 'cc0', etiqueta: 'CC0 1.0 (dominio público)', texto: 'CC0 1.0' },
  { id: 'otra', etiqueta: 'Otra licencia', texto: '' },
];

const kb = (bytes) => `${formatearNumero(bytes / 1024, 0)} KB`;

export function PaginaPrepararFotos() {
  useTituloDocumento('Preparar fotos del catálogo');
  const { cargando, error, catalogo, especies, buscarEspecie } = useCatalogo();
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
  const entrada = useRef(null);
  const vista = useRef(null);
  const arrastre = useRef(null);

  const [foto, setFoto] = useState(null); // { imagen, url, nombre }
  const [errorFoto, setErrorFoto] = useState('');
  const [encuadre, setEncuadre] = useState(ENCUADRE_INICIAL);
  const [analisis, setAnalisis] = useState({ estado: 'inactivo', zonas: [] });
  const [pixelar, setPixelar] = useState(false);
  const [revisada, setRevisada] = useState(false);
  const [autor, setAutor] = useState(preparadas[Object.keys(preparadas)[0]]?.imagenAutor ?? '');
  const [fuente, setFuente] = useState('Fotografía propia');
  const [licencia, setLicencia] = useState('propia');
  const [licenciaOtra, setLicenciaOtra] = useState('');
  const [derechos, setDerechos] = useState(false);
  const [errores, setErrores] = useState({});
  const [generando, setGenerando] = useState(false);

  const ancho = foto?.imagen.naturalWidth ?? 0;
  const alto = foto?.imagen.naturalHeight ?? 0;
  const recorte = useMemo(() => (foto ? calcularRecorte(ancho, alto, encuadre) : null), [foto, ancho, alto, encuadre]);
  const [zonasVisibles, setZonasVisibles] = useState([]);

  // Liberar la URL temporal de la foto al cambiarla o al salir.
  useEffect(() => () => foto && URL.revokeObjectURL(foto.url), [foto]);

  // Analizar la foto en el dispositivo en cuanto se carga.
  useEffect(() => {
    if (!foto) return undefined;
    let activo = true;
    setAnalisis({ estado: 'analizando', zonas: [] });
    const { lienzo, escala } = prepararLienzoAnalisis(foto.imagen);
    detectarPersonas(lienzo, escala).then(
      (zonas) => {
        if (!activo) return;
        setAnalisis({ estado: 'listo', zonas });
        setPixelar(zonas.length > 0);
      },
      (error) => activo && setAnalisis({ estado: 'error', zonas: [], mensaje: error?.message }),
    );
    return () => {
      activo = false;
    };
  }, [foto]);

  // Vista previa del encuadre.
  useEffect(() => {
    if (!foto || !recorte || !vista.current) return;
    const visibles = dibujarRecorte(vista.current, foto.imagen, recorte, {
      zonas: analisis.zonas,
      pixelar,
      marcar: true,
    });
    setZonasVisibles(visibles);
  }, [foto, recorte, analisis.zonas, pixelar]);

  function elegirFoto(evento) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;
    setErrorFoto('');
    const url = URL.createObjectURL(archivo);
    const imagen = new Image();
    imagen.onload = () => {
      setFoto({ imagen, url, nombre: archivo.name });
      setEncuadre(ENCUADRE_INICIAL);
      setRevisada(false);
    };
    imagen.onerror = () => {
      URL.revokeObjectURL(url);
      setErrorFoto(
        'Este navegador no puede abrir la foto. Si es HEIC (iPhone), usa Safari o conviértela antes a JPG.',
      );
    };
    imagen.src = url;
  }

  function cambiarEncuadre(cambios) {
    setEncuadre((actual) => normalizarEncuadre(ancho, alto, { ...actual, ...cambios }));
  }

  function alPulsar(evento) {
    evento.currentTarget.setPointerCapture(evento.pointerId);
    arrastre.current = { x: evento.clientX, y: evento.clientY };
  }

  function alMover(evento) {
    if (!arrastre.current || !recorte) return;
    const factor = recorte.ancho / evento.currentTarget.getBoundingClientRect().width;
    const dx = (evento.clientX - arrastre.current.x) * factor;
    const dy = (evento.clientY - arrastre.current.y) * factor;
    arrastre.current = { x: evento.clientX, y: evento.clientY };
    setEncuadre((actual) => moverEncuadre(ancho, alto, actual, -dx, -dy));
  }

  const soltar = () => {
    arrastre.current = null;
  };

  async function preparar(evento) {
    evento.preventDefault();
    const textoLicencia = licencia === 'otra' ? licenciaOtra.trim() : LICENCIAS.find((l) => l.id === licencia).texto;
    const nuevos = {};
    if (!foto) nuevos.foto = 'Elige una foto.';
    if (!autor.trim()) nuevos.autor = 'Indica quién hizo la foto.';
    if (!fuente.trim()) nuevos.fuente = 'Indica de dónde procede la foto.';
    if (!textoLicencia) nuevos.licencia = 'Escribe la licencia.';
    if (!derechos) nuevos.derechos = 'Confirma que puedes usar la foto con esta licencia.';
    if (!revisada) nuevos.revisada = 'Confirma que has revisado la foto.';
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;

    setGenerando(true);
    try {
      const salida = tamanoSalida(recorte);
      const lienzo = document.createElement('canvas');
      lienzo.width = salida.ancho;
      lienzo.height = salida.alto;
      dibujarRecorte(lienzo, foto.imagen, recorte, { zonas: analisis.zonas, pixelar, marcar: false });
      const { blob, extension } = await codificarImagen(lienzo);
      const archivo = `${especie.id}.${extension}`;
      descargarArchivo(archivo, blob, blob.type);

      const pixeladas = pixelar && zonasVisibles.length > 0;
      const entradaCatalogo = {
        especieId: especie.id,
        archivo,
        imagen: `imagenes/especies/${archivo}`,
        imagenAutor: autor.trim(),
        imagenFuente: fuente.trim(),
        imagenLicencia: textoLicencia,
        imagenModificaciones: `Recortada a 4:3 y comprimida${pixeladas ? '; zonas con posibles personas pixeladas' : ''}`,
        fecha: new Date().toISOString(),
        tamano: blob.size,
        ancho: salida.ancho,
        alto: salida.alto,
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

  const sinMargenHorizontal = recorte && recorte.ancho >= ancho - 0.5;
  const sinMargenVertical = recorte && recorte.alto >= alto - 0.5;

  return (
    <form onSubmit={preparar} noValidate>
      <section className="herramienta-paso" aria-labelledby="paso-foto">
        <h2 id="paso-foto">2. Foto de {especie.nombreComun}</h2>
        <input
          ref={entrada}
          type="file"
          accept="image/*"
          className="solo-lectores"
          tabIndex={-1}
          aria-hidden="true"
          onChange={elegirFoto}
        />
        <button type="button" className="boton boton--secundario" onClick={() => entrada.current?.click()}>
          <IconoSubir />
          {foto ? 'Elegir otra foto' : 'Elegir foto'}
        </button>
        {foto && (
          <p className="texto-suave texto-pequeno" style={{ marginTop: '0.5rem' }}>
            {foto.nombre}, {ancho} × {alto} píxeles
          </p>
        )}
        {errorFoto && <p className="error-campo">{errorFoto}</p>}
        {errores.foto && <p className="error-campo">{errores.foto}</p>}
      </section>

      {foto && (
        <>
          <section className="herramienta-paso" aria-labelledby="paso-encuadre">
            <h2 id="paso-encuadre">3. Encuadre</h2>
            <p className="texto-suave texto-pequeno">
              Arrastra la imagen o usa los controles. Así se verá en las fichas del catálogo (proporción 4:3).
            </p>
            <div className="encuadre">
              <canvas
                ref={vista}
                width={ANCHO_VISTA}
                height={ALTO_VISTA}
                role="img"
                aria-label={`Vista previa del encuadre de ${especie.nombreComun}`}
                onPointerDown={alPulsar}
                onPointerMove={alMover}
                onPointerUp={soltar}
                onPointerCancel={soltar}
              />
            </div>
            <div className="deslizadores">
              <Deslizador
                id="zoom"
                etiqueta="Ampliar"
                min={1}
                max={4}
                paso={0.05}
                valor={encuadre.zoom}
                alCambiar={(v) => cambiarEncuadre({ zoom: v })}
              />
              <Deslizador
                id="horizontal"
                etiqueta="Horizontal"
                min={0}
                max={1}
                paso={0.005}
                valor={encuadre.centroX}
                desactivado={sinMargenHorizontal}
                alCambiar={(v) => cambiarEncuadre({ centroX: v })}
              />
              <Deslizador
                id="vertical"
                etiqueta="Vertical"
                min={0}
                max={1}
                paso={0.005}
                valor={encuadre.centroY}
                desactivado={sinMargenVertical}
                alCambiar={(v) => cambiarEncuadre({ centroY: v })}
              />
            </div>
          </section>

          <section className="herramienta-paso" aria-labelledby="paso-personas">
            <h2 id="paso-personas">4. Personas y datos identificables</h2>
            <EstadoAnalisis analisis={analisis} visibles={zonasVisibles.length} />
            {analisis.zonas.length > 0 && (
              <label className="casilla">
                <input type="checkbox" checked={pixelar} onChange={(e) => setPixelar(e.target.checked)} />
                <span>Pixelar las zonas marcadas</span>
              </label>
            )}
            <label className="casilla">
              <input type="checkbox" checked={revisada} onChange={(e) => setRevisada(e.target.checked)} />
              <span>
                He revisado la foto: no aparecen personas, matrículas, direcciones ni otros datos identificables
                {analisis.zonas.length > 0 ? ', o están pixelados' : ''}.
              </span>
            </label>
            {errores.revisada && <p className="error-campo">{errores.revisada}</p>}
          </section>

          <section className="herramienta-paso formulario" aria-labelledby="paso-licencia">
            <h2 id="paso-licencia">5. Autoría y licencia</h2>
            <div className="campo">
              <label htmlFor="foto-autor">Autor o autora</label>
              <input
                id="foto-autor"
                value={autor}
                onChange={(e) => setAutor(e.target.value)}
                maxLength={200}
                aria-invalid={Boolean(errores.autor)}
              />
              {errores.autor && <p className="error-campo">{errores.autor}</p>}
            </div>
            <div className="campo">
              <label htmlFor="foto-licencia">Licencia</label>
              <select id="foto-licencia" value={licencia} onChange={(e) => setLicencia(e.target.value)}>
                {LICENCIAS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.etiqueta}
                  </option>
                ))}
              </select>
            </div>
            {licencia === 'otra' && (
              <div className="campo">
                <label htmlFor="foto-licencia-otra">Nombre de la licencia</label>
                <input
                  id="foto-licencia-otra"
                  value={licenciaOtra}
                  onChange={(e) => setLicenciaOtra(e.target.value)}
                  maxLength={200}
                  aria-invalid={Boolean(errores.licencia)}
                />
                {errores.licencia && <p className="error-campo">{errores.licencia}</p>}
              </div>
            )}
            <div className="campo">
              <label htmlFor="foto-fuente">Procedencia</label>
              <input
                id="foto-fuente"
                value={fuente}
                onChange={(e) => setFuente(e.target.value)}
                maxLength={500}
                aria-describedby="ayuda-foto-fuente"
                aria-invalid={Boolean(errores.fuente)}
              />
              <p className="ayuda" id="ayuda-foto-fuente">
                Para fotos de Wikimedia Commons, pega la dirección de la página de la imagen.
              </p>
              {errores.fuente && <p className="error-campo">{errores.fuente}</p>}
            </div>
            <label className="casilla">
              <input type="checkbox" checked={derechos} onChange={(e) => setDerechos(e.target.checked)} />
              <span>Tengo derecho a usar esta foto con la licencia indicada.</span>
            </label>
            {errores.derechos && <p className="error-campo">{errores.derechos}</p>}

            <div className="acciones" style={{ marginTop: 0 }}>
              <button type="submit" className="boton" disabled={generando || analisis.estado === 'analizando'}>
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

function Deslizador({ id, etiqueta, min, max, paso, valor, desactivado = false, alCambiar }) {
  return (
    <div className="deslizador">
      <label htmlFor={`deslizador-${id}`}>{etiqueta}</label>
      <input
        id={`deslizador-${id}`}
        type="range"
        min={min}
        max={max}
        step={paso}
        value={valor}
        disabled={desactivado}
        onChange={(e) => alCambiar(Number(e.target.value))}
      />
    </div>
  );
}

function EstadoAnalisis({ analisis, visibles }) {
  const aviso = (
    <p className="texto-suave texto-pequeno">
      El análisis se hace en este dispositivo; la foto no se envía a ningún sitio. Es una ayuda: puede no ver caras
      pequeñas, de perfil o tapadas, y no detecta matrículas ni textos.
    </p>
  );
  if (analisis.estado === 'analizando') {
    return (
      <div className="aviso" role="status">
        <p>Buscando personas en la foto…</p>
        {aviso}
      </div>
    );
  }
  if (analisis.estado === 'error') {
    return (
      <div className="aviso aviso--ocre" role="status">
        <p>
          <strong>No se ha podido cargar el detector de personas.</strong>
          Revisa la foto con atención antes de continuar. En local, ejecuta «npm run preparar-detector» con conexión a
          Internet para descargar los modelos.
        </p>
      </div>
    );
  }
  if (analisis.estado === 'listo' && analisis.zonas.length === 0) {
    return (
      <div className="aviso" role="status">
        <p>No se han detectado personas.</p>
        {aviso}
      </div>
    );
  }
  if (analisis.estado === 'listo') {
    return (
      <div className="aviso aviso--ocre" role="status">
        <p>
          <strong>
            {plural(analisis.zonas.length, 'zona podría ser una persona', 'zonas podrían ser personas')}
            {visibles !== analisis.zonas.length && ` (${visibles} dentro del encuadre)`}.
          </strong>
          Están marcadas en amarillo. Pixélalas, cambia el encuadre o elige otra foto.
        </p>
        {aviso}
      </div>
    );
  }
  return null;
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
