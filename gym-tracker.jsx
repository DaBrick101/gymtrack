import React, { useState, useEffect, useRef, useCallback } from "react";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Plus, Trash2, Check, ChevronLeft, Dumbbell, History, LineChart as LineChartIcon, ListPlus, Play, X, Flame, Download, Upload } from "lucide-react";

// ---------- Farb-Tokens ----------
// WICHTIG: Alle Farben werden über Inline-Styles gesetzt (nicht über Tailwind
// bg-[#..]/text-[#..] Klassen), da eckige Tailwind-Werte hier nicht zuverlässig
// gerendert werden. Nur Layout/Typografie-Utilities kommen aus Tailwind.
const C = {
  bg: "#F7F5EF",
  surface: "#FFFFFF",
  surface2: "#F0EDE4",
  border: "#DCD7C8",
  text: "#1A1A1D",
  textDim: "#6B6B70",
  accent: "#F2C230",
  accentText: "#1A1207",
  danger: "#D6392C",
};

const STORAGE_KEY = "gymtracker-data-v1";
const uid = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_EXERCISES = [
  { id: uid(), name: "Bankdrücken", muscle: "Brust" },
  { id: uid(), name: "Kniebeuge", muscle: "Beine" },
  { id: uid(), name: "Kreuzheben", muscle: "Rücken" },
  { id: uid(), name: "Schulterdrücken", muscle: "Schultern" },
  { id: uid(), name: "Klimmzug", muscle: "Rücken" },
  { id: uid(), name: "Bizepscurls", muscle: "Arme" },
  { id: uid(), name: "Seitheben", muscle: "Schultern" },
  { id: uid(), name: "Trizeps-Pushdown", muscle: "Arme" },
  { id: uid(), name: "Rudern", muscle: "Rücken" },
  { id: uid(), name: "Face Pull", muscle: "Schultern" },
];

function makeDefaultData() {
  const bank = DEFAULT_EXERCISES[0].id;
  const knie = DEFAULT_EXERCISES[1].id;
  const kreuz = DEFAULT_EXERCISES[2].id;
  const schulter = DEFAULT_EXERCISES[3].id;
  const klimm = DEFAULT_EXERCISES[4].id;
  const bizeps = DEFAULT_EXERCISES[5].id;
  const seitheben = DEFAULT_EXERCISES[6].id;
  const trizeps = DEFAULT_EXERCISES[7].id;
  const rudern = DEFAULT_EXERCISES[8].id;
  const facePull = DEFAULT_EXERCISES[9].id;
  return {
    exercises: DEFAULT_EXERCISES,
    plans: [
      { id: uid(), name: "Push Day", items: [
        { exerciseId: knie, targetSets: 3, targetReps: 8 },
        { exerciseId: bank, targetSets: 3, targetReps: 8 },
        { exerciseId: schulter, targetSets: 3, targetReps: 8 },
        { exerciseId: seitheben, targetSets: 3, targetReps: 15 },
        { exerciseId: trizeps, targetSets: 3, targetReps: 12 },
      ]},
      { id: uid(), name: "Pull Day", items: [
        { exerciseId: kreuz, targetSets: 3, targetReps: 5 },
        { exerciseId: klimm, targetSets: 3, targetReps: 8 },
        { exerciseId: rudern, targetSets: 3, targetReps: 10 },
        { exerciseId: bizeps, targetSets: 3, targetReps: 12 },
        { exerciseId: facePull, targetSets: 3, targetReps: 15 },
      ]},
    ],
    sessions: [],
  };
}

// ---------- Signature element: Plattenstapel als Ladeanzeige ----------
function PlateBar({ weight = 0, height = 34 }) {
  const plateDefs = [
    { kg: 25, w: 20, color: C.danger },
    { kg: 20, w: 18, color: "#3A3A40" },
    { kg: 15, w: 15, color: C.accent },
    { kg: 10, w: 12, color: "#3A3A40" },
    { kg: 5, w: 9, color: C.textDim },
    { kg: 2.5, w: 7, color: "#3A3A40" },
  ];
  let remaining = Math.max(0, weight) / 2;
  const plates = [];
  for (const p of plateDefs) {
    let count = Math.min(Math.floor(remaining / p.kg), 4);
    for (let i = 0; i < count; i++) plates.push(p);
    remaining -= count * p.kg;
  }
  return (
    <div style={{ display: "flex", alignItems: "center", height }}>
      <div style={{ display: "flex", flexDirection: "row-reverse", alignItems: "center" }}>
        {plates.map((p, i) => (
          <div key={i} style={{ width: p.w * 0.55, height, background: p.color, marginLeft: -3, borderRadius: 2 }} />
        ))}
      </div>
      <div style={{ width: 26, height: 5, background: C.textDim, borderRadius: 2 }} />
      <div style={{ display: "flex", alignItems: "center" }}>
        {plates.map((p, i) => (
          <div key={i} style={{ width: p.w * 0.55, height, background: p.color, marginRight: -3, borderRadius: 2 }} />
        ))}
      </div>
    </div>
  );
}

