import React from "react";
import Login from "./Login.jsx";
import AdminUsers from "./AdminUsers.jsx";
import BioplasticApp from "./BioplasticApp.jsx";
import { getCurrentUser, logout, ROLES, ensureDefaultAdmin } from "./auth";
import eanLogo from "./assets/ean-logo.png"; // <-- coloca el logo aquí

export default function App() {
  const [user, setUser] = React.useState(getCurrentUser());
  // Vistas: 'home' (menú principal), 'lab' (app de laboratorio), 'admin-users' (gestión usuarios)
  const [view, setView] = React.useState("home");
  React.useEffect(() => {
    ensureDefaultAdmin(); // crea el admin si no existe
  }, []);
  
  if (!user) {
    return <Login onLogin={() => { setUser(getCurrentUser()); setView("home"); }} />;
  }

  // Header con logo y título (reutilizado en vistas)
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

  // --------- Vistas ---------
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
            <div className="text-xs text-gray-500">
              Sesión: {user?.email} · Rol: {user?.role}
            </div>
          </div>
          {/* Tu app de laboratorio completa (cálculo, manual, búsqueda, cronómetro, etc.) */}
          <BioplasticApp />
        </main>
      </div>
    );
  }

  if (view === "admin-users") {
    if (user?.role !== ROLES.ADMIN) {
      // Bloqueo suave si no es admin
      return (
        <div className="min-h-screen bg-gray-50 text-gray-900">
          <Header />
          <main className="w-full max-w-3xl mx-auto px-4">
            <div className="bg-white border rounded-2xl p-5">
              <p className="text-rose-600 font-semibold">
                No tienes permisos de administrador.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setView("home")}
                  className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
                >
                  ← Volver
                </button>
                <button
                  onClick={() => {
                    logout();
                    setUser(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-gray-300 hover:bg-gray-400"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          </main>
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
            <div className="text-xs text-gray-500">
              Sesión: {user?.email} · Rol: {user?.role}
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
  <div className="min-h-screen bg-gray-50 text-gray-900 flex justify-center items-center px-4">
    <div className="w-full max-w-lg flex flex-col items-center">
      <Header />

      <main className="w-full flex flex-col gap-3 mt-4">
        <MenuButton onClick={() => setView("lab")}>
          Ingresar al laboratorio
        </MenuButton>

        {/* Solo visible para admin */}
        {user?.role === ROLES.ADMIN && (
          <MenuButton onClick={() => setView("admin-users")} variant="warn">
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

        <div className="mt-3 text-center text-xs text-gray-500">
          Sesión: {user?.email} · Rol: {user?.role}
        </div>
      </main>
    </div>
  </div>
);
}
