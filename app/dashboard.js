/* Boussole — Tableau de bord (v0.7.18)
   Lit un status.json OU un diagnostic exporté (si includeData ON).
   Aucun tracking. Tout local.
*/

const DASH_VERSION = "0.7.15";
const $ = (id) => document.getElementById(id);

// v0.6.93 — Accessibilité : lien "Aller au contenu" (skip link) + offset barre sticky
function initSkipLink(){
  try{
    const link = document.getElementById('skipLink');
    const main = document.getElementById('main');
    if(!link || !main) return;
    link.addEventListener('click', () => {
      setTimeout(() => {
        try{ main.focus({ preventScroll:true }); } catch(e){ try{ main.focus(); } catch(_){} }
        try{ main.scrollIntoView({ block:'start' }); } catch(_){}

        // v0.6.93 — Évite que <main> soit masqué par la barre sticky (topbar)
        try{
          const topbar = document.querySelector('.topbar');
          const off = (topbar ? topbar.getBoundingClientRect().height : 0) + 12;
          requestAnimationFrame(() => {
            try{
              const y = main.getBoundingClientRect().top + window.pageYOffset - off;
              if(Number.isFinite(y)) window.scrollTo({ top: Math.max(0, y), behavior:'auto' });
            }catch(e2){}
          });
        }catch(e){}
      }, 0);
    });
  }catch(e){}
}

function slotLabel(slot){ return (slot==="PM") ? "Soir" : "Matin"; }

function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year:"numeric", month:"2-digit", day:"2-digit" });
  } catch { return (iso || "").slice(0,10); }
}

function clamp0to10(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(10, Math.round(x)));
}

function avg(nums) {
  const v = nums.filter((x)=>Number.isFinite(x));
  if (!v.length) return null;
  return v.reduce((a,b)=>a+b,0) / v.length;
}
function round1(x){ return (Math.round(x*10)/10).toFixed(1); }

function normalizeEntries(payload) {
  const sanitize = (e) => {
    if (!e || typeof e !== "object") return null;
    const ts = typeof e.ts === "string" ? e.ts : null;
    if (!ts) return null;
    const out = {
      ts,
      energy: clamp0to10(e.energy),
      sleep: clamp0to10(e.sleep),
      comfort: clamp0to10(e.comfort),
    };
    if (e.memory != null) out.memory = clamp0to10(e.memory);
    if (e.concentration != null) out.concentration = clamp0to10(e.concentration);
    if (e.clarity != null) out.clarity = clamp0to10(e.clarity); // legacy
    if (e.orthostatic != null) out.orthostatic = clamp0to10(e.orthostatic);
    if (e.mood != null) out.mood = clamp0to10(e.mood);
    if (e.serenity != null) out.serenity = clamp0to10(e.serenity);
    return out;
  };

  // status.json format: { app, exportedAt, settings?, entries:[...] }
  if (payload && Array.isArray(payload.entries)) {
    return payload.entries.map(sanitize).filter(Boolean);
  }

  // diagnostic format from app: { app, generatedAt, includeData, lastEntries:[{date,...}] }
  if (payload && Array.isArray(payload.lastEntries) && payload.lastEntries.length) {
    return payload.lastEntries.map(e => {
      if (!e || typeof e !== "object") return null;
      const out = {
        ts: (e.date || "") + "T12:00:00.000Z",
        energy: clamp0to10(e.energy),
        sleep: clamp0to10(e.sleep),
        comfort: clamp0to10(e.comfort),
      };
      if (e.memory != null) out.memory = clamp0to10(e.memory);
      if (e.concentration != null) out.concentration = clamp0to10(e.concentration);
      if (e.clarity != null) out.clarity = clamp0to10(e.clarity); // legacy
      if (e.orthostatic != null) out.orthostatic = clamp0to10(e.orthostatic);
      if (e.mood != null) out.mood = clamp0to10(e.mood);
      if (e.serenity != null) out.serenity = clamp0to10(e.serenity);
      return out;
    }).filter(Boolean);
  }
  return [];
}



function computeDays(entries, n) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (n-1));
  const byDay = new Map();
  for (const e of entries) {
    if (!e || !e.ts) continue;
    const d = new Date(e.ts);
    if (Number.isNaN(d.getTime())) continue;
    if (d < start || d > end) continue;
    const key = d.toISOString().slice(0,10);
    byDay.set(key, e);
  }
  const out = [];
  for (let i=0;i<n;i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0,10);
    out.push({ date: key, entry: byDay.get(key) || null });
  }
  return out;
}

