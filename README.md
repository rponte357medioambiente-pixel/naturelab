# NaturaLab

Cuaderno de campo para talleres de exploración ambiental. Es una aplicación web progresiva (PWA) sin servidor: los datos se guardan en el propio dispositivo (IndexedDB) y se intercambian mediante copias exportadas. Laboratorio disponible: **Biodiversidad**. Siguiente laboratorio previsto: **Microplásticos**.

La especificación completa está en [`docs/especificaciones.md`](docs/especificaciones.md).

Proyecto educativo independiente. No atribuir a ningún programa o entidad sin autorización expresa.

## Requisitos

Node.js 20.19 o superior (probado con Node 22).

## Comandos

| Comando | Uso |
|---|---|
| `npm install` | Instala las dependencias con las versiones fijadas en `package-lock.json` |
| `npm run dev` | Servidor de desarrollo en http://localhost:5173 |
| `npm test` | Pruebas automatizadas (Vitest) |
| `npm run build` | Compila en `dist/` |
| `npm run preview` | Sirve la compilación; aquí sí actúa el service worker |
| `npm run preparar-detector` | Copia el motor de MediaPipe y descarga los modelos del detector de personas (se ejecuta solo antes de `dev` y `build`) |

Para probar desde el móvil en la misma red: `npm run dev -- --host` y abrir la dirección que aparezca. Por HTTP en red local se pueden registrar datos, pero el service worker (uso sin conexión) solo funciona con HTTPS o en `localhost`. Para comprobar el uso sin conexión, usa la versión publicada.

## Despliegue

**GitHub Pages.** El flujo `.github/workflows/desplegar.yml` ejecuta las pruebas, compila con la ruta base `/<nombre-del-repositorio>/` y publica en cada `push` a `main`.

1. Sube el proyecto a un repositorio de GitHub.
2. En *Settings → Pages*, elige *Source: GitHub Actions*.
3. Si el repositorio es el sitio de usuario (`usuario.github.io`), cambia `VITE_BASE` a `/` en el flujo.

**Vercel.** Preset Vite, sin variables de entorno (la base por defecto es `/`).

## Estructura

```text
public/
  data/especies.json                 Catálogo (provisional, versionado)
  data/categorias-microplasticos.json  Borrador para la fase 4
  imagenes/especies/                 Imágenes de referencia con licencia verificada
  manifest.webmanifest, icono*.png, icono.svg
src/
  app/                    Rutas, estructura y páginas generales
  componentes/            Piezas compartidas (franja de abundancia, navegación…)
  laboratorios/
    registro.js           Lista de laboratorios
    biodiversidad/        Investigación, parcelas, observaciones, resultados
    microplasticos/       En preparación
  catalogos/              Carga, búsqueda y fichas del catálogo
  almacenamiento/         IndexedDB, modelo de datos y consultas
  calculos/               Índices de biodiversidad y formatos
  importacion-exportacion/  Copias JSON, validación, fusión y CSV
  accesibilidad/          Anuncios para lectores de pantalla, títulos
  estilos/                Hoja de estilos global
tests/                    Pruebas de cálculos, importación, CSV y almacenamiento
```

## Decisiones técnicas

- **Rutas con almohadilla** (`#/investigaciones`): funcionan en GitHub Pages y sin conexión sin configurar redirecciones.
- **Service worker** generado por `vite-plugin-pwa`. Precarga la app, el catálogo y las tipografías. Cuando hay una versión nueva, la app lo avisa y no se recarga sola en mitad de un registro.
- **Datos locales** en IndexedDB, con almacenes separados para investigaciones, parcelas, observaciones y fotos. Las escrituras son transaccionales. La app pide al navegador almacenamiento persistente, sin prometer que no se borre.
- **Fotos de campo**: opcionales, una por observación. Se reducen a 1600 px, se recodifican en JPEG (sin metadatos ni ubicación) y se guardan solo en el dispositivo.
- **Copia de seguridad**: un ZIP con `proyecto.json`, la carpeta `fotos/` y `LEEME.txt`. Se importa tal cual, sin descomprimir. Siguen aceptándose las copias `.json` anteriores (sin fotos).
- **Cuaderno en PDF**: generado en el dispositivo con jsPDF, también sin conexión. Incluye portada, resultados y observaciones con sus fotos.
- **Formato de los datos**: `naturalab-investigacion`, versión de esquema 1. Las migraciones futuras se añaden en `migrarPaquete()` (`src/importacion-exportacion/esquema.js`) y en `upgrade()` (`src/almacenamiento/db.js`).
- **Importación**: valida tipos, tamaños (5 MB como máximo) y referencias, y descarta campos desconocidos. Deduplica por identificador y, ante cambios distintos en un mismo registro, pide una decisión. Permite fusionar o importar como copia independiente.
- **Ejemplo del Salar** con identificadores fijos: cargarlo varias veces no duplica recuentos.
- **Tipografías** Alegreya y Atkinson Hyperlegible Next incluidas en la app (SIL OFL 1.1), sin peticiones externas.
- Las copias del prototipo anterior (`naturalab_copia.json`) no son compatibles con este formato.

## Catálogo e imágenes

Las fotos de referencia se preparan desde la propia app, en *Catálogo → preparar fotos del catálogo* (o desde la ficha de cada especie):

1. Elige la especie y la foto.
2. Ajusta el encuadre 4:3.
3. Revisa el aviso del detector de personas y, si marca zonas, pixélalas o cambia el encuadre.
4. Indica autoría, procedencia y licencia, y descarga la foto (`<id>.webp`, 1200 × 900 como máximo y sin metadatos de ubicación).
5. Cuando tengas todas, descarga `especies.json` y copia los archivos con los comandos que muestra la herramienta.

La detección de personas usa MediaPipe (Apache 2.0) y se ejecuta en el navegador; la foto no sale del dispositivo. Es una ayuda, no una garantía. Los modelos se descargan de Google la primera vez que se ejecuta `npm run dev` o `npm run build`, y se guardan en `public/modelos/` (excluido de git y de la caché sin conexión).

La app solo muestra imágenes que tengan licencia indicada. Al revisar una ficha botánicamente, actualiza `estadoValidacion` a `validada` y `fechaRevision`.

## Próximas fases

- Consulta externa con Lens desde la foto de una observación.
- Revisión de identificaciones pendientes.
- Laboratorio de Microplásticos.
