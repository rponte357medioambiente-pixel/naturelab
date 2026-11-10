import { useEffect, useState } from 'react';
import { useAnunciar } from '../accesibilidad/Anunciador.jsx';
import { useTituloDocumento } from '../accesibilidad/useTituloDocumento.js';
import { estadoAlmacenamiento, solicitarPersistencia } from '../almacenamiento/repositorio.js';
import { formatearNumero } from '../calculos/formato.js';
import { useCatalogo } from '../catalogos/catalogo.js';

const megas = (bytes) => `${formatearNumero(bytes / 1024 / 1024, 1)} MB`;

export function PaginaAyuda() {
  useTituloDocumento('Ayuda y privacidad');
  const anunciar = useAnunciar();
  const { catalogo } = useCatalogo();
  const [almacen, setAlmacen] = useState(null);
  const sinConexionLista = Boolean(navigator.serviceWorker?.controller);

  const actualizarEstado = () => estadoAlmacenamiento().then(setAlmacen);
  useEffect(() => {
    actualizarEstado();
  }, []);

  async function pedirPersistencia() {
    const concedido = await solicitarPersistencia({ forzar: true });
    await actualizarEstado();
    anunciar(
      concedido
        ? 'El navegador conservará los datos de NatureLab.'
        : 'El navegador no lo ha concedido. Exporta copias con frecuencia.',
    );
  }

  return (
    <>
      <header className="encabezado-pagina">
        <h1>Ayuda y privacidad</h1>
        <p>Cómo funciona NatureLab y qué ocurre con tus datos.</p>
      </header>

      <section className="ayuda-bloque" aria-labelledby="ayuda-estado">
        <h2 id="ayuda-estado">Estado de este dispositivo</h2>
        <ul className="lista lista-panel">
          <li className="fila-registro">
            <div className="principal">
              <strong>Uso sin conexión</strong>
              <span className="texto-suave">
                {sinConexionLista
                  ? 'Preparado: la app se abrirá aunque no haya Internet.'
                  : 'Aún no está preparado. Abre la app una vez con conexión y recarga la página.'}
              </span>
            </div>
          </li>
          <li className="fila-registro">
            <div className="principal">
              <strong>Conservación de los datos</strong>
              <span className="texto-suave">
                {almacen?.persistente === true && 'El navegador se ha comprometido a no borrarlos cuando falte espacio.'}
                {almacen?.persistente === false &&
                  'El navegador podría borrarlos si el dispositivo se queda sin espacio.'}
                {almacen && almacen.persistente === null && 'Este navegador no informa de ello.'}
              </span>
            </div>
            {almacen?.persistente === false && (
              <div className="herramientas">
                <button type="button" className="boton boton--secundario" onClick={pedirPersistencia}>
                  Pedir que los conserve
                </button>
              </div>
            )}
          </li>
          {almacen?.usado !== null && almacen?.usado !== undefined && (
            <li className="fila-registro">
              <div className="principal">
                <strong>Espacio usado</strong>
                <span className="texto-suave">
                  {megas(almacen.usado)}
                  {almacen.cuota ? ` de ${megas(almacen.cuota)} disponibles` : ''}
                </span>
              </div>
            </li>
          )}
        </ul>
      </section>

      <section className="ayuda-bloque" aria-labelledby="ayuda-datos">
        <h2 id="ayuda-datos">Dónde se guardan tus datos</h2>
        <p>
          Las investigaciones, parcelas y observaciones se guardan solo en este navegador. NatureLab no tiene cuentas
          de usuario ni servidor, y no envía tus datos a ningún sitio.
        </p>
        <p>
          Los datos pueden perderse si borras los datos del navegador, cambias de dispositivo o el sistema libera
          espacio. Instalar la app no elimina ese riesgo. Por eso conviene <strong>exportar una copia</strong> al
          terminar cada sesión de campo con «Copia de seguridad». Es un archivo ZIP que incluye las fotos y se
          recupera con «Importar copia», sin descomprimirlo. Las investigaciones con cambios sin copia muestran
          «Pendiente de exportar».
        </p>
      </section>

      <section className="ayuda-bloque" aria-labelledby="ayuda-practicas">
        <h2 id="ayuda-practicas">Tipos de práctica</h2>
        <p>
          <strong>Recuento en parcela:</strong> cuentas los individuos de cada especie dentro de una superficie. NatureLab
          calcula la riqueza, los índices de Shannon y Pielou y la densidad.
        </p>
        <p>
          <strong>Transecto lineal:</strong> tiendes una cuerda y mides cuánto ocupa cada especie bajo ella. Puedes anotar
          solo lo que mide cada mancha (por ejemplo, 1+12+5+28) o dónde empieza y termina sobre la cinta. NatureLab
          calcula la cobertura de cada especie, la cobertura total y el suelo desnudo. Si dos plantas se solapan, cuentan
          las dos. Puedes añadir varios transectos, por ejemplo uno Este-Oeste y otro Norte-Sur.
        </p>
        <p>
          En Investigaciones, «Cargar un modelo» copia en el dispositivo investigaciones completas, como el Salar de los
          Canos o Río Antas, para practicar o usarlas como punto de partida.
        </p>
      </section>

      <section className="ayuda-bloque" aria-labelledby="ayuda-dibujos">
        <h2 id="ayuda-dibujos">Dibujos</h2>
        <p>
          Cada investigación tiene una pestaña «Dibujos». Al crear uno se elige la especie y cómo dibujarla:{' '}
          <strong>unir los puntos</strong>, con su contorno en tres niveles de dificultad, o <strong>dibujo libre</strong>,
          en una hoja en blanco. Después se puede colorear con el dedo, el ratón o un lápiz digital; con lápiz, el trazo
          sigue la presión y la mano apoyada en la pantalla no pinta.
        </p>
        <p>
          Los dibujos se guardan en la investigación, salen en el cuaderno en PDF y viajan en su copia de seguridad. Usa
          un alias para indicar quién dibuja, nunca el nombre real.
        </p>
      </section>

      <section className="ayuda-bloque" aria-labelledby="ayuda-juego">
        <h2 id="ayuda-juego">Juego «¿Qué especie es?»</h2>
        <p>
          En Catálogo, «Jugar: ¿qué especie es?» muestra la imagen de una especie y cuatro nombres para elegir. Se juega con
          todo el catálogo o solo con las especies de las investigaciones que marques, con el nombre común o el científico,
          en partidas de 5, 10 o 20 preguntas. Solo salen las especies que tienen foto o ilustración, incluidas tus fotos de
          campo. Al final aparecen los aciertos y las especies para repasar. No se guarda ningún resultado.
        </p>
      </section>

      <section className="ayuda-bloque" aria-labelledby="ayuda-ubicacion">
        <h2 id="ayuda-ubicacion">Ubicación y hábitat</h2>
        <p>
          Cada investigación puede guardar sus coordenadas: «Usar mi ubicación» las toma del GPS (solo si lo pulsas) o se
          escriben a mano en grados decimales. Cada parcela o transecto puede tener las suyas si está en otro sitio. Salen
          exactas en el cuaderno en PDF, en los CSV y en la copia de seguridad; si la ubicación de una especie protegida no
          debe difundirse, déjalas vacías. La ficha de cada especie muestra sola en qué investigaciones se ha observado,
          con un enlace al mapa.
        </p>
        <p>
          Al añadir una especie a Mi catálogo se elige su hábitat natural (dunares y de costa, crasas de desierto, alta
          montaña, bosque, acuáticas y de ribera, o praderas y campo abierto). En el Catálogo se puede filtrar por hábitat.
        </p>
      </section>

      <section className="ayuda-bloque" aria-labelledby="ayuda-fichas">
        <h2 id="ayuda-fichas">Fichas para imprimir</h2>
        <p>
          En Catálogo, «Fichas para imprimir» crea un PDF con una fila por especie: su imagen con el nombre y, al lado,
          sus características. Sin recortar sirve para estudiar; recortado por las líneas de puntos, para emparejar cada
          imagen con su ficha. Las letras van barajadas y las soluciones y los créditos de las imágenes están en la última
          página. Se puede hacer con todo el catálogo o con las especies de las investigaciones que elijas.
        </p>
      </section>

      <section className="ayuda-bloque" aria-labelledby="ayuda-aspecto">
        <h2 id="ayuda-aspecto">Paletas y tamaño del texto</h2>
        <p>
          En el menú de configuración, el engranaje de arriba a la derecha, eliges la paleta general de la app y el
          tamaño del texto. Cada investigación puede tener además su propia paleta, por ejemplo Mar para una de
          microplásticos en la playa: se elige al crearla o al editarla.
        </p>
      </section>

      <section className="ayuda-bloque" aria-labelledby="ayuda-mi-catalogo">
        <h2 id="ayuda-mi-catalogo">Mi catálogo</h2>
        <p>
          En Catálogo, «Añadir a mi catálogo» guarda una planta que encuentres, con su foto y el nombre que quieras
          darle, sin que pertenezca a ninguna investigación. Después puedes elegirla al registrar observaciones.
        </p>
        <p>
          Igual que las investigaciones, «Mi catálogo» se guarda solo en este dispositivo. Tiene su propia copia de
          seguridad, en la misma pantalla del catálogo: descárgala de vez en cuando y úsala para llevar tus especies a
          otro dispositivo con «Importar copia».
        </p>
        <p>
          En la ficha de cualquier especie del catálogo, «Sustituir por tu foto» cambia su ilustración o su imagen por
          una foto tuya hecha en campo. Solo se ve en este dispositivo, entra en la copia de «Mi catálogo» y puedes
          volver a la imagen original cuando quieras.
        </p>
      </section>

      <section className="ayuda-bloque" aria-labelledby="ayuda-pdf">
        <h2 id="ayuda-pdf">Cuaderno en PDF</h2>
        <p>
          «Cuaderno en PDF» genera un documento con la portada, los resultados y todas las observaciones con sus
          fotos, listo para compartir o imprimir. Se crea en el dispositivo, también sin conexión. Sirve para leer y
          compartir; para guardar o mover los datos, usa la copia de seguridad.
        </p>
      </section>

      <section className="ayuda-bloque" aria-labelledby="ayuda-equipos">
        <h2 id="ayuda-equipos">Trabajo en equipo</h2>
        <ul>
          <li>Con un solo dispositivo, una persona registra lo que observa el equipo.</li>
          <li>
            Con varios dispositivos, cada uno exporta su copia y la persona responsable la importa y elige «Fusionar».
            Las observaciones repetidas no se cuentan dos veces.
          </li>
          <li>No hay sincronización en tiempo real entre dispositivos.</li>
        </ul>
      </section>

      <section className="ayuda-bloque" aria-labelledby="ayuda-identificacion">
        <h2 id="ayuda-identificacion">Identificar especies</h2>
        <p>
          El catálogo es provisional y está pendiente de revisión. Si no reconoces una especie, regístrala
          con «Añadir especie nueva»: basta un nombre provisional y, si lo sabes, si es planta, animal o insecto. Se
          guarda en Mi catálogo como pendiente y la clasificas después desde su ficha.
        </p>
        <p>
          Puedes consultar una aplicación externa como Google Lens, pero NatureLab no está conectada con ella. Ten en
          cuenta que la foto se comparte con ese servicio según sus condiciones y que las imágenes de sus resultados
          no se pueden reutilizar libremente.
        </p>
      </section>

      <section className="ayuda-bloque" aria-labelledby="ayuda-privacidad">
        <h2 id="ayuda-privacidad">Privacidad en talleres</h2>
        <ul>
          <li>Usa alias para los equipos, nunca nombres reales.</li>
          <li>Describe el lugar de forma general; NatureLab no usa el GPS.</li>
          <li>
            Las fotos de las observaciones se guardan solo en este dispositivo, sin datos de ubicación. Salen de él
            únicamente si compartes la copia de seguridad o el cuaderno en PDF.
          </li>
          <li>Fotografía las plantas y evita caras, matrículas, direcciones y otros datos personales.</li>
          <li>
            En talleres con menores, la entidad organizadora debe revisar las obligaciones de protección de datos antes
            de recoger o difundir imágenes.
          </li>
        </ul>
      </section>

      <section className="ayuda-bloque" aria-labelledby="ayuda-licencias">
        <h2 id="ayuda-licencias">Versión y licencias</h2>
        <p className="texto-suave">
          NatureLab {__VERSION_APP__}. Catálogo versión {catalogo?.versionCatalogo ?? '—'}
          {catalogo?.estado === 'provisional' ? ' (provisional)' : ''}.
        </p>
        <p className="texto-suave">
          Tipografías Alegreya y Atkinson Hyperlegible Next, con licencia SIL Open Font License 1.1. Las imágenes del
          catálogo se incorporarán con su autoría, procedencia y licencia.
        </p>
      </section>
    </>
  );
}
