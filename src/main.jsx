import React from "react";
import ReactDOM from "react-dom/client";
import BioplasticApp from "./BioplasticApp.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* Contenedor de pantalla completa y centrado */}
    <div className="min-h-screen w-full bg-gray-50 py-8 px-4 flex justify-center">
      <div className="w-full max-w-5xl">
        <BioplasticApp />
      </div>
    </div>
  </React.StrictMode>
);
