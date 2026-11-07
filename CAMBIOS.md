# NatureLab · Registro de cambios

Cuaderno de campo digital para talleres de exploración ambiental. Aplicación web progresiva (PWA), sin servidor: los datos se guardan en el dispositivo y se trasladan con copias de seguridad.

---

## 7 de noviembre de 2026 · Juego «¿Qué especie es?» (fase 5)

- Nuevo botón en el Catálogo: **Jugar: ¿qué especie es?**. Se ve la imagen de una especie y se elige su nombre entre cuatro.
- Antes de empezar se elige con qué especies jugar (todo el catálogo o las de una o varias investigaciones), si responder con el **nombre común** o el **científico**, y el número de preguntas: 5, 10 o 20.
- Solo se preguntan las especies con foto o ilustración, incluidas las fotos de campo y las especies de Mi catálogo con foto. Cada especie sale una vez por partida; las opciones incorrectas salen primero de las especies elegidas y, si no bastan, del resto del catálogo.
- Al responder, la correcta se marca en verde con ✓ y la equivocada en rojo con ✕, junto a un rasgo de la especie. Al final se muestran los aciertos y las especies falladas, con enlace a sus fichas.
- No se guarda ningún resultado.

### Correcciones

- Cada transecto muestra la lista de sus especies con sus centímetros, y el botón para anotarlas se llama «Anotar especies».
- Si la app se actualiza con la página abierta y una parte no carga (por ejemplo, el generador del PDF), la página se recarga sola una vez.

---

## 7 de noviembre de 2026 · Dibujos (fase 4)

### Pestaña «Dibujos»

- Cada investigación, de parcela o de transecto, tiene una pestaña **Dibujos** con los dibujos de los estudiantes, la especie, el alias y la fecha. Cada dibujo se puede descargar en PNG o eliminar.
- Al crear un dibujo se elige la especie (primero las de la investigación, después el resto del catálogo), un alias opcional y el modo:
  - **Unir los puntos**: el contorno de la especie con sus puntos numerados. Se toca cada número en orden y la línea se traza sola; si se toca otro, el que toca parpadea. Al cerrar la figura se puede colorear.
  - **Dibujo libre**: una hoja en blanco.
- Herramientas: 8 colores, grosor, lápiz, goma, deshacer y borrar.
- Funciona con el dedo, el ratón y lápices digitales (Apple Pencil, S Pen…). Con lápiz, el trazo sigue la presión y la mano apoyada no pinta.

### Plantillas

- Una plantilla por especie del catálogo (13), con tres niveles: el fácil usa los puntos justos para reconocer la forma (entre 15 y 29, según la especie); el medio y el difícil, unos 30 y 50.
- Están en `public/data/plantillas.json` y se generan con `scripts/generar-plantillas.py` (Python 3 con shapely). Para añadir una especie: definir su forma en `scripts/plantillas_contornos.py` y ejecutar el generador.
- Las especies sin plantilla se pueden dibujar en modo libre.

### Cuaderno y copias

- Los dibujos salen en el cuaderno en PDF, en una página propia.
- Viajan en la copia de seguridad de la investigación (carpeta `dibujos/` del ZIP). Al fusionar se añaden los que faltan; al importar como copia reciben identificadores nuevos. Las copias anteriores siguen siendo válidas.
- La base de datos local pasa a la versión 4, con un almacén nuevo para los dibujos; los datos existentes se conservan.

---

## 6 de noviembre de 2026 · Fotos de campo en el catálogo (fase 3)

- En la ficha de cualquier especie del catálogo publicado, **Sustituir por tu foto** cambia su ilustración o su imagen por una foto propia, hecha con la cámara o elegida de la galería.
- La foto pasa por el mismo proceso que el resto: encuadre 4:3, revisión de personas (con pixelado opcional) y autoría y licencia. Se guarda sin datos de ubicación.
- Solo se ve en este dispositivo, en todo el catálogo: ficha, rejilla, selector de especies y anotaciones. La ficha la marca como «Tu foto».
- **Volver a la ilustración** (o a la imagen del catálogo) la quita en cualquier momento.
- Entra en la copia de seguridad de **Mi catálogo** y se recupera al importarla. Las copias anteriores siguen siendo válidas.
- Para que la vean también otros dispositivos, se publica con «Preparar fotos del catálogo».
- La base de datos local pasa a la versión 3, con un almacén nuevo para estas fotos; los datos existentes se conservan.

---

## 6 de noviembre de 2026 · Aspecto y nuevo nombre (fase 2)

### Nombre

