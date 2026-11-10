# NatureLab

Cuaderno de campo digital para talleres de exploración ambiental. Permite registrar plantas, animales e insectos en salidas de campo, calcular al momento indicadores ecológicos y guardar todo en el propio dispositivo, sin cuentas ni servidor.

Es una aplicación web progresiva (PWA): se abre en el navegador del móvil, la tableta o el ordenador, se puede instalar como una app y funciona sin conexión después de la primera visita.

> Proyecto educativo personal e independiente. No está vinculado a ningún programa ni entidad.

El historial detallado de cambios está en [CAMBIOS.md](CAMBIOS.md).

---

## Qué permite hacer

### Investigaciones de campo

- **Recuento en parcela:** número de individuos de cada especie en una o varias parcelas. Calcula riqueza, abundancia, índice de Shannon (H′), equitatividad de Pielou (J′), dominancia y densidad.
- **Transecto lineal:** cobertura de cada especie a lo largo de una línea, anotando la longitud de cada mancha o su inicio y fin. Calcula cobertura por especie, cobertura total, suelo desnudo y solapes, también con varios transectos.
- **Ubicación:** coordenadas de la investigación y, si hace falta, de cada parcela o transecto, con el botón «Usar mi ubicación» (GPS) y enlace al mapa (OpenStreetMap).
- **Dibujos:** unir los puntos sobre el contorno de una especie, en tres niveles, o dibujo libre con el dedo, el ratón o un lápiz digital, sensible a la presión.
- **Cuaderno en PDF** con resumen, resultados, tablas, coordenadas y dibujos, y **CSV** para hojas de cálculo.
- **Catálogo de partida** con plantas, aves, un reptil y libélulas del Salar de los Canos y de la duna del río Antas.
- **Modelos de ejemplo** que se cargan con un botón: Biodiversidad en el Salar de los Canos y Cobertura vegetal en la duna del río Antas.

### Catálogo de especies

- **Tres tipos**, con sus grupos:
  - Plantas: árboles, arbustos y matas, hierbas y flores, gramíneas y juncos, helechos, musgos y líquenes.
  - Animales: aves (con subgrupos), mamíferos, reptiles, anfibios y peces.
  - Insectos y otros invertebrados.
- **Hábitat natural:** dunares y de costa, crasas de desierto, alta montaña, bosque, acuáticas y de ribera, praderas y campo abierto.
- **Mi catálogo:** especies propias añadidas por cada persona. En el campo basta un nombre provisional («Añadir especie nueva»); la clasificación se completa después desde la ficha.
- **Hasta tres fotos por especie**, cada una con la parte que muestra (planta entera, flor, fruto…). Antes de guardarlas pasan por encuadre, detección de personas con pixelado opcional y registro de autoría y licencia.
- **Dónde se ha observado:** cada ficha lista sola las investigaciones en las que aparece la especie, con sus coordenadas.
- **Juego «¿Qué especie es?»:** adivinar la especie a partir de su foto, con el nombre común o el científico.
- **Fichas para imprimir:** PDF con la imagen y las características de cada especie, para estudiar o para recortar y emparejar.

### Aspecto

- Siete paletas ilustradas (Atardecer, la general, Rosa, Lavanda, Ámbar, Terracota, Mar y Río). Cada investigación puede tener la suya.
- Tamaño de texto normal o grande, menú de configuración y diseño pensado para leerse a pleno sol.

---

## Datos y privacidad

- **Sin servidor ni cuentas.** Todo se guarda en el navegador del dispositivo (IndexedDB) y nada se sube automáticamente.
- **Copias de seguridad** en ZIP: una por investigación (con sus fotos, dibujos y las especies de Mi catálogo que usa) y otra de Mi catálogo completo (con sus fotos). Sirven para no perder datos y para pasarlos a otro dispositivo, donde se pueden importar como nuevos o fusionar.
- **Fotos sin ubicación:** se guardan sin datos EXIF y se revisan antes por si aparecen personas, matrículas o direcciones.
- **Coordenadas solo si se piden.** El GPS actúa únicamente al pulsar «Usar mi ubicación». Si la ubicación de una especie protegida no debe difundirse, basta con dejarlas vacías.
- **Sin analítica** ni servicios de terceros. El detector de personas (MediaPipe) se descarga la primera vez y queda guardado para usarse sin conexión.

Si se borran los datos del navegador o se cambia de dispositivo sin haber exportado una copia, los datos se pierden. La app recuerda qué investigaciones tienen cambios sin copia.

