export const ROLES = { ADMIN: "admin", STUDENT: "student", INSTRUCTOR: "instructor" };

const USERS_KEY = "bioplastic_users_v1";
const SESSION_KEY = "bioplastic_user";

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveUsers(list) {
  localStorage.setItem(USERS_KEY, JSON.stringify(list));
}

// -------- sesión ----------
export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
  } catch {
    return null;
  }
}
export function setCurrentUser(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}
export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

// -------- usuarios ----------
export function getUsers() {
  return loadUsers();
}
export function addUser({ name, email, role = ROLES.STUDENT, password, active = true }) {
  const users = loadUsers();
  if (users.some(u => u.email.toLowerCase() === String(email).toLowerCase())) {
    throw new Error("El correo ya está registrado");
  }
  const u = {
    id: Date.now().toString(),
    name,
    email,
    role,
    password,   // (solo demo/localStorage)
    active,
    createdAt: new Date().toISOString(),
  };
  users.push(u);
  saveUsers(users);
  return u;
}
export function updateUser(id, partial) {
  const users = loadUsers();
  const i = users.findIndex(u => u.id === id);
  if (i === -1) return;
  users[i] = { ...users[i], ...partial };
  saveUsers(users);
  return users[i];
}
export function deleteUser(id) {
  const users = loadUsers().filter(u => u.id !== id);
  saveUsers(users);
}

// -------- login por contraseña (demo) ----------
export function loginWithPassword(email, password) {
  const users = loadUsers();
  const u = users.find(
    (x) => x.email.toLowerCase() === String(email).toLowerCase()
  );
  if (!u) throw new Error("Usuario no encontrado");
  if (!u.active) throw new Error("Usuario inactivo");
  if (u.password !== password) throw new Error("Contraseña incorrecta");
  setCurrentUser({ id: u.id, name: u.name, email: u.email, role: u.role });
  return u;
}

// -------- roles helpers ----------
export function isAdmin() {
  const user = getCurrentUser();
  return user?.role === ROLES.ADMIN;
}
export function isInstructor() {
  const user = getCurrentUser();
  return user?.role === ROLES.INSTRUCTOR;
}

// -------- permisos básicos (defense in depth) ----------
export function canSee(item) {
  const user = getCurrentUser();
  if (user?.role === ROLES.ADMIN) return true;
  if (user?.role === ROLES.INSTRUCTOR) return true;
  return item?.ownerId === user?.id;
}
export function canEdit(item) {
  const user = getCurrentUser();
  if (user?.role === ROLES.ADMIN) return true;
  if (user?.role === ROLES.INSTRUCTOR) return true;
  return item?.ownerId === user?.id;
}
export function canClose(exp) {
  const user = getCurrentUser();
  // solo admin/instructor y que no esté cerrado
  return (user?.role === ROLES.ADMIN || user?.role === ROLES.INSTRUCTOR) && !exp?.closed;
}
export function canDelete() {
  const user = getCurrentUser();
  return user?.role === ROLES.ADMIN;
}

// -------- SEED: crear admin por defecto si no existe ----------
export function ensureDefaultAdmin() {
  const KEY = "bioplastic_users_v1";
  let users = [];
  try { users = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { users = []; }

  const email = "amartin16099@universidadean.edu.co";
  const exists = users.some(u => (u.email || "").toLowerCase() === email.toLowerCase());
  if (!exists) {
    users.push({
      id: Date.now().toString(),
      name: "Admin EAN",
      email,
      role: "admin",
      password: "admin123",   // demo local
      active: true,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(KEY, JSON.stringify(users));
  }
}