import React, { useEffect, useState } from "react";
import * as Auth from "./auth"; // 👈 importamos TODO el módulo como 'Auth'
import logoEAN from "./assets/ean-logo.png";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("amartin16099@universidadean.edu.co");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    // Crea admin por defecto si no existe
    Auth.ensureDefaultAdmin?.();
  }, []);

  function submit(e) {
    e.preventDefault();

    const loginFn = Auth.loginWithPassword;
    if (typeof loginFn !== "function") {
      setMsg(
        "No se encontró 'loginWithPassword' en auth.js. Revisa que el archivo exporte la función."
      );
      return;
    }

    const u = loginFn(email.trim(), password);
    if (!u) {
      setMsg("Credenciales inválidas o usuario inactivo.");
      return;
    }
    onLogin?.();
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-white border rounded-2xl shadow p-6 space-y-4"
      >
        {/* Logo EAN arriba */}
        <div className="flex flex-col items-center mb-2">
          <img
            src={logoEAN}
            alt="Logo Universidad EAN"
            className="h-16 mb-2"
          />
          <h1 className="text-lg font-bold text-emerald-700 text-center">
            Bioplástico EAN · Acceso
          </h1>
        </div>

        <label className="block">
          <div className="text-sm text-gray-600 mb-1">Correo</div>
          <input
            className="w-full border rounded-xl px-3 py-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="block">
          <div className="text-sm text-gray-600 mb-1">Contraseña</div>
          <input
            className="w-full border rounded-xl px-3 py-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {msg && <div className="text-sm text-rose-600">{msg}</div>}

        <button
          className="w-full bg-emerald-600 text-white rounded-xl py-2 font-semibold hover:bg-emerald-700"
          type="submit"
        >
          Entrar
        </button>

        <div className="text-xs text-gray-500 mt-2 text-center">
          Admin: <b>amartin16099@universidadean.edu.co</b> / <b>admin123</b>
        </div>
      </form>
    </div>
  );
}
