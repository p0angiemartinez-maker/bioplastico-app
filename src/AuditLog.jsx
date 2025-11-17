import React from "react";
import { getAuditLog, clearAudit } from "./audit";
import { isAdmin } from "./auth";

export default function AuditLog({ onClose }) {
  const [items, setItems] = React.useState(() => getAuditLog());

  function handleClear() {
    if (!isAdmin()) {
      alert("Solo el administrador puede limpiar la auditoría.");
      return;
    }
    if (!confirm("¿Borrar todo el registro de auditoría?")) return;
    clearAudit();
    setItems([]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Fondo translúcido */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Cerrar auditoría"
      />

      {/* Modal */}
      <div className="relative bg-white w-[95%] max-w-3xl rounded-2xl shadow-lg p-4 sm:p-6 border border-emerald-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg sm:text-xl font-semibold text-emerald-800">
            Auditoría de acciones
          </h2>
          <div className="flex gap-2">
            <button
              className="border border-emerald-300 text-emerald-700 rounded-xl px-3 py-1 hover:bg-emerald-50"
              onClick={() => setItems(getAuditLog())}
              title="Recargar"
            >
              Recargar
            </button>
            <button
              className="bg-rose-600 text-white rounded-xl px-3 py-1 hover:bg-rose-700"
              onClick={handleClear}
              title="Limpiar auditoría (solo admin)"
            >
              Limpiar
            </button>
            <button
              className="bg-gray-200 rounded-xl px-3 py-1 hover:bg-gray-300"
              onClick={onClose}
              title="Cerrar"
            >
              Cerrar
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-sm text-gray-500">
            No hay registros aún. Realiza alguna acción (crear experimento, guardar tiempo/T°, cerrar, eliminar…) y vuelve a abrir.
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-auto space-y-2">
            {items
              .slice()
              .reverse()
              .map((e) => (
                <div
                  key={e.id}
                  className="border rounded-xl p-3 bg-white flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {new Date(e.timestamp).toLocaleString()}
                    </span>
                    <span className="text-[11px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">
                      {e.action}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    <b>Usuario:</b>{" "}
                    {e?.details?.user
                      ? `${e.details.user.name} (${e.details.user.email})`
                      : "—"}
                  </div>
                  <div className="text-xs text-gray-600">
                    <b>Exp:</b>{" "}
                    {e?.details?.experimentNumber ?? "—"} · <b>Práctica:</b>{" "}
                    {e?.details?.practiceCode ?? "—"}
                  </div>

                  {e?.details?.payload && (
                    <pre className="text-[11px] bg-gray-50 border rounded p-2 overflow-auto">
{JSON.stringify(e.details.payload, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}