import { openDB } from 'idb';

/**
 * Base de datos local del navegador (IndexedDB). No hay servidor ni base remota.
 *
 * Para cambiar el esquema: subir VERSION_BD y añadir un bloque
 * `if (versionAnterior < N)` en upgrade(), sin modificar los anteriores.
 */
// Conserva el nombre antiguo de la app a propósito: cambiarlo dejaría sin abrir los datos y las copias ya guardados.
export const NOMBRE_BD = 'naturalab';
export const VERSION_BD = 4;

export const ALMACENES = {
  investigaciones: 'investigaciones',
  parcelas: 'parcelas',
  observaciones: 'observaciones',
  fotos: 'fotos', // Fase 2: fotografías locales como Blob, separadas de las observaciones.
  ajustes: 'ajustes',
  especiesPropias: 'especiesPropias', // «Mi catálogo»: especies añadidas por la persona usuaria, con su foto.
  fotosCatalogo: 'fotosCatalogo', // Fotos de campo que sustituyen, en este dispositivo, la imagen de una especie publicada.
  dibujos: 'dibujos', // Dibujos de los estudiantes (unir los puntos o libre), guardados en su investigación.
};

let promesaBD = null;

export function abrirBD() {
  if (!globalThis.indexedDB) {
    return Promise.reject(new Error('Este navegador no permite guardar datos en el dispositivo.'));
  }
  if (!promesaBD) {
    promesaBD = openDB(NOMBRE_BD, VERSION_BD, {
      upgrade(bd, versionAnterior) {
        if (versionAnterior < 1) {
          bd.createObjectStore(ALMACENES.investigaciones, { keyPath: 'id' });

          const parcelas = bd.createObjectStore(ALMACENES.parcelas, { keyPath: 'id' });
          parcelas.createIndex('porInvestigacion', 'investigacionId');

          const observaciones = bd.createObjectStore(ALMACENES.observaciones, { keyPath: 'id' });
          observaciones.createIndex('porInvestigacion', 'investigacionId');
          observaciones.createIndex('porParcela', 'parcelaId');

          const fotos = bd.createObjectStore(ALMACENES.fotos, { keyPath: 'id' });
          fotos.createIndex('porObservacion', 'observacionId');

          bd.createObjectStore(ALMACENES.ajustes, { keyPath: 'clave' });
        }
        if (versionAnterior < 2) {
          bd.createObjectStore(ALMACENES.especiesPropias, { keyPath: 'id' });
        }
        if (versionAnterior < 3) {
          bd.createObjectStore(ALMACENES.fotosCatalogo, { keyPath: 'especieId' });
        }
        if (versionAnterior < 4) {
          const dibujos = bd.createObjectStore(ALMACENES.dibujos, { keyPath: 'id' });
          dibujos.createIndex('porInvestigacion', 'investigacionId');
        }
      },
      // Otra pestaña con una versión más nueva necesita actualizar la base: se cierra esta conexión.
      blocking() {
        const actual = promesaBD;
        promesaBD = null;
        actual?.then((bd) => bd.close()).catch(() => {});
      },
      terminated() {
        promesaBD = null;
      },
    }).catch((error) => {
      promesaBD = null;
      throw error;
    });
  }
  return promesaBD;
}

/** Solo para pruebas: cierra y olvida la conexión actual. */
export async function cerrarBD() {
  if (promesaBD) {
    const bd = await promesaBD.catch(() => null);
    bd?.close();
    promesaBD = null;
  }
}
