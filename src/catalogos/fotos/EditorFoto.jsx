import { useEffect, useMemo, useRef, useState } from 'react';
import { plural } from '../../calculos/formato.js';
import { IconoCamara, IconoSubir } from '../../componentes/Iconos.jsx';
import { detectarPersonas } from './detectorPersonas.js';
import {
  calcularRecorte,
  codificarImagen,
  dibujarRecorte,
  moverEncuadre,
  normalizarEncuadre,
  prepararLienzoAnalisis,
  tamanoSalida,
  zonasEnRecorte,
} from './procesarImagen.js';

/**
 * Pasos comunes para preparar una foto de especie, todo en el dispositivo:
 * elegir la foto, encuadrarla en 4:3, revisar que no aparezcan personas y anotar
 * su autoría y licencia. Los usan «Preparar fotos del catálogo» y «Mi catálogo».
 */

const ENCUADRE_INICIAL = { zoom: 1, centroX: 0.5, centroY: 0.5 };
const ANCHO_VISTA = 800;
const ALTO_VISTA = 600;

export const LICENCIAS = [
  { id: 'propia', etiqueta: 'Fotografía propia (todos los derechos reservados)', texto: 'Todos los derechos reservados' },
  { id: 'cc-by', etiqueta: 'CC BY 4.0', texto: 'CC BY 4.0' },
  { id: 'cc-by-sa', etiqueta: 'CC BY-SA 4.0', texto: 'CC BY-SA 4.0' },
  { id: 'cc0', etiqueta: 'CC0 1.0 (dominio público)', texto: 'CC0 1.0' },
  { id: 'otra', etiqueta: 'Otra licencia', texto: '' },
];

/* ---------- Estado del editor ---------- */

export function useEditorFoto() {
  const [foto, setFoto] = useState(null); // { imagen, url, nombre }
  const [errorFoto, setErrorFoto] = useState('');
  const [encuadre, setEncuadre] = useState(ENCUADRE_INICIAL);
  const [analisis, setAnalisis] = useState({ estado: 'inactivo', zonas: [] });
  const [pixelar, setPixelar] = useState(false);
  const [revisada, setRevisada] = useState(false);

  const ancho = foto?.imagen.naturalWidth ?? 0;
  const alto = foto?.imagen.naturalHeight ?? 0;
  const recorte = useMemo(() => (foto ? calcularRecorte(ancho, alto, encuadre) : null), [foto, ancho, alto, encuadre]);
  // Zonas que quedan dentro del encuadre (el recuento no depende de la escala).
  const zonasVisibles = useMemo(
    () => (recorte ? zonasEnRecorte(analisis.zonas, recorte, 1) : []),
    [analisis.zonas, recorte],
  );

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

  function cargarArchivo(archivo) {
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
      setErrorFoto('Este navegador no puede abrir la foto. Si es HEIC (iPhone), usa Safari o conviértela antes a JPG.');
    };
    imagen.src = url;
  }

  function descartar() {
    setFoto(null);
    setErrorFoto('');
    setAnalisis({ estado: 'inactivo', zonas: [] });
    setPixelar(false);
    setRevisada(false);
  }

  function cambiarEncuadre(cambios) {
    setEncuadre((actual) => normalizarEncuadre(ancho, alto, { ...actual, ...cambios }));
  }

  function mover(dx, dy) {
    setEncuadre((actual) => moverEncuadre(ancho, alto, actual, dx, dy));
  }

  /** Genera la foto final: recortada, con las zonas pixeladas si se pidió y sin metadatos. */
  async function generar() {
    const salida = tamanoSalida(recorte);
    const lienzo = document.createElement('canvas');
    lienzo.width = salida.ancho;
    lienzo.height = salida.alto;
    dibujarRecorte(lienzo, foto.imagen, recorte, { zonas: analisis.zonas, pixelar, marcar: false });
    const { blob, extension } = await codificarImagen(lienzo);
    return {
      blob,
      extension,
      ancho: salida.ancho,
      alto: salida.alto,
      pixeladas: pixelar && zonasVisibles.length > 0,
    };
  }

  return {
    foto,
    errorFoto,
    encuadre,
    analisis,
    pixelar,
    setPixelar,
    revisada,
    setRevisada,
    ancho,
    alto,
    recorte,
    zonasVisibles,
    analizando: analisis.estado === 'analizando',
    cargarArchivo,
    descartar,
    cambiarEncuadre,
    mover,
    generar,
  };
}

export function textoModificaciones(pixeladas) {
  return `Recortada a 4:3 y comprimida${pixeladas ? '; zonas con posibles personas pixeladas' : ''}`;
}