- La aplicación pasa a llamarse **NatureLab** en toda la web: pestaña del navegador, cabecera, manifiesto de la PWA, PDF, ayuda y nombres de los archivos descargados.
- Los identificadores internos conservan el nombre antiguo a propósito, para no perder datos ni copias: la base de datos local (`naturalab`) y los formatos de copia (`naturalab-investigacion`, `naturalab-catalogo-propio`).

### Paletas

- Siete paletas ilustradas: **Atardecer** (la general), Rosa, Lavanda, Ámbar, Terracota, Mar y Río.
- Cada investigación puede tener su propia paleta. Se elige al crearla o editarla, con vista previa en directo, y se aplica a todas sus pantallas.
- Los fondos tienen una versión vertical para el móvil y otra apaisada para el ordenador y las tabletas, con la decoración en los laterales y el centro despejado.
- La paleta se guarda en la copia de seguridad. Una paleta desconocida, de una versión futura, no impide importar: se usa la general.

### Navegación

- Nuevo menú de configuración (el engranaje, arriba a la derecha): paleta general, tamaño del texto y acceso a la ayuda. «Mi perfil» queda reservado para una versión con usuarios.
- Barra inferior: Inicio, Laboratorios, Investigaciones y **Catálogo**. La ayuda pasa al menú de configuración.
- Nuevo icono de la aplicación, en granate.

---

## 6 de noviembre de 2026 · Transectos y modelos (fase 1)

### Tipo de práctica «Transecto lineal»

- Al crear una investigación se elige el tipo de práctica: **Recuento en parcela** o **Transecto lineal**.
- Cada investigación de transectos admite varias líneas, cada una con su longitud, orientación (Este-Oeste, Norte-Sur…) y modo de anotación.
- Dos modos de anotar las manchas de cada especie:
  - **Longitudes**: se escribe lo que mide cada mancha (`1+12+5+28`). El suelo desnudo se anota en una fila propia.
  - **Inicio y fin**: se anota dónde empieza y termina cada mancha sobre la cinta. El suelo desnudo se calcula solo y se dibuja la franja del transecto.
- Las especies pueden solaparse: cuentan las dos y la suma de coberturas puede superar el 100 %.

### Cálculos

- Cobertura de cada especie: cm de la especie ÷ longitud de la línea × 100.
- Cobertura total, suelo desnudo, especie dominante y solapes.
- Con varios transectos: se suman los cm de cada especie en todas las líneas y se divide entre la longitud total; también se indica en cuántos transectos aparece.
- Avisos cuando falta longitud por anotar.

### Resultados y exportaciones

- Pantalla de resultados con indicadores, barras por especie, cálculo paso a paso y conclusión.
- CSV de resultados y CSV de anotaciones.
- Cuaderno en PDF con resumen, una página por transecto y franja dibujada en el modo de inicio y fin.

### Modelos

- «Cargar ejemplo del Salar» se sustituye por **Cargar un modelo**, con una lista ampliable:
  - **Biodiversidad · Salar de los Canos** (recuento en parcela).
  - **Cobertura vegetal · Río Antas** (transecto de 4 m Este-Oeste, 3 de noviembre de 2026).
- Cargar un modelo no modifica las demás investigaciones; «Restaurar» lo devuelve a sus datos originales.

### Catálogo

- Cuatro especies nuevas de la duna del río Antas, con ilustraciones esquemáticas propias (CC0): grama de los arenales, cuernecillo de mar, hierba carnicera y planta rodante. Pendientes de revisión botánica.
- El catálogo se agrupa por zona: Mi catálogo, Salar de los Canos y Duna del río Antas.

### Compatibilidad

- El esquema de datos pasa a la **versión 2**. Las copias anteriores se importan sin cambios, como recuento en parcela.
- Las copias hechas con esta versión no se pueden importar en versiones anteriores de la aplicación.

---

## 29 de octubre de 2026 · Mi catálogo

- Añadir especies propias desde el Catálogo, con foto (cámara o galería) y nombre, sin asociarlas a ninguna investigación.
- La foto pasa por encuadre 4:3, revisión de personas y datos de autoría y licencia, y se guarda en el dispositivo sin datos de ubicación.
- Las especies propias se pueden elegir al registrar observaciones y tienen su propia copia de seguridad en ZIP.
- El detector de personas queda guardado para usarse sin conexión tras el primer uso con Internet.

---

## Pendiente

- **Fase 4b:** crear plantillas de «unir los puntos» desde la app, tocando el contorno sobre la foto o la ilustración de una especie (también para las de Mi catálogo).
- Animales en el catálogo y sus plantillas.
- Fotos en las especies de un transecto.
- Laboratorio de Microplásticos.
- Fondos de las paletas en mayor resolución.
