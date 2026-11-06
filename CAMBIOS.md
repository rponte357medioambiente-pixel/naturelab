# NatureLab · Registro de cambios

Cuaderno de campo digital para talleres de exploración ambiental. Aplicación web progresiva (PWA), sin servidor: los datos se guardan en el dispositivo y se trasladan con copias de seguridad.

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

- **Fase 3:** sustituir la ilustración de una especie por una foto tomada en campo, desde su ficha.
- **Fase 4:** dibujo de plantas y animales con puntos para unir.
- Fotos en las especies de un transecto.
- Laboratorio de Microplásticos.
- Fondos de las paletas en mayor resolución.
