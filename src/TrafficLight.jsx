// src/TrafficLight.jsx
import React from "react";

export default function TrafficLight({
  seconds,
  targetSeconds,
  tolerance = 0.1,
}) {
  if (!targetSeconds || targetSeconds <= 0) {
    // Si no hay tiempo objetivo definido, mostramos todo apagado con verde encendido
    return (
      <div className="flex flex-col items-center gap-1 bg-slate-800 rounded-xl px-3 py-2">
        <div className="w-4 h-4 rounded-full bg-red-600/20" />
        <div className="w-4 h-4 rounded-full bg-yellow-400/20" />
        <div className="w-4 h-4 rounded-full bg-green-500" />
      </div>
    );
  }

  const lowGreen = targetSeconds * (1 - tolerance);
  const highGreen = targetSeconds * (1 + tolerance);
  const lowYellow = targetSeconds * (1 - 2 * tolerance);
  const highYellow = targetSeconds * (1 + 2 * tolerance);

  let status = "green";

  if (seconds < lowYellow || seconds > highYellow) {
    status = "red";
  } else if (
    (seconds >= lowYellow && seconds < lowGreen) ||
    (seconds > highGreen && seconds <= highYellow)
  ) {
    status = "yellow";
  } else {
    status = "green";
  }

  const redOn = status === "red";
  const yellowOn = status === "yellow";
  const greenOn = status === "green";

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-center gap-1 bg-slate-800 rounded-xl px-3 py-2">
        <div
          className={`w-4 h-4 rounded-full ${
            redOn ? "bg-red-600" : "bg-red-600/20"
          }`}
        />
        <div
          className={`w-4 h-4 rounded-full ${
            yellowOn ? "bg-yellow-400" : "bg-yellow-400/20"
          }`}
        />
        <div
          className={`w-4 h-4 rounded-full ${
            greenOn ? "bg-green-500" : "bg-green-500/20"
          }`}
        />
      </div>
      <span className="text-[11px] text-gray-600 max-w-[200px]">
        {status === "green" && "Dentro del rango de tiempo definido para el procedimiento."}
        {status === "yellow" && "Cerca del límite: revisar condiciones y registrar observaciones."}
        {status === "red" && "Fuera de especificación: revisar procedimiento / repetir práctica."}
      </span>
    </div>
  );
}
