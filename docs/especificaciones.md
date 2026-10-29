# NaturaLab — Documento maestro de especificaciones

**Versión:** 1.0 (documento de planificación)  
**Fecha:** 21 de octubre de 2026  
**Estado:** Arquitectura inicial acordada; desarrollo pendiente  
**Naturaleza del proyecto:** Aplicación educativa personal e independiente para talleres de exploración ambiental. No atribuir a ningún programa o entidad sin autorización expresa.

> **Decisión central:** la versión inicial de NaturaLab será una aplicación web progresiva (PWA), móvil primero, sin Firebase, sin plan Blaze, sin backend y sin base de datos remota. Los datos del usuario se almacenarán localmente y podrán exportarse e importarse. Un catálogo JSON y fotografías de referencia revisadas se distribuirán con la propia web.

---

## 1. Visión y objetivos

NaturaLab es una plataforma educativa para aprender ciencias ambientales mediante investigaciones de campo. Busca que participantes y docentes observen el entorno, reconozcan especies o materiales, recojan datos, analicen resultados y compartan informes de forma responsable.

**Objetivos:**

1. Facilitar talleres ambientales desde móviles, tabletas y ordenadores.
2. Trabajar sin conexión después de la primera carga e instalación de los recursos necesarios.
3. Evitar costes obligatorios de servicios en la nube y requisitos de tarjeta bancaria.
4. Minimizar datos personales y evitar la publicación no supervisada de fotografías.
5. Generar resultados científicamente explicables, reproducibles y exportables.
6. Permitir incorporar nuevos laboratorios sin rehacer la aplicación.
7. Ofrecer una interfaz clara, atractiva, accesible y adaptada a pantallas pequeñas.

### 1.1 Público y escenarios

- Participantes en talleres de educación ambiental, incluidos menores bajo supervisión.
- Docentes, monitores y responsables de actividades.
- Personas que realizan observaciones individuales.
- Equipos que comparten un dispositivo o intercambian archivos de investigaciones.

### 1.2 Principios de diseño

- **Offline first:** no depender de Internet para registrar observaciones.
- **Privacidad por diseño:** datos mínimos; fotografías locales por defecto.
- **Sencillez:** interfaz intuitiva, pocos pasos y mensajes claros.
- **Portabilidad:** exportaciones abiertas y recuperables.
- **Rigor:** identificaciones revisables, fórmulas documentadas y trazabilidad.
- **Escalabilidad modular:** biodiversidad primero; microplásticos después.

---

## 2. Alcance y decisiones confirmadas

| Tema | Decisión para la primera versión |
|---|---|
| Plataforma | Web responsive instalable como PWA |
| Alojamiento | GitHub Pages o Vercel, sujeto a la configuración y límites del servicio elegido |
| Base de datos en la nube | **No** |
| Firebase / Blaze | **No se utilizarán** en la primera versión |
| Catálogo de especies | Archivo JSON versionado con la aplicación |
| Imágenes del catálogo | Archivos optimizados (preferentemente WebP), con licencia y procedencia documentadas |
| Datos de investigaciones | IndexedDB en cada dispositivo |
| Fotografías tomadas en campo | Opcionales, guardadas localmente; nunca subidas automáticamente |
| Trabajo colaborativo | Un dispositivo por equipo o intercambio de exportaciones |
| Cuentas de usuarios | No necesarias en la primera versión |
| Exportaciones | JSON/ZIP para copia y traslado; CSV y PDF para resultados |
| Identificación con Lens | Consulta externa opcional, no integración automática ni descarga de imágenes de resultados |
| Laboratorio inicial | Biodiversidad |
| Segundo laboratorio | Microplásticos |

**Importante:** «sin base de datos» se refiere a no usar una **base de datos remota o un servidor**. IndexedDB es una base de datos **local del navegador**, imprescindible para guardar investigaciones y fotografías sin conexión de forma estructurada.

### 2.1 Lo que NO incluye la primera versión