/* ---------- Elegir la foto ---------- */

/**
 * Botones para elegir la foto. Con «conCamara», uno abre directamente la cámara
 * y otro la galería; en un ordenador, ambos abren el selector de archivos.
 */
export function BotonesFoto({ editor, conCamara = false, textoElegir }) {
  const camara = useRef(null);
  const galeria = useRef(null);
  const alElegir = (evento) => {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    editor.cargarArchivo(archivo);
  };
  const entradaOculta = { type: 'file', accept: 'image/*', className: 'solo-lectores', tabIndex: -1, 'aria-hidden': true };

  return (
    <div className="botones-foto">
      {conCamara && (
        <>
          <input ref={camara} {...entradaOculta} capture="environment" onChange={alElegir} />
          <button type="button" className="boton" onClick={() => camara.current?.click()}>
            <IconoCamara />
            Hacer foto
          </button>
        </>
      )}
      <input ref={galeria} {...entradaOculta} onChange={alElegir} />
      <button type="button" className="boton boton--secundario" onClick={() => galeria.current?.click()}>
        <IconoSubir />
        {textoElegir ?? (editor.foto ? 'Elegir otra foto' : 'Elegir foto')}
      </button>
    </div>
  );
}

/* ---------- Encuadre ---------- */

export function VistaEncuadre({ editor, etiqueta }) {
  const vista = useRef(null);
  const arrastre = useRef(null);
  const { foto, recorte, analisis, pixelar, ancho, alto, encuadre } = editor;

  // Vista previa del encuadre con las zonas marcadas.
  useEffect(() => {
    if (!foto || !recorte || !vista.current) return;
    dibujarRecorte(vista.current, foto.imagen, recorte, { zonas: analisis.zonas, pixelar, marcar: true });
  }, [foto, recorte, analisis.zonas, pixelar]);

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
    editor.mover(-dx, -dy);
  }

  const soltar = () => {
    arrastre.current = null;
  };

  const sinMargenHorizontal = recorte && recorte.ancho >= ancho - 0.5;
  const sinMargenVertical = recorte && recorte.alto >= alto - 0.5;

  return (
    <>
      <div className="encuadre">
        <canvas
          ref={vista}
          width={ANCHO_VISTA}
          height={ALTO_VISTA}
          role="img"
          aria-label={etiqueta}
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
          alCambiar={(v) => editor.cambiarEncuadre({ zoom: v })}
        />
        <Deslizador
          id="horizontal"
          etiqueta="Horizontal"
          min={0}
          max={1}
          paso={0.005}
          valor={encuadre.centroX}
          desactivado={sinMargenHorizontal}
          alCambiar={(v) => editor.cambiarEncuadre({ centroX: v })}
        />
        <Deslizador
          id="vertical"
          etiqueta="Vertical"
          min={0}
          max={1}
          paso={0.005}
          valor={encuadre.centroY}
          desactivado={sinMargenVertical}
          alCambiar={(v) => editor.cambiarEncuadre({ centroY: v })}
        />
      </div>
    </>
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

/* ---------- Personas y datos identificables ---------- */

/**
 * @param {{textoSinDetector?: string}} props  qué decir si el detector no se puede cargar
 */
export function RevisionPersonas({ editor, error, textoSinDetector }) {
  const { analisis, pixelar, setPixelar, revisada, setRevisada, zonasVisibles } = editor;
  return (
    <>
      <EstadoAnalisis analisis={analisis} visibles={zonasVisibles.length} textoSinDetector={textoSinDetector} />
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
      {error && <p className="error-campo">{error}</p>}
    </>
  );
}

const TEXTO_SIN_DETECTOR =
  'Revisa la foto con atención antes de continuar. En local, ejecuta «npm run preparar-detector» con conexión a Internet para descargar los modelos.';

function EstadoAnalisis({ analisis, visibles, textoSinDetector = TEXTO_SIN_DETECTOR }) {
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
          {textoSinDetector}
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

/* ---------- Autoría y licencia ---------- */

/** Valores iniciales del formulario a partir de los datos guardados de una imagen. */
export const FUENTE_PROPIA = 'Fotografía propia';

/**
 * Valores iniciales de autoría. «quien» es 'yo' si la foto es propia: entonces
 * la procedencia es «Fotografía propia» y no hace falta confirmar derechos,
 * porque son de quien la hizo.
 */
export function valoresLicencia({ autor = '', fuente = FUENTE_PROPIA, licencia = '', derechos = false } = {}) {
  const conocida = licencia ? LICENCIAS.find((l) => l.texto && l.texto === licencia) : LICENCIAS[0];
  const propia = !fuente || fuente === FUENTE_PROPIA;
  return {
    quien: propia ? 'yo' : 'otra',
    autor,
    fuente: propia ? '' : fuente,
    licencia: conocida ? conocida.id : 'otra',
    licenciaOtra: conocida ? '' : licencia,
    derechos,
  };
}

/** Procedencia que se guarda. */
export const textoFuente = (valores) => (valores.quien === 'yo' ? FUENTE_PROPIA : valores.fuente.trim());

export function textoLicencia(valores) {
  return valores.licencia === 'otra'
    ? valores.licenciaOtra.trim()
    : LICENCIAS.find((l) => l.id === valores.licencia)?.texto ?? '';
}

/** Errores de los campos de autoría y licencia (objeto vacío si todo está bien). */
export function validarLicencia(valores) {
  const errores = {};
  const propia = valores.quien === 'yo';
  if (!valores.autor.trim()) errores.autor = propia ? 'Escribe tu nombre.' : 'Indica quién hizo la foto.';
  if (!propia && !valores.fuente.trim()) errores.fuente = 'Indica de dónde procede la foto.';
  if (!textoLicencia(valores)) errores.licencia = 'Escribe la licencia.';
  if (!propia && !valores.derechos) errores.derechos = 'Confirma que puedes usar la foto con esta licencia.';
  return errores;
}

export function CamposLicencia({ valores, alCambiar, errores = {}, ayudaFuente }) {
  const cambiar = (campo) => (evento) =>
    alCambiar({ ...valores, [campo]: evento.target.type === 'checkbox' ? evento.target.checked : evento.target.value });
  return (
    <>
      <fieldset className="selector-autoria">
        <legend>¿Quién hizo la foto?</legend>
        <label className="casilla">
          <input type="radio" name="foto-quien" checked={valores.quien === 'yo'} onChange={() => alCambiar({ ...valores, quien: 'yo' })} />
          <span>
            Yo
            <span className="texto-suave texto-pequeno" style={{ display: 'block' }}>
              Es tuya: los derechos son tuyos y no hace falta confirmarlos.
            </span>
          </span>
        </label>
        <label className="casilla">
          <input type="radio" name="foto-quien" checked={valores.quien === 'otra'} onChange={() => alCambiar({ ...valores, quien: 'otra' })} />
          <span>Otra persona</span>
        </label>
      </fieldset>
      <div className="campo">
        <label htmlFor="foto-autor">{valores.quien === 'yo' ? 'Tu nombre' : 'Autor o autora'}</label>
        <input
          id="foto-autor"
          value={valores.autor}
          onChange={cambiar('autor')}
          maxLength={200}
          autoComplete="name"
          aria-invalid={Boolean(errores.autor)}
        />
        {errores.autor && <p className="error-campo">{errores.autor}</p>}
      </div>
      <div className="campo">
        <label htmlFor="foto-licencia">Licencia</label>
        <select id="foto-licencia" value={valores.licencia} onChange={cambiar('licencia')}>
          {LICENCIAS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.etiqueta}
            </option>
          ))}
        </select>
      </div>
      {valores.licencia === 'otra' && (
        <div className="campo">
          <label htmlFor="foto-licencia-otra">Nombre de la licencia</label>
          <input
            id="foto-licencia-otra"
            value={valores.licenciaOtra}
            onChange={cambiar('licenciaOtra')}
            maxLength={200}
            aria-invalid={Boolean(errores.licencia)}
          />
          {errores.licencia && <p className="error-campo">{errores.licencia}</p>}
        </div>
      )}
      {valores.quien === 'otra' && (
        <>
      <div className="campo">
        <label htmlFor="foto-fuente">Procedencia</label>
        <input
          id="foto-fuente"
          value={valores.fuente}
          onChange={cambiar('fuente')}
          maxLength={500}
          aria-describedby={ayudaFuente ? 'ayuda-foto-fuente' : undefined}
          aria-invalid={Boolean(errores.fuente)}
        />
        {ayudaFuente && (
          <p className="ayuda" id="ayuda-foto-fuente">
            {ayudaFuente}
          </p>
        )}
        {errores.fuente && <p className="error-campo">{errores.fuente}</p>}
      </div>
      <label className="casilla">
        <input type="checkbox" checked={valores.derechos} onChange={cambiar('derechos')} />
        <span>Tengo derecho a usar esta foto con la licencia indicada.</span>
      </label>
      {errores.derechos && <p className="error-campo">{errores.derechos}</p>}
        </>
      )}
    </>
  );
}
