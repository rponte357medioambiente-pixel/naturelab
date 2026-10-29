export function EstadoCopia({ pendiente }) {
  return pendiente ? (
    <span className="estado estado--ocre">Pendiente de exportar</span>
  ) : (
    <span className="estado">Copia exportada</span>
  );
}
