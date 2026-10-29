import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProveedorAnuncios } from '../accesibilidad/Anunciador.jsx';
import { PaginaCatalogo } from '../catalogos/PaginaCatalogo.jsx';
import { PaginaEspeciePropia } from '../catalogos/PaginaEspeciePropia.jsx';
import { PaginaFichaEspecie } from '../catalogos/PaginaFichaEspecie.jsx';
import { PaginaPrepararFotos } from '../catalogos/fotos/PaginaPrepararFotos.jsx';
import {
  PaginaEditarInvestigacion,
  PaginaNuevaInvestigacion,
} from '../laboratorios/biodiversidad/PaginasFormularioInvestigacion.jsx';
import { PaginaInvestigacion } from '../laboratorios/biodiversidad/PaginaInvestigacion.jsx';
import { PaginaRegistrarObservacion } from '../laboratorios/biodiversidad/PaginaRegistrarObservacion.jsx';
import { SeccionObservaciones } from '../laboratorios/biodiversidad/SeccionObservaciones.jsx';
import { SeccionParcelas } from '../laboratorios/biodiversidad/SeccionParcelas.jsx';
import { SeccionResultados } from '../laboratorios/biodiversidad/SeccionResultados.jsx';
import { PaginaMicroplasticos } from '../laboratorios/microplasticos/PaginaMicroplasticos.jsx';
import { Layout } from './Layout.jsx';
import { PaginaAyuda } from './PaginaAyuda.jsx';
import { PaginaInicio } from './PaginaInicio.jsx';
import { PaginaInvestigaciones } from './PaginaInvestigaciones.jsx';
import { PaginaLaboratorios } from './PaginaLaboratorios.jsx';
import { PaginaNoEncontrada } from './PaginaNoEncontrada.jsx';

/**
 * Rutas con HashRouter (#/ruta): funcionan en GitHub Pages y sin conexión
 * sin configurar redirecciones en el servidor.
 */
export default function App() {
  return (
    <HashRouter>
      <ProveedorAnuncios>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<PaginaInicio />} />
            <Route path="laboratorios" element={<PaginaLaboratorios />} />
            <Route path="laboratorios/microplasticos" element={<PaginaMicroplasticos />} />
            <Route path="catalogo" element={<PaginaCatalogo />} />
            <Route path="catalogo/fotos" element={<PaginaPrepararFotos />} />
            <Route path="catalogo/nueva" element={<PaginaEspeciePropia />} />
            <Route path="catalogo/:especieId/editar" element={<PaginaEspeciePropia />} />
            <Route path="catalogo/:especieId" element={<PaginaFichaEspecie />} />
            <Route path="investigaciones" element={<PaginaInvestigaciones />} />
            <Route path="investigaciones/nueva" element={<PaginaNuevaInvestigacion />} />
            <Route path="investigaciones/:id/editar" element={<PaginaEditarInvestigacion />} />
            <Route path="investigaciones/:id/observar" element={<PaginaRegistrarObservacion />} />
            <Route path="investigaciones/:id/observaciones/:observacionId" element={<PaginaRegistrarObservacion />} />
            <Route path="investigaciones/:id" element={<PaginaInvestigacion />}>
              <Route index element={<Navigate to="observaciones" replace />} />
              <Route path="parcelas" element={<SeccionParcelas />} />
              <Route path="observaciones" element={<SeccionObservaciones />} />
              <Route path="resultados" element={<SeccionResultados />} />
            </Route>
            <Route path="ayuda" element={<PaginaAyuda />} />
            <Route path="*" element={<PaginaNoEncontrada />} />
          </Route>
        </Routes>
      </ProveedorAnuncios>
    </HashRouter>
  );
}