- Registro de menores con correo electrónico.
- Subida pública de fotografías o contenidos generados por participantes.
- Sincronización en tiempo real entre distintos móviles.
- Panel de administración en la nube.
- Identificación automática garantizada de plantas mediante Google Lens.
- Almacenamiento ilimitado o copia de seguridad automática en un servidor.

Estas funcionalidades solo se valorarán en fases futuras, con evaluación técnica, económica, legal y de privacidad.

---

## 3. Arquitectura técnica

```text
                      NATURALAB PWA
                 (móvil / tableta / PC)
                           |
             +-------------+-------------+
             |                           |
       RECURSOS ESTÁTICOS           DATOS LOCALES
       - especies.json              - investigaciones
       - imágenes WebP              - parcelas
       - textos didácticos          - observaciones
       - app y estilos              - fotos opcionales
             |                           |
        GitHub/Vercel                 IndexedDB
             |                           |
             +-------------+-------------+
                           |
                    IMPORTAR / EXPORTAR
                    JSON · ZIP · CSV · PDF
```

### 3.1 Tecnologías propuestas

- **Frontend:** React + Vite (propuesta; confirmar al iniciar el desarrollo).
- **PWA:** manifiesto web y service worker para cachear la aplicación y los recursos necesarios.
- **Persistencia local:** IndexedDB; puede utilizarse una biblioteca ligera como `idb` o Dexie.
- **Visualización:** gráficos accesibles mediante una biblioteca ligera o SVG.
- **Cálculos:** JavaScript/TypeScript local, con pruebas unitarias.
- **Exportación ZIP:** biblioteca cliente, p. ej. JSZip.
- **CSV:** generación local con codificación UTF-8 y separadores correctamente escapados.
- **PDF:** generación en el navegador o vista imprimible; elegir tras probar compatibilidad móvil.
- **Despliegue:** repositorio GitHub y hosting estático compatible con HTTPS.

No se requiere servidor para el funcionamiento básico. El service worker permitirá abrir la aplicación sin conexión **después de una visita inicial con Internet y de completar la caché**. Las políticas del navegador pueden eliminar almacenamiento local; la app no debe prometer persistencia absoluta.

### 3.2 Organización propuesta del repositorio

```text
naturalab/
├── README.md
├── docs/
│   └── especificaciones.md
├── public/
│   ├── manifest.webmanifest
│   ├── data/
│   │   ├── especies.json
│   │   └── categorias-microplasticos.json
│   └── imagenes/
│       └── especies/
├── src/
│   ├── app/
│   ├── componentes/
│   ├── laboratorios/
│   │   ├── biodiversidad/
│   │   └── microplasticos/
│   ├── catalogos/
│   ├── almacenamiento/
│   ├── calculos/
│   ├── importacion-exportacion/
│   ├── accesibilidad/
│   └── estilos/
├── tests/
├── package.json
└── vite.config.js
```

**Nota:** esta estructura corresponde a una implementación React/Vite; el `index.html` se ubicaría en la raíz del proyecto y el service worker se generaría o configuraría según el plugin PWA elegido.

---

## 4. Experiencia de usuario y navegación

### 4.1 Pantallas previstas

1. **Inicio:** acceso a laboratorios, investigaciones recientes y ayuda.
2. **Laboratorios:** Biodiversidad y Microplásticos (segundo en preparación).
3. **Mis investigaciones:** crear, continuar, duplicar, importar y exportar.
4. **Nueva investigación:** título, fecha, lugar descriptivo opcional, objetivo y participantes/equipo mediante alias.
5. **Parcelas o muestras:** crear unidades de estudio con identificador y características.
6. **Catálogo:** buscar especies, ver imágenes y fichas didácticas.
7. **Registrar observación:** seleccionar especie, introducir cantidad y notas; foto local opcional.
8. **Resultados:** tablas, gráficos, índices e interpretación educativa.
9. **Exportar / importar:** copia completa ZIP/JSON e informe CSV/PDF.
10. **Ayuda y privacidad:** uso sin conexión, límites, permisos y licencias.