---

## Puesta en marcha

Requisitos: Node.js 20.19 o posterior (se recomienda la versión 22) y npm.

```bash
npm install
npm run dev        # servidor de desarrollo en http://localhost:5173
npm test           # pruebas automáticas
npm run build      # versión de producción en dist/
npm run preview    # sirve la versión de producción en local
```

Antes de `dev` y `build` se ejecuta `scripts/preparar-detector.mjs`, que deja listo el modelo del detector de personas.

El GPS y la instalación como app solo funcionan con conexión segura: `localhost` o una dirección `https`. Al abrir el servidor de desarrollo desde el móvil por la red local, las coordenadas se escriben a mano.

---

## Despliegue

- **GitHub Pages:** el flujo `.github/workflows/desplegar.yml` publica la app automáticamente con cada `git push` a la rama `main`.
- **Vercel** (opcional): `npx vercel --prod` desde la carpeta del proyecto.

Al publicar una versión nueva, la app avisa de que hay una actualización. Si una página abierta desde antes no consigue cargar alguna parte, se recarga sola una vez.

---

## Estructura

```text
naturelab/
├── public/
│   ├── data/
│   │   ├── especies.json        catálogo publicado (versión 2)
│   │   └── plantillas.json      plantillas de «unir los puntos»
│   ├── imagenes/especies/       fotos e ilustraciones del catálogo
│   └── manifest.webmanifest
├── scripts/
│   ├── preparar-detector.mjs    modelo del detector de personas
│   ├── generar-plantillas.py    genera plantillas.json
│   └── plantillas_contornos.py  contornos de cada especie
├── src/
│   ├── app/                     rutas, cabecera, ayuda y recarga segura
│   ├── almacenamiento/          base de datos local (IndexedDB) y modelo de datos
│   ├── apariencia/              paletas, fondos y tamaño de texto
│   ├── calculos/                biodiversidad (Shannon, Pielou) y cobertura
│   ├── catalogos/               catálogo, Mi catálogo, tipos, hábitats, fotos y fichas
│   ├── dibujos/                 unir los puntos y dibujo libre
│   ├── fotos/                   compresión y preparación de fotos
│   ├── importacion-exportacion/ copias ZIP, CSV, PDF e importación
│   ├── juego/                   «¿Qué especie es?»
│   ├── laboratorios/            Biodiversidad (parcelas y transectos)
│   ├── modelos/                 investigaciones de ejemplo
│   └── ubicacion/               coordenadas y mapa
├── tests/                       pruebas con Vitest
└── CAMBIOS.md                   historial de cambios
```

**Tecnologías:** React 19, Vite 8, React Router, IndexedDB (idb), vite-plugin-pwa (Workbox), jsPDF, fflate para los ZIP y MediaPipe para detectar personas. Las pruebas usan Vitest y fake-indexeddb.

---

## Catálogo y plantillas

- **El catálogo publicado** está en `public/data/especies.json`: 13 plantas del Salar de los Canos y de la duna del río Antas, y 22 especies de fauna del Salar (18 aves, la tortuga mora y 3 libélulas). Cada especie tiene identificador, nombres común y científico, familia, tipo y grupo, hábitat natural, descripción, rasgos, imagen con su autoría y licencia (si la tiene) y estado de validación. En las notas de la fauna figura la fuente de cada cita. Todo está pendiente de revisión.
- **Las plantillas de «unir los puntos»** se generan con Python 3 y la librería shapely:

  ```bash
  pip install shapely
  python3 scripts/generar-plantillas.py
  ```

  Para añadir una especie, se define su contorno en `scripts/plantillas_contornos.py` y se vuelve a ejecutar el generador.
- **Las imágenes del catálogo** solo se incorporan con licencia compatible y su atribución. La herramienta «Preparar fotos del catálogo», dentro de la app, ayuda a recortarlas y documentarlas.

---

## Compatibilidad de datos

- Esquema de datos: versión 2. Base de datos local: versión 4. Las copias y los datos de versiones anteriores se adaptan solos.
- Por compatibilidad, los identificadores internos conservan el nombre antiguo de la app: la base de datos `naturalab` y los formatos de copia `naturalab-investigacion` y `naturalab-catalogo-propio`. Cambiarlos dejaría sin abrir los datos y las copias ya guardados.

---

## Pendiente

- Crear plantillas de «unir los puntos» desde la app, a partir de la foto de una especie (fase 4b).
- Laboratorio de Microplásticos.
- Fondos de las paletas en mayor resolución.