function Screen({ title, onBack, right, children }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-5 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          {onBack && (
            <button onClick={onBack} className="p-1 -ml-1" style={{ color: C.textDim }}>
              <ChevronLeft size={22} />
            </button>
          )}
          <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: C.text }}>{title}</h1>
        </div>
        {right}
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
    </div>
  );
}

function Empty({ label }) {
  return <div className="text-center py-14 text-sm uppercase tracking-wide font-mono" style={{ color: C.textDim }}>{label}</div>;
}

function Card({ children, onClick, style, className = "" }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl ${className}`}
      style={{ background: C.surface, border: `1px solid ${C.border}`, ...style }}
    >
      {children}
    </div>
  );
}

function Onboarding({ onDismiss }) {
  const steps = [
    { n: "1", title: "Übungen anlegen", text: "Unter „Übungen“ trägst du deine Bewegungen mit Muskelgruppe ein. Ein paar Standard-Übungen sind schon dabei." },
    { n: "2", title: "Plan erstellen", text: "Unter „Pläne“ baust du dir Trainingstage (z. B. Push Day) aus deinen Übungen mit Zielsätzen und -wiederholungen." },
    { n: "3", title: "Training starten", text: "Auf der Startseite tippst du auf einen Plan und trägst pro Satz Gewicht × Wiederholungen ein. Mit dem Haken bestätigst du den Satz." },
    { n: "4", title: "Fortschritt sehen", text: "Unter „Verlauf“ siehst du alle Trainings, unter „Fortschritt“ Charts zu Maxgewicht und Volumen pro Übung." },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="w-full max-w-sm rounded-2xl p-5 max-h-[85vh] overflow-y-auto" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
        <div className="text-[11px] font-mono uppercase tracking-widest mb-1" style={{ color: C.accent }}>Willkommen</div>
        <h2 className="text-2xl font-black uppercase tracking-tight mb-4" style={{ color: C.text }}>So funktioniert Iron Log</h2>
        <div className="flex flex-col gap-4 mb-5">
          {steps.map((s) => (
            <div key={s.n} className="flex gap-3">
              <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-mono text-sm font-bold" style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.text }}>{s.n}</div>
              <div>
                <div className="font-bold text-sm uppercase tracking-tight" style={{ color: C.text }}>{s.title}</div>
                <div className="text-[13px] leading-snug mt-0.5" style={{ color: C.textDim }}>{s.text}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onDismiss} className="w-full font-bold uppercase tracking-wide py-3 rounded-xl active:scale-[0.98]" style={{ background: C.accent, color: C.accentText }}>
          Los geht's
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("home");
  const [editingPlan, setEditingPlan] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [progressExerciseId, setProgressExerciseId] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [importError, setImportError] = useState("");
  const saveTimeout = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, false);
        if (res && res.value) setData(JSON.parse(res.value));
        else {
          const def = makeDefaultData();
          setData(def);
          await window.storage.set(STORAGE_KEY, JSON.stringify(def), false);
        }
      } catch (e) {
        const def = makeDefaultData();
        setData(def);
        try { await window.storage.set(STORAGE_KEY, JSON.stringify(def), false); } catch (e2) {}
      }
      try {
        const seen = await window.storage.get("gymtracker-onboarding-seen", false);
        if (!seen || !seen.value) setShowOnboarding(true);
      } catch (e) { setShowOnboarding(true); }
      setLoaded(true);
    })();
  }, []);

  const dismissOnboarding = async () => {
    setShowOnboarding(false);
    try { await window.storage.set("gymtracker-onboarding-seen", "true", false); } catch (e) {}
  };

  const persist = useCallback((next) => {
    setData(next);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      try { await window.storage.set(STORAGE_KEY, JSON.stringify(next), false); } catch (e) {}
    }, 300);
  }, []);

  if (!loaded || !data) {
    return (
      <div style={{ width: "100%", minHeight: 600, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="font-mono text-sm uppercase tracking-widest animate-pulse" style={{ color: C.textDim }}>Lädt…</div>
      </div>
    );
  }

  const exerciseName = (id) => data.exercises.find((e) => e.id === id)?.name || "?";

  const addExercise = (name, muscle) => {
    if (!name.trim()) return;
    persist({ ...data, exercises: [...data.exercises, { id: uid(), name: name.trim(), muscle: muscle.trim() || "Sonstige" }] });
  };
  const deleteExercise = (id) => persist({ ...data, exercises: data.exercises.filter((e) => e.id !== id) });

  const savePlan = (plan) => {
    const exists = data.plans.some((p) => p.id === plan.id);
    const plans = exists ? data.plans.map((p) => (p.id === plan.id ? plan : p)) : [...data.plans, plan];
    persist({ ...data, plans });
    setEditingPlan(null);
    setView("plans");
  };
  const deletePlan = (id) => persist({ ...data, plans: data.plans.filter((p) => p.id !== id) });

  const startWorkout = (plan) => {
    setActiveSession({
      id: uid(), planId: plan.id, planName: plan.name, date: new Date().toISOString(),
      exercises: plan.items.map((it) => ({
        exerciseId: it.exerciseId, targetSets: it.targetSets, targetReps: it.targetReps,
        sets: Array.from({ length: it.targetSets }, () => ({ reps: "", weight: "", done: false })),
      })),
    });
    setView("active");
  };
  const updateActiveSet = (exIdx, setIdx, field, value) => {
    setActiveSession((prev) => {
      const next = structuredClone(prev);
      next.exercises[exIdx].sets[setIdx][field] = value;
      return next;
    });
  };
  const toggleSetDone = (exIdx, setIdx) => {
    setActiveSession((prev) => {
      const next = structuredClone(prev);
      next.exercises[exIdx].sets[setIdx].done = !next.exercises[exIdx].sets[setIdx].done;
      return next;
    });
  };
  const addSetToActive = (exIdx) => {
    setActiveSession((prev) => {
      const next = structuredClone(prev);
      next.exercises[exIdx].sets.push({ reps: "", weight: "", done: false });
      return next;
    });
  };
  const finishWorkout = () => {
    const cleaned = {
      ...activeSession,
      exercises: activeSession.exercises.map((e) => ({ ...e, sets: e.sets.filter((s) => s.reps !== "" && s.weight !== "") })),
    };
    persist({ ...data, sessions: [cleaned, ...data.sessions] });
    setActiveSession(null);
    setView("home");
  };

  const inputStyle = { background: C.surface2, border: `1px solid ${C.border}`, color: C.text };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `iron-log-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const triggerImport = () => {
    setImportError("");
    fileInputRef.current?.click();
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed.exercises) || !Array.isArray(parsed.plans) || !Array.isArray(parsed.sessions)) {
          throw new Error("Ungültiges Format");
        }
        persist(parsed);
        setImportError("");
      } catch (err) {
        setImportError("Datei konnte nicht gelesen werden. Bitte eine gültige Iron-Log-Backup-Datei wählen.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ================= ACTIVE WORKOUT =================
  if (view === "active" && activeSession) {
    const totalVolume = activeSession.exercises.reduce(
      (sum, e) => sum + e.sets.reduce((s, set) => s + (Number(set.weight) || 0) * (Number(set.reps) || 0), 0), 0
    );
    return (
      <div style={{ width: "100%", minHeight: 640, background: C.bg, display: "flex", flexDirection: "column" }} className="font-sans">
        <Screen
          title={activeSession.planName}
          onBack={() => { if (confirm("Training abbrechen? Nicht gespeicherte Sätze gehen verloren.")) { setActiveSession(null); setView("home"); } }}
          right={
            <button onClick={finishWorkout} className="flex items-center gap-1 font-bold text-sm uppercase tracking-wide px-3 py-2 rounded-lg active:scale-95" style={{ background: C.accent, color: C.accentText }}>
              <Check size={16} /> Fertig
            </button>
          }
        >
          <Card style={{ marginBottom: 16 }} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest font-mono" style={{ color: C.textDim }}>Volumen</div>
              <div className="text-xl font-black font-mono" style={{ color: C.text }}>{totalVolume.toLocaleString("de-DE")} kg</div>
            </div>
            <PlateBar weight={Math.min(totalVolume, 400)} height={28} />
          </Card>

          <div className="flex flex-col gap-4">
            {activeSession.exercises.map((ex, exIdx) => (
              <Card key={exIdx} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold uppercase tracking-tight text-sm" style={{ color: C.text }}>{exerciseName(ex.exerciseId)}</div>
                  <div className="text-[10px] font-mono" style={{ color: C.textDim }}>Ziel: {ex.targetSets}×{ex.targetReps}</div>
                </div>
                <div className="flex flex-col gap-1.5">
                  {ex.sets.map((s, setIdx) => (
                    <div key={setIdx} className="flex items-center gap-2">
                      <div className="w-5 text-center text-[11px] font-mono" style={{ color: C.textDim }}>{setIdx + 1}</div>
                      <input type="number" inputMode="decimal" placeholder="kg" value={s.weight}
                        onChange={(e) => updateActiveSet(exIdx, setIdx, "weight", e.target.value)}
                        className="w-16 rounded-lg px-2 py-1.5 text-sm font-mono text-center focus:outline-none"
                        style={inputStyle} />
                      <span className="text-xs" style={{ color: C.textDim }}>×</span>
                      <input type="number" inputMode="numeric" placeholder="wdh" value={s.reps}
                        onChange={(e) => updateActiveSet(exIdx, setIdx, "reps", e.target.value)}
                        className="w-16 rounded-lg px-2 py-1.5 text-sm font-mono text-center focus:outline-none"
                        style={inputStyle} />
                      <button onClick={() => toggleSetDone(exIdx, setIdx)} className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center"
                        style={s.done ? { background: C.accent, color: C.accentText } : { background: C.surface2, color: C.textDim, border: `1px solid ${C.border}` }}>
                        <Check size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <button onClick={() => addSetToActive(exIdx)} className="mt-2 text-[11px] font-mono uppercase tracking-wide flex items-center gap-1" style={{ color: C.textDim }}>
                  <Plus size={12} /> Satz hinzufügen
                </button>
              </Card>
            ))}
          </div>
        </Screen>
      </div>
    );
  }

  if (view === "exercises") {
    return (
      <Shell>
        <Screen title="Übungen" onBack={() => setView("home")}>
          <p className="text-[13px] leading-snug mb-3" style={{ color: C.textDim }}>Lege hier deine Übungen mit Muskelgruppe an. Sie stehen dir danach beim Erstellen von Plänen zur Auswahl.</p>
          <AddExerciseForm onAdd={addExercise} inputStyle={inputStyle} />
          <div className="mt-4 flex flex-col gap-2">
            {data.exercises.length === 0 && <Empty label="Noch keine Übungen" />}
            {data.exercises.map((ex) => (
              <Card key={ex.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="font-bold text-sm" style={{ color: C.text }}>{ex.name}</div>
                  <div className="text-[11px] font-mono uppercase tracking-wide" style={{ color: C.textDim }}>{ex.muscle}</div>
                </div>
                <button onClick={() => deleteExercise(ex.id)} className="p-1" style={{ color: C.textDim }}><Trash2 size={16} /></button>
              </Card>
            ))}
          </div>
        </Screen>
      </Shell>
    );
  }

  if (view === "plans") {
    return (
      <Shell>
        <Screen
          title="Pläne"
          onBack={() => setView("home")}
          right={<button onClick={() => { setEditingPlan({ id: uid(), name: "", items: [] }); setView("planEdit"); }} className="p-2 rounded-lg active:scale-95" style={{ background: C.surface2, color: C.text }}><Plus size={18} /></button>}
        >
          <p className="text-[13px] leading-snug mb-3" style={{ color: C.textDim }}>Ein Plan ist ein Trainingstag (z. B. Push Day) mit einer Reihenfolge von Übungen samt Zielsätzen und -wiederholungen.</p>
          <div className="flex flex-col gap-2">
            {data.plans.length === 0 && <Empty label="Noch keine Pläne" />}
            {data.plans.map((p) => (
              <Card key={p.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold uppercase tracking-tight" style={{ color: C.text }}>{p.name}</div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setEditingPlan(p); setView("planEdit"); }} className="text-[11px] font-mono uppercase" style={{ color: C.textDim }}>Bearbeiten</button>
                    <button onClick={() => deletePlan(p.id)} style={{ color: C.textDim }}><Trash2 size={15} /></button>
                  </div>
                </div>
                <div className="text-[11px] font-mono mt-1" style={{ color: C.textDim }}>
                  {p.items.map((it) => exerciseName(it.exerciseId)).join(" · ") || "Keine Übungen"}
                </div>
              </Card>
            ))}
          </div>
        </Screen>
      </Shell>
    );
  }

  if (view === "planEdit" && editingPlan) {
    return (
      <Shell>
        <PlanEditor plan={editingPlan} exercises={data.exercises} inputStyle={inputStyle}
          onCancel={() => { setEditingPlan(null); setView("plans"); }} onSave={savePlan} />
      </Shell>
    );
  }

  if (view === "history") {
    return (
      <Shell>
        <Screen title="Verlauf" onBack={() => setView("home")}>
          <p className="text-[13px] leading-snug mb-3" style={{ color: C.textDim }}>Jedes abgeschlossene Training wird hier mit Datum, Sätzen und Gesamtvolumen gespeichert.</p>
          <div className="flex flex-col gap-3">
            {data.sessions.length === 0 && <Empty label="Noch kein Training absolviert" />}
            {data.sessions.map((s) => {
              const vol = s.exercises.reduce((sum, e) => sum + e.sets.reduce((a, b) => a + (Number(b.weight) || 0) * (Number(b.reps) || 0), 0), 0);
              return (
                <Card key={s.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="font-bold uppercase tracking-tight text-sm" style={{ color: C.text }}>{s.planName}</div>
                    <div className="text-[11px] font-mono" style={{ color: C.textDim }}>{new Date(s.date).toLocaleDateString("de-DE")}</div>
                  </div>
                  <div className="mt-2 flex flex-col gap-1">
                    {s.exercises.map((e, i) => (
                      <div key={i} className="text-[12px] font-mono" style={{ color: C.textDim }}>
                        {exerciseName(e.exerciseId)}: {e.sets.map((set) => `${set.weight}×${set.reps}`).join(", ")}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-[11px] font-mono font-bold" style={{ color: C.text }}>Volumen: {vol.toLocaleString("de-DE")} kg</div>
                </Card>
              );
            })}
          </div>
        </Screen>
      </Shell>
    );
  }

  if (view === "progress") {
    const exercisesWithData = data.exercises.filter((ex) => data.sessions.some((s) => s.exercises.some((e) => e.exerciseId === ex.id && e.sets.length > 0)));
    const selectedId = progressExerciseId || exercisesWithData[0]?.id;
    const chartData = [];
    if (selectedId) {
      const sorted = [...data.sessions].sort((a, b) => new Date(a.date) - new Date(b.date));
      for (const s of sorted) {
        const e = s.exercises.find((x) => x.exerciseId === selectedId);
        if (e && e.sets.length > 0) {
          const maxWeight = Math.max(...e.sets.map((set) => Number(set.weight) || 0));
          const volume = e.sets.reduce((sum, set) => sum + (Number(set.weight) || 0) * (Number(set.reps) || 0), 0);
          chartData.push({ date: new Date(s.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }), maxWeight, volume });
        }
      }
    }
    return (
      <Shell>
        <Screen title="Fortschritt" onBack={() => setView("home")}>
          <p className="text-[13px] leading-snug mb-3" style={{ color: C.textDim }}>Wähle eine Übung, um zu sehen, wie sich Maxgewicht und Volumen über die Zeit entwickeln.</p>
          {exercisesWithData.length === 0 ? <Empty label="Noch keine Daten für Charts" /> : (
            <>
              <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
                {exercisesWithData.map((ex) => (
                  <button key={ex.id} onClick={() => setProgressExerciseId(ex.id)}
                    className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-mono uppercase tracking-wide"
                    style={selectedId === ex.id ? { background: C.accent, color: C.accentText, border: `1px solid ${C.accent}` } : { background: C.surface, color: C.textDim, border: `1px solid ${C.border}` }}>
                    {ex.name}
                  </button>
                ))}
              </div>
              <Card className="p-3">
                <div className="text-[11px] font-mono uppercase tracking-widest mb-2" style={{ color: C.textDim }}>Maxgewicht pro Session (kg)</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData}>
                    <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fill: C.textDim, fontSize: 10 }} axisLine={{ stroke: C.border }} tickLine={false} />
                    <YAxis tick={{ fill: C.textDim, fontSize: 10 }} axisLine={{ stroke: C.border }} tickLine={false} width={30} />
                    <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: C.textDim }} />
                    <Line type="monotone" dataKey="maxWeight" stroke={C.danger} strokeWidth={2} dot={{ r: 3, fill: C.danger }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-3 mt-3">
                <div className="text-[11px] font-mono uppercase tracking-widest mb-2" style={{ color: C.textDim }}>Volumen pro Session (kg)</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData}>
                    <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fill: C.textDim, fontSize: 10 }} axisLine={{ stroke: C.border }} tickLine={false} />
                    <YAxis tick={{ fill: C.textDim, fontSize: 10 }} axisLine={{ stroke: C.border }} tickLine={false} width={40} />
                    <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: C.textDim }} />
                    <Line type="monotone" dataKey="volume" stroke="#3A6EA5" strokeWidth={2} dot={{ r: 3, fill: "#3A6EA5" }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </>
          )}
        </Screen>
      </Shell>
    );
  }

  // ---- HOME ----
  const weekVolume = data.sessions
    .filter((s) => (Date.now() - new Date(s.date).getTime()) < 7 * 24 * 3600 * 1000)
    .reduce((sum, s) => sum + s.exercises.reduce((a, e) => a + e.sets.reduce((b, set) => b + (Number(set.weight) || 0) * (Number(set.reps) || 0), 0), 0), 0);

  return (
    <Shell>
      {showOnboarding && <Onboarding onDismiss={dismissOnboarding} />}
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-mono uppercase tracking-widest" style={{ color: C.textDim }}>Iron Log</div>
          <button onClick={() => setShowOnboarding(true)} className="text-[11px] font-mono uppercase tracking-widest underline underline-offset-2" style={{ color: C.textDim }}>Hilfe</button>
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tight -mt-1" style={{ color: C.text }}>Training</h1>
      </div>
      <div className="px-4">
        <Card className="p-4 mb-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest" style={{ color: C.textDim }}>
              <Flame size={12} style={{ color: C.accent }} /> Diese Woche
            </div>
            <div className="text-2xl font-black font-mono mt-0.5" style={{ color: C.text }}>{weekVolume.toLocaleString("de-DE")} kg</div>
          </div>
          <PlateBar weight={Math.min(weekVolume, 500)} height={32} />
        </Card>
      </div>

      <div className="px-4 flex-1 overflow-y-auto pb-4">
        <div className="text-[11px] font-mono uppercase tracking-widest mb-2" style={{ color: C.textDim }}>Plan starten</div>
        <div className="flex flex-col gap-2 mb-6">
          {data.plans.length === 0 && <Empty label="Erstelle zuerst einen Plan" />}
          {data.plans.map((p) => (
            <Card key={p.id} onClick={() => startWorkout(p)} className="flex items-center justify-between px-4 py-3.5 active:scale-[0.98] transition-transform">
              <div className="text-left">
                <div className="font-bold uppercase tracking-tight" style={{ color: C.text }}>{p.name}</div>
                <div className="text-[11px] font-mono" style={{ color: C.textDim }}>{p.items.length} Übungen</div>
              </div>
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: C.accent }}>
                <Play size={16} fill={C.accentText} color={C.accentText} />
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NavCard icon={<ListPlus size={18} />} label="Pläne" onClick={() => setView("plans")} />
          <NavCard icon={<Dumbbell size={18} />} label="Übungen" onClick={() => setView("exercises")} />
          <NavCard icon={<History size={18} />} label="Verlauf" onClick={() => setView("history")} />
          <NavCard icon={<LineChartIcon size={18} />} label="Fortschritt" onClick={() => setView("progress")} />
        </div>

        <div className="mt-3 flex gap-3">
          <button onClick={exportData} className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-bold uppercase tracking-wide"
            style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text }}>
            <Download size={16} /> Exportieren
          </button>
          <button onClick={triggerImport} className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-bold uppercase tracking-wide"
            style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text }}>
            <Upload size={16} /> Importieren
          </button>
          <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImportFile} style={{ display: "none" }} />
        </div>
        {importError && <p className="mt-2 text-[12px] font-mono" style={{ color: C.danger }}>{importError}</p>}
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div style={{ width: "100%", minHeight: 640, background: C.bg, borderRadius: 16, overflow: "hidden" }} className="flex flex-col font-sans">
      {children}
    </div>
  );
}