### 4.2 Interfaz

- Diseño **mobile first** con navegación inferior sencilla, preferentemente cuatro accesos: Inicio, Laboratorios, Investigaciones y Ayuda.
- Textos legibles, botones táctiles amplios y contraste suficiente.
- Evitar elementos superpuestos a imágenes y desplazamientos innecesarios.
- Mensajes de estado: «Guardado en este dispositivo», «Pendiente de exportar», «Sin conexión».
- Búsqueda por nombre común y científico, con filtros si el catálogo crece.
- Confirmación antes de borrar investigaciones y antes de sobrescribir importaciones.
- Alternativas textuales a fotografías y gráficos.
- Compatible con teclado y tecnologías de asistencia; objetivo WCAG 2.2 AA donde resulte aplicable.

---

## 5. Laboratorio 1: Biodiversidad

### 5.1 Flujo principal

1. Crear una investigación.
2. Definir una o varias parcelas con superficie y unidad de medida.
3. Consultar el catálogo y reconocer especies en el campo.
4. Registrar cada especie observada y su abundancia en la parcela.
5. Añadir notas y, opcionalmente, fotografía local.
6. Revisar identificaciones inciertas.
7. Calcular resultados automáticamente.
8. Exportar informe y copia de seguridad.

### 5.2 Datos de investigación

**Investigación:** `id`, `titulo`, `descripcion`, `fechaCreacion`, `fechaObservacion`, `lugarTexto` (opcional), `equipoAlias` (opcional), `laboratorio`, `versionEsquema`, `fechaModificacion`.

**Parcela:** `id`, `investigacionId`, `codigo`, `superficie`, `unidadSuperficie`, `descripcion`, `notas`.

**Observación:** `id`, `investigacionId`, `parcelaId`, `especieId` (o identificación pendiente), `abundancia`, `notas`, `fecha`, `estadoIdentificacion`, `fotoLocalId` (opcional).

**Fotografía local:** `id`, `observacionId`, `blob`, `tipoMime`, `tamano`, `fecha`, `consentimientoUso` (si procede). La foto no se publica automáticamente.

### 5.3 Catálogo de especies

El catálogo JSON incluirá, según disponibilidad y verificación:

- Identificador estable y único.
- Nombre común y nombre científico.
- Familia botánica.
- Descripción breve y rasgos de identificación.
- Hábitat y notas ecológicas.
- Ruta local de imagen de referencia.
- Autoría, procedencia, licencia y atribución de la imagen.
- Estado de validación taxonómica y fecha de revisión.

**Ejemplo ilustrativo de registro:**

```json
{
  "id": "lygeum-spartum",
  "nombreComun": "Albardín",
  "nombreCientifico": "Lygeum spartum",
  "familia": "Poaceae",
  "habitat": "Ambientes áridos y suelos salinos",
  "imagen": "/imagenes/especies/lygeum-spartum.webp",
  "imagenLicencia": "PENDIENTE_DE_VERIFICAR",
  "estadoValidacion": "pendiente"
}
```

No se incorporará una imagen sin verificar previamente su licencia y procedencia.

### 5.4 Catálogo inicial: Salar de los Canos (Vera, Almería)

Datos de partida de un ejercicio de campo previo, **provisionales y sujetos a revisión botánica**:

| Nombre común | Identificación científica de partida | Individuos |
|---|---|---:|
| Taray | *Tamarix canariensis* | 2 |
| Albaida | *Anthyllis cytisoides* | 1 |
| Aulaga rascavieja | *Launaea arborescens* | 4 |
| Boja negra | *Artemisia glutinosa* (verificar) | 1 |
| Albardín | *Lygeum spartum* | 20 |
| Siempreviva | *Limonium* sp. | 1 |
| Salicornia | *Salicornia* sp. | 1 |
| Moricandia | *Moricandia arvensis* | 2 |
| Verdolaga | *Portulaca oleracea* | 1 |
| **Total** | **9 taxones** | **33** |

