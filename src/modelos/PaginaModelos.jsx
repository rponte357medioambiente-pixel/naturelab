import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAnunciar } from '../accesibilidad/Anunciador.jsx';
import { useTituloDocumento } from '../accesibilidad/useTituloDocumento.js';
import { TIPOS_PRACTICA } from '../almacenamiento/modelo.js';
import { listarInvestigacionesConDatos } from '../almacenamiento/repositorio.js';
import { useConsulta } from '../almacenamiento/useConsulta.js';
import { IconoAtras } from '../componentes/Iconos.jsx';
import { cargarModelo } from './cargarModelo.js';
import { MODELOS } from './registro.js';

function IconoTipo({ tipo }) {
  return tipo === 'transecto' ? (
    <svg aria-hidden="true" width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 27c6-5 10-5 16 0s10 5 16 0" />
      <path d="M6 20h28" />
      <path d="M6 17v6M34 17v6" />
      <path d="M14 20v-8M14 12l-3-3M14 14l3-3" />
    </svg>
  ) : (
    <svg aria-hidden="true" width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="6" y="8" width="28" height="24" rx="2" strokeDasharray="3 3" />
      <circle cx="14" cy="16" r="2.5" />
      <circle cx="24" cy="14" r="2.5" />
      <circle cx="19" cy="24" r="2.5" />
      <circle cx="28" cy="25" r="2.5" />
    </svg>
  );
}

export function PaginaModelos() {
  useTituloDocumento('Cargar un modelo');
  const { datos } = useConsulta(listarInvestigacionesConDatos, []);
  const anunciar = useAnunciar();
  const navegar = useNavigate();
  const [ocupado, setOcupado] = useState(null);
  const presentes = new Set((datos ?? []).map((d) => d.investigacion.id));

  async function cargar(modelo) {
    setOcupado(modelo.id);
    try {
      const id = await cargarModelo(modelo);
      if (!id) return;
      anunciar(`«${modelo.titulo}» cargado en este dispositivo.`);
      navegar(`/investigaciones/${id}/${modelo.abrirEn}`);
    } catch (error) {
      anunciar(error.message, { tipo: 'error' });
    } finally {
      setOcupado(null);
    }
  }

  return (
    <>
      <Link to="/investigaciones" className="volver">
        <IconoAtras />
        Investigaciones
      </Link>
      <header className="encabezado-pagina">
        <h1>Cargar un modelo</h1>
        <p>Investigaciones completas para practicar o usar como punto de partida. Se copian en este dispositivo.</p>
      </header>

      <ul className="lista lista-modelos">
        {MODELOS.map((modelo) => {
          const presente = presentes.has(modelo.id);
          return (
            <li key={modelo.id} className="panel tarjeta-modelo">
              <div className="tarjeta-modelo__cabecera">
                <span className="tarjeta-modelo__icono">
                  <IconoTipo tipo={modelo.tipoPractica} />
                </span>
                <div>
                  <h2>{modelo.titulo}</h2>
                  <span className={`estado ${modelo.tipoPractica === 'transecto' ? 'estado--ocre' : ''}`}>
                    {TIPOS_PRACTICA[modelo.tipoPractica].nombre}
                  </span>
                  <p className="texto-suave texto-pequeno">{modelo.resumen}</p>
                </div>
              </div>
              <div className="tarjeta-modelo__acciones">
                <span className="texto-suave texto-pequeno">{presente ? 'Ya está en este dispositivo' : modelo.lugar}</span>
                {presente ? (
                  <>
                    <button
                      type="button"
                      className="boton boton--sencillo"
                      onClick={() => cargar(modelo)}
                      disabled={ocupado !== null}
                    >
                      Restaurar
                    </button>
                    <Link className="boton boton--secundario" to={`/investigaciones/${modelo.id}`}>
                      Abrir
                    </Link>
                  </>
                ) : (
                  <button type="button" className="boton" onClick={() => cargar(modelo)} disabled={ocupado !== null}>
                    {ocupado === modelo.id ? 'Cargando…' : 'Cargar'}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="texto-suave texto-pequeno" style={{ marginTop: '1rem' }}>
        Cargar un modelo no borra ni cambia tus investigaciones. «Restaurar» devuelve un modelo a sus datos originales.
      </p>
    </>
  );
}
