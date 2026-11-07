import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Tipografías incluidas en la propia app (licencia SIL OFL 1.1): funcionan sin conexión.
import '@fontsource/atkinson-hyperlegible-next/latin-400.css';
import '@fontsource/atkinson-hyperlegible-next/latin-700.css';
import '@fontsource/alegreya/latin-500-italic.css';
import '@fontsource/alegreya/latin-700.css';
import './estilos/global.css';

import App from './app/App.jsx';
import { vigilarPrecargas } from './app/recargaSegura.js';

vigilarPrecargas();

createRoot(document.getElementById('raiz')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
