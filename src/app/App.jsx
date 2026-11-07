import { HashRouter, Route, Routes } from 'react-router-dom';
import { ProveedorAnuncios } from '../accesibilidad/Anunciador.jsx';
import { ProveedorApariencia } from '../apariencia/Apariencia.jsx';
import { PaginaCatalogo } from '../catalogos/PaginaCatalogo.jsx';
import { PaginaEspeciePropia } from '../catalogos/PaginaEspeciePropia.jsx';
import { PaginaFichaEspecie } from '../catalogos/PaginaFichaEspecie.jsx';
import { PaginaPrepararFotos } from '../catalogos/fotos/PaginaPrepararFotos.jsx';
import {
  PaginaEditarInvestigacion,
  PaginaNuevaInvestigacion,
} from '../laboratorios/biodiversidad/PaginasFormularioInvestigacion.jsx';
import {
  IndiceInvestigacion,
  PaginaInvestigacion,
  SoloTipo,
} from '../laboratorios/biodiversidad/PaginaInvestigacion.jsx';
import { PaginaRegistrarObservacion } from '../laboratorios/biodiversidad/PaginaRegistrarObservacion.jsx';
import { PaginaTransecto } from '../laboratorios/biodiversidad/PaginaTransecto.jsx';
import { SeccionCobertura } from '../laboratorios/biodiversidad/SeccionCobertura.jsx';
import { SeccionObservaciones } from '../laboratorios/biodiversidad/SeccionObservaciones.jsx';
import { SeccionParcelas } from '../laboratorios/biodiversidad/SeccionParcelas.jsx';
import { SeccionResultados } from '../laboratorios/biodiversidad/SeccionResultados.jsx';
import { SeccionTransectos } from '../laboratorios/biodiversidad/SeccionTransectos.jsx';
import { PaginaModelos } from '../modelos/PaginaModelos.jsx';
import { PaginaNuevoDibujo } from '../dibujos/PaginaNuevoDibujo.jsx';
import { SeccionDibujos } from '../dibujos/SeccionDibujos.jsx';
import { PaginaJuego } from '../juego/PaginaJuego.jsx';
import { PaginaFichas } from '../catalogos/PaginaFichas.jsx';
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
      <ProveedorApariencia>
        <ProveedorAnuncios>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<PaginaInicio />} />
              <Route path="laboratorios" element={<PaginaLaboratorios />} />
              <Route path="laboratorios/microplasticos" element={<PaginaMicroplasticos />} />
              <Route path="catalogo" element={<PaginaCatalogo />} />
              <Route path="catalogo/fotos" element={<PaginaPrepararFotos />} />
              <Route path="catalogo/nueva" element={<PaginaEspeciePropia />} />
              <Route path="catalogo/juego" element={<PaginaJuego />} />
              <Route path="catalogo/fichas" element={<PaginaFichas />} />
              <Route path="catalogo/:especieId/editar" element={<PaginaEspeciePropia />} />
              <Route path="catalogo/:especieId" element={<PaginaFichaEspecie />} />
              <Route path="investigaciones" element={<PaginaInvestigaciones />} />
              <Route path="investigaciones/nueva" element={<PaginaNuevaInvestigacion />} />
              <Route path="investigaciones/:id/editar" element={<PaginaEditarInvestigacion />} />
              <Route path="investigaciones/:id/observar" element={<PaginaRegistrarObservacion />} />
              <Route path="investigaciones/:id/observaciones/:observacionId" element={<PaginaRegistrarObservacion />} />
              <Route path="investigaciones/:id/transectos/:transectoId" element={<PaginaTransecto />} />
              <Route path="investigaciones/:id/dibujos/nuevo" element={<PaginaNuevoDibujo />} />
              <Route path="investigaciones/:id" element={<PaginaInvestigacion />}>
                <Route index element={<IndiceInvestigacion />} />
                <Route path="parcelas" element={<SoloTipo tipo="parcela"><SeccionParcelas /></SoloTipo>} />
                <Route path="observaciones" element={<SoloTipo tipo="parcela"><SeccionObservaciones /></SoloTipo>} />
                <Route path="resultados" element={<SoloTipo tipo="parcela"><SeccionResultados /></SoloTipo>} />
                <Route path="transectos" element={<SoloTipo tipo="transecto"><SeccionTransectos /></SoloTipo>} />
                <Route path="cobertura" element={<SoloTipo tipo="transecto"><SeccionCobertura /></SoloTipo>} />
                <Route path="dibujos" element={<SeccionDibujos />} />
              </Route>
              <Route path="modelos" element={<PaginaModelos />} />
              <Route path="ayuda" element={<PaginaAyuda />} />
              <Route path="*" element={<PaginaNoEncontrada />} />
            </Route>
          </Routes>
        </ProveedorAnuncios>
      </ProveedorApariencia>
    </HashRouter>
  );
}
