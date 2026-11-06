/** Iconos de trazo (24 × 24). Decorativos: siempre acompañan a un texto visible o accesible. */
function Icono({ children, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconoInicio = (p) => (
  <Icono {...p}>
    <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
  </Icono>
);

export const IconoLaboratorio = (p) => (
  <Icono {...p}>
    <path d="M9 3h6M10 3v6l-5.4 9.4A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.4-2.6L14 9V3M7.3 15h9.4" />
  </Icono>
);

export const IconoCuaderno = (p) => (
  <Icono {...p}>
    <path d="M5 5a2 2 0 0 1 2-2h12v15H7a2 2 0 0 0-2 2zM5 20a2 2 0 0 0 2 1h12v-3M9 7h6" />
  </Icono>
);

export const IconoAyuda = (p) => (
  <Icono {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .9-1 1.6v.4M12 17.2h.01" />
  </Icono>
);

export const IconoCatalogo = (p) => (
  <Icono {...p}>
    <path d="M5 20c0-8.5 5-14.5 14-15.5-1 8.8-6 13.8-14 15.5z" />
    <path d="M5 20l7-7.5" />
  </Icono>
);

export const IconoAjustes = (p) => (
  <Icono {...p}>
    <path d="M10.3 4.3c.4-1.8 3-1.8 3.4 0a1.7 1.7 0 0 0 2.6 1.1c1.5-.9 3.3.8 2.4 2.4a1.7 1.7 0 0 0 1 2.5c1.8.5 1.8 3.1 0 3.5a1.7 1.7 0 0 0-1 2.6c.9 1.5-.9 3.3-2.4 2.4a1.7 1.7 0 0 0-2.6 1c-.4 1.8-3 1.8-3.4 0a1.7 1.7 0 0 0-2.6-1c-1.5.9-3.3-.9-2.4-2.4a1.7 1.7 0 0 0-1-2.6c-1.8-.4-1.8-3 0-3.5a1.7 1.7 0 0 0 1-2.5c-.9-1.6.9-3.3 2.4-2.4a1.7 1.7 0 0 0 2.6-1.1z" />
    <circle cx="12" cy="12" r="3" />
  </Icono>
);

export const IconoMas = (p) => (
  <Icono {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icono>
);

export const IconoMenos = (p) => (
  <Icono {...p}>
    <path d="M5 12h14" />
  </Icono>
);

export const IconoAtras = (p) => (
  <Icono {...p}>
    <path d="m15 18-6-6 6-6" />
  </Icono>
);

export const IconoBuscar = (p) => (
  <Icono {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icono>
);

export const IconoPapelera = (p) => (
  <Icono {...p}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
  </Icono>
);

export const IconoEditar = (p) => (
  <Icono {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />
  </Icono>
);

export const IconoDescargar = (p) => (
  <Icono {...p}>
    <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
  </Icono>
);

export const IconoSubir = (p) => (
  <Icono {...p}>
    <path d="M12 16V5M7 10l5-5 5 5M5 20h14" />
  </Icono>
);

export const IconoCompartir = (p) => (
  <Icono {...p}>
    <path d="M12 3v12M7 8l5-5 5 5M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6" />
  </Icono>
);

export const IconoImprimir = (p) => (
  <Icono {...p}>
    <path d="M7 9V3h10v6M7 18H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M7 14h10v7H7z" />
  </Icono>
);

export const IconoSinConexion = (p) => (
  <Icono {...p}>
    <path d="M2 8.8A15 15 0 0 1 6.3 6M22 8.8a15 15 0 0 0-10.8-4M5 12.6a10 10 0 0 1 2.7-1.7M19 12.6a10 10 0 0 0-3.1-2M8.6 16.1a5 5 0 0 1 6.8 0M12 20h.01M3 3l18 18" />
  </Icono>
);

export const IconoCamara = (p) => (
  <Icono {...p}>
    <path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    <circle cx="12" cy="13.5" r="3.5" />
  </Icono>
);

export const IconoDocumento = (p) => (
  <Icono {...p}>
    <path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6" />
  </Icono>
);

export const IconoBrote = (p) => (
  <Icono {...p} strokeWidth="1.6">
    <path d="M12 21v-8M12 13C12 9 9 7 5 7c0 4 3 6 7 6zM12 11c0-3.5 2.5-6 7-6 0 3.5-2.5 6-7 6zM7 21h10" />
  </Icono>
);

/** Marca de NatureLab: tres hojas sobre el suelo, con el color de la paleta. */
export const MarcaNatureLab = (p) => (
  <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" {...p}>
    <rect width="48" height="48" rx="11" fill="var(--albardin)" />
    <g fill="none" stroke="#fffaf4" strokeWidth="3.2" strokeLinecap="round">
      <path d="M24 38c0-9-.6-16.5-2-25" />
      <path d="M24 38c-1.6-7.5-5.5-13-10.5-17.5" />
      <path d="M24 38c2-7 6.4-11.6 11.2-14.6" />
    </g>
    <path d="M12 38.5h24" stroke="var(--albardin-claro)" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);