- Superficie de referencia: **73,2 m²**.
- Dominancia del albardín: **20/33 = 60,61 %**.
- Índice de Shannon: **H′ ≈ 1,429** (logaritmo natural).
- Equitatividad de Pielou: **J′ ≈ 0,650**.
- Los taxones identificados solo a nivel de género deben mantenerse como tales hasta confirmar especie.
- El catálogo es **reutilizable**: los recuentos anteriores pertenecen a la investigación de ejemplo, no a las fichas de especies.

### 5.5 Cálculos científicos

Para cada parcela o conjunto de observaciones agregadas sin duplicados:

- **Abundancia total:** `N = Σ nᵢ`.
- **Riqueza de taxones:** `S = número de taxones con nᵢ > 0`.
- **Proporción relativa:** `pᵢ = nᵢ / N`.
- **Shannon:** `H′ = −Σ(pᵢ × ln(pᵢ))` para `nᵢ > 0`.
- **Pielou:** `J′ = H′ / ln(S)` cuando `S > 1`; mostrar «no aplicable» si `S ≤ 1`.
- **Densidad opcional:** `N / superficie` si se conoce y es positiva.

**Validaciones:** no admitir abundancias negativas, fraccionarias ni no numéricas; evitar parcelas con superficie negativa; explicar el caso `N = 0` sin dividir entre cero; no contar dos veces una observación importada con el mismo ID.

**Resultados visuales:** tabla de abundancias, gráfico de barras por especie, porcentajes relativos, tarjetas de indicadores y explicación comprensible de la diversidad. Los valores deben recalcularse cuando cambian los datos.

---

## 6. Laboratorio 2: Microplásticos (fase posterior)

Objetivo: documentar muestras y clasificar partículas observadas mediante criterios didácticos y procedimientos seguros.

**Modelo inicial propuesto:**

- Investigación y unidad de muestreo.
- Fecha, entorno descriptivo y protocolo de muestreo utilizado.
- Categoría de partícula (p. ej., fibra, fragmento, película, espuma, pellet), pendiente de validar contra un protocolo educativo.
- Color, tamaño aproximado y número de partículas.
- Imagen de referencia incluida en el catálogo.
- Observaciones y grado de certeza.
- Resultados por tipo, color y muestra.

**Precaución científica:** una identificación visual no demuestra por sí sola que una partícula sea plástico; el informe debe diferenciar «partícula sospechosa» de «microplástico confirmado». Las actividades con muestras deben diseñarse con supervisión y medidas de seguridad apropiadas.

El módulo reutilizará navegación, investigaciones, almacenamiento, gráficos y exportaciones del laboratorio de Biodiversidad.

---

## 7. Fotografías, identificación y moderación

### 7.1 Tres tipos de imágenes

1. **Referencias del catálogo:** revisadas por la persona responsable y distribuidas con la web. Requieren licencia de uso compatible y atribución cuando corresponda.
2. **Fotografías de campo:** opcionales; se guardan solo en el dispositivo, sin subida automática.
3. **Fotografías de especies desconocidas:** permanecen locales hasta que el participante o responsable las revise.

### 7.2 Consulta externa con Google Lens

Puede ofrecerse una opción educativa para consultar Lens fuera de NaturaLab. El flujo previsto es: tomar foto → abrir Lens de forma externa cuando sea posible → examinar sugerencias → regresar a NaturaLab → contrastar con el catálogo → registrar como confirmada o pendiente.

**Limitaciones:** no asumir una API pública de Lens para identificación automática; no prometer un traspaso de fotografía directo entre todas las plataformas; el uso de Lens puede implicar que la imagen se comparta con Google bajo sus propias condiciones; no copiar imágenes de resultados de búsqueda sin permiso/licencia.

### 7.3 Fotografías de participantes

