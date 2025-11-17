const KEY = "audit_log";

export function logAudit(action, details = {}) {
  const entry = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    action,
    details,
  };
  const all = getAuditLog();
  all.push(entry);
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function getAuditLog() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function clearAudit() {
  localStorage.removeItem(KEY);
}