// src/BioplasticApp.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  getCurrentUser,
  canSee, canEdit, canClose, canDelete,
  isAdmin, isInstructor
} from "./auth";
import { logAudit } from "./audit";
import AuditLog from "./AuditLog.jsx";
import logoEAN from "./assets/ean-logo.png";
/* ---------------- Storage & helpers ---------------- */
const STORAGE = {
  practices: "bioplastic_practices_v1",
  experiments: "bioplastic_experiments_v1",
  counter: "bioplastic_experiment_counter_v1",
};
const pad2 = (n) => n.toString().padStart(2, "0");
const todayDDMMYY = (d = new Date()) =>
  `${pad2(d.getDate())}${pad2(d.getMonth() + 1)}${pad2(d.getFullYear() % 100)}`;
const makeCode = (exp, p, d = new Date()) => `${pad2(exp)}${pad2(p)}${todayDDMMYY(d)}`;

const readLS = (k, fb) => {
  try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : fb; } catch { return fb; }
};
const writeLS = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const nextExperimentNumber = () => {
  const n = Number(localStorage.getItem(STORAGE.counter) || "0") + 1;
  localStorage.setItem(STORAGE.counter, String(n));
  return n;
};

const saveExperiment = (exp) => {
  const all = readLS(STORAGE.experiments, []);
  const ix = all.findIndex((e) => e.experimentNumber === exp.experimentNumber);
  if (ix >= 0) all[ix] = exp; else all.push(exp);
  writeLS(STORAGE.experiments, all);
};
const getExperiment = (n) => readLS(STORAGE.experiments, []).find((e) => e.experimentNumber === n);

const savePractice = (p) => {
  const all = readLS(STORAGE.practices, []);
  const ix = all.findIndex((x) => x.code === p.code);
  if (ix >= 0) all[ix] = p; else all.push(p);
  writeLS(STORAGE.practices, all);
};
const deletePractice = (code) => {
  writeLS(STORAGE.practices, readLS(STORAGE.practices, []).filter((p) => p.code !== code));
};
const findPracticeByCode = (c) => readLS(STORAGE.practices, []).find((p) => p.code === c);
const findPracticesByExperiment = (n) =>
  readLS(STORAGE.practices, []).filter((p) => p.experimentNumber === n);

/* ---------------- Cálculos ---------------- */
const round2 = (x) => Math.round((Number(x) + Number.EPSILON) * 100) / 100;
const calcByStarch = (g) => {
  const f = Number(g || 0) / 10;
  return { starch_g: round2(g), water_ml: round2(50 * f), acetic_ml: round2(2.5 * f), glycerin_ml: round2(2.5 * f) };
};

/* ---------------- Confiabilidad ---------------- */
const CRITERIA = { time: { dup_diff_ok: 8, trip_cv_ok: 8 }, temp: { dup_diff_ok: 3, trip_cv_ok: 3 } };
const YELLOW_FACTOR = 1.5;
const mean = (a)=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const sd = (a)=>{ if(a.length<2) return 0; const m=mean(a); const v=a.reduce((s,x)=>s+(x-m)*(x-m),0)/(a.length-1); return Math.sqrt(v); };
const cvPct = (a)=>{ const m=mean(a); if(!isFinite(m)||m===0) return 0; return sd(a)/Math.abs(m)*100; };
const diffPctDup = (a,b)=>{ const avg=(a+b)/2; if(!isFinite(avg)||avg===0) return 0; return Math.abs(a-b)/avg*100; };
const to2 = (x)=>Math.round(x*100)/100;

// --- Helpers para obtener listas completas ---
function getAllExperiments() {
  return readLS(STORAGE.experiments, []);
}

function getAllPractices() {
  return readLS(STORAGE.practices, []);
}