- La captura será opcional y no necesaria para completar la actividad.
- Advertir de no fotografiar rostros, matrículas, direcciones ni otros datos identificables.
- Eliminar metadatos EXIF sensibles en cualquier exportación que incluya fotografías, especialmente geolocalización, cuando técnicamente sea posible.
- Si se activa en el futuro una subida, solo podrán publicar responsables autorizados y habrá revisión previa, reglas de acceso y mecanismo de retirada.
- Tener una cuenta no sustituye las obligaciones de privacidad, derechos de imagen y protección de menores.

---

## 8. Almacenamiento local y copias de seguridad

### 8.1 IndexedDB

Guardar investigaciones, parcelas, observaciones, configuración y fotos opcionales. Utilizar identificadores únicos estables y fechas de modificación. La app debe tolerar cierres inesperados y comprobar que el almacenamiento esté disponible.

### 8.2 Exportación

**ZIP de investigación (formato recomendado):**

```text
investigacion-salar-2026.zip
├── proyecto.json
├── catalogo-referencias.json   (opcional)
├── fotos/
│   ├── foto-001.webp
│   └── foto-002.webp
└── LEEME.txt
```

`proyecto.json` contendrá el esquema y versión, investigación, parcelas, observaciones, vínculos a fotografías y metadatos necesarios. Las fotos no se incrustarán como Base64 dentro del JSON, para evitar archivos enormes.

**Otras salidas:**

- **JSON:** intercambio estructurado sin fotografías binarias.
- **CSV:** tablas de observaciones y resultados para hojas de cálculo.
- **PDF:** informe legible con metodología, resumen, tablas, gráficos y fecha; sin datos personales innecesarios.

### 8.3 Importación y recuperación

- Validar formato, versión de esquema, tipos de datos, tamaños y rutas antes de importar.
- Rechazar rutas ZIP inseguras y archivos inesperados; limitar tamaño total y número de ficheros.
- Ofrecer vista previa de contenido y elección entre **importar como nuevo** o **fusionar**.
- Deduplicar por identificadores estables; detectar conflictos y solicitar resolución.
- No ejecutar contenido incluido en archivos importados.
- Mantener un mecanismo de migración de versiones del esquema.
- Mostrar recordatorio de copia de seguridad antes de finalizar un taller.

**Limitación:** si el usuario borra los datos del navegador, cambia de dispositivo o el sistema libera espacio, las investigaciones pueden perderse si no se exportaron. La instalación PWA no elimina ese riesgo.

---

## 9. Trabajo individual y colaborativo

### 9.1 Individual

Cada participante registra y analiza su investigación en un dispositivo; puede exportarla e importarla posteriormente.

### 9.2 Equipo con un solo dispositivo

Los integrantes realizan observaciones y una persona registra los datos en un móvil o tableta compartido.

### 9.3 Equipo con varios dispositivos

Cada dispositivo produce una exportación; el responsable reúne los archivos mediante importación y fusión. No habrá sincronización en tiempo real ni edición simultánea garantizada en la primera versión.

**Reglas para fusión:** identificadores únicos, registro de origen, prevención de duplicados, tratamiento de conflictos, trazabilidad de cambios y confirmación antes de modificar datos existentes.

---

## 10. Privacidad, seguridad y propiedad intelectual

- No exigir cuentas de usuario ni correos electrónicos para las funciones locales.
- Usar alias no identificativos cuando se necesite distinguir equipos.
- No recopilar ubicación GPS precisa por defecto; lugar descriptivo opcional.
- No publicar automáticamente fotografías de participantes.
- No activar analítica o seguimiento de terceros innecesarios.
- Utilizar HTTPS para el alojamiento web.
- Escapar texto introducido por usuarios y validar archivos importados.
- Explicar claramente qué queda en el dispositivo y qué se publica con el catálogo.
- Evitar imágenes con derechos de autor no aclarados; documentar autor, fuente, licencia, modificaciones y atribución.
- No asumir que una imagen encontrada con Lens puede reutilizarse libremente.
- Si se realizan talleres con menores, revisar con la entidad organizadora las obligaciones aplicables de protección de datos y consentimiento antes de recoger o difundir imágenes.

