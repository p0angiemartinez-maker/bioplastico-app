import React, { useMemo, useState } from "react";
import * as Auth from "./auth"; // 👈 importamos TODO el módulo como 'Auth'

export default function AdminUsers() {
  const [refresh, setRefresh] = useState(0);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: Auth.ROLES.STUDENT,
    password: "",
    active: true,
  });

  const users = useMemo(() => Auth.getUsers(), [refresh]);

  function save() {
    if (!form.email || !form.name || !form.password) {
      return alert("Completa nombre, correo y contraseña.");
    }
    Auth.addUser(form);
    setForm({
      name: "",
      email: "",
      role: Auth.ROLES.STUDENT,
      password: "",
      active: true,
    });
    setRefresh((x) => x + 1);
  }

  function toggleActive(u) {
    Auth.updateUser(u.id, { active: !u.active });
    setRefresh((x) => x + 1);
  }

  function remove(u) {
    if (!confirm("¿Eliminar usuario?")) return;
    Auth.deleteUser(u.id);
    setRefresh((x) => x + 1);
  }

  return (
    <div className="grid gap-4">
      <div className="bg-white border rounded-2xl p-4">
        <h2 className="font-semibold mb-3">Crear usuario</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            className="border rounded-xl px-3 py-2"
            placeholder="Nombre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="border rounded-xl px-3 py-2"
            placeholder="Correo"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <select
            className="border rounded-xl px-3 py-2"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value={Auth.ROLES.STUDENT}>Estudiante</option>
            <option value={Auth.ROLES.ADMIN}>Administrador</option>
          </select>
          <input
            className="border rounded-xl px-3 py-2"
            placeholder="Contraseña"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <button
          className="mt-3 bg-emerald-600 text-white rounded-xl px-4 py-2"
          onClick={save}
        >
          Guardar
        </button>
      </div>

      <div className="bg-white border rounded-2xl p-4">
        <h2 className="font-semibold mb-3">Usuarios</h2>
        <div className="grid gap-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="border rounded-xl p-3 flex items-center justify-between"
            >
              <div className="text-sm">
                <b>{u.name}</b> — {u.email} · {u.role} ·{" "}
                {u.active ? "Activo" : "Inactivo"}
              </div>
              <div className="flex gap-2">
                <button
                  className="border rounded-xl px-3 py-1"
                  onClick={() => toggleActive(u)}
                >
                  {u.active ? "Desactivar" : "Activar"}
                </button>
                <button
                  className="bg-rose-600 text-white rounded-xl px-3 py-1"
                  onClick={() => remove(u)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
          {!users.length && (
            <div className="text-sm text-gray-500">Sin usuarios aún.</div>
          )}
        </div>
      </div>
    </div>
  );
}