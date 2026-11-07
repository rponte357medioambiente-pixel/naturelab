/**
 * Lógica del juego «¿Qué especie es?», sin interfaz: elegir las especies que
 * se pueden preguntar, preparar las preguntas y contar los aciertos.
 * El azar se recibe como parámetro para poder probarla.
 */

export const NUMEROS_PREGUNTAS = [5, 10, 20];
export const NOMBRES_RESPUESTA = { comun: 'Nombre común', cientifico: 'Nombre científico' };

export const textoDe = (especie, nombre) => (nombre === 'cientifico' ? especie.nombreCientifico : especie.nombreComun) ?? '';

/**
 * Especies que se pueden preguntar: con imagen y con el nombre que se pide.
 * @param {object[]} especies  catálogo completo
 * @param {(e) => boolean} tieneImagen
 * @param {{ids?: Set<string>|null, nombre: 'comun'|'cientifico'}} opciones  ids: solo esas especies (null = todas)
 */
export function especiesJugables(especies, tieneImagen, { ids = null, nombre = 'comun' } = {}) {
  return especies.filter((e) => tieneImagen(e) && textoDe(e, nombre).trim() && (!ids || ids.has(e.id)));
}

function barajar(lista, azar) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * Prepara una partida. Cada especie sale como mucho una vez; las opciones
 * incorrectas salen primero de las especies elegidas y, si no bastan, del resto
 * del catálogo, para que siempre haya cuatro (si el catálogo lo permite).
 * @returns {{especie, opciones: {id, texto}[]}[]}
 */
export function crearPartida(jugables, todas, { preguntas = 10, nombre = 'comun', azar = Math.random } = {}) {
  const elegidas = barajar(jugables, azar).slice(0, preguntas);
  const conNombre = todas.filter((e) => textoDe(e, nombre).trim());
  return elegidas.map((especie) => {
    const correcta = textoDe(especie, nombre).trim().toLocaleLowerCase('es');
    const usados = new Set([correcta]);
    const distractores = [];
    for (const grupo of [barajar(jugables, azar), barajar(conNombre, azar)]) {
      for (const e of grupo) {
        const texto = textoDe(e, nombre).trim();
        const clave = texto.toLocaleLowerCase('es');
        if (distractores.length < 3 && !usados.has(clave)) {
          usados.add(clave);
          distractores.push({ id: e.id, texto });
        }
      }
    }
    const opciones = barajar([{ id: especie.id, texto: textoDe(especie, nombre).trim() }, ...distractores], azar);
    return { especie, opciones };
  });
}

/** Un rasgo breve para recordar la especie tras responder. */
export function pistaDe(especie) {
  const texto = especie.rasgos?.[0] ?? especie.descripcion ?? especie.notas ?? '';
  return texto.length > 160 ? `${texto.slice(0, 157).trimEnd()}…` : texto;
}

/** Resumen final: aciertos y especies falladas, sin repetir. */
export function resumirPartida(preguntas, respuestas) {
  let aciertos = 0;
  const fallos = [];
  preguntas.forEach((p, i) => {
    if (respuestas[i] === p.especie.id) aciertos += 1;
    else if (respuestas[i] !== undefined && !fallos.some((f) => f.id === p.especie.id)) fallos.push(p.especie);
  });
  return { aciertos, total: preguntas.length, fallos };
}