### 10.1 Responsables futuros

Si en otra fase se habilitan cuentas y publicación de fotos, definir roles (participante, responsable, administrador), autenticación, permisos, moderación previa, política de retención, borrado y procedimiento de respuesta a incidencias. **No forma parte del MVP.**

---

## 11. Requisitos funcionales (MVP)

| ID | Requisito | Prioridad |
|---|---|---|
| RF-01 | Abrir la web en móvil y escritorio | Alta |
| RF-02 | Instalar/usar como PWA con recursos básicos offline | Alta |
| RF-03 | Consultar catálogo de especies JSON | Alta |
| RF-04 | Buscar especies por nombre común/científico | Alta |
| RF-05 | Crear y editar investigaciones | Alta |
| RF-06 | Crear parcelas con superficie opcional | Alta |
| RF-07 | Registrar especies y abundancias | Alta |
| RF-08 | Guardar datos en IndexedDB | Alta |
| RF-09 | Calcular N, S, Shannon y Pielou | Alta |
| RF-10 | Mostrar tablas y gráficos | Alta |
| RF-11 | Exportar e importar JSON/ZIP | Alta |
| RF-12 | Exportar CSV | Media |
| RF-13 | Generar informe PDF | Media |
| RF-14 | Adjuntar fotografías locales opcionales | Media |
| RF-15 | Identificación «pendiente» o «desconocida» | Alta |
| RF-16 | Fusionar investigaciones de varios dispositivos | Media |
| RF-17 | Consultar Lens externamente | Opcional |
| RF-18 | Incorporar laboratorio de Microplásticos | Fase 2 |

---

## 12. Requisitos no funcionales

- **Coste:** funcionamiento básico sin planes de pago ni tarjeta bancaria.
- **Disponibilidad:** navegación offline después de instalar/cachear recursos; avisar cuando falten archivos.
- **Rendimiento:** comprimir imágenes, carga diferida y catálogos eficientes.
- **Compatibilidad:** navegadores móviles actuales y escritorio; comprobar diferencias en iOS y Android.
- **Accesibilidad:** botones grandes, etiquetas, contraste, navegación con teclado y textos alternativos.
- **Integridad:** guardado fiable, validaciones y exportaciones comprobables.
- **Seguridad:** ningún contenido subido automáticamente; importar archivos con controles.
- **Mantenibilidad:** módulos independientes, esquema versionado y pruebas automatizadas.
- **Transparencia:** mostrar claramente límites de identificación, uso offline y riesgos de pérdida local.

---

## 13. Plan de desarrollo por fases

### Fase 0 — Preparación

- Crear repositorio `naturalab-app` o nombre disponible.
- Confirmar hosting estático y configuración PWA.
- Revisar taxonomía, licencias e imágenes de las nueve especies iniciales.
- Definir esquema JSON y convenciones de identificadores.

### Fase 1 — Prototipo de Biodiversidad

- Inicio y navegación móvil.
- Catálogo de nueve taxones.
- Crear investigación y parcela.
- Registrar abundancias.
- Calcular indicadores y mostrar resultados.
- Persistir localmente.

### Fase 2 — Uso real en campo

- PWA offline.
- Fotos locales opcionales y compresión.
- Exportar/importar ZIP y JSON.
- CSV y PDF.
- Pruebas de recuperación y uso sin conexión.

### Fase 3 — Colaboración sin servidor

- Fusión de investigaciones.
- Identificación pendiente y revisión de observaciones.
- Mejoras de accesibilidad y pruebas con participantes.

### Fase 4 — Microplásticos

- Catálogo específico.
- Registro de muestras y partículas sospechosas.
- Gráficos e informes del segundo laboratorio.

### Fase futura — Solo si se justifica

- Usuarios responsables autenticados.
- Moderación de imágenes.
- Sincronización remota y permisos.
- Evaluación de costes, privacidad y cumplimiento normativo antes de activar servicios externos.

---

## 14. Pruebas y criterios de aceptación