function classifySemaforo({type, values}) {
  const n = values.filter(v=>Number.isFinite(v)).length;
  if (n < 2) return {status:"na", metric:null, value:null};
  if (n === 2) {
    const v = diffPctDup(values[0], values[1]);
    const ok = type==="time" ? CRITERIA.time.dup_diff_ok : CRITERIA.temp.dup_diff_ok;
    const warn = ok * YELLOW_FACTOR;
    return {status: v<=ok?"ok":v<=warn?"warn":"fail", metric:"Dif%", value:to2(v)};
  }
  const v = cvPct(values);
  const ok = type==="time" ? CRITERIA.time.trip_cv_ok : CRITERIA.temp.trip_cv_ok;
  const warn = ok * YELLOW_FACTOR;
  return {status: v<=ok?"ok":v<=warn?"warn":"fail", metric:"CV%", value:to2(v)};
}
function buildStats(values){
  const clean=values.filter(Number.isFinite); if(!clean.length) return {n:0,mean:null,sd:null,cv:null,min:null,max:null,range:null};
  const m=mean(clean), s=sd(clean);
  return { n:clean.length, mean:to2(m), sd:to2(s), cv:m?to2((s/Math.abs(m))*100):null, min:to2(Math.min(...clean)), max:to2(Math.max(...clean)), range:to2(Math.max(...clean)-Math.min(...clean)) };
}