function NavCard({ icon, label, onClick }) {
  return (
    <Card onClick={onClick} className="flex flex-col items-start gap-3 px-4 py-4 active:scale-[0.97] transition-transform">
      <div style={{ color: C.accent }}>{icon}</div>
      <div className="text-[13px] font-bold uppercase tracking-wide" style={{ color: C.text }}>{label}</div>
    </Card>
  );
}

function AddExerciseForm({ onAdd, inputStyle }) {
  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState("");
  return (
    <Card className="p-3 flex flex-col gap-2">
      <input placeholder="Übungsname" value={name} onChange={(e) => setName(e.target.value)}
        className="rounded-lg px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
      <div className="flex gap-2">
        <input placeholder="Muskelgruppe" value={muscle} onChange={(e) => setMuscle(e.target.value)}
          className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
        <button onClick={() => { onAdd(name, muscle); setName(""); setMuscle(""); }}
          className="font-bold px-4 rounded-lg text-sm active:scale-95" style={{ background: C.accent, color: C.accentText }}>
          <Plus size={16} />
        </button>
      </div>
    </Card>
  );
}

function PlanEditor({ plan, exercises, onCancel, onSave, inputStyle }) {
  const [name, setName] = useState(plan.name);
  const [items, setItems] = useState(plan.items);
  const [pickerOpen, setPickerOpen] = useState(false);

  const addItem = (exerciseId) => { setItems([...items, { exerciseId, targetSets: 3, targetReps: 10 }]); setPickerOpen(false); };
  const updateItem = (idx, field, value) => { const next = [...items]; next[idx] = { ...next[idx], [field]: value }; setItems(next); };
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  return (
    <Screen title={plan.name ? "Plan bearbeiten" : "Neuer Plan"} onBack={onCancel}>
      <input placeholder="Plan-Name (z. B. Push Day)" value={name} onChange={(e) => setName(e.target.value)}
        className="w-full rounded-lg px-3 py-2.5 font-bold uppercase tracking-tight focus:outline-none mb-4" style={inputStyle} />

      <div className="flex flex-col gap-2 mb-3">
        {items.map((it, idx) => (
          <Card key={idx} className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold text-sm" style={{ color: C.text }}>{exercises.find((e) => e.id === it.exerciseId)?.name}</div>
              <button onClick={() => removeItem(idx)} style={{ color: C.textDim }}><X size={16} /></button>
            </div>
            <div className="flex items-center gap-2 text-[12px] font-mono" style={{ color: C.textDim }}>
              <span>Sätze</span>
              <input type="number" value={it.targetSets} onChange={(e) => updateItem(idx, "targetSets", Number(e.target.value))} className="w-14 rounded-lg px-2 py-1 text-center" style={inputStyle} />
              <span>Wdh</span>
              <input type="number" value={it.targetReps} onChange={(e) => updateItem(idx, "targetReps", Number(e.target.value))} className="w-14 rounded-lg px-2 py-1 text-center" style={inputStyle} />
            </div>
          </Card>
        ))}
      </div>

      {pickerOpen ? (
        <Card className="p-2 mb-3 max-h-48 overflow-y-auto">
          {exercises.map((ex) => (
            <button key={ex.id} onClick={() => addItem(ex.id)} className="w-full text-left px-3 py-2 rounded-lg text-sm" style={{ color: C.text }}>
              {ex.name} <span className="text-xs font-mono" style={{ color: C.textDim }}>· {ex.muscle}</span>
            </button>
          ))}
        </Card>
      ) : (
        <button onClick={() => setPickerOpen(true)} className="w-full rounded-xl py-3 text-sm font-mono uppercase tracking-wide mb-3" style={{ border: `1px dashed ${C.border}`, color: C.textDim }}>
          + Übung hinzufügen
        </button>
      )}

      <button onClick={() => name.trim() && onSave({ ...plan, name: name.trim(), items })} disabled={!name.trim() || items.length === 0}
        className="w-full font-bold uppercase tracking-wide py-3 rounded-xl mt-2 active:scale-[0.98] disabled:opacity-40"
        style={{ background: C.accent, color: C.accentText }}>
        Plan speichern
      </button>
    </Screen>
  );
}