function render(entries, sourceLabel) {
  $("srcPill").textContent = "Source : " + (sourceLabel || "—");
  $("countPill").textContent = "Entrées : " + (entries.length || 0);

  if (entries.length) {
    const minTs = entries[0].ts;
    const maxTs = entries[entries.length-1].ts;
    $("rangePill").textContent = "Période : " + fmtDate(minTs) + " → " + fmtDate(maxTs);
  } else {
    $("rangePill").textContent = "Période : —";
  }

  const days14 = computeDays(entries, 14);
  const list14 = days14.map(d=>d.entry).filter(Boolean);

  const kpis = $("kpis");
  kpis.innerHTML = "";
  const make = (label, value, sub) => {
    const div = document.createElement("div");
    div.className = "kpi";
    div.innerHTML = `<div class="kpi__label">${label}</div>
                     <div class="kpi__value">${value}</div>
                     <div class="kpi__sub">${sub}</div>`;
    return div;
  };

  const metrics = [
    { key: "energy", label: "Énergie" },
    { key: "sleep", label: "Sommeil" },
    { key: "comfort", label: "Confort" },
  ];
  if (entries.some(e => e.memory != null)) metrics.push({ key: "memory", label: "Mémoire" });
  if (entries.some(e => e.concentration != null)) metrics.push({ key: "concentration", label: "Concentration" });
  if (!entries.some(e => e.memory != null) && !entries.some(e => e.concentration != null) && entries.some(e => e.clarity != null)) metrics.push({ key: "clarity", label: "Mémoire/Concentration" });
  if (entries.some(e => e.orthostatic != null)) metrics.push({ key: "orthostatic", label: "Orthost." });
  if (entries.some(e => e.mood != null)) metrics.push({ key: "mood", label: "Humeur" });
  if (entries.some(e => e.serenity != null)) metrics.push({ key: "serenity", label: "Sérénité" });

  for (const m of metrics) {
    const values = list14.map(e=>e[m.key]).filter(v => v != null && Number.isFinite(Number(v)));
    const a = avg(values.map(Number));
    kpis.appendChild(make(m.label, a==null ? "—" : round1(a), "moyenne 14 j"));
  }

  // Table (last 30)
  const table = $("tbl");
  const theadRow = table.querySelector("thead tr");
  theadRow.innerHTML = "<th>Date</th>" + metrics.map(m => `<th>${m.label}</th>`).join("");

  const tbody = table.querySelector("tbody");
  tbody.innerHTML = "";
  const last30 = entries.slice(-30).reverse();
  for (const e of last30) {
    const tr = document.createElement("tr");
    const slot = e && e.slot ? ` • ${slotLabel(e.slot)}` : "";
    let html = `<td>${fmtDate(e.ts)}${slot}</td>`;
    for (const m of metrics) html += `<td>${e[m.key] ?? "—"}</td>`;
    tr.innerHTML = html;
    tbody.appendChild(tr);
  }
}

async function tryAutoLoad() {
  // 1) Auto: localStorage (si le tableau de bord est ouvert sur le même site que l’app)
  try {
    const raw = localStorage.getItem("boussole_entries_v1") || "[]";
    const entriesLS = JSON.parse(raw);
    if (Array.isArray(entriesLS) && entriesLS.length) {
      render(entriesLS, "localStorage (auto)");
      return;
    }
  } catch {}

  // 2) Fallback: status.json statique à côté du tableau de bord
  try {
    const r = await fetch("./status.json", { cache:"no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const payload = await r.json();
    const entries = normalizeEntries(payload);
    render(entries, "status.json (auto)");
  } catch (e) {
    render([], "—");
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportStatusFromLocalStorage() {
  // Reads app entries if dashboard shares origin (works best on http://)
  let entries = [];
  try {
    entries = JSON.parse(localStorage.getItem("boussole_entries_v1") || "[]");
    if (!Array.isArray(entries)) entries = [];
  } catch { entries = []; }

  const status = {
    app: { name:"Boussole", version:DASH_VERSION },
    exportedAt: new Date().toISOString(),
    entries: entries,
  };
  const blob = new Blob([JSON.stringify(status, null, 2)], { type:"application/json" });
  downloadBlob(blob, "status.json");
}

function applyVersionBadge(){
  try{
    document.title = `Boussole — Tableau de bord (v${DASH_VERSION})`;
    const meta = document.querySelector('.brand__meta');
    if(meta) meta.textContent = `Tableau de bord • v${DASH_VERSION} • local‑first`;
  }catch(e){}
}

function handleFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(String(reader.result || "{}"));
      const entries = normalizeEntries(payload);
      render(entries, file.name);
    } catch {
      render([], "Fichier invalide");
    }
  };
  reader.readAsText(file);
}

function boot() {
  applyVersionBadge();
  initSkipLink();
  $("btnTryAuto").addEventListener("click", tryAutoLoad);
  $("btnExportStatus").addEventListener("click", exportStatusFromLocalStorage);

  const file = $("file");
  file.addEventListener("change", () => {
    const f = file.files && file.files[0];
    if (f) handleFile(f);
    file.value = "";
  });

  tryAutoLoad();
}

document.addEventListener("DOMContentLoaded", boot);