function downloadBlob(name, content, type = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(v) {
  if (v == null) return "";
  const s = String(v).replace(/"/g, '""');
  return `"${s}"`;
}

function buildGroupCSV(exp, group) {
  const header = [
    "Codigo","NroExperimento","Practica","Fecha",
    "Almidon_g","Agua_mL","AcidoAcetico_mL","Glicerina_mL",
    "Tiempo_s","Tiempo_min","Temp_C","ObsCalentamiento","ObsFinales"
  ].join(",");

  const rows = group.map(p => [
    p.code,
    p.experimentNumber,
    p.practiceNumber,
    p.date ? new Date(p.date).toLocaleString() : "",
    p.starch_g ?? "",
    p.water_ml ?? "",
    p.acetic_ml ?? "",
    p.glycerin_ml ?? "",
    p.heatSeconds ?? "",
    p.heatMinutes ?? (p.heatSeconds ? Math.round((p.heatSeconds/60)*100)/100 : ""),
    p.maxTemp ?? "",
    p.heatingNotes ?? "",
    p.finalNotes ?? ""
  ].map(csvEscape).join(","));

  const base = exp?.baseReagents || {};
  const meta = `# Base: Almidon=${base.starch_g??""}g, Agua=${base.water_ml??""}mL, Acido=${base.acetic_ml??""}mL, Glicerina=${base.glycerin_ml??""}mL`;

  return [meta, header, ...rows].join("\n");
}

/* ---------------- UI helpers ---------------- */
const Button = ({ children, variant = "primary", className = "", ...rest }) => {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition";
  const styles = { primary:"bg-emerald-600 text-white hover:bg-emerald-700", ghost:"bg-white border border-emerald-200 hover:bg-emerald-50", danger:"bg-rose-600 text-white hover:bg-rose-700" }[variant];
  return <button className={`${base} ${styles} ${className}`} {...rest}>{children}</button>;
};
const NumberInput = (props) => <input type="number" step="any" {...props} className={`w-full border rounded-xl px-3 py-2 outline-none focus:ring focus:ring-emerald-200 ${props.className||""}`} />;
const Field = ({ label, children }) => (<label className="block mb-3"><div className="text-sm font-medium text-gray-700 mb-1">{label}</div>{children}</label>);
const Section = ({ title, right, children }) => (
  <div className="bg-white/80 rounded-2xl shadow p-4 sm:p-6 border border-emerald-100">
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg sm:text-xl font-semibold text-emerald-800">{title}</h2>
      {right}
    </div>
    {children}
  </div>
);
function Badge({status, children}) {
  const cls = status==="ok"?"bg-green-100 text-green-800 border-green-200":status==="warn"?"bg-yellow-100 text-yellow-800 border-yellow-200":status==="fail"?"bg-rose-100 text-rose-800 border-rose-200":"bg-gray-100 text-gray-700 border-gray-200";
  return <span className={`inline-block text-xs px-2 py-1 rounded border ${cls}`}>{children}</span>;
}
function ReliabilityCard({ practices }) {
  const times = practices.map(p => Number(p.heatSeconds / 60));
  const temps = practices.map(p => Number(p.maxTemp));
  const timeStats = buildStats(times), tempStats = buildStats(temps);
  const timeClass = classifySemaforo({type:"time", values: times});
  const tempClass = classifySemaforo({type:"temp", values: temps});
  return (
    <div className="mt-3 bg-white border rounded-xl p-3">
      <div className="font-semibold mb-2">Confiabilidad de réplicas</div>
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div>
          <div className="flex justify-between"><b>Tiempo (min)</b><Badge status={timeClass.status}>{timeClass.metric ? `${timeClass.metric}: ${timeClass.value}%` : "N/A"}</Badge></div>
          <div className="text-xs text-gray-500">n={timeStats.n} | media={timeStats.mean} | SD={timeStats.sd} | CV={timeStats.cv}% | rango={timeStats.range}</div>
        </div>
        <div>
          <div className="flex justify-between"><b>Temperatura (°C)</b><Badge status={tempClass.status}>{tempClass.metric ? `${tempClass.metric}: ${tempClass.value}%` : "N/A"}</Badge></div>
          <div className="text-xs text-gray-500">n={tempStats.n} | media={tempStats.mean} | SD={tempStats.sd} | CV={tempStats.cv}% | rango={tempStats.range}</div>
        </div>
      </div>
      <div className="text-[10px] text-gray-400 mt-2">Basado en ISO 5725, GLP OECD, y SPC (Montgomery). Duplicado: Diferencia% · Triplicado: CV%.</div>
    </div>
  );
}

/* ---------------- Componente principal ---------------- */
export default function BioplasticApp() {
  const [view, setView] = useState("home");
  const [baseStarch, setBaseStarch] = useState(10);
  const calc = useMemo(() => calcByStarch(baseStarch), [baseStarch]);
  const [repCalc, setRepCalc] = useState(1);

  const [manual, setManual] = useState({
    water_ml: 0,
    acetic_ml: 0,
    glycerin_ml: 0,
    starch_g: 0,
  });
  const [repManual, setRepManual] = useState(1);

  const [query, setQuery] = useState("");
  const [showMineOnly, setShowMineOnly] = useState(false);
  const [searchMode, setSearchMode] = useState("auto"); // "auto" | "code" | "exp"
  const [results, setResults] = useState(null);
  const [active, setActive] = useState(null);

  const [timer, setTimer] = useState({ running: false, seconds: 0 });
  const tRef = useRef(null);
  const [heatNotes, setHeatNotes] = useState("");
  const [maxTemp, setMaxTemp] = useState("");
  const [finalNotes, setFinalNotes] = useState("");
  const [showAudit, setShowAudit] = useState(false);

  // limpiar temporizador al desmontar
  useEffect(() => {
    return () => {
      if (tRef.current) {
        clearInterval(tRef.current);
      }
    };
  }, []);

  const startExperiment = (base, replicas) => {
    const u = getCurrentUser();
    const ownerId = u?.id;
    const expNum = nextExperimentNumber();

    saveExperiment({
      experimentNumber: expNum,
      baseReagents: base,
      createdAt: new Date().toISOString(),
      closed: false,
      ownerId,
    });

    for (let i = 1; i <= replicas; i++) {
      const code = makeCode(expNum, i);
      savePractice({
        code,
        experimentNumber: expNum,
        practiceNumber: i,
        date: new Date().toISOString(),
        ownerId,
        ...base,
        heatSeconds: 0,
        heatingNotes: "",
        finalNotes: "",
      });
    }

    const current = getCurrentUser();
    logAudit("experiment:create", {
      user: current,
      experimentNumber: expNum,
      payload: { base, replicas },
    });

    setQuery(String(expNum));
    handleSearch(String(expNum));
    setView("dashboard");
  };

  const handleSearch = (q) => {
    const t = (q || "").trim();
    const u = getCurrentUser();

    if (!t) {
      setResults(null);
      return;
    }

    // helper para aplicar canSee siempre y setear resultados
    const doSet = (list) => {
      const filtered = (list || []).filter((p) => canSee(p, u));
      setResults(filtered);
    };

    // modo "solo código"
    if (searchMode === "code") {
      const p = findPracticeByCode(t);
      return doSet(p ? [p] : []);
    }

    // modo "solo número de experimento"
    if (searchMode === "exp") {
      if (!/^\d+$/.test(t)) {
        setResults([]);
        return;
      }
      const list = findPracticesByExperiment(Number(t)).sort(
        (a, b) => a.practiceNumber - b.practiceNumber
      );
      return doSet(list);
    }

    // auto (comportamiento actual)
    // si son solo dígitos cortos → buscar por Nº experimento
    if (/^\d+$/.test(t) && t.length <= 3) {
      const list = findPracticesByExperiment(Number(t)).sort(
        (a, b) => a.practiceNumber - b.practiceNumber
      );
      return doSet(list);
    }

    // si no, tratar como código único (EEPPDDMMYY)
    const p = findPracticeByCode(t);
    return doSet(p ? [p] : []);
  };

  const openPractice = (p) => {
    setActive(p);
    setHeatNotes(p.heatingNotes || "");
    setFinalNotes(p.finalNotes || "");
    setMaxTemp(p.maxTemp?.toString() || "");
    setTimer({ running: false, seconds: p.heatSeconds || 0 });
    setView("resume");
  };

  const updateActive = (partial) => {
    if (!active) return;
    if (!canEdit(active)) return alert("Sin permisos");
    const up = { ...active, ...partial };
    setActive(up); savePractice(up);
  };

  const startTimer = () => {
    if (!canEdit(active) || timer.running) return;
    const id = setInterval(()=>setTimer(t=>({ ...t, seconds: t.seconds+1 })), 1000);
    tRef.current = id; setTimer(t=>({ ...t, running:true }));
  };
  const stopTimer = () => { if (tRef.current) clearInterval(tRef.current); tRef.current=null; setTimer(t=>({ ...t, running:false })); };

  const saveHeatData = () => {
    if (!canEdit(active)) return;
    const minutes = round2(timer.seconds / 60);
    const t = Number(maxTemp);
    updateActive({ heatSeconds: timer.seconds, heatMinutes: minutes, maxTemp: isNaN(t) ? undefined : t, heatingNotes: heatNotes });
    const current = getCurrentUser();
    logAudit("practice:save_heat", {
      user: current,
      experimentNumber: active?.experimentNumber,
      practiceCode: active?.code,
      payload: { seconds: timer.seconds, minutes, maxTemp: t, notes: heatNotes }
    });
    alert("Datos guardados");
  };

  const savePhoto = (file) => {
    if (!canEdit(active) || !file) return;
    const reader = new FileReader();
    reader.onload = () => updateActive({ finalDate: new Date().toISOString(), finalPhotoDataUrl: reader.result, finalNotes });
    reader.readAsDataURL(file);
  };


  const closeExperiment = (n) => {
    const exp = getExperiment(n);
    if (!canClose(exp)) return alert("Solo admin");
    exp.closed = true; saveExperiment(exp);
    const current = getCurrentUser();
    logAudit("experiment:close", {
      user: current,
      experimentNumber: n,
    });
    alert("Cerrado"); handleSearch(String(n));
  };
  

  const deleteExp = (n) => {
    if (!canDelete()) return alert("Solo admin");
    if (!confirm("Eliminar experimento?")) return;
    writeLS(STORAGE.practices, readLS(STORAGE.practices, []).filter((p)=>p.experimentNumber!==n));
    writeLS(STORAGE.experiments, readLS(STORAGE.experiments, []).filter((e)=>e.experimentNumber!==n));
    const current = getCurrentUser();
    logAudit("experiment:delete", {
      user: current,
      experimentNumber: n
    });
    alert("Eliminado"); setResults(null);
  };

  const deletePracticeAdmin = (c) => { if (!canDelete()) return alert("Solo admin"); if (!confirm("Eliminar práctica?")) return; deletePractice(c); if (active?.code===c) setActive(null); if (query) handleSearch(query); };
  const showAll = () => {
    const u = getCurrentUser();
    let list = getAllPractices();

    // Si existe el filtro "solo mis experimentos", aplicarlo
    if (typeof showMineOnly !== "undefined" && showMineOnly) {
      list = list.filter((p) => p.ownerId === u?.id);
    }

    // Ordenar por experimento y práctica
    list.sort((a, b) =>
      a.experimentNumber === b.experimentNumber
        ? a.practiceNumber - b.practiceNumber
        : a.experimentNumber - b.experimentNumber
    );

    // Limpiar búsqueda y mostrar resultados
    setQuery("");
    setResults(list);
  };
/* ---------------- Render ---------------- */
  return (
    <div className="min-h-screen w-full bg-gray-50 py-8 px-4 flex justify-center">
      <div className="w-full max-w-5xl space-y-4">
        {/* Encabezado: logo + título + cerrar sesión */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={logoEAN}
              alt="Universidad EAN"
              className="h-10 w-auto"
            />
            <div>
              <h1 className="text-lg font-bold text-emerald-700">
                Bioplástico EAN
              </h1>
              <p className="text-xs text-gray-500">
                Registro de experimentos de bioplástico de almidón
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="text-sm border border-emerald-600 text-emerald-700 rounded-xl px-3 py-1 hover:bg-emerald-50"
          >
            Cerrar sesión
          </button>
        </header>

        {/* Botones principales */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
          <Button
            onClick={() => setView("calculate")}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Calcular reactivos
          </Button>
          <Button
            onClick={() => setView("manual")}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Ingreso manual
          </Button>
          <Button
            onClick={() => setView("dashboard")}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Buscar experimentos
          </Button>
          {(isAdmin() || isInstructor()) && (
            <Button
              variant="ghost"
              onClick={() => setShowAudit(true)}
              className="border border-emerald-600 text-emerald-700 hover:bg-emerald-50"
            >
              Auditoría
            </Button>
          )}
        </div>

        {/* VISTA: Calcular reactivos */}
        {view === "calculate" && (
          <Section title="Calcular reactivos">
            <p className="text-xs text-gray-500 mb-2">
              Estos son los datos base del experimento.
            </p>

            <Field label="Almidón (g)">
              <NumberInput
                step="any"
                value={baseStarch}
                onChange={(e) =>
                  setBaseStarch(parseFloat(e.target.value) || 0)
                }
              />
            </Field>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              <Field label="Agua (mL)">
                <NumberInput value={calc.water_ml} readOnly />
              </Field>
              <Field label="Ácido acético (mL)">
                <NumberInput value={calc.acetic_ml} readOnly />
              </Field>
              <Field label="Glicerina (mL)">
                <NumberInput value={calc.glycerin_ml} readOnly />
              </Field>
            </div>

            <Field label="Número de réplicas">
              <select
                className="border rounded px-2 py-1"
                value={repCalc}
                onChange={(e) => setRepCalc(Number(e.target.value))}
              >
                <option value={1}>1</option>
                <option value={2}>2 (duplicado)</option>
                <option value={3}>3 (triplicado)</option>
              </select>
            </Field>

            <Button onClick={() => startExperiment(calc, repCalc)}>
              Iniciar experimento
            </Button>
            <Button
              variant="ghost"
              onClick={() => setView("home")}
              className="ml-2"
            >
              Volver
            </Button>
          </Section>
        )}

        {/* VISTA: Ingreso manual */}
        {view === "manual" && (
          <Section title="Ingreso manual">
            <p className="text-xs text-gray-500 mb-2">
              Ingresa manualmente los reactivos de una práctica.
            </p>

            <Field label="Agua (mL)">
              <NumberInput
                value={manual.water_ml}
                onChange={(e) =>
                  setManual({
                    ...manual,
                    water_ml: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </Field>
            <Field label="Ácido acético (mL)">
              <NumberInput
                value={manual.acetic_ml}
                onChange={(e) =>
                  setManual({
                    ...manual,
                    acetic_ml: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </Field>
            <Field label="Glicerina (mL)">
              <NumberInput
                value={manual.glycerin_ml}
                onChange={(e) =>
                  setManual({
                    ...manual,
                    glycerin_ml: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </Field>
            <Field label="Almidón (g)">
              <NumberInput
                value={manual.starch_g}
                onChange={(e) =>
                  setManual({
                    ...manual,
                    starch_g: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </Field>

            <Field label="Número de réplicas">
              <select
                className="border rounded px-2 py-1"
                value={repManual}
                onChange={(e) => setRepManual(Number(e.target.value))}
              >
                <option value={1}>1</option>
                <option value={2}>2 (duplicado)</option>
                <option value={3}>3 (triplicado)</option>
              </select>
            </Field>

            <Button variant="ghost" onClick={() => setView("home")}>
              Volver
            </Button>
          </Section>
        )}

        {/* VISTA: Dashboard / Búsqueda */}
        {view === "dashboard" && (
          <Section title="Buscar experimentos">
            {/* Input de búsqueda */}
            <div className="flex gap-2 mt-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nº experimento o código EEPPDDMMYY"
                className="border px-2 py-1 rounded text-sm flex-1"
              />
              <Button
                onClick={() => handleSearch(query)}
                className="bg-emerald-600 hover:bg-emerald-700 text-sm"
              >
                Buscar
              </Button>
              <Button
                variant="outline"
                onClick={showAll}
                className="text-sm"
              >
                Ver todos
              </Button>
            </div>

            {/* Filtros */}
            <div className="flex items-center gap-3 text-sm mt-4">
              <span className="text-gray-500">Modo:</span>

              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="mode"
                  value="auto"
                  checked={searchMode === "auto"}
                  onChange={(e) => setSearchMode(e.target.value)}
                />{" "}
                Auto
              </label>

              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="mode"
                  value="code"
                  checked={searchMode === "code"}
                  onChange={(e) => setSearchMode(e.target.value)}
                />{" "}
                Por código
              </label>

              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="mode"
                  value="exp"
                  checked={searchMode === "exp"}
                  onChange={(e) => setSearchMode(e.target.value)}
                />{" "}
                Por Nº exp.
              </label>

              <label className="ml-auto flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showMineOnly}
                  onChange={(e) => setShowMineOnly(e.target.checked)}
                />
                Solo mis experimentos
              </label>
            </div>

            {/* Resultados */}
            {results === null ? (
              <p className="text-sm text-gray-500 mt-3">
                Realiza una búsqueda para ver resultados.
              </p>
            ) : results.length === 0 ? (
              <p className="text-sm text-rose-600 mt-3">
                No se encontraron prácticas.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {Array.from(
                  new Map(
                    results.map((p) => [p.experimentNumber, true])
                  ).keys()
                ).map((num) => {
                  // Agrupar por experimento
                  let group = results
                    .filter((p) => p.experimentNumber === num)
                    .sort(
                      (a, b) => a.practiceNumber - b.practiceNumber
                    );

                  const exp = getExperiment(num);

                  // Filtro "solo mis experimentos"
                  if (showMineOnly) {
                    const u = getCurrentUser();
                    group = group.filter((p) => p.ownerId === u?.id);
                    if (group.length === 0) return null;
                  }

                  // Acciones del grupo
                  const exportCSV = () => {
                    const csv = buildGroupCSV(exp, group);
                    downloadBlob(
                      `exp_${pad2(num)}_${todayDDMMYY()}.csv`,
                      csv
                    );
                  };

                  const copyCodes = () => {
                    const txt = group.map((p) => p.code).join("\n");
                    navigator.clipboard.writeText(txt);
                    alert("Códigos copiados.");
                  };

                  return (
                    <div
                      key={num}
                      className="border rounded-lg p-4 bg-white shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-sm">
                          Experimento {num}
                        </h3>
                        <div className="flex gap-2 text-xs">
                          <button
                            onClick={exportCSV}
                            className="underline"
                          >
                            Exportar CSV
                          </button>
                          <button
                            onClick={copyCodes}
                            className="underline"
                          >
                            Copiar códigos
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                        {group.map((p) => (
                          <button
                            key={p.code}
                            onClick={() => openPractice(p)}
                            className="border rounded px-2 py-1 text-left hover:bg-emerald-50"
                          >
                            <div className="font-mono text-[11px]">
                              {p.code}
                            </div>
                            <div>Práctica #{p.practiceNumber}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        )}

        {/* VISTA: Resumen práctica activa */}
        {active && view === "resume" && (
          <Section title={`Práctica ${active.code}`}>
            {(() => {
              const editable = canEdit(active);

              return (
                <>
                  <p className="text-xs text-gray-500 mb-3">
                    Detalle de la práctica seleccionada.{" "}
                    {editable
                      ? "Puedes registrar tiempo, temperatura y notas."
                      : "Solo puedes consultar la información. Esta práctica pertenece a otro usuario."}
                  </p>

                  {/* Info básica */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs mb-4">
                    <div className="border rounded px-2 py-1">
                      <div className="text-gray-500">Experimento</div>
                      <div className="font-semibold">
                        {active.experimentNumber}
                      </div>
                    </div>
                    <div className="border rounded px-2 py-1">
                      <div className="text-gray-500">Práctica</div>
                      <div className="font-semibold">
                        {active.practiceNumber}
                      </div>
                    </div>
                    <div className="border rounded px-2 py-1">
                      <div className="text-gray-500">Código</div>
                      <div className="font-mono text-[11px]">
                        {active.code}
                      </div>
                    </div>
                  </div>

                  {/* Timer de calentamiento */}
                  <div className="mb-4 border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">
                        Tiempo de calentamiento
                      </span>
                      <span className="font-mono text-lg">
                        {String(
                          Math.floor(timer.seconds / 60)
                        ).padStart(2, "0")}
                        :
                        {String(timer.seconds % 60).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={startTimer}
                        disabled={!editable || timer.running}
                      >
                        Iniciar / continuar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          setTimer((t) => ({ ...t, running: false }))
                        }
                        disabled={!editable}
                      >
                        Pausar
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setTimer({ running: false, seconds: 0 })
                        }
                        disabled={!editable}
                      >
                        Reiniciar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          updateActive({ heatSeconds: timer.seconds })
                        }
                        disabled={!editable}
                      >
                        Guardar tiempo
                      </Button>
                    </div>
                  </div>

                  {/* Temperatura máxima */}
                  <Field label="Temperatura máxima alcanzada (°C)">
                    <NumberInput
                      value={maxTemp}
                      onChange={(e) => setMaxTemp(e.target.value)}
                      readOnly={!editable}
                    />
                  </Field>

                  {/* Notas */}
                  <Field label="Notas de calentamiento">
                    <textarea
                      className="w-full border rounded px-2 py-1 text-sm"
                      rows={3}
                      value={heatNotes}
                      onChange={(e) => setHeatNotes(e.target.value)}
                      readOnly={!editable}
                    />
                  </Field>

                  <Field label="Notas finales / observaciones de la película">
                    <textarea
                      className="w-full border rounded px-2 py-1 text-sm"
                      rows={3}
                      value={finalNotes}
                      onChange={(e) => setFinalNotes(e.target.value)}
                      readOnly={!editable}
                    />
                  </Field>

                  {/* Foto final */}
                  <div className="mt-3">
                    <label className="text-sm font-medium block mb-1">
                      Foto de la película (opcional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) savePhoto(file);
                      }}
                      className="text-xs"
                      disabled={!editable}
                    />
                    {active.finalPhotoDataUrl && (
                      <div className="mt-2">
                        <img
                          src={active.finalPhotoDataUrl}
                          alt="Película final"
                          className="max-h-48 rounded border"
                        />
                      </div>
                    )}
                  </div>

                  {/* Botones de guardar y navegación */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      onClick={() =>
                        updateActive({
                          heatingNotes: heatNotes,
                          finalNotes,
                          maxTemp: maxTemp ? Number(maxTemp) : null,
                          heatSeconds: timer.seconds,
                        })
                      }
                      disabled={!editable}
                    >
                      Guardar cambios
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => {
                        setActive(null);
                        setView("dashboard");
                      }}
                    >
                      Volver a la búsqueda
                    </Button>
                  </div>
                </>
              );
            })()}
          </Section>
        )}

        {/* Modal / panel de Auditoría */}
        {showAudit && <AuditLog onClose={() => setShowAudit(false)} />}
      </div>
    </div>
  );
}





