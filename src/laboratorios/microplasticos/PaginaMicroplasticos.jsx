import { Link } from 'react-router-dom';
import { useTituloDocumento } from '../../accesibilidad/useTituloDocumento.js';
import { IconoAtras } from '../../componentes/Iconos.jsx';

export function PaginaMicroplasticos() {
  useTituloDocumento('Microplásticos');
  return (
    <>
      <Link to="/laboratorios" className="volver">
        <IconoAtras />
        Laboratorios
      </Link>
      <header className="encabezado-pagina">
        <h1>Microplásticos</h1>
        <p>Laboratorio en preparación.</p>
      </header>
      <div className="panel">
        <p>Permitirá documentar muestras de arena o agua y clasificar las partículas observadas por tipo, color y tamaño aproximado, con gráficos por muestra.</p>
        <p>
          Una identificación visual no demuestra por sí sola que una partícula sea plástico. Por eso el laboratorio
          registrará <strong>partículas sospechosas</strong> y las distinguirá de los microplásticos confirmados.
        </p>
        <p className="texto-suave texto-pequeno">
          Las actividades con muestras se diseñarán con supervisión y medidas de seguridad apropiadas.
        </p>
      </div>
    </>
  );
}
