import React from "react";
import Login from "./Login.jsx";
import AdminUsers from "./AdminUsers.jsx";
import BioplasticApp from "./BioplasticApp.jsx";
import { getCurrentUser, logout, ROLES, ensureDefaultAdmin } from "./auth";
import eanLogo from "./assets/ean-logo.png";

export default function App() {
  const [user, setUser] = React.useState(getCurrentUser());
  // Vistas: 'home' (menú principal), 'lab' (app de laboratorio), 'admin-users' (gestión usuarios)
  const [view, setView] = React.useState("home");

  React.useEffect(() => {
    ensureDefaultAdmin(); // crea el admin si no existe
  }, []);

  // Si NO hay usuario -> mostrar login centrado
  if (!user) {
    return (
      <Login
        onLogin={() => {
          setUser(getCurrentUser());
          setView("home");
        }}
      />
    );
  }

  // Header reutilizable para lab y admin-users
  const Header = () => (
    <header className="w-full max-w-3xl mx-auto flex flex-col items-center mt-6 mb-4 px-4">
      <img
        src={eanLogo}
        alt="Universidad EAN"
        className="w-36 h-auto mb-2"
        draggable={false}
      />
      <h1 className="text-xl sm:text-2xl font-bold text-emerald-700 text-center">
        Registro de Bioplásticos — EAN
      </h1>
      <p className="text-sm text-gray-600 text-center">
        Laboratorio · Ingeniería Química
      </p>
    </header>
  );

  // Botón estándar
  const MenuButton = ({ children, onClick, variant = "primary" }) => {
    const base = "w-full rounded-xl py-3 font-semibold transition";
    const styles =
      variant === "primary"
        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
        : variant === "warn"
        ? "bg-yellow-500 hover:bg-yellow-600 text-white"
        : "bg-gray-300 hover:bg-gray-400 text-gray-800";
    return (
      <button onClick={onClick} className={`${base} ${styles}`}>
        {children}
      </button>
    );
  };

  // --------- Vista LAB (app de laboratorio) ---------
  if (view === "lab") {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <Header />
        <main className="w-full max-w-5xl mx-auto px-4">
          <div className="flex justify-between items-center mb-3">
            <button
              onClick={() => setView("home")}
              className="text-sm px-3 py-1 rounded-lg border bg-white hover:bg-gray-50"
            >
              ← Volver al menú
            </button>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>
                Sesión: {user?.email} · Rol: {user?.role}
              </span>
              <button
                onClick={() => {
                  logout();
                  setUser(null);
                }}
                className="px-3 py-1 rounded-lg border bg-white hover:bg-gray-50 text-[11px]"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
          {/* Tu app de laboratorio completa */}
          <BioplasticApp />
        </main>
      </div>
    );
  }

  // --------- Vista ADMIN-USERS ---------
  if (view === "admin-users") {
    if (user?.role !== ROLES.ADMIN) {
      // Bloqueo suave si no es admin
      return (
        <div className="min-h-screen bg-gray-50 text-gray-900 grid place-items-center px-4">
          <div className="w-full max-w-md bg-white border rounded-2xl shadow p-6 space-y-4">
            <div className="flex flex-col items-center gap-2">
              <img
                src={eanLogo}
                alt="Universidad EAN"
                className="w-24 h-auto"
                draggable={false}
              />
              <h1 className="text-lg sm:text-xl font-bold text-emerald-700 text-center">
                Registro de Bioplásticos — EAN
              </h1>
              <p className="text-xs text-gray-600 text-center">
                Administración de usuarios
              </p>
            </div>
            <p className="text-rose-600 font-semibold text-sm">
              No tienes permisos de administrador.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setView("home")}
                className="flex-1 px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm"
              >
                ← Volver
              </button>
              <button
                onClick={() => {
                  logout();
                  setUser(null);
                }}
                className="flex-1 px-4 py-2 rounded-xl bg-gray-300 hover:bg-gray-400 text-sm"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <Header />
        <main className="w-full max-w-5xl mx-auto px-4">
          <div className="flex justify-between items-center mb-3">
            <button
              onClick={() => setView("home")}
              className="text-sm px-3 py-1 rounded-lg border bg-white hover:bg-gray-50"
            >
              ← Volver al menú
            </button>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>
                Sesión: {user?.email} · Rol: {user?.role}
              </span>
              <button
                onClick={() => {
                  logout();
                  setUser(null);
                }}
                className="px-3 py-1 rounded-lg border bg-white hover:bg-gray-50 text-[11px]"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
          {/* Panel de administración de usuarios */}
          <AdminUsers />
        </main>
      </div>
    );
  }

// --------- Menú principal (home) ---------
return (
  <div
    className="min-h-screen w-screen bg-gray-50 text-gray-900 flex items-center justify-center px-4"
  >
    <div className="w-full max-w-md bg-white border rounded-2xl shadow p-6 space-y-4">
      {/* Encabezado del menú principal */}
      <div className="flex flex-col items-center gap-2">
        <img
          src={eanLogo}
          alt="Universidad EAN"
          className="w-24 h-auto"
          draggable={false}
        />
        <h1 className="text-lg sm:text-xl font-bold text-emerald-700 text-center">
          Registro de Bioplásticos — EAN
        </h1>
        <p className="text-xs text-gray-600 text-center">
          Menú principal · Laboratorio de Ingeniería Química
        </p>
      </div>

      {/* Botones del menú */}
      <div className="flex flex-col gap-3 mt-2">
        <MenuButton onClick={() => setView("lab")}>
          Ingresar al laboratorio
        </MenuButton>

        {user?.role === ROLES.ADMIN && (
          <MenuButton
            onClick={() => setView("admin-users")}
            variant="warn"
          >
            Gestión de usuarios
          </MenuButton>
        )}

        <MenuButton
          onClick={() => {
            logout();
            setUser(null);
          }}
          variant="secondary"
        >
          Cerrar sesión
        </MenuButton>
      </div>

      {/* Info de sesión */}
      <div className="text-center text-xs text-gray-500">
        Sesión: {user?.email} · Rol: {user?.role}
      </div>
    </div>
  </div>
);
}