La primera versión se considerará utilizable cuando se pueda:

1. Abrir NaturaLab en un móvil y consultar las nueve fichas del catálogo.
2. Crear una investigación y una parcela de 73,2 m².
3. Registrar los nueve taxones con abundancias `2,1,4,1,20,1,1,2,1`.
4. Obtener **N = 33**, **S = 9**, **H′ ≈ 1,429**, **J′ ≈ 0,650** y albardín **≈ 60,61 %**.
5. Cerrar y reabrir la app sin perder la investigación, mientras el navegador conserve su almacenamiento.
6. Repetir el registro sin conexión tras preparar correctamente la PWA.
7. Exportar una copia e importarla en otro dispositivo sin alterar los recuentos.
8. Verificar que ninguna foto de campo se sube a un servidor.
9. Mostrar mensajes adecuados cuando no haya almacenamiento, falte conexión o se importe un archivo inválido.
10. Comprobar que la aplicación es utilizable en pantallas móviles pequeñas sin solapamientos.

**Pruebas automatizadas recomendadas:** fórmulas de biodiversidad, validaciones, serialización/deserialización, migración de esquema, deduplicación, exportación/importación y flujo PWA offline. Añadir pruebas manuales en Android y iPhone.

---

## 15. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Pérdida de datos locales | Copias ZIP frecuentes y avisos visibles |
| Fotografías demasiado pesadas | Compresión y límites de tamaño |
| Identificación botánica errónea | Estado «pendiente», revisión y fuentes fiables |
| Derechos de autor de imágenes | Registro de licencia, autor y procedencia |
| Falta de sincronización | Flujo de exportación/importación y fusión |
| Importaciones duplicadas | IDs únicos y control de conflictos |
| Cache offline incompleta | Indicador de recursos disponibles y prueba real sin red |
| Privacidad de participantes | Sin cuentas obligatorias ni subida automática |
| Limitaciones del navegador | Pruebas multiplataforma y exportaciones recuperables |

---

## 16. Decisiones pendientes

Estas cuestiones **no están cerradas** y deben resolverse al iniciar la implementación:

1. Elegir definitivamente GitHub Pages o Vercel para el despliegue.
2. Confirmar React + Vite frente a una implementación más sencilla si el alcance lo aconseja.
3. Seleccionar y licenciar fotografías de referencia de las nueve especies.
4. Validar los nombres científicos del catálogo inicial, especialmente la «boja negra» y los taxones identificados solo por género.
5. Definir el diseño visual definitivo y la identidad gráfica de NaturaLab.
6. Elegir biblioteca de gráficos, ZIP y generación de PDF.
7. Decidir límites de tamaño de imágenes y archivos de importación.
8. Especificar reglas de fusión y resolución de conflictos.
9. Definir protocolo didáctico y clasificación del laboratorio de Microplásticos.
10. Valorar en una fase futura si existe necesidad real de usuarios, nube y moderación.

---

## 17. Resumen ejecutivo

**NaturaLab** será una PWA educativa, modular y centrada en la privacidad. Su primer laboratorio, **Biodiversidad**, permitirá registrar observaciones de especies en parcelas, calcular indicadores ecológicos y exportar informes. El catálogo se distribuirá en **JSON** con imágenes de referencia verificadas. Las investigaciones y fotografías opcionales se conservarán **en el dispositivo mediante IndexedDB**. La colaboración entre móviles se resolverá inicialmente mediante **archivos de exportación e importación**, no mediante una base de datos remota.

La versión inicial **no utilizará Firebase, Blaze ni servicios de almacenamiento de fotografías en la nube**. Esta decisión evita cuotas de infraestructura obligatorias y reduce los riesgos asociados a contenidos publicados por participantes. El segundo laboratorio previsto es **Microplásticos** y compartirá la arquitectura base.

**Siguiente hito:** crear el repositorio, preparar el catálogo verificado de las nueve especies y desarrollar el primer flujo completo «crear investigación → registrar observaciones → calcular → exportar».
