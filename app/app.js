/* Boussole — v0.7.17
   Données locales. Aucun suivi. Aucun envoi automatique.
*/

const APP_NAME = "Boussole";
const APP_VERSION = '0.7.15';

// v0.6.96 — horodatage stable (nom de fichier) pour tous les exports (JSON/PDF/PNG/TXT)
function makeExportStamp(date = new Date()) {
  try {
    const pad2 = (n) => String(n).padStart(2, "0");
    const pad3 = (n) => String(n).padStart(3, "0");
    const y = date.getUTCFullYear();
    const m = pad2(date.getUTCMonth() + 1);
    const d = pad2(date.getUTCDate());
    const hh = pad2(date.getUTCHours());
    const mm = pad2(date.getUTCMinutes());
    const ss = pad2(date.getUTCSeconds());
    const ms = pad3(date.getUTCMilliseconds());
    // caractères sûrs : chiffres + '-' + '_' + 'Z'
    return `${y}-${m}-${d}_${hh}-${mm}-${ss}-${ms}Z`;
  } catch {
    try { return new Date().toISOString().replace(/[:.]/g, "-"); } catch { return String(Date.now()); }
  }
}


// v0.6.29 — mode simulation PDF lent (debug only)
function isDebugPdfSlowMode() {
  try {
    const v = new URLSearchParams(location.search || "").get("debugPdfSlow");
    return v === "1" || v === "true";
  } catch { return false; }
}

// v0.6.32 — mode simulation erreur PDF (debug only)
function isDebugPdfFailMode() {
  try {
    const v = new URLSearchParams(location.search || "").get("debugPdfFail");
    return v === "1" || v === "true";
  } catch { return false; }
}

async function debugPdfSlowWait(ms, job) {
  const t0 = Date.now();
  const step = 120;
  while (Date.now() - t0 < ms) {
    if (job && job.cancelled) return false;
    await new Promise((r) => setTimeout(r, step));
    // micro-yield pour laisser l'UI peindre les messages
    try { await nextPaint(); } catch {}
  }
  return true;
}
const SUPPORT_EMAIL = "remyhonore@protonmail.com";

const $ = (id) => document.getElementById(id);

const LS_KEYS = {
  entries: "boussole_entries_v1",
  lastDeleted: "boussole_last_deleted_v1",
  diagInclude: "boussole_diag_include_data_v1",
  errors: "boussole_errors_v1",
  settings: "boussole_settings_v1",
  drafts: "boussole_drafts_v1",
  importBackup: "boussole_import_backup_v1",
  uiLastTab: "boussole_ui_last_tab_v1",
  releaseNotesSeen: "boussole_release_notes_seen_v1",
  consultGoal: "boussole_consult_goal_v1",
  reminder: "boussole_reminder_v1",
  fichesFav: "boussole_fiches_fav_v1",
  fichesFilter: "boussole_fiches_filter_v1",
  fichesScroll: "boussole_fiches_scroll_v1",
  fichesTag: "boussole_fiches_tag_v1",
  asApiKey: "boussole_as_api_key_v1",
  fichesCustom: "boussole_fiches_custom_v1",
  pdfLastError: "boussole_pdf_last_error_v1",
};


// v0.6.77 — Stockage robuste (Safari iOS / navigation privée / autoremplissage silencieux)
// Objectif : éviter les exceptions localStorage et garder une continuité minimale.
// NB : on conserve localStorage quand il est disponible, sinon fallback mémoire (session courante).
const __MEM_STORE = (typeof window !== "undefined" && window.__MEM_STORE) ? window.__MEM_STORE : {};
if (typeof window !== "undefined") window.__MEM_STORE = __MEM_STORE;

function safeStorageGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return (__MEM_STORE[key] ?? null); }
}
function safeStorageSet(key, value) {
  try { localStorage.setItem(key, value); __MEM_STORE[key] = value; return true; } catch (e) { __MEM_STORE[key] = value; return false; }
}
function safeStorageRemove(key) {
  try { localStorage.removeItem(key); } catch (e) {}
  try { delete __MEM_STORE[key]; } catch (e) {}
}

function safeStorageKeys() {
  try {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k != null) out.push(k);
    }
    return out;
  } catch (e) {
    try { return Object.keys(__MEM_STORE); } catch (e2) { return []; }
  }
}


// v0.6.80 — Détection disponibilité stockage persistant (localStorage)
// En mode navigation privée / Safari iOS, localStorage peut être inaccessible : on garde alors l'UI comme source de vérité.
function isPersistentStorageAvailable() {
  try {
    const k = "__boussole_probe__";
    const v = String(Date.now());
    const ok = safeStorageSet(k, v);
    safeStorageRemove(k);
    return !!ok;
  } catch (e) {
    return false;
  }
}

// v0.6.80 — Indicateur discret pour la persistance des contacts (Médecin / Pharmacie)
function contactsAnyFilledUI() {
  try {
    const ids = ["doctorName","doctorPhone","doctorAddress","pharmacyName","pharmacyPhone","pharmacyAddress"];
    return ids.some(id => {
      const el = $(id);
      if (!el) return false;
      return String(el.value || "").trim().length > 0;
    });
  } catch (e) {
    return false;
  }
}

function setContactsSaveIndicator(state) {
  const el = $("contactsSaveState");
  const exp = $("contactsSaveExplain");
  if (!el) return;

  // v0.6.82 — ne rien afficher tant que tous les champs sont vides
  if (!contactsAnyFilledUI()) {
    el.style.display = "none";
    if (exp) exp.style.display = "none";
    return;
  }

  const show = (txt) => {
    el.textContent = txt;
    el.style.display = "inline";
  };

  if (state === "unavailable") {
    show("Non sauvegardé (mode privé ?)");
    if (exp) {
      // v0.6.84 — explication plus courte (et non anxiogène)
      exp.textContent = "En navigation privée, le stockage peut être bloqué : les champs restent utilisables et le PDF utilise ce qui est affiché, mais ces infos ne seront pas gardées après fermeture du navigateur.";
      exp.style.display = "block";
    }
    return;
  }

  if (exp) exp.style.display = "none";

  if (state === "saving") { show("Sauvegarde…"); return; }
  if (state === "saved") { show("Sauvegardé ✅"); return; }

  // défaut : cacher
  el.style.display = "none";
}

// v0.6.83 — Au moment d’ouvrir Réglages, refléter immédiatement l’état réel (sans dépendre d’un “input”)
function refreshContactsSaveIndicatorOnOpen() {
  try {
    if (!contactsAnyFilledUI()) { setContactsSaveIndicator("hidden"); return; }
    const ok = isPersistentStorageAvailable();
    setContactsSaveIndicator(ok ? "saved" : "unavailable");
  } catch (e) {}
}

// v0.5.72 — stockage local des images de fiches importées (IndexedDB)
const FICHES_DB = { name: "boussole_fiches_db_v1", store: "images" };
let __fichesDbPromise = null;
let __ficheObjectUrl = null;

const FICHES = {
  lever: {
    title: "Se lever sans malaise",
    desc: "Le lever progressif évite le “grand huit” orthostatique.",
    tags: ["orthostatisme", "dysautonomie", "lever"],
    src: "fiches/se-lever-sans-malaise.webp",
  },
  hydratation: {
    title: "Hydratation + sel (intelligent)",
    desc: "Un petit coup de pouce au volume sanguin, quand c’est adapté.",
    tags: ["hydratation", "sel", "circulation"],
    src: "fiches/hydratation-sel.webp",
  },
  respiration: {
    title: "Respiration longue : calmer l’escalade",
    desc: "Une routine courte pour redescendre le niveau d’alerte.",
    tags: ["respiration", "calme", "stress"],
    src: "fiches/respiration-longue.webp",
  },
  pacing: {
    title: "Pacing : éviter le crash",
    desc: "Fractionner, s’arrêter plus tôt, récupérer mieux.",
    tags: ["rythme", "fatigue", "recuperation"],
    src: "fiches/pacing-anti-crash.webp",
  },
  proteines: {
    title: "Régime protéiné & charge rénale : la grille simple",
    desc: "Zone verte / orange / rouge, pour se situer rapidement.",
    tags: ["protéines", "reins", "surveillance"],
    src: "fiches/proteines-charge-renale.webp",
    copyText: `Régime protéiné & charge rénale : la grille simple
ZONE VERTE ✅
— Rein sain, hydratation OK, protéines réparties sur la journée
— Surveillance “de routine” : créatinine/eGFR 1×/an (ou selon contexte)
ZONE ORANGE 🟠
— Antécédents rénaux, diabète/HTA, >60 ans, déshydratation fréquente, AINS
— Ajuster la dose, éviter les excès prolongés, contrôler plus souvent
ZONE ROUGE 🟥
— eGFR bas, albuminurie/protéinurie, rein unique fragile, maladie rénale connue
— Avis médical avant d’augmenter les protéines
Rappel : Urée seule = insuffisant : vérifier créatinine / eGFR / uACR
⚠️ Infos générales uniquement. Pas d’avis médical personnalisé en ligne.
En cas de doute/symptôme : médecin traitant. Urgence : 15.`,
  },
};
let __ficheCurrentSrc = null;
let __ficheCurrentTitle = null;
let __ficheCurrentCopyText = null;

// v0.5.71 — mode lecture (agrandir/réduire) dans la modale fiche
let __ficheReadingMode = false;
let __ficheCurrentId = null;

// v0.5.60 — correctifs fiches (plein écran + miniatures + avertissement)
let __fichesLastShownOrder = [];
let __ficheNavOrder = null;
let __ficheNavIndex = -1;

let __fichesFavSet = null;
let __fichesFilterMode = null;
let __fichesTag = null;
let __fichesScrollSaveT = null;




let __fichesSearchQuery = "";

function normalizeForSearch(s) {
  try {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  } catch {
    try { return String(s || "").toLowerCase(); } catch { return ""; }
  }
}

// ---------- v0.5.72 : IndexedDB (images de fiches importées) ----------
function openFichesDb() {
  if (__fichesDbPromise) return __fichesDbPromise;
  __fichesDbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(FICHES_DB.name, 1);
      req.onupgradeneeded = () => {
        try {
          const db = req.result;
          if (!db.objectStoreNames.contains(FICHES_DB.store)) {
            db.createObjectStore(FICHES_DB.store);
          }
        } catch {}
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return __fichesDbPromise;
}

async function idbPut(key, blob) {
  try {
    const db = await openFichesDb();
    if (!db) return false;
    return await new Promise((resolve) => {
      try {
        const tx = db.transaction(FICHES_DB.store, "readwrite");
        const st = tx.objectStore(FICHES_DB.store);
        st.put(blob, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch { resolve(false); }
    });
  } catch { return false; }
}

async function idbGet(key) {
  try {
    const db = await openFichesDb();
    if (!db) return null;
    return await new Promise((resolve) => {
      try {
        const tx = db.transaction(FICHES_DB.store, "readonly");
        const st = tx.objectStore(FICHES_DB.store);
        const rq = st.get(key);
        rq.onsuccess = () => resolve(rq.result || null);
        rq.onerror = () => resolve(null);
      } catch { resolve(null); }
    });
  } catch { return null; }
}

async function resolveFicheSrc(src) {
  try {
    const s = String(src || "");
    if (!s.startsWith("db:")) return s;
    const key = s.slice(3);
    if (!key) return "";
    const blob = await idbGet(key);
    if (!blob) return "";
    try { if (__ficheObjectUrl) URL.revokeObjectURL(__ficheObjectUrl); } catch {}
    __ficheObjectUrl = URL.createObjectURL(blob);
    return __ficheObjectUrl;
  } catch {
    return "";
  }
}

function getFichesSearchQuery() {
  try { return __fichesSearchQuery || ""; } catch { return ""; }
}

function updateFichesSearchUI() {
  const inp = $("fichesSearchInput");
  const btn = $("btnFichesSearchClear");
  const q = getFichesSearchQuery();
  if (inp && (inp.value !== q)) {
    try { inp.value = q; } catch {}
  }
  if (btn) {
    try {
      const show = !!q;
      btn.style.visibility = show ? "visible" : "hidden";
      btn.style.pointerEvents = show ? "auto" : "none";
      btn.setAttribute("aria-hidden", show ? "false" : "true");
    } catch {}
  }
}

function setFichesSearchQuery(q) {
  // Sauver la position avant changement (mode courant)
  try { saveFichesScrollPos(); } catch {}

  const raw = String(q || "");
  __fichesSearchQuery = raw.trim().slice(0, 64); // garde-fou

  try { updateFichesSearchUI(); } catch {}
  try { renderFichesGrid(); } catch {}
  try { restoreFichesScrollPos(true); } catch {}
}

function escapeHtml(s) {
  const str = String(s ?? "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegExp(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------- v0.5.72 : Import ZIP de fiches (sans bibliothèque externe) ----------
function u16(dv, o) { return dv.getUint16(o, true); }
function u32(dv, o) { return dv.getUint32(o, true); }

function findEOCD(dv) {
  // EOCD signature 0x06054b50
  const sig = 0x06054b50;
  const len = dv.byteLength;
  // recherche sur les 66k derniers octets (max comment length)
  const start = Math.max(0, len - 66000);
  for (let i = len - 22; i >= start; i--) {
    try {
      if (dv.getUint32(i, true) === sig) return i;
    } catch {}
  }
  return -1;
}

async function inflateRaw(u8) {
  try {
    // Zip = deflate raw
    const algo = (typeof DecompressionStream !== "undefined") ? "deflate-raw" : null;
    if (!algo) return null;
    const ds = new DecompressionStream(algo);
    const stream = new Blob([u8]).stream().pipeThrough(ds);
    const ab = await new Response(stream).arrayBuffer();
    return new Uint8Array(ab);
  } catch {
    // fallback (certains navigateurs n'ont pas deflate-raw)
    try {
      const ds = new DecompressionStream("deflate");
      const stream = new Blob([u8]).stream().pipeThrough(ds);
      const ab = await new Response(stream).arrayBuffer();
      return new Uint8Array(ab);
    } catch { return null; }
  }
}

async function unzipEntries(arrayBuffer) {
  const dv = new DataView(arrayBuffer);
  const eocd = findEOCD(dv);
  if (eocd < 0) throw new Error("ZIP invalide");

  const cdSize = u32(dv, eocd + 12);
  const cdOffset = u32(dv, eocd + 16);
  const cdEnd = cdOffset + cdSize;
  if (cdOffset < 0 || cdEnd > dv.byteLength) throw new Error("ZIP tronqué");

  const out = new Map();
  let p = cdOffset;
  while (p + 46 <= cdEnd) {
    const sig = dv.getUint32(p, true);
    if (sig !== 0x02014b50) break;

    const method = u16(dv, p + 10);
    const flags = u16(dv, p + 8);
    const compSize = u32(dv, p + 20);
    const uncompSize = u32(dv, p + 24);
    const nameLen = u16(dv, p + 28);
    const extraLen = u16(dv, p + 30);
    const commentLen = u16(dv, p + 32);
    const localOff = u32(dv, p + 42);
    const nameStart = p + 46;
    const nameBytes = new Uint8Array(arrayBuffer, nameStart, nameLen);
    const name = new TextDecoder("utf-8").decode(nameBytes);

    // sauter vers prochain header
    p = nameStart + nameLen + extraLen + commentLen;

    // ignore dossiers
    if (!name || name.endsWith("/")) continue;
    // ignore crypté
    if (flags & 0x0001) continue;

    // local file header
    if (localOff + 30 > dv.byteLength) continue;
    if (dv.getUint32(localOff, true) !== 0x04034b50) continue;
    const lfNameLen = u16(dv, localOff + 26);
    const lfExtraLen = u16(dv, localOff + 28);
    const dataStart = localOff + 30 + lfNameLen + lfExtraLen;
    const dataEnd = dataStart + compSize;
    if (dataEnd > dv.byteLength) continue;
    const comp = new Uint8Array(arrayBuffer, dataStart, compSize);

    let content = null;
    if (method === 0) {
      content = new Uint8Array(comp);
    } else if (method === 8) {
      const dec = await inflateRaw(comp);
      if (dec && (!uncompSize || dec.byteLength === uncompSize)) content = dec;
      else content = dec; // accepte même si taille mismatch
    } else {
      continue; // méthode non supportée
    }
    if (content) out.set(name, content);
  }
  return out;
}

function parseFichesJson(payload) {
  if (!payload) return {};
  if (payload.fiches && typeof payload.fiches === "object") return payload.fiches;
  if (Array.isArray(payload)) {
    const o = {};
    payload.forEach((f) => {
      try {
        const id = String(f && (f.id || f.key || f.slug) || "").trim();
        if (!id) return;
        const copy = Object.assign({}, f);
        delete copy.id; delete copy.key; delete copy.slug;
        o[id] = copy;
      } catch {}
    });
    return o;
  }
  if (typeof payload === "object") return payload;
  return {};
}

function loadCustomFiches() {
  try {
    const raw = safeStorageGet(LS_KEYS.fichesCustom);
    if (!raw) return;
    const j = JSON.parse(raw);
    const fiches = (j && j.fiches) ? j.fiches : j;
    if (!fiches || typeof fiches !== "object") return;
    Object.keys(fiches).forEach((id) => {
      try {
        const f = fiches[id];
        if (!f) return;
        const item = {
          title: f.title || "Fiche",
          desc: f.desc || "",
          tags: Array.isArray(f.tags) ? f.tags : [],
          src: f.src || "",
        };
        if (f.copyText) item.copyText = String(f.copyText);
        FICHES[String(id)] = item;
      } catch {}
    });
  } catch {}
}

function saveCustomFichesMap(map) {
  try {
    safeStorageSet(LS_KEYS.fichesCustom, JSON.stringify({ fiches: map }));
  } catch {}
}

function countCustomFiches() {
  try {
    const raw = safeStorageGet(LS_KEYS.fichesCustom);
    if (!raw) return 0;
    const j = JSON.parse(raw);
    const fiches = (j && j.fiches) ? j.fiches : j;
    if (!fiches || typeof fiches !== "object") return 0;
    return Object.keys(fiches).length;
  } catch {
    return 0;
  }
}

function updateCustomFichesCountUI() {
  const el = $("customFichesCount");
  if (!el) return;
  const n = countCustomFiches();
  el.textContent = `${n} fiche(s) importée(s)`;
}

async function analyzeFichesZip(file, replaceExisting) {
  const buf = await file.arrayBuffer();
  const entries = await unzipEntries(buf);

  // trouve fiches.json
  let jsonName = null;
  for (const k of entries.keys()) {
    if (k.toLowerCase().endsWith("fiches.json")) { jsonName = k; break; }
  }
  if (!jsonName) throw new Error("fiches.json introuvable dans le ZIP");
  const jsonTxt = new TextDecoder("utf-8").decode(entries.get(jsonName));
  let payload;
  try { payload = JSON.parse(jsonTxt); } catch { throw new Error("fiches.json invalide"); }
  const fichesObj = parseFichesJson(payload);
  const ids = Object.keys(fichesObj);
  if (!ids.length) throw new Error("Aucune fiche dans fiches.json");

  const res = {
    total: ids.length,
    wouldAdd: [],
    wouldReplace: [],
    wouldSkipExisting: [],
    wouldSkipInvalid: [],
    wouldSkipNoImage: [],
  };

  for (const id of ids) {
    const f0 = fichesObj[id];
    const fid = String(id || "").trim();
    if (!fid || !f0) { res.wouldSkipInvalid.push(fid || "(id vide)"); continue; }

    const srcRaw = String(f0.src || "").trim();
    if (!srcRaw) { res.wouldSkipInvalid.push(fid); continue; }

    // image présente ?
    let imgEntryName = null;
    const srcLower = srcRaw.toLowerCase();
    if (entries.has(srcRaw)) imgEntryName = srcRaw;
    else {
      const base = srcRaw.split("/").pop();
      for (const name of entries.keys()) {
        const nl = name.toLowerCase();
        if (nl === srcLower) { imgEntryName = name; break; }
        if (base && nl.endsWith("/" + base.toLowerCase())) { imgEntryName = name; break; }
      }
    }
    if (!imgEntryName) { res.wouldSkipNoImage.push(fid); continue; }

    const exists = !!FICHES[fid];
    if (exists) {
      if (replaceExisting) res.wouldReplace.push(fid);
      else res.wouldSkipExisting.push(fid);
    } else {
      res.wouldAdd.push(fid);
    }
  }
  return res;
}

async function importFichesZip(file, replaceExisting) {
  const buf = await file.arrayBuffer();
  const entries = await unzipEntries(buf);

  // trouve fiches.json
  let jsonName = null;
  for (const k of entries.keys()) {
    if (k.toLowerCase().endsWith("fiches.json")) { jsonName = k; break; }
  }
  if (!jsonName) throw new Error("fiches.json introuvable dans le ZIP");
  const jsonTxt = new TextDecoder("utf-8").decode(entries.get(jsonName));
  let payload;
  try { payload = JSON.parse(jsonTxt); } catch { throw new Error("fiches.json invalide"); }
  const fichesObj = parseFichesJson(payload);
  const ids = Object.keys(fichesObj);
  if (!ids.length) throw new Error("Aucune fiche dans fiches.json");

  // charge map existante
  let custom = {};
  try {
    const raw = safeStorageGet(LS_KEYS.fichesCustom);
    if (raw) {
      const j = JSON.parse(raw);
      custom = (j && j.fiches) ? j.fiches : (j || {});
    }
  } catch { custom = {}; }
  if (!custom || typeof custom !== "object") custom = {};

  const added = [];
  const skipped = [];
  for (const id of ids) {
    const f0 = fichesObj[id];
    if (!f0) continue;
    const fid = String(id || "").trim();
    if (!fid) continue;
    const exists = !!FICHES[fid];
    if (exists && !replaceExisting) { skipped.push(fid); continue; }

    const title = String(f0.title || "Fiche").trim().slice(0, 80);
    const desc = String(f0.desc || "").trim().slice(0, 220);
    const tags = Array.isArray(f0.tags) ? f0.tags.map(t => String(t).trim()).filter(Boolean).slice(0, 10) : [];
    const srcRaw = String(f0.src || "").trim();
    if (!srcRaw) { skipped.push(fid); continue; }

    // trouver l'image correspondante dans le zip
    const srcLower = srcRaw.toLowerCase();
    let imgEntryName = null;
    if (entries.has(srcRaw)) imgEntryName = srcRaw;
    else {
      // tentative avec normalisation
      const base = srcRaw.split("/").pop();
      for (const name of entries.keys()) {
        const nl = name.toLowerCase();
        if (nl === srcLower) { imgEntryName = name; break; }
        if (base && nl.endsWith("/" + base.toLowerCase())) { imgEntryName = name; break; }
      }
    }
    if (!imgEntryName) { skipped.push(fid); continue; }

    const bytes = entries.get(imgEntryName);
    const ext = (imgEntryName.match(/\.(webp|png|jpe?g)$/i) || [])[1] || "webp";
    const key = "import/" + fid + "." + ext.toLowerCase();
    const mime = ext.toLowerCase() === "png" ? "image/png" : (ext.toLowerCase().startsWith("jp") ? "image/jpeg" : "image/webp");
    const blob = new Blob([bytes], { type: mime });
    const ok = await idbPut(key, blob);
    if (!ok) { skipped.push(fid); continue; }

    const item = { title, desc, tags, src: "db:" + key };
    if (f0.copyText) item.copyText = String(f0.copyText).slice(0, 5000);
    custom[fid] = item;
    FICHES[fid] = item;
    added.push(fid);
  }

  saveCustomFichesMap(custom);
  try { renderFichesGrid(); } catch {}
  try { updateFichesEntryQuickUI(); } catch {}
  try { updateCustomFichesCountUI(); } catch {}

  return { added, skipped };
}

function highlightHtml(text, q) {
  const safe = escapeHtml(text);
  const needle = String(q || "").trim();
  if (!needle) return safe;
  try {
    const re = new RegExp(escapeRegExp(needle), "ig");
    return safe.replace(re, (m) => `<mark class="ficheMark">${m}</mark>`);
  } catch {
    return safe;
  }
}

function syncDisplayedVersion() {
  try {
    const meta = document.querySelector('.brand__meta');
    if (meta) {
      const btn = meta.querySelector('#btnReleaseNotes');
      const base = `v${APP_VERSION} • données locales • sans compte`;
      if (btn) {
        const prefix = base + " • ";
        let done = false;
        try {
          meta.childNodes.forEach((node) => {
            if (done) return;
            if (node && node.nodeType === Node.TEXT_NODE) {
              node.textContent = prefix;
              done = true;
            }
          });
        } catch (e) {}
        if (!done) {
          try { meta.insertBefore(document.createTextNode(prefix), meta.firstChild); } catch (e) {}
        }
      } else {
        meta.textContent = base;
      }
    }

    const footer = document.querySelector('.footer__text');
    if (footer) footer.textContent = `Boussole • données locales • v${APP_VERSION}`;
    if (document && document.title) document.title = `Boussole — v${APP_VERSION}`;
  } catch (e) {}
}

// v0.6.90 — Accessibilité : lien "Aller au contenu" (skip link) + offset barres sticky
function initSkipLink() {
  try {
    const link = document.getElementById('skipLink');
    const main = document.getElementById('main');
    if (!link || !main) return;
    link.addEventListener('click', () => {
      // Déplace le focus sur <main> (utile au clavier)
      setTimeout(() => {
        try { main.focus({ preventScroll: true }); } catch (e) { try { main.focus(); } catch (_) {} }
        try { main.scrollIntoView({ block: 'start' }); } catch (_) {}

        // v0.6.90 — Évite que <main> soit partiellement masqué par les barres sticky (topbar + tabs)
        try {
          const topbar = document.querySelector('.topbar');
          const tabs = document.querySelector('.tabs');
          const off = (topbar ? topbar.getBoundingClientRect().height : 0)
                    + (tabs ? tabs.getBoundingClientRect().height : 0)
                    + 12; // marge visuelle
          requestAnimationFrame(() => {
            try {
              const y = main.getBoundingClientRect().top + window.pageYOffset - off;
              if (Number.isFinite(y)) window.scrollTo({ top: Math.max(0, y), behavior: 'auto' });
            } catch (e2) {}
          });
        } catch (e) {}
      }, 0);
    });
  } catch (e) {}
}

function nowISO() {
  return new Date().toISOString();
}

function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year:"numeric", month:"2-digit", day:"2-digit" });
  } catch {
    return (iso || "").slice(0,10);
  }
}

function safeJsonParse(str, fallback) {
  try {
    const v = JSON.parse(str);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function loadEntries() {
  const arr = safeJsonParse(safeStorageGet(LS_KEYS.entries), []);
  return Array.isArray(arr) ? arr : [];
}

function saveEntries(entries) {
  safeStorageSet(LS_KEYS.entries, JSON.stringify(entries));
}

function clamp0to10(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(10, Math.round(x)));
}

function compute14Days(entries, daysCount) {
  const daysN = (daysCount === 7 || daysCount === 14 || daysCount === 30) ? daysCount : 14;
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (daysN - 1)); // inclusive
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
  for (let i=0;i<daysN;i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0,10);
    out.push({ date: key, entry: byDay.get(key) || null });
  }
  return out;
}


function compute14DaysTwice(entries, daysCount) {
  const daysN = (daysCount === 7 || daysCount === 14 || daysCount === 30) ? daysCount : 14;
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (daysN - 1)); // inclusive
  const byDay = new Map(); // date -> {AM:{e,t}, PM:{e,t}}
  for (const e of entries) {
    if (!e || !e.ts) continue;
    const d = new Date(e.ts);
    if (Number.isNaN(d.getTime())) continue;
    if (d < start || d > end) continue;
    const key = d.toISOString().slice(0,10);
    const slot = (e.slot === "PM") ? "PM" : "AM"; // compat: absence de slot => Matin
    const t = d.getTime();
    const rec = byDay.get(key) || { AM: { e:null, t:-1 }, PM: { e:null, t:-1 } };
    if (t >= rec[slot].t) rec[slot] = { e, t };
    byDay.set(key, rec);
  }
  const out = [];
  for (let i=0;i<daysN;i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0,10);
    const rec = byDay.get(key) || { AM:{e:null}, PM:{e:null} };
    out.push({ date: key, slot: "AM", entry: rec.AM.e || null });
    out.push({ date: key, slot: "PM", entry: rec.PM.e || null });
  }
  return out;
}

function get14DayEntriesForSummary(entries, windowDays) {
  if (!getTwiceDailyEnabled()) {
    const days = compute14Days(entries, windowDays);
    return days.map(d => d.entry).filter(Boolean);
  }
  const rows = compute14DaysTwice(entries, windowDays);
  return rows.map(r => r.entry).filter(Boolean);
}
function avg(nums) {
  const v = nums.filter((x)=>Number.isFinite(x));
  if (!v.length) return null;
  return v.reduce((a,b)=>a+b,0) / v.length;
}

function round1(x) {
  return (Math.round(x*10)/10).toFixed(1);
}


function closeOpenNLegends() {
  const openDets = document.querySelectorAll("details.nLegend[open]");
  if (!openDets || !openDets.length) return;
  for (const det of openDets) {
    try { det.open = false; } catch (e) {}
    try { det.classList.remove("is-flash"); } catch (e) {}
    try { if (det.__ctxTimer) clearTimeout(det.__ctxTimer); } catch (e) {}
  }
}

function setTab(name) {
  // v0.5.17 — En quittant l’onglet Évolution, fermer les légendes “n=” (évite de revenir avec une légende restée ouverte)
  const prevTabBtn = document.querySelector(".tab.is-active");
  const prevTab = prevTabBtn && prevTabBtn.dataset ? prevTabBtn.dataset.tab : null;
  if (prevTab === "evolution" && name !== "evolution") closeOpenNLegends();


  document.querySelectorAll(".tab").forEach(btn => {
    const active = btn.dataset.tab === name;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("is-active"));
  const el = $("tab-" + name);
  if (el) el.classList.add("is-active");

  // v0.6.71 — En entrant dans l’onglet PDF, forcer une synchronisation silencieuse des contacts (autoremplissage navigateur)
  if (name === 'pdf') {
    try { syncHealthContactsFromUI(); } catch (e) {}
    try { renderPdfPreview(); } catch (e) {}
  }

  // v0.5.26 — Mémoriser le dernier onglet (évite de repartir de zéro après rechargement)
  try {
    if (["today","evolution","pdf","settings"].includes(name)) {
      safeStorageSet(LS_KEYS.uiLastTab, name);
    }
  } catch (e) {}
}

function registerTabs() {
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => {
      setTab(btn.dataset.tab);
      if (btn.dataset.tab === "evolution") renderEvolution();
      if (btn.dataset.tab === "pdf") { syncPdfWindowUI(); renderPdfPreview(); }
      if (btn.dataset.tab === "settings") {
        syncDiagToggle();
        syncExtraSettingsUI();
        syncHealthContactsUI();
        // v0.6.83 — indicateur contacts immédiat à l’ouverture
        try { refreshContactsSaveIndicatorOnOpen(); } catch (e) {}
        syncImportUI();
        syncErrorsIndicator();
      }
    });
  });
}

function syncSlider(sliderId, pillId) {
  const s = $(sliderId);
  const p = $(pillId);
  if (!s || !p) return;

  const refresh = () => {
    const unset = (s.dataset && s.dataset.unset === "1");
    s.classList.toggle("is-unset", unset);
    p.classList.toggle("is-unset", unset);
    p.textContent = unset ? "—" : String(clamp0to10(s.value));
  };

  const onInput = () => {
    if (s.dataset) s.dataset.unset = "0";
    refresh();
    onFormChanged();
  };

  s.addEventListener("input", onInput);
  // Initial state
  if (!s.dataset) s.dataset = {};
  if (s.dataset.unset == null) s.dataset.unset = "1"; // par défaut : vide
  refresh();
}

function setSliderValue(sliderId, valueOrNull) {
  const s = $(sliderId);
  const p = $(sliderId + "Val");
  if (!s) return;
  const unset = (valueOrNull == null);
  if (unset) {
    s.value = "0";
    if (s.dataset) s.dataset.unset = "1";
    s.classList.add("is-unset");
    if (p) {
      p.textContent = "—";
      p.classList.add("is-unset");
    }
    return;
  }
  const v = clamp0to10(valueOrNull);
  s.value = String(v);
  if (s.dataset) s.dataset.unset = "0";
  s.classList.remove("is-unset");
  if (p) {
    p.textContent = String(v);
    p.classList.remove("is-unset");
  }
}

function getSliderMaybeValue(sliderId) {
  const s = $(sliderId);
  if (!s) return null;
  const unset = (s.dataset && s.dataset.unset === "1");
  if (unset) return null;
  return clamp0to10(s.value);
}

function getTodayDateKey() {
  return new Date().toISOString().slice(0,10);
}

function getDraftSlot() {
  return getTwiceDailyEnabled() ? getSelectedSlot() : "DAY";
}

function loadDraftStore() {
  const obj = safeJsonParse(safeStorageGet(LS_KEYS.drafts), {});
  return (obj && typeof obj === "object" && !Array.isArray(obj)) ? obj : {};
}

function saveDraftStore(store) {
  // garde seulement les 7 derniers jours (local)
  try {
    const keep = new Set();
    const now = new Date();
    for (let i=0;i<7;i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      keep.add(d.toISOString().slice(0,10));
    }
    const out = {};
    for (const k in store) {
      if (keep.has(k)) out[k] = store[k];
    }
    safeStorageSet(LS_KEYS.drafts, JSON.stringify(out));
  } catch {
    safeStorageSet(LS_KEYS.drafts, JSON.stringify(store));
  }
}

function getDraft(dateKey, slot) {
  try {
    const store = loadDraftStore();
    const day = store[dateKey];
    if (!day) return null;
    return day[slot] || null;
  } catch {
    return null;
  }
}

function setDraft(dateKey, slot, draft) {
  const store = loadDraftStore();
  store[dateKey] = (store[dateKey] && typeof store[dateKey] === "object") ? store[dateKey] : {};
  if (draft == null) {
    try { delete store[dateKey][slot]; } catch {}
  } else {
    store[dateKey][slot] = draft;
  }
  saveDraftStore(store);
}

function readDraftFromForm() {
  const d = {
    energy: getSliderMaybeValue("energy"),
    sleep: getSliderMaybeValue("sleep"),
    comfort: getSliderMaybeValue("comfort"),
    memory: getSliderMaybeValue("memory"),
    concentration: getSliderMaybeValue("concentration"),
    orthostatic: getSliderMaybeValue("orthostatic"),
    mood: getSliderMaybeValue("mood"),
    serenity: getSliderMaybeValue("serenity"),
  };
  return d;
}

function applyDraftToForm(d) {
  if (!d || typeof d !== "object") { resetTodayFormToUnset(); return; }
  setSliderValue("energy", d.energy ?? null);
  setSliderValue("sleep", d.sleep ?? null);
  setSliderValue("comfort", d.comfort ?? null);
  setSliderValue("memory", d.memory ?? null);
  setSliderValue("concentration", d.concentration ?? null);
  setSliderValue("orthostatic", d.orthostatic ?? null);
  setSliderValue("mood", d.mood ?? null);
  setSliderValue("serenity", d.serenity ?? null);
}

let __draftTimer = null;
let __autoTimer = null;
let __slotCurrent = "AM";
let __lastAutoSig = {}; // key -> signature

function flushDraft(slotOverride) {
  try {
    const dateKey = getTodayDateKey();
    const slot = slotOverride || getDraftSlot();
    const d = readDraftFromForm();
    setDraft(dateKey, slot, d);
  } catch {}
}

function scheduleDraftSave() {
  if (__draftTimer) { try { clearTimeout(__draftTimer); } catch {} }
  __draftTimer = setTimeout(() => {
    __draftTimer = null;
    flushDraft();
  }, 200);
}

function canAutoSave(d) {
  return d && d.energy != null && d.sleep != null && d.comfort != null;
}

function buildAutoSig(dateKey, slot, d) {
  // signature stable (base + extras visibles)
  return JSON.stringify({
    dateKey, slot,
    energy: d.energy, sleep: d.sleep, comfort: d.comfort,
    memory: (getExtraEnabled("memory") ? d.memory : null),
    concentration: (getExtraEnabled("concentration") ? d.concentration : null),
    orthostatic: (getExtraEnabled("orthostatic") ? d.orthostatic : null),
    mood: (getExtraEnabled("mood") ? d.mood : null),
    serenity: (getExtraEnabled("serenity") ? d.serenity : null),
  });
}

function scheduleAutoSave() {
  if (__autoTimer) { try { clearTimeout(__autoTimer); } catch {} }
  __autoTimer = setTimeout(() => {
    __autoTimer = null;
    try {
      const dateKey = getTodayDateKey();
      const slot = getDraftSlot();
      const d = readDraftFromForm();
      if (!canAutoSave(d)) return;

      const key = dateKey + "|" + slot;
      const sig = buildAutoSig(dateKey, slot, d);
      if (__lastAutoSig[key] === sig) return;

      const ok = saveEntry({ silent:true, source:"auto" });
      if (ok) __lastAutoSig[key] = sig;
    } catch {}
  }, 700);
}

function onFormChanged() {
  scheduleDraftSave();
  scheduleAutoSave();
}

function renderLastSaved() {
  const entries = loadEntries();
  const el = $("lastSaved");
  if (!entries.length) {
    el.textContent = "Aucune entrée enregistrée.";
    return;
  }
  const e = entries[entries.length - 1];
  const slot = (e && e.slot) ? ` • ${slotLabel(e.slot)}` : "";
  el.textContent = `Dernière entrée : ${fmtDate(e.ts)}${slot} • Énergie ${e.energy}/10 • Sommeil ${e.sleep}/10 • Confort ${e.comfort}/10`;
}

function quickCheckin() {
  const entries = loadEntries();
  if (!entries.length) {
    alert("Aucune entrée enregistrée pour pré-remplir.");
    return;
  }
  const last = entries[entries.length - 1] || null;
  if (!last) return;

  setSliderValue("energy", last.energy);
  setSliderValue("sleep", last.sleep);
  setSliderValue("comfort", last.comfort);

  // Extras : uniquement si activés + présents dans la dernière entrée
  const legacyClarity = (last && last.clarity != null) ? last.clarity : null;

  if (getExtraEnabled("memory")) {
    const v = (last.memory != null) ? last.memory : legacyClarity;
    if (v != null) setSliderValue("memory", v);
  }
  if (getExtraEnabled("concentration")) {
    const v = (last.concentration != null) ? last.concentration : legacyClarity;
    if (v != null) setSliderValue("concentration", v);
  }
  if (getExtraEnabled("orthostatic") && last.orthostatic != null) setSliderValue("orthostatic", last.orthostatic);
  if (getExtraEnabled("mood") && last.mood != null) setSliderValue("mood", last.mood);
  if (getExtraEnabled("serenity") && last.serenity != null) setSliderValue("serenity", last.serenity);

  // Feedback léger (sans ajouter de nouvelle UI)
  try {
    const el = $("lastSaved");
    const base = el ? el.textContent : "";
    if (el && base) {
      el.textContent = base + " • Pré-rempli";
      setTimeout(() => { try { renderLastSaved(); } catch {} }, 2500);
    }
  } catch {}
}

function applyExtraSection() {
  const sec = $("extraSection");
  if (!sec) return;

  // Affichage fin : montrer uniquement les curseurs réellement activés
  const map = [
    ["memory", "memory"],
    ["concentration", "concentration"],
    ["orthostatic", "orthostatic"],
    ["mood", "mood"],
    ["serenity", "serenity"],
  ];

  let any = false;
  for (const [key, id] of map) {
    const enabled = getExtraEnabled(key);
    any = any || enabled;
    const input = $(id);
    if (!input) continue;
    const field = input.closest(".field");
    if (field) field.style.display = enabled ? "block" : "none";
  }

  // Le bloc global n'apparaît que s'il y a au moins 1 extra activé
  sec.style.display = any ? "block" : "none";
}


function saveEntry(evOrOpts) {
  // click handler passes an Event; auto-save passes {silent:true}
  const isEvent = !!(evOrOpts && typeof evOrOpts === "object" && ("preventDefault" in evOrOpts || "target" in evOrOpts));
  const opts = isEvent ? {} : (evOrOpts || {});
  const silent = !!opts.silent;

  const d = readDraftFromForm();

  // Base requis
  if (d.energy == null || d.sleep == null || d.comfort == null) {
    if (!silent) alert("Renseigne au minimum : Énergie, Sommeil, Confort (les 3).");
    return false;
  }

  const entries = loadEntries();
  const entry = {
    ts: nowISO(),
    energy: d.energy,
    sleep: d.sleep,
    comfort: d.comfort,
  };
  if (getTwiceDailyEnabled()) entry.slot = getSelectedSlot();

  // Champs optionnels : uniquement si activés ET renseignés
  if (getExtraEnabled("memory") && d.memory != null) entry.memory = d.memory;
  if (getExtraEnabled("concentration") && d.concentration != null) entry.concentration = d.concentration;
  if (getExtraEnabled("orthostatic") && d.orthostatic != null) entry.orthostatic = d.orthostatic;
  if (getExtraEnabled("mood") && d.mood != null) entry.mood = d.mood;
  if (getExtraEnabled("serenity") && d.serenity != null) entry.serenity = d.serenity;

  entries.push(entry);
  saveEntries(entries);
  safeStorageRemove(LS_KEYS.lastDeleted);
  renderLastSaved();

  // Après un enregistrement (manuel), on synchronise le brouillon courant
  try { flushDraft(); } catch {}



  // v0.5.32 — si un rappel est déjà activé, le déplacer automatiquement à demain
  try { bumpReminderAfterSave(); } catch {}

  // v0.5.31 — Micro-écran “C’est noté ✅”
  if (!silent) {
    try { openSavedModal(); } catch {}
  }
  return true;
}

function undoLast() {
  const entries = loadEntries();
  if (!entries.length) return;
  const removed = entries.pop();
  saveEntries(entries);
  safeStorageSet(LS_KEYS.lastDeleted, JSON.stringify(removed));
  renderLastSaved();
}

function renderEvolution() {
  const entries = loadEntries();
  const twice = getTwiceDailyEnabled();
  const windowDays = getEvolutionWindowDays();

  // v0.5.26 — Titre et légendes adaptés à la période
  const evoTitle = $("evolutionTitle");
  if (evoTitle) evoTitle.textContent = `Évolution (${windowDays} jours)`;

  const nAMTitle = $("nAM");
  const nPMTitle = $("nPM");
  if (nAMTitle) { try { nAMTitle.title = `Nombre de jours avec une entrée Matin (sur ${windowDays})`; } catch(e) {} }
  if (nPMTitle) { try { nPMTitle.title = `Nombre de jours avec une entrée Soir (sur ${windowDays})`; } catch(e) {} }

  const nTxtAM = document.querySelector ? document.querySelector("#nLegendAM .nLegend__text") : null;
  const nTxtPM = document.querySelector ? document.querySelector("#nLegendPM .nLegend__text") : null;
  if (nTxtAM) nTxtAM.textContent = `n = nombre de jours avec une valeur renseignée (sur ${windowDays} jours).`;
  if (nTxtPM) nTxtPM.textContent = `n = nombre de jours avec une valeur renseignée (sur ${windowDays} jours).`;

  // Metrics à afficher
  const metrics = [
    { key: "energy", label: "Énergie" },
    { key: "sleep", label: "Sommeil" },
    { key: "comfort", label: "Confort" },
  ];
  if (getExtraEnabled("memory")) metrics.push({ key: "memory", label: "Mémoire" });
  if (getExtraEnabled("concentration")) metrics.push({ key: "concentration", label: "Concentration" });
  if (getExtraEnabled("orthostatic")) metrics.push({ key: "orthostatic", label: "Orthost." });
  if (getExtraEnabled("mood")) metrics.push({ key: "mood", label: "Humeur" });
  if (getExtraEnabled("serenity")) metrics.push({ key: "serenity", label: "Sérénité" });

  // Affichage : standard vs 2×/jour
  const stdWrap = $("evolutionStandard");
  const twWrap = $("evolutionTwice");
  if (stdWrap && twWrap) {
    // On laisse le CSS définir le display natif (notamment grid en mode 2×/jour)
    stdWrap.style.display = twice ? "none" : "";
    twWrap.style.display = twice ? "" : "none";
  }

  const fmtDelta = (x) => {
    if (x == null || !Number.isFinite(Number(x))) return "—";
    const r = Math.round(Number(x) * 10) / 10;
    if (!Number.isFinite(r)) return "—";
    if (r > 0) return "+" + r.toFixed(1);
    if (r < 0) return "−" + Math.abs(r).toFixed(1);
    return "0.0";
  };

  const deltaGlyph = (x) => {
    if (x == null || !Number.isFinite(Number(x))) return "";
    const r = Number(x);
    if (r > 0.05) return "↗";
    if (r < -0.05) return "↘";
    return "→";
  };

  const makeKpis = (containerEl, list, subText, deltaByKey) => {
    if (!containerEl) return;
    containerEl.innerHTML = "";
    const make = (label, value, sub, delta) => {
      const div = document.createElement("div");
      div.className = "kpi";
      const showDelta = !!deltaByKey;
      const deltaText = !showDelta
        ? ""
        : `Soir – Matin ${delta == null ? "—" : `${deltaGlyph(delta)} ${fmtDelta(delta)}`.trim()}`;
      const deltaHtml = showDelta
        ? `<span class="kpi__delta" title="Différence des moyennes ${windowDays} jours (Soir – Matin)">${deltaText}</span>`
        : "";
      div.innerHTML = `
        <div class="kpi__label">${label}</div>
        <div class="kpi__value">${value}</div>
        <div class="kpi__sub"><span>${sub}</span>${deltaHtml}</div>
      `;
      return div;
    };
    for (const m of metrics) {
      // n= : nombre de jours réellement pris en compte pour cette métrique (valeur renseignée)
      const raw = list
        .map(e => e && e[m.key])
        .filter(v => v != null && Number.isFinite(Number(v)))
        .map(Number);
      const n = raw.length;
      const a = avg(raw);
      const delta = deltaByKey ? deltaByKey[m.key] : null;
      const sub = `${subText || ("moyenne " + windowDays + " j")} • n=${n}`;
      containerEl.appendChild(make(m.label, a==null ? "—" : round1(a), sub, delta));
    }
  };

  const fillTable = (tableEl, datesDesc, entryForDate, nByMetric, legendKey) => {
    if (!tableEl) return;
    const theadRow = tableEl.querySelector("thead tr");
    if (theadRow) {
      if (nByMetric) {
        theadRow.innerHTML = "<th>Date</th>" + metrics.map(m => {
          const n = (nByMetric && (m.key in nByMetric)) ? nByMetric[m.key] : 0;
          const ctrl = (legendKey === "AM") ? "nLegendAM" : (legendKey === "PM") ? "nLegendPM" : "";
          const mm = window.matchMedia ? window.matchMedia("(hover: none) and (pointer: coarse)") : null;
          const isCoarse = mm ? mm.matches : ("ontouchstart" in window);
          const aria = (ctrl && isCoarse) ? ` role="button" tabindex="0" aria-controls="${ctrl}" aria-expanded="false"` : "";
          return `<th><div class="th__stack"><div class="th__label">${m.label}</div><div class="th__n"${aria} title="Nombre de jours avec une valeur renseignée pour ${m.label} (sur ${windowDays} jours)">n=${n}</div></div></th>`;
        }).join("");
      } else {
        theadRow.innerHTML = "<th>Date</th>" + metrics.map(m => `<th>${m.label}</th>`).join("");
      }
    }

    const tbody = tableEl.querySelector("tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    for (const date of datesDesc) {
      const e = entryForDate(date);
      const tr = document.createElement("tr");
      let html = `<td>${date}</td>`;
      for (const m of metrics) html += `<td>${e ? (e[m.key] ?? "—") : "—"}</td>`;
      tr.innerHTML = html;
      tbody.appendChild(tr);
    }
  };

  // ---------- Mode standard ----------
  if (!twice) {
    const days = compute14Days(entries, windowDays);
    const datesDesc = days.map(d => d.date).slice().reverse();
    const byDate = new Map(days.map(d => [d.date, d.entry || null]));
    const list = days.map(d => d.entry).filter(Boolean);

    makeKpis($("kpis"), list, `moyenne ${windowDays} j`);
    fillTable($("table14"), datesDesc, (date) => byDate.get(date) || null);
    return;
  }

  // ---------- Mode 2×/jour : vue séparée Matin vs Soir ----------
  const rows = compute14DaysTwice(entries, windowDays); // chronologique, 2 lignes/jour (AM, PM)
  const byDate = new Map(); // date -> {AM, PM}
  for (let i=0;i<rows.length;i+=2) {
    const date = rows[i].date;
    byDate.set(date, {
      AM: rows[i].entry || null,
      PM: rows[i+1] ? (rows[i+1].entry || null) : null,
    });
  }
  const dates = Array.from(byDate.keys()); // chronologique (14)
  const datesDesc = dates.slice().reverse();

  const listAM = dates.map(d => (byDate.get(d) || {}).AM).filter(Boolean);
  const listPM = dates.map(d => (byDate.get(d) || {}).PM).filter(Boolean);

  // Indicateur n= (jours avec une entrée) — utile pour interpréter les moyennes/deltas
  const nAMEl = $("nAM");
  const nPMEl = $("nPM");
  if (nAMEl) nAMEl.textContent = `n=${listAM.length}/${windowDays}`;
  if (nPMEl) nPMEl.textContent = `n=${listPM.length}/${windowDays}`;

  // Mini‑indicateur : Soir – Matin (différence des moyennes 14 j) — uniquement en mode 2×/jour
  const deltaByKey = {};
  for (const m of metrics) {
    const vAM = listAM.map(e => e && e[m.key]).filter(v => v != null && Number.isFinite(Number(v))).map(Number);
    const vPM = listPM.map(e => e && e[m.key]).filter(v => v != null && Number.isFinite(Number(v))).map(Number);
    const aAM = avg(vAM);
    const aPM = avg(vPM);
    deltaByKey[m.key] = (aAM == null || aPM == null) ? null : (aPM - aAM);
  }

  makeKpis($("kpisAM"), listAM, `moyenne ${windowDays} j (Matin)`, deltaByKey);
  makeKpis($("kpisPM"), listPM, `moyenne ${windowDays} j (Soir)`, deltaByKey);

  // n= par métrique (complétude) — affiché dans l’en-tête des tableaux
  const nByMetricAM = {};
  const nByMetricPM = {};
  for (const m of metrics) {
    nByMetricAM[m.key] = listAM.map(e => e && e[m.key]).filter(v => v != null && Number.isFinite(Number(v))).length;
    nByMetricPM[m.key] = listPM.map(e => e && e[m.key]).filter(v => v != null && Number.isFinite(Number(v))).length;
  }

  fillTable($("table14AM"), datesDesc, (date) => (byDate.get(date) || {}).AM || null, nByMetricAM, "AM");
  fillTable($("table14PM"), datesDesc, (date) => (byDate.get(date) || {}).PM || null, nByMetricPM, "PM");

  // Flash du contexte (Matin/Soir) dans la légende — utile quand les 2 légendes existent à l’écran sur mobile
  const flashLegendCtx = (det, legendKey) => {
    if (!det) return;
    const ctx = det.querySelector ? det.querySelector(".nLegend__ctx") : null;
    if (!ctx) return;
    ctx.textContent = (legendKey === "AM") ? "Matin" : "Soir";
    det.classList.add("is-flash");
    try { if (det.__ctxTimer) clearTimeout(det.__ctxTimer); } catch (e) {}
    det.__ctxTimer = setTimeout(() => {
      try { det.classList.remove("is-flash"); } catch (e) {}
    }, 1600);
  };

  // ---------- Légendes “n=” (mobile) : accessibilité + contrôles ----------
  const mmNLegend = window.matchMedia ? window.matchMedia("(hover: none) and (pointer: coarse)") : null;
  const isCoarseNLegend = mmNLegend ? mmNLegend.matches : ("ontouchstart" in window);

  // Sur desktop (hover...), la légende est masquée : éviter d’exposer de faux “boutons” au clavier/lecteurs.
  const syncTitleNLegendA11y = () => {
    const am = $("nAM");
    const pm = $("nPM");
    for (const el of [am, pm]) {
      if (!el) continue;
      if (isCoarseNLegend) {
        try { el.setAttribute("role", "button"); } catch (e) {}
        try { el.setAttribute("tabindex", "0"); } catch (e) {}
      } else {
        try { el.removeAttribute("role"); } catch (e) {}
        try { el.removeAttribute("tabindex"); } catch (e) {}
        try { el.setAttribute("aria-expanded", "false"); } catch (e) {}
      }
    }
  };

  syncTitleNLegendA11y();

  const getNLegendDet = (legendKey) => {
    const id = (legendKey === "AM") ? "nLegendAM" : (legendKey === "PM") ? "nLegendPM" : "";
    return (id ? document.getElementById(id) : null) || document.querySelector(`details.nLegend[data-nlegend="${legendKey}"]`);
  };

  const cleanupLegendFx = (det) => {
    if (!det) return;
    try { det.classList.remove("is-flash"); } catch (e) {}
    try { if (det.__ctxTimer) clearTimeout(det.__ctxTimer); } catch (e) {}
  };

  const setNLegendExpanded = (legendKey, expanded) => {
    const v = expanded ? "true" : "false";
    const titleEl = (legendKey === "AM") ? $("nAM") : (legendKey === "PM") ? $("nPM") : null;
    if (titleEl) {
      try { titleEl.setAttribute("aria-expanded", v); } catch (e) {}
    }
    const tableEl = (legendKey === "AM") ? $("table14AM") : (legendKey === "PM") ? $("table14PM") : null;
    if (tableEl && tableEl.querySelectorAll) {
      const triggers = tableEl.querySelectorAll('.th__n[role="button"]');
      for (const el of triggers) {
        try { el.setAttribute("aria-expanded", v); } catch (e) {}
      }
    }
  };


  // v0.5.20 — Mobile : scroll significatif → fermer la légende “n=” (réduit le scroll parasite)
  // v0.5.22 — Seuil adaptatif selon hauteur d’écran (petit écran = plus bas, grand écran = plus haut)
  const getNLegendScrollThresholdPx = () => {
    const vh = (window.innerHeight || document.documentElement.clientHeight || 0);
    if (!vh) return 80;
    const t = Math.round(vh * 0.10); // ~10% de la hauteur d’écran
    return Math.max(60, Math.min(120, t));
  };

  const getScrollY = () => {
    try { return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0; }
    catch (e) { return 0; }
  };

  const disarmNLegendScrollClose = () => {
    try { window.__boussoleNLegendScrollArmed = false; } catch (e) {}
    try { window.__boussoleNLegendScrollBaseY = null; } catch (e) {}
    try { if (window.__boussoleNLegendScrollTimer) clearTimeout(window.__boussoleNLegendScrollTimer); } catch (e) {}
    try { window.__boussoleNLegendScrollTimer = null; } catch (e) {}
    try { window.__boussoleNLegendScrollIgnoreUntil = 0; } catch (e) {}
  };

  function ensureNLegendScrollCloseBound() {
    if (!isCoarseNLegend) return;
    if (window.__boussoleNLegendScrollBound) return;
    window.__boussoleNLegendScrollBound = true;

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      const rafFn = window.requestAnimationFrame || ((fn)=>setTimeout(fn, 16));
      raf = 1;
      rafFn(() => {
        raf = 0;

        if (!window.__boussoleNLegendScrollArmed) return;

        const openDets = document.querySelectorAll("details.nLegend[open]");
        if (!openDets || !openDets.length) return;

        const now = Date.now();
        const ignoreUntil = window.__boussoleNLegendScrollIgnoreUntil || 0;
        if (now < ignoreUntil) return;

        const y = getScrollY();
        const y0 = (typeof window.__boussoleNLegendScrollBaseY === "number") ? window.__boussoleNLegendScrollBaseY : y;
        const dy = Math.abs(y - y0);

        if (dy >= getNLegendScrollThresholdPx()) {
          closeAllNLegends();
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
  }

  const armNLegendScrollClose = () => {
    if (!isCoarseNLegend) return;
    ensureNLegendScrollCloseBound();

    try { window.__boussoleNLegendScrollArmed = true; } catch (e) {}
    try { window.__boussoleNLegendScrollBaseY = getScrollY(); } catch (e) {}

    // Ignorer le scroll causé par scrollIntoView(smooth) juste après ouverture,
    // puis recalibrer la base après l’animation.
    try { window.__boussoleNLegendScrollIgnoreUntil = Date.now() + 900; } catch (e) {}
    try { if (window.__boussoleNLegendScrollTimer) clearTimeout(window.__boussoleNLegendScrollTimer); } catch (e) {}
    window.__boussoleNLegendScrollTimer = setTimeout(() => {
      try { window.__boussoleNLegendScrollBaseY = getScrollY(); } catch (e) {}
      try { window.__boussoleNLegendScrollIgnoreUntil = Date.now() + 120; } catch (e) {}
    }, 750);
  };

  // v0.5.23 — Rotation / changement d’orientation : recalibrer la base de scroll
  // (évite une fermeture “surprise” due aux reflows après portrait ↔ paysage)
  const recalibrateNLegendScrollBase = () => {
    if (!isCoarseNLegend) return;
    let openDets = null;
    try { openDets = document.querySelectorAll("details.nLegend[open]"); } catch (e) {}
    if (!openDets || !openDets.length) return;

    // Garder le “scroll-close” actif, mais ignorer les variations dues au reflow.
    ensureNLegendScrollCloseBound();
    try { window.__boussoleNLegendScrollArmed = true; } catch (e) {}
    const now = Date.now();
    try { window.__boussoleNLegendScrollIgnoreUntil = now + 900; } catch (e) {}
    try { window.__boussoleNLegendScrollBaseY = getScrollY(); } catch (e) {}

    // Recalibrer une 2e fois après stabilisation du viewport.
    try { if (window.__boussoleNLegendViewportTimer) clearTimeout(window.__boussoleNLegendViewportTimer); } catch (e) {}
    window.__boussoleNLegendViewportTimer = setTimeout(() => {
      try { window.__boussoleNLegendScrollBaseY = getScrollY(); } catch (e) {}
      try { window.__boussoleNLegendScrollIgnoreUntil = Date.now() + 180; } catch (e) {}
    }, 650);
  };

  const bindNLegendViewportRecalibration = () => {
    if (!isCoarseNLegend) return;
    if (window.__boussoleNLegendViewportBound) return;
    window.__boussoleNLegendViewportBound = true;

    const getSig = () => {
      const w = window.innerWidth || 0;
      const h = window.innerHeight || 0;
      const o = (h >= w) ? "P" : "L";
      return { w, h, o };
    };

    let last = getSig();

    window.addEventListener("orientationchange", () => {
      recalibrateNLegendScrollBase();
      last = getSig();
    }, { passive: true });

    // v0.5.24 — Filtre “rotation réelle uniquement” :
    // Sur mobile, les micro-variations de viewport (barre d’adresse qui apparaît/disparaît)
    // peuvent déclencher des `resize` sans rotation. On ne recalibre que si la rotation est
    // très probable (changement d’orientation + variation forte sur largeur ET hauteur).
    window.addEventListener("resize", () => {
      const cur = getSig();
      const dw = Math.abs(cur.w - last.w);
      const dh = Math.abs(cur.h - last.h);
      const oriChanged = (cur.o !== last.o);
      const realRotation = oriChanged && (dw > 120) && (dh > 120);
      last = cur;
      if (realRotation) recalibrateNLegendScrollBase();
    }, { passive: true });
  };

  bindNLegendViewportRecalibration();

  const closeNLegend = (legendKey, opts) => {
    const det = getNLegendDet(legendKey);
    if (!det) return;
    try { det.open = false; } catch (e) {}
    cleanupLegendFx(det);
    setNLegendExpanded(legendKey, false);
    if (opts && opts.restoreFocus) {
      const trg = opts.triggerEl || window.__boussoleNLegendLastTrigger;
      if (trg && trg.focus) {
        try { trg.focus({ preventScroll: true }); } catch (e) { try { trg.focus(); } catch (e2) {} }
      }
    }
    // v0.5.20 — si aucune légende n’est ouverte, arrêter le “scroll-close”
    try {
      const openDets = document.querySelectorAll("details.nLegend[open]");
      if (!openDets || !openDets.length) disarmNLegendScrollClose();
    } catch (e) {}

  };

  const closeAllNLegends = (opts) => {
    // Fermer sans faire de focus à chaque appel, puis restaurer 1 seule fois si demandé.
    closeNLegend("AM");
    closeNLegend("PM");
    if (opts && opts.restoreFocus) {
      const trg = opts.triggerEl || window.__boussoleNLegendLastTrigger;
      if (trg && trg.focus) {
        try { trg.focus({ preventScroll: true }); } catch (e) { try { trg.focus(); } catch (e2) {} }
      }
    }
  };

  // Fermer l’autre légende “n=” quand on ouvre celle-ci (évite 2 légendes ouvertes sur mobile)
  const closeOtherNLegend = (legendKey) => {
    const otherKey = (legendKey === "AM") ? "PM" : "AM";
    closeNLegend(otherKey);
  };

  const openNLegend = (legendKey, triggerEl, fromKeyboard) => {
    const det = getNLegendDet(legendKey);
    if (!det) return;
    closeOtherNLegend(legendKey);
    try { det.open = true; } catch (e) {}
    setNLegendExpanded(legendKey, true);
    window.__boussoleNLegendLastTrigger = triggerEl || null;
    window.__boussoleNLegendLastKey = legendKey;
    flashLegendCtx(det, legendKey);
    // v0.5.21 — Sur mobile, ne scroller que si la légende n’est pas déjà visible (évite les ‘sauts’)
    if (isCoarseNLegend) {
      const vh = (window.innerHeight || document.documentElement.clientHeight || 0);
      const pad = 12;
      try {
        const rect = det.getBoundingClientRect();
        const fullyVisible = !!vh && (rect.top >= pad) && (rect.bottom <= (vh - pad));
        if (!fullyVisible) {
          const rafFn = window.requestAnimationFrame || ((fn)=>setTimeout(fn, 0));
          rafFn(() => {
            try {
              const r2 = det.getBoundingClientRect();
              const fullyVisible2 = !!vh && (r2.top >= pad) && (r2.bottom <= (vh - pad));
              if (!fullyVisible2) det.scrollIntoView({ behavior: "smooth", block: "nearest" });
            } catch (e) {}
          });
        }
      } catch (e) {}
    } else {
      try { det.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch (e) {}
    }
    if (fromKeyboard) {
      const btn = det.querySelector ? det.querySelector('.nLegend__close') : null;
      if (btn && btn.focus) {
        try { btn.focus({ preventScroll: true }); } catch (e) { try { btn.focus(); } catch (e2) {} }
      }
    }
  };

  const toggleNLegend = (legendKey, triggerEl, fromKeyboard) => {
    const det = getNLegendDet(legendKey);
    if (!det) return;
    const willOpen = !det.open;
    if (willOpen) openNLegend(legendKey, triggerEl, fromKeyboard);
    else closeNLegend(legendKey, { restoreFocus: !!fromKeyboard, triggerEl });
  };

  // Mobile : tap/clavier sur un “n=” (en‑tête de métrique) → toggle la légende correspondante
  const bindNLegendTap = (tableEl, legendKey) => {
    if (!tableEl) return;
    const mm = window.matchMedia ? window.matchMedia("(hover: none) and (pointer: coarse)") : null;
    const isCoarse = mm ? mm.matches : ("ontouchstart" in window);
    if (!isCoarse) return;
    if (tableEl.dataset && tableEl.dataset.nLegendTapBound === "1") return;
    if (tableEl.dataset) tableEl.dataset.nLegendTapBound = "1";

    tableEl.addEventListener("click", (ev) => {
      const t = (ev.target && ev.target.nodeType === 3) ? ev.target.parentElement : ev.target;
      const el = t && t.closest ? t.closest(".th__n") : null;
      if (!el) return;
      toggleNLegend(legendKey, el, false);
    });

    tableEl.addEventListener("keydown", (ev) => {
      const k = ev.key;
      if (!(k === "Enter" || k === " ")) return;
      const t = (ev.target && ev.target.nodeType === 3) ? ev.target.parentElement : ev.target;
      const el = t && t.closest ? t.closest(".th__n") : null;
      if (!el) return;
      ev.preventDefault();
      toggleNLegend(legendKey, el, true);
    });
  };

  bindNLegendTap($("table14AM"), "AM");
  bindNLegendTap($("table14PM"), "PM");

  // Mobile : tap/clavier sur le “n=” du titre Matin/Soir → toggle la légende correspondante
  const bindTitleNLegendTap = (el, legendKey) => {
    if (!el) return;
    const mm = window.matchMedia ? window.matchMedia("(hover: none) and (pointer: coarse)") : null;
    const isCoarse = mm ? mm.matches : ("ontouchstart" in window);
    if (!isCoarse) return;
    if (el.dataset && el.dataset.nLegendTapBound === "1") return;
    if (el.dataset) el.dataset.nLegendTapBound = "1";

    el.addEventListener("click", () => {
      toggleNLegend(legendKey, el, false);
    });

    el.addEventListener("keydown", (ev) => {
      const k = ev.key;
      if (!(k === "Enter" || k === " ")) return;
      ev.preventDefault();
      toggleNLegend(legendKey, el, true);
    });
  };

  bindTitleNLegendTap($("nAM"), "AM");
  bindTitleNLegendTap($("nPM"), "PM");

  // v0.5.16 — Mobile : tap en dehors de la légende “n=” → ferme les légendes ouvertes
  const bindOutsideCloseNLegend = () => {
    const mm = window.matchMedia ? window.matchMedia("(hover: none) and (pointer: coarse)") : null;
    const isCoarse = mm ? mm.matches : ("ontouchstart" in window);
    if (!isCoarse) return;
    if (window.__boussoleNLegendOutsideBound) return;
    window.__boussoleNLegendOutsideBound = true;

    document.addEventListener("click", (ev) => {
      const t = (ev.target && ev.target.nodeType === 3) ? ev.target.parentElement : ev.target;
      if (!t) return;

      // Ne pas interférer avec les actions d’ouverture/fermeture via les “n=” (titre ou colonnes)
      const isTrigger = (t.closest && (t.closest(".th__n") || t.closest("#nAM") || t.closest("#nPM")));
      if (isTrigger) return;

      const openDets = document.querySelectorAll("details.nLegend[open]");
      if (!openDets || !openDets.length) return;

      // Si le tap est à l’intérieur d’une légende ouverte, ne rien faire
      for (const det of openDets) {
        if (det && det.contains && det.contains(t)) return;
      }

      // Sinon : fermer toutes les légendes ouvertes
      closeAllNLegends();
    }, true); // capture : évite de refermer juste après un tap qui ouvre
  };

  bindOutsideCloseNLegend();

  // v0.5.18 — Mobile : bouton “Fermer” dans la légende “n=” (action explicite)
  const bindNLegendCloseButtons = () => {
    const mm = window.matchMedia ? window.matchMedia("(hover: none) and (pointer: coarse)") : null;
    const isCoarse = mm ? mm.matches : ("ontouchstart" in window);
    if (!isCoarse) return;
    if (window.__boussoleNLegendCloseBtnBound) return;
    window.__boussoleNLegendCloseBtnBound = true;

    document.addEventListener("click", (ev) => {
      const t = (ev.target && ev.target.nodeType === 3) ? ev.target.parentElement : ev.target;
      if (!t) return;
      const btn = (t.closest && t.closest(".nLegend__close"));
      if (!btn) return;
      ev.preventDefault();
      try { ev.stopPropagation(); } catch (e) {}
      const det = btn.closest ? btn.closest("details.nLegend") : null;
      if (!det) return;
      const key = det.getAttribute ? det.getAttribute("data-nlegend") : null;
      const restoreFocus = (document.activeElement === btn);
      if (key === "AM" || key === "PM") closeNLegend(key, { restoreFocus });
      else {
        try { det.open = false; } catch (e) {}
        cleanupLegendFx(det);
      }
    }, true);
  };

  bindNLegendCloseButtons();

  // v0.5.19 — Échap : fermer les légendes “n=” (utile clavier/accessibilité)
  const bindNLegendEscapeClose = () => {
    if (window.__boussoleNLegendEscBound) return;
    window.__boussoleNLegendEscBound = true;
    document.addEventListener("keydown", (ev) => {
      const k = ev.key;
      if (!(k === "Escape" || k === "Esc")) return;
      const openDets = document.querySelectorAll("details.nLegend[open]");
      if (!openDets || !openDets.length) return;
      ev.preventDefault();
      try { ev.stopPropagation(); } catch (e) {}
      // Restore focus only if focus is currently within an open legend
      let focusInside = false;
      try {
        const ae = document.activeElement;
        for (const det of openDets) {
          if (det && det.contains && ae && det.contains(ae)) { focusInside = true; break; }
        }
      } catch (e) {}
      closeAllNLegends({ restoreFocus: focusInside });
    }, true);
  };

  bindNLegendEscapeClose();

  // Robustesse : si la légende est ouverte via son <summary>, garder l’exclusivité + aria cohérent
  const bindNLegendDetailsToggle = (legendKey) => {
    const det = getNLegendDet(legendKey);
    if (!det) return;
    if (det.dataset && det.dataset.nLegendToggleBound === "1") return;
    if (det.dataset) det.dataset.nLegendToggleBound = "1";
    det.addEventListener("toggle", () => {
      if (det.open) {
        closeOtherNLegend(legendKey);
        setNLegendExpanded(legendKey, true);
        armNLegendScrollClose();
      } else {
        setNLegendExpanded(legendKey, false);
        cleanupLegendFx(det);
        try {
          const openDets = document.querySelectorAll("details.nLegend[open]");
          if (!openDets || !openDets.length) disarmNLegendScrollClose();
        } catch (e) {}
      }
    });
  };

  bindNLegendDetailsToggle("AM");
  bindNLegendDetailsToggle("PM");

}

function buildSummaryText() {
  try { syncHealthContactsFromUI(); } catch (e) {}
  const entries = loadEntries();
  const windowDays = getEvolutionWindowDays();
  const list = get14DayEntriesForSummary(entries, windowDays);
  const energyAvg = avg(list.map(e => e.energy));
  const sleepAvg = avg(list.map(e => e.sleep));
  const comfortAvg = avg(list.map(e => e.comfort));

  const hasMemory = list.some(e => e && e.memory != null);
  const hasConcentration = list.some(e => e && e.concentration != null);
  const hasLegacyClarity = list.some(e => e && e.clarity != null);

  const memoryAvg = hasMemory ? avg(list.map(e => e.memory).filter(x => x != null)) : null;
  const concentrationAvg = hasConcentration ? avg(list.map(e => e.concentration).filter(x => x != null)) : null;
  const legacyClarityAvg = (!hasMemory && !hasConcentration && hasLegacyClarity)
    ? avg(list.map(e => e.clarity).filter(x => x != null))
    : null;

  const orthostaticAvg = avg(list.map(e => e.orthostatic).filter(x=>x!=null));
  const moodAvg = avg(list.map(e => e.mood).filter(x=>x!=null));
  const serenityAvg = avg(list.map(e => e.serenity).filter(x=>x!=null));

  // 2×/jour : moyennes séparées Matin/Soir (mêmes jours)
  // Compat: certaines versions stockent le moment via e.slot ("AM"/"PM") plutôt que e.moment ("Matin"/"Soir").
  const normMoment = (e) => {
    if (!e) return "";
    const m = String(e.moment || "").trim().toLowerCase();
    if (m === "matin" || m === "soir") return m;
    const slot = String(e.slot || "").trim().toUpperCase();
    if (slot === "AM") return "matin";
    if (slot === "PM") return "soir";
    return "";
  };
  const listMorning = getTwiceDailyEnabled() ? list.filter(e => normMoment(e) === "matin") : [];
  const listEvening = getTwiceDailyEnabled() ? list.filter(e => normMoment(e) === "soir") : [];
  const avgFor = (arr, key) => {
    if (!arr || !arr.length) return null;
    const xs = arr.map(e => e ? e[key] : null).filter(x => x != null);
    return xs.length ? avg(xs) : null;
  };
  const morningAvg = getTwiceDailyEnabled() ? {
    energy: avgFor(listMorning, 'energy'),
    sleep: avgFor(listMorning, 'sleep'),
    comfort: avgFor(listMorning, 'comfort'),
    memory: avgFor(listMorning, 'memory'),
    concentration: avgFor(listMorning, 'concentration'),
    clarity: avgFor(listMorning, 'clarity'),
    orthostatic: avgFor(listMorning, 'orthostatic'),
    mood: avgFor(listMorning, 'mood'),
    serenity: avgFor(listMorning, 'serenity')
  } : null;
  const eveningAvg = getTwiceDailyEnabled() ? {
    energy: avgFor(listEvening, 'energy'),
    sleep: avgFor(listEvening, 'sleep'),
    comfort: avgFor(listEvening, 'comfort'),
    memory: avgFor(listEvening, 'memory'),
    concentration: avgFor(listEvening, 'concentration'),
    clarity: avgFor(listEvening, 'clarity'),
    orthostatic: avgFor(listEvening, 'orthostatic'),
    mood: avgFor(listEvening, 'mood'),
    serenity: avgFor(listEvening, 'serenity')
  } : null;

  const last = entries.length ? entries[entries.length - 1] : null;
  // 2×/jour : récupérer la dernière entrée du matin et du soir (pour le PDF)
  const findLastByMoment = (arr, momentLabel) => {
    for (let i = (arr||[]).length - 1; i >= 0; i--) {
      const e = arr[i];
      if (!e) continue;
      const m = normMoment(e);
      const want = String(momentLabel||"").trim().toLowerCase();
      if (m === want) return e;
    }
    return null;
  };
  const lastMorning = getTwiceDailyEnabled() ? findLastByMoment(entries, "Matin") : null;
  const lastEvening = getTwiceDailyEnabled() ? findLastByMoment(entries, "Soir") : null;

  const lines = [];

  // Wrap util for the PDF (no automatic wrapping in the minimal PDF renderer).
  // Keep it simple and predictable.
  const WRAP_MAX = 78;
  const wrapWords = (s, maxLen) => {
    const text = String(s ?? "").replace(/\s+/g, " ").trim();
    if (!text) return [];
    if (text.length <= maxLen) return [text];
    const out = [];
    const words = text.split(" ");
    let cur = "";
    for (const w of words) {
      if (!cur) {
        cur = w;
        continue;
      }
      if ((cur.length + 1 + w.length) <= maxLen) {
        cur += " " + w;
      } else {
        out.push(cur);
        cur = w;
      }
    }
    if (cur) out.push(cur);
    // If a single word is longer than maxLen, hard-split it.
    const out2 = [];
    for (const line of out) {
      if (line.length <= maxLen) { out2.push(line); continue; }
      let i = 0;
      while (i < line.length) {
        out2.push(line.slice(i, i + maxLen));
        i += maxLen;
      }
    }
    return out2;
  };
  const pushWrapped = (prefix, value, indent) => {
    const p = String(prefix ?? "");
    const v = String(value ?? "").trim();
    const baseMax = Math.max(20, WRAP_MAX - p.length);
    if (!v) {
      lines.push(p + "-");
      return;
    }
    const parts = wrapWords(v, baseMax);
    if (!parts.length) {
      lines.push(p + "-");
      return;
    }
    lines.push(p + parts[0]);
    for (let i = 1; i < parts.length; i++) lines.push(String(indent ?? "  ") + parts[i]);
  };
  lines.push(`${APP_NAME} - Résumé (1 page)`);
  lines.push(`Version : v${APP_VERSION}`);
  lines.push(`Mode : ${getTwiceDailyEnabled() ? "2×/jour (Matin/Soir)" : "Standard"}`);
  lines.push(`Généré le : ${new Date().toLocaleString()}`);
  lines.push("");
  // v0.5.30 — Pré-consultation : objectif (1 phrase)
  const consultGoal = getConsultGoal();
  lines.push("Pré-consultation :");
  pushWrapped("- Objectif de la consultation : ", consultGoal ? consultGoal : "", "  ");

  // v0.5.62 — Contacts santé (affichage multi-lignes pour éviter les lignes trop longues dans le PDF)
  const hc = getHealthContacts({ preferUI: true });
  lines.push("Mes professionnels de santé :");
  lines.push("- Médecin :");
  pushWrapped("  Nom : ", hc.doctor.name, "    ");
  pushWrapped("  Téléphone : ", hc.doctor.phone, "    ");
  pushWrapped("  Adresse : ", hc.doctor.address, "    ");
  lines.push("- Pharmacie :");
  pushWrapped("  Nom : ", hc.pharmacy.name, "    ");
  pushWrapped("  Téléphone : ", hc.pharmacy.phone, "    ");
  pushWrapped("  Adresse : ", hc.pharmacy.address, "    ");
  lines.push("");

  // Dernière entrée (PDF)
  const pushEntryBlock = (title, entry) => {
    lines.push(title + " :");
    if (!entry) { lines.push("- aucune"); lines.push(""); return; }
    lines.push(`- Date : ${entry.date || "-"}`);
    const mLabel = (normMoment(entry) === "matin") ? "Matin" : (normMoment(entry) === "soir") ? "Soir" : (entry.moment || entry.slot || "");
    if (mLabel) lines.push(`- Moment : ${mLabel}`);
    lines.push(`- Énergie : ${entry.energy}/10`);
    lines.push(`- Sommeil : ${entry.sleep}/10`);
    lines.push(`- Confort : ${entry.comfort}/10`);
    const hasNew = (entry && (entry.memory != null || entry.concentration != null));
    if (entry.memory != null) lines.push(`- Mémoire : ${entry.memory}/10`);
    if (entry.concentration != null) lines.push(`- Concentration : ${entry.concentration}/10`);
    if (!hasNew && entry.clarity != null) lines.push(`- Mémoire / concentration (ancien “Clarté mentale”) : ${entry.clarity}/10`);
    if (entry.orthostatic != null) lines.push(`- Orthostatisme : ${entry.orthostatic}/10`);
    if (entry.mood != null) lines.push(`- Humeur : ${entry.mood}/10`);
    if (entry.serenity != null) lines.push(`- Sérénité : ${entry.serenity}/10`);
    lines.push("");
  };

  if (getTwiceDailyEnabled()) {
    pushEntryBlock("Dernière entrée (Matin)", lastMorning);
    pushEntryBlock("Dernière entrée (Soir)", lastEvening);
  } else {
    pushEntryBlock("Dernière entrée", last);
  }

  const pushAvgBlock = (title, obj, fallbackLegacy) => {
    lines.push(title + ` (${windowDays} jours) :`);
    lines.push(`- Énergie : ${obj?.energy==null ? "-" : round1(obj.energy)}/10`);
    lines.push(`- Sommeil : ${obj?.sleep==null ? "-" : round1(obj.sleep)}/10`);
    lines.push(`- Confort : ${obj?.comfort==null ? "-" : round1(obj.comfort)}/10`);
    if (obj?.memory!=null) lines.push(`- Mémoire : ${round1(obj.memory)}/10`);
    if (obj?.concentration!=null) lines.push(`- Concentration : ${round1(obj.concentration)}/10`);
    if (fallbackLegacy!=null) lines.push(`- Mémoire / concentration (ancien “Clarté mentale”) : ${round1(fallbackLegacy)}/10`);
    if (obj?.orthostatic!=null) lines.push(`- Orthostatisme : ${round1(obj.orthostatic)}/10`);
    if (obj?.mood!=null) lines.push(`- Humeur : ${round1(obj.mood)}/10`);
    if (obj?.serenity!=null) lines.push(`- Sérénité : ${round1(obj.serenity)}/10`);
    lines.push("");
  };

  if (getTwiceDailyEnabled()) {
    // Pour la compatibilité “Clarté mentale” : on garde le fallback par bloc si besoin
    const legacyM = (!hasMemory && !hasConcentration && hasLegacyClarity) ? avg(listMorning.map(e => e.clarity).filter(x=>x!=null)) : null;
    const legacyE = (!hasMemory && !hasConcentration && hasLegacyClarity) ? avg(listEvening.map(e => e.clarity).filter(x=>x!=null)) : null;
    pushAvgBlock("Moyennes (Matin)", morningAvg, legacyM);
    pushAvgBlock("Moyennes (Soir)", eveningAvg, legacyE);
  } else {
    pushAvgBlock("Moyennes", {energy: energyAvg, sleep: sleepAvg, comfort: comfortAvg, memory: memoryAvg, concentration: concentrationAvg, orthostatic: orthostaticAvg, mood: moodAvg, serenity: serenityAvg}, legacyClarityAvg);
  }

  lines.push("Notes :");
  lines.push("- Generation 100% locale, sans compte, sans envoi.");
  return lines.join("\n");
}

/* ---------- PDF minimal (Helvetica builtin) ----------
   PDF très simple, 1 page, texte uniquement. Offline-friendly.
*/
function pdfEscape(s) {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r?\n/g, "\\n");
}

function pdfLatin1Bytes(str) {
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    out[i] = (code <= 0xFF) ? code : 63; // '?'
  }
  return out;
}

function makeSimplePdfFromLines(lines) {
  // A4 portrait in points: 595 x 842
  const pageW = 595;
  const pageH = 842;
  const marginX = 50;
  let y = pageH - 72;

  const fontSize = 12;
  const leading = 16;

  let stream = "BT\n/F1 " + fontSize + " Tf\n" + marginX + " " + y + " Td\n" + leading + " TL\n";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    stream += "(" + pdfEscape(line) + ") Tj\n";
    if (i < lines.length - 1) stream += "T*\n";
  }
  stream += "ET\n";

  // IMPORTANT:
  // - Builtin Type1 fonts + simple PDFs expect 8-bit encodings (WinAnsi/PDFDocEncoding), not UTF-8.
  // - We therefore write the whole file as Latin-1 bytes and declare WinAnsiEncoding for Helvetica.
  const streamLen = pdfLatin1Bytes(stream).length;

  const objs = [];
  const addObj = (s) => { objs.push(s); return objs.length; };

  addObj("<< /Type /Catalog /Pages 2 0 R >>");
  addObj("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  addObj("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + pageW + " " + pageH + "] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>");
  addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  addObj("<< /Length " + streamLen + " >>\nstream\n" + stream + "endstream");

  let pdf = "%PDF-1.4\n%âãÏÓ\n";
  const offsets = [0];
  for (let i = 0; i < objs.length; i++) {
    offsets.push(pdf.length);
    pdf += (i + 1) + " 0 obj\n" + objs[i] + "\nendobj\n";
  }
  const xrefPos = pdf.length;
  pdf += "xref\n0 " + (objs.length + 1) + "\n";
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objs.length; i++) {
    const off = String(offsets[i]).padStart(10, "0");
    pdf += off + " 00000 n \n";
  }
  pdf += "trailer\n<< /Size " + (objs.length + 1) + " /Root 1 0 R >>\nstartxref\n" + xrefPos + "\n%%EOF";

  const bytes = pdfLatin1Bytes(pdf);
  return new Blob([bytes], { type: "application/pdf" });
}

// v0.5.64 — PDF "plus joli" (toujours 1 page, offline-friendly)
// Objectif : hiérarchie (titres/sections), marges, séparateurs, footer.
function makePrettyPdfFromSummaryLines(lines, themeKey) {
  // A4 portrait in points: 595 x 842
  const pageW = 595;
  const pageH = 842;
  const marginX = 48;
  const marginTop = 64;
  const marginBottom = 64;

  // Thème (Coloré / Noir & blanc)
  const theme = (() => {
    const k = (themeKey === "bw") ? "bw" : "color";
    if (k === "bw") {
      return {
        mode: "bw",
        headerBg: 0.94,
        headerTitle: 0.0,
        headerSub: 0.15,
        sectionBg: 0.94,
        sectionStripe: 0.70,
        cardBg: 0.965,
        cardStripe: 0.70,
        barBg: 0.90,
        barFill: 0.20,
        text: 0.0,
        muted: 0.25,
        rule: 0.75,
      };
    }
    return {
      mode: "color",
      headerBg: { r: 0.93, g: 0.96, b: 0.99 },
      headerTitle: { r: 0.10, g: 0.30, b: 0.55 },
      headerSub: { r: 0.15, g: 0.20, b: 0.30 },
      sectionBg: { r: 0.94, g: 0.97, b: 0.99 },
      sectionStripe: { r: 0.12, g: 0.36, b: 0.67 },
      cardBg: { r: 0.98, g: 0.99, b: 1.00 },
      cardStripe: { r: 0.12, g: 0.36, b: 0.67 },
      barBg: { r: 0.88, g: 0.91, b: 0.94 },
      barFill: { r: 0.12, g: 0.36, b: 0.67 },
      sliderLow: { r: 0.93, g: 0.27, b: 0.26 },
      sliderMid: { r: 0.96, g: 0.64, b: 0.13 },
      sliderHigh: { r: 0.22, g: 0.78, b: 0.35 },
      sliderThumbFill: { r: 1.00, g: 1.00, b: 1.00 },
      sliderThumbStroke: { r: 0.50, g: 0.54, b: 0.58 },
      text: { r: 0.06, g: 0.08, b: 0.10 },
      muted: { r: 0.20, g: 0.24, b: 0.30 },
      rule: { r: 0.70, g: 0.74, b: 0.78 },
    };
  })();

  const safe = (s) => String(s ?? "");

  // Extract meta
  let mode = "";
  let generated = "";
  for (const raw of (lines || [])) {
    const line = safe(raw).trim();
    if (!mode && line.startsWith("Mode :")) mode = line.replace(/^Mode\s*:\s*/i, "").trim();
    if (!generated && (line.startsWith("Généré le :") || line.startsWith("Genere le :"))) {
      generated = line.replace(/^(Généré|Genere)\s*le\s*:\s*/i, "").trim();
    }
  }

  // Parse sections by lines ending with ':'
  const sections = [];
  let cur = null;
  for (const raw of (lines || [])) {
    const line = safe(raw);
    const t = line.trim();
    if (!t) {
      if (cur) cur.lines.push("");
      continue;
    }
    if (/^https?:\/\//i.test(t)) {
      if (cur) cur.lines.push(t);
      continue;
    }
    // Sections = titres "niveau 0" (ex: "Pré-consultation :").
    // IMPORTANT : ne pas considérer les puces comme des titres (ex: "- Médecin :"),
    // sinon le parsing split la section et on affiche Médecin/Pharmacie deux fois.
    if (/^\-\s+/.test(t)) { if (cur) cur.lines.push(line); continue; }
    if (/:\s*$/.test(t) && t.length <= 48) {
      // IMPORTANT: trim to avoid invisible trailing spaces (NBSP) breaking exact title matches
      cur = { title: t.replace(/:\s*$/, "").replace(/\u00A0/g, " ").trim(), lines: [] };
      sections.push(cur);
      continue;
    }
    if (cur) cur.lines.push(line);
  }

  // Wrap helpers (character-based for predictability)
  const wrapWords = (text, maxLen) => {
    const s = safe(text).replace(/\s+/g, " ").trim();
    if (!s) return [];
    if (s.length <= maxLen) return [s];
    const words = s.split(" ");
    const out = [];
    let cur = "";
    for (const w of words) {
      if (!cur) { cur = w; continue; }
      if ((cur.length + 1 + w.length) <= maxLen) cur += " " + w;
      else { out.push(cur); cur = w; }
    }
    if (cur) out.push(cur);
    const out2 = [];
    for (const line of out) {
      if (line.length <= maxLen) { out2.push(line); continue; }
      let i = 0;
      while (i < line.length) { out2.push(line.slice(i, i + maxLen)); i += maxLen; }
    }
    return out2;
  };

  const inferIndent = (raw) => {
    const s = safe(raw);
    const m = s.match(/^(\s+)/);
    const spaces = m ? m[1].length : 0;
    // Each 2 spaces = one level
    const level = Math.floor(spaces / 2);
    let indent = level * 14;
    const t = s.trim();
    if (t.startsWith("- ")) indent = Math.max(indent, 14);
    return Math.min(56, indent);
  };

  const normalizeLine = (raw) => {
    const s = safe(raw);
    const t = s.trim();
    if (!t) return "";
    if (t.startsWith("- ")) return "- " + t.slice(2).trim();
    return t;
  };

  // PDF stream builder
  const esc = pdfEscape;
  const addText = (fontKey, fontSize, x, y, txt) => {
    return "BT\n/" + fontKey + " " + fontSize + " Tf\n" + x + " " + y + " Td\n(" + esc(txt) + ") Tj\nET\n";
  };
  const addRule = (x1, y1, x2, y2, gray, w) => {
    const g = (gray == null) ? 0.75 : gray;
    const lw = (w == null) ? 1 : w;
    return "q\n" + lw + " w\n" + g + " G\n" + x1 + " " + y1 + " m\n" + x2 + " " + y2 + " l\nS\nQ\n";
  };
  const addRectFill = (x, y, w, h, gray) => {
    const g = (gray == null) ? 0.95 : gray;
    return "q\n" + g + " g\n" + x + " " + y + " " + w + " " + h + " re\nf\nQ\n";
  };

  let stream = "";

  // Header bar (un peu plus compact)
  stream += addRectFill(0, pageH - 48, pageW, 48, theme.headerBg);
  stream += addText("F2", 16, marginX, pageH - 32, `${APP_NAME}`);
  // Éviter les tirets typographiques Unicode dans le PDF minimal
  stream += addText("F1", 10, marginX, pageH - 46, "Résumé (1 page) - Pré-consultation");
  const rightX = pageW - marginX;
  // Right aligned text (approx by shifting left using char count)
  const rightText1 = `v${APP_VERSION}`;
  const rightText2 = generated ? generated : new Date().toLocaleString();
  stream += addText("F2", 11, rightX - Math.min(160, rightText1.length * 6), pageH - 32, rightText1);
  stream += addText("F1", 9, rightX - Math.min(220, rightText2.length * 5), pageH - 46, rightText2);
  stream += addRule(marginX, pageH - 50, pageW - marginX, pageH - 50, 0.80, 1);

  // Meta line
  let y = pageH - marginTop - 10;
  if (mode) {
    stream += addText("F1", 10, marginX, y, `Mode : ${mode}`);
    y -= 14;
  }
  y -= 6;

  // Body
  const bodyFont = 10;
  const lead = 13;
  const sectionTitleFont = 12;

  const maxY = marginBottom;
  const maxCharsBase = 98;

	// Robust title matcher (avoid exact-string issues with hidden spaces/variants)
	const isContactsTitle = (t) => {
		const s = String(t || "").replace(/\u00A0/g, " ").trim();
		return /contacts\s*sant/i.test(s) || /professionnels\s+de\s+sant/i.test(s);
	};

  const ensureSpace = (need) => (y - need) >= maxY;

  let truncated = false;


  // --- Helpers PDF ---

	  const cleanDash = (v) => {
	    const s = String(v ?? "").trim();
	    if (!s) return "";
	    if (s === "-" || s === "--") return "";
	    return s;
	  };

	  const parseGoal = (secLines) => {
	    // Attend une ligne du type "- Objectif de la consultation : ..."
	    for (const raw of (secLines || [])) {
	      const t = safe(raw).trim();
	      if (!t) continue;
	      if (/^\-\s*Objectif/i.test(t)) {
	        const idx = t.indexOf(":");
	        const val = (idx >= 0) ? t.slice(idx + 1).trim() : t.replace(/^\-\s*Objectif\s*/i, "").trim();
	        return cleanDash(val);
	      }
	    }
	    return "";
	  };

	  const parseLastEntry = (secLines) => {
	    const out = { date: "", moment: "", scores: [] };
	    for (const raw of (secLines || [])) {
	      const t = safe(raw).trim();
	      if (!t) continue;
	      const mKV = t.match(/^\-\s*([^:]+)\s*:\s*(.*)$/);
	      if (!mKV) continue;
	      const k = String(mKV[1] || "").trim();
	      const v = String(mKV[2] || "").trim();
	      if (/^Date$/i.test(k)) out.date = cleanDash(v);
	      else if (/^Moment$/i.test(k)) out.moment = cleanDash(v);
	      else {
	        const mScore = v.match(/^(\d+(?:[\.,]\d+)?)\s*\/\s*10/);
	        if (mScore) out.scores.push({ label: k, value: parseFloat(String(mScore[1]).replace(",", ".")) });
	      }
	    }
	    return out;
	  };

	  const renderGoalBox = (goalText) => {
	    const contentW = (pageW - 2 * marginX);
	    const boxX = marginX;
	    const padX = 10;
	    const padY = 10;
	    const wrapMax = 86;
	    const shown = goalText ? goalText : "Non renseigné";
	    const parts = wrapWords(shown, wrapMax);
	    const leadIn = 12;
	    const boxH = padY + 14 + (parts.length * leadIn) + padY;
	    if (!ensureSpace(boxH + 8)) return false;
	    stream += addRectFill(boxX, y - (boxH - 4), contentW, boxH, 0.965);
	    stream += addRectFill(boxX, y - (boxH - 4), 3, boxH, 0.70);
	    stream += addText("F2", 11, boxX + padX, y, "Objectif (1 phrase)");
	    let yy = y - 14;
	    for (const p of parts) {
	      stream += addText("F1", 10, boxX + padX, yy, p);
	      yy -= leadIn;
	    }
	    y -= (boxH + 12);
	    return true;
	  };

	  const renderLastEntryGrid = (data) => {
	    const contentW = (pageW - 2 * marginX);
	    const gap = 14;
	    const leftW = 180;
	    const rightW = contentW - leftW - gap;
	    const xL = marginX;
	    const xR = marginX + leftW + gap;
	    const line = 12;
	    const rowH = Math.max(46, 14 + (Math.max(1, data.scores.length) * 16) + 10);
	    if (!ensureSpace(rowH + 8)) return false;
	
	    // Left: date + moment
	    stream += addText("F2", 10, xL, y, "Date");
	    stream += addText("F1", 10, xL, y - 14, data.date || "Non renseigné");
	    if (data.moment) {
	      stream += addText("F2", 10, xL, y - 32, "Moment");
	      stream += addText("F1", 10, xL, y - 46, data.moment);
	    }
	
	    // Right: scores as mini-bars
	    const barW = Math.min(140, rightW - 90);
	    const barH = 8;
	    let yy = y - 2;
	    const scores = data.scores || [];
	    const shownScores = scores.slice(0, 8);
	    for (const sc of shownScores) {
	      const val = (sc.value == null || isNaN(sc.value)) ? null : Math.max(0, Math.min(10, sc.value));
	      const label = String(sc.label || "").trim();
	      const vtxt = (val == null) ? "-" : (Math.round(val * 10) / 10) + "/10";
	      stream += addText("F1", 10, xR, yy, label);
	      // background bar
	      const bx = xR + 80;
	      const by = yy - 1;
	      stream += addRectFill(bx, by, barW, barH, 0.92);
	      if (val != null) stream += addRectFill(bx, by, (barW * (val / 10)), barH, 0.70);
	      stream += addText("F2", 10, xR + 80 + barW + 8, yy, vtxt);
	      yy -= 16;
	    }
	
	    y -= (rowH + 12);
	    return true;
	  };

    // v0.5.67 — Rendu "cartes" pour la section Contacts santé
  const parseContactsSection = (secLines) => {
    const out = {
      doctor: { name: "", phone: "", address: "" },
      pharmacy: { name: "", phone: "", address: "" },
    };
    let cur = null;

    const clean = (v) => {
      const s = String(v ?? "").trim();
      if (!s) return "";
      if (s === "-" || s === "--") return "";
      return s;
    };

    const stripBullet = (s) => String(s || "").replace(/^[\-•–—]\s*/u, "").trim();

    for (const raw of (secLines || [])) {
      const t0 = clean(safe(raw));
      if (!t0) continue;
      const t = stripBullet(t0);
      if (!t) continue;

      // Titres de section (ex. "Médecin" / "Pharmacie")
      if (/^médecin\s*:?$/i.test(t)) { cur = out.doctor; continue; }
      if (/^pharmacie\s*:?$/i.test(t)) { cur = out.pharmacy; continue; }

      // Lignes de type "Médecin : <nom>" / "Pharmacie : <nom>"
      let m = t.match(/^(Médecin|Pharmacie)\s*:\s*(.*)$/i);
      if (m) {
        const who = String(m[1] || "").toLowerCase();
        const val = clean(m[2]);
        cur = who.startsWith("m") ? out.doctor : out.pharmacy;
        if (val) cur.name = val;
        continue;
      }

      // Champs classiques
      m = t.match(/^(Nom|Téléphone|Telephone|Adresse)\s*:\s*(.*)$/i);
      if (m) {
        if (!cur) continue;
        const key = String(m[1] || "").toLowerCase();
        const val = clean(m[2]);
        if (key.startsWith("nom")) cur.name = val;
        else if (key.startsWith("t")) cur.phone = val;
        else if (key.startsWith("a")) cur.address = val;
        continue;
      }

      // Fallback : dans un bloc, une ligne sans ':' est très souvent le nom
      if (cur && !cur.name && !/:/.test(t) && !/^non\s+renseigné$/i.test(t)) {
        cur.name = t;
        continue;
      }
    }
    return out;
  };

const renderContactCard = (title, c, yStart) => {
    const contentW = (pageW - 2 * marginX);
    const cardX = marginX;
    const cardW = contentW;
    const padX = 10;
    const padTop = 10;
    const padBot = 10;
    const leadIn = 12;

    const name = (c && c.name) ? String(c.name).trim() : "";
    const phone = (c && c.phone) ? String(c.phone).trim() : "";
    const address = (c && c.address) ? String(c.address).trim() : "";

    const shownName = name || "Non renseigné";
    const shownPhone = phone || "Non renseigné";
    const shownAddr = address || "Non renseigné";

    const addrParts = wrapWords("Adresse : " + shownAddr, 92);

    // Compute height (title + 1 name + 1 phone + address parts)
    const linesCount = 1 + 1 + addrParts.length; // name + phone + addr lines
    const cardH = padTop + 14 + (linesCount * leadIn) + padBot;

    // Background + accent
    stream += addRectFill(cardX, yStart - (cardH - 4), cardW, cardH, 0.965);
    stream += addRectFill(cardX, yStart - (cardH - 4), 3, cardH, 0.70);

    // Title
    stream += addText("F2", 11, cardX + padX, yStart, title);

    // Content
    let yy = yStart - 14;
    stream += addText("F2", 10, cardX + padX, yy, shownName);
    yy -= leadIn;
    stream += addText("F1", 10, cardX + padX, yy, "Téléphone : " + shownPhone);
    yy -= leadIn;
    for (const p of addrParts) {
      stream += addText("F1", 10, cardX + padX, yy, p);
      yy -= leadIn;
    }

    return { cardH };
  };

  const parsePreConsultGoal = (secLines) => {
    // Cherche une ligne "- Objectif de la consultation : ..."
    for (const raw of (secLines || [])) {
      const t = safe(raw).trim();
      const m = t.match(/^[-•]\s*Objectif\s+de\s+la\s+consultation\s*:\s*(.*)$/i);
      if (m) return String(m[1] || "").trim();
    }
    return "";
  };

  const parseLastEntrySection = (secLines) => {
    const out = { date: "", moment: "", scores: [], hasAny: false };
    for (const raw of (secLines || [])) {
      const t = safe(raw).trim();
      if (!t) continue;
      if (/aucune/i.test(t)) continue;
      let m = t.match(/^[-•]\s*Date\s*:\s*(.*)$/i);
      if (m) { out.date = String(m[1]||"").trim(); out.hasAny = true; continue; }
      m = t.match(/^[-•]\s*Moment\s*:\s*(.*)$/i);
      if (m) { out.moment = String(m[1]||"").trim(); out.hasAny = true; continue; }
      m = t.match(/^[-•]\s*([^:]{2,40})\s*:\s*(\d+(?:[\.,]\d+)?)\s*\/\s*10\s*$/);
      if (m) {
        const label = String(m[1]||"").trim();
        const val = parseFloat(String(m[2]).replace(",", "."));
        if (!isNaN(val)) out.scores.push({ label, val: Math.max(0, Math.min(10, val)) });
        out.hasAny = true;
      }
    }
    return out;
  };

  // v0.5.85 — Mode 2×/jour : rendre Matin/Soir côte à côte (2 colonnes)
  const renderDualEntriesSideBySide = (title, left, right) => {
    const contentW = (pageW - 2 * marginX);
    const gap = 12;
    const colW = (contentW - gap) / 2;
    const x1 = marginX;
    const x2 = marginX + colW + gap;

    const padX = 10;
    const leadIn = 14;
    const barH = 8;
    const barW = Math.max(90, colW - 150);

    const safeVal = (v) => (v == null || isNaN(v)) ? null : Math.max(0, Math.min(10, v));

    const build = (d) => {
      const date = (d && d.date && d.date !== "-" && d.date !== "Non renseigné") ? d.date : "Non renseigné";
      const moment = (d && d.moment) ? d.moment : "";
      const scores = (d && d.scores) ? d.scores.slice(0, 8) : [];
      const h = 12 + 14 + 14 + (Math.max(4, scores.length) * leadIn) + 14;
      return { date, moment, scores, h };
    };

    const L = build(left);
    const R = build(right);
    const rowH = Math.max(L.h, R.h);

    if (!ensureSpace(rowH + 10)) return false;

    // Outer container
    stream += addRectFill(marginX, y - (rowH - 4), contentW, rowH, theme.cardBg);
    stream += addRectFill(marginX, y - (rowH - 4), 3, rowH, theme.cardStripe);

    const drawCol = (x, label, d) => {
      // Column title
      stream += addText("F2", 11, x + padX, y, label);
      let yy = y - 16;
      stream += addText("F1", 9, x + padX, yy, "Date : " + d.date);
      yy -= 12;
      if (d.moment) { stream += addText("F1", 9, x + padX, yy, "Moment : " + d.moment); yy -= 14; }
      else { yy -= 6; }

      // Scores
      for (const sc of d.scores) {
        const lab = String(sc.label || "").trim();
        const v = safeVal(sc.val);
        const txtv = (v == null) ? "-" : (Math.round(v * 10) / 10) + "/10";
        stream += addText("F1", 10, x + padX, yy, lab);
        const bx = x + padX + 95;
        const by = yy - 8;
        stream += addRectFill(bx, by, barW, barH, theme.barBg);
        if (v != null) stream += addRectFill(bx, by, (barW * (v / 10)), barH, theme.barFill);
        stream += addText("F2", 10, bx + barW + 8, yy, txtv);
        yy -= leadIn;
      }
    };

    // Divider
    stream += addRule(marginX + colW + (gap/2), y + 6, marginX + colW + (gap/2), y - (rowH - 10), theme.rule, 1);

    drawCol(x1, "Matin", L);
    drawCol(x2, "Soir", R);

    y -= (rowH + 12);
    y -= 6;
    return true;
  };

  // v0.5.85 — Moyennes : rendu comparatif Matin/Soir (2 colonnes + barres)
  const renderDualAveragesSideBySide = (title, left, right) => {
    const contentW = (pageW - 2 * marginX);
    const gap = 12;
    const colW = (contentW - gap) / 2;
    const x1 = marginX;
    const x2 = marginX + colW + gap;

    const padX = 10;
    const leadIn = 14;
    const barH = 8;
    const barW = Math.max(90, colW - 150);

    const safeVal = (v) => (v == null || isNaN(v)) ? null : Math.max(0, Math.min(10, v));

    // Build map by label to align rows
    const toMap = (d) => {
      const m = new Map();
      for (const sc of ((d && d.scores) ? d.scores : [])) m.set(String(sc.label || "").trim(), safeVal(sc.val));
      return m;
    };
    const LM = toMap(left);
    const RM = toMap(right);
    const labels = Array.from(new Set([...LM.keys(), ...RM.keys()])).slice(0, 9);

    const boxH = 18 + 14 + (Math.max(1, labels.length) * leadIn) + 18;
    if (!ensureSpace(boxH + 10)) return false;

    stream += addRectFill(marginX, y - (boxH - 4), contentW, boxH, theme.cardBg);
    stream += addRectFill(marginX, y - (boxH - 4), 3, boxH, theme.cardStripe);
    stream += addText("F2", 11, marginX + padX, y, title);

    // Column headers
    stream += addText("F2", 10, x1 + padX, y - 16, "Matin");
    stream += addText("F2", 10, x2 + padX, y - 16, "Soir");

    // Divider
    stream += addRule(marginX + colW + (gap/2), y - 8, marginX + colW + (gap/2), y - (boxH - 10), theme.rule, 1);

    let yy = y - 32;
    for (const lab of labels) {
      // Left
      const vL = LM.get(lab);
      stream += addText("F1", 10, x1 + padX, yy, lab);
      const bx1 = x1 + padX + 95;
      const by1 = yy - 8;
      stream += addRectFill(bx1, by1, barW, barH, theme.barBg);
      if (vL != null) stream += addRectFill(bx1, by1, (barW * (vL / 10)), barH, theme.barFill);
      stream += addText("F2", 10, bx1 + barW + 8, yy, (vL == null ? "-" : (Math.round(vL * 10) / 10) + "/10"));

      // Right
      const vR = RM.get(lab);
      const bx2 = x2 + padX + 95;
      const by2 = yy - 8;
      stream += addRectFill(bx2, by2, barW, barH, theme.barBg);
      if (vR != null) stream += addRectFill(bx2, by2, (barW * (vR / 10)), barH, theme.barFill);
      stream += addText("F2", 10, x2 + padX + 95 + barW + 8, yy, (vR == null ? "-" : (Math.round(vR * 10) / 10) + "/10"));

      yy -= leadIn;
    }

    y -= (boxH + 12);
    y -= 6;
    return true;
  };
  for (let si = 0; si < sections.length; si++) {
    const sec = sections[si];
    const next = sections[si + 1];

    if (!sec || !sec.title) continue;
    if (!ensureSpace(28)) { truncated = true; break; }

    // v0.5.85 — Fusion Matin/Soir en 2 colonnes (Dernière entrée + Moyennes)
    // Actif uniquement en layout "visual".
    const t0 = String(sec.title || "");
    const t1 = next ? String(next.title || "") : "";

    if (layout === "visual") {

    // Dernière entrée (Matin) + (Soir) -> un seul bloc 2 colonnes
    if (/^Dernière entrée\s*\(Matin\)/i.test(t0) && /^Dernière entrée\s*\(Soir\)/i.test(t1)) {
      const leM = parseLastEntrySection(sec.lines || []);
      const leS = parseLastEntrySection(next.lines || []);
      // Header (compact)
      const sh = 16;
      stream += addRectFill(marginX, y - 13, (pageW - 2*marginX), sh, 0.92);
      stream += addRectFill(marginX, y - 13, 3, sh, 0.70);
      stream += addText("F2", sectionTitleFont, marginX + 8, y, "Dernière entrée (Matin / Soir)");
      y -= (sh + 10);

      if (!leM.hasAny && !leS.hasAny) {
        if (!ensureSpace(lead + 2)) { truncated = true; break; }
        stream += addText("F1", bodyFont, marginX, y, "- aucune");
        y -= lead;
        y -= 10;
      } else {
        if (!renderDualEntriesSideBySide("Dernière entrée", leM, leS)) { truncated = true; break; }
      }
      si += 1; // skip next (Soir)
      continue;
    }

    // Moyennes (Matin) + (Soir) -> un seul bloc comparatif 2 colonnes
    if (/^Moyennes\s*\(Matin\)/i.test(t0) && /^Moyennes\s*\(Soir\)/i.test(t1)) {
      const avM = parseLastEntrySection(sec.lines || []);
      const avS = parseLastEntrySection(next.lines || []);
      const title = (t0.match(/\((\d+\s+jours)\)/i) ? ("Moyennes (" + RegExp.$1 + ") — Matin / Soir") : "Moyennes — Matin / Soir");
      // Header
      const sh = 16;
      stream += addRectFill(marginX, y - 13, (pageW - 2*marginX), sh, 0.92);
      stream += addRectFill(marginX, y - 13, 3, sh, 0.70);
      stream += addText("F2", sectionTitleFont, marginX + 8, y, title);
      y -= (sh + 10);

      if ((!avM.hasAny || !avM.scores.length) && (!avS.hasAny || !avS.scores.length)) {
        if (!ensureSpace(lead + 2)) { truncated = true; break; }
        stream += addText("F1", bodyFont, marginX, y, "- aucune");
        y -= lead;
        y -= 10;
      } else {
        if (!renderDualAveragesSideBySide(title, avM, avS)) { truncated = true; break; }
      }
      si += 1; // skip next (Soir)
      continue;
    }

    }

    // Section header (un peu plus fin)
    const sh = 16;
    stream += addRectFill(marginX, y - 13, (pageW - 2*marginX), sh, 0.92);
    stream += addRectFill(marginX, y - 13, 3, sh, 0.70);
		const secDisplayTitle = (isContactsTitle(sec.title)) ? "Mes professionnels de santé" : sec.title;
    stream += addText("F2", sectionTitleFont, marginX + 8, y, secDisplayTitle);
    y -= (sh + 10);

    // v0.5.80 — Pré-consultation : objectif en encadré
    if (sec.title === "Pré-consultation") {
      const goal = parsePreConsultGoal(sec.lines || []);
      const shown = goal ? goal : "Non renseigné";
      const contentW = (pageW - 2 * marginX);
      const boxX = marginX;
      const boxW = contentW;
      const padX = 10;
      const padTop = 10;
      const padBot = 10;
      const wrapMax = Math.max(30, Math.floor((boxW - 2 * padX) / 5.2));
      const parts = wrapWords(shown, wrapMax);
      const leadIn = 12;
      const boxH = padTop + 14 + (parts.length * leadIn) + padBot;
      if (!ensureSpace(boxH + 10)) { truncated = true; break; }
      stream += addRectFill(boxX, y - (boxH - 4), boxW, boxH, 0.965);
      stream += addRectFill(boxX, y - (boxH - 4), 3, boxH, 0.70);
      stream += addText("F2", 11, boxX + padX, y, "Objectif de la consultation");
      let yy = y - 14;
      for (const p of parts) {
        stream += addText("F1", 10, boxX + padX, yy, p);
        yy -= leadIn;
      }
      y -= (boxH + 12);
      y -= 6;
      continue;
    }

    // v0.5.80 — Dernière entrée : 2 colonnes + mini-barres
    if (/^Dernière entrée/i.test(sec.title)) {
      const le = parseLastEntrySection(sec.lines || []);
      if (!le.hasAny) {
        if (!ensureSpace(lead + 2)) { truncated = true; break; }
        stream += addText("F1", bodyFont, marginX, y, "- aucune");
        y -= lead;
        y -= 10;
        continue;
      }

    // v0.5.83 — Moyennes : mini-barres (pleine largeur)
    if (/^Moyennes/i.test(sec.title)) {
      const av = parseLastEntrySection(sec.lines || []);
      if (!av.hasAny || !av.scores.length) {
        if (!ensureSpace(lead + 2)) { truncated = true; break; }
        stream += addText("F1", bodyFont, marginX, y, "- aucune");
        y -= lead;
        y -= 10;
        continue;
      }

      const contentW = (pageW - 2 * marginX);
      const boxX = marginX;
      const boxW = contentW;
      const padX = 10;
      const leadIn = 14;
      const shownScores = av.scores.slice(0, 9);
      const boxH = 12 + (shownScores.length * leadIn) + 16;
      if (!ensureSpace(boxH + 10)) { truncated = true; break; }

      stream += addRectFill(boxX, y - (boxH - 4), boxW, boxH, 0.965);
      stream += addRectFill(boxX, y - (boxH - 4), 3, boxH, 0.70);

      // Title inside card (to clearly show Matin/Soir)
      stream += addText("F2", 11, boxX + padX, y, sec.title);

      let yy = y - 18;
      const barW = 150;
      const barH = 8;
      for (const s of shownScores) {
        const label = String(s.label || "").trim();
        const val = (s.val == null) ? 0 : s.val;
        const txtv = `${Math.round(val)}/10`;
        stream += addText("F1", 10, boxX + padX, yy, label);
        // bar background
        stream += addRectFill(boxX + padX + 160, yy - 1, barW, barH, 0.90);
        // bar fill (gris + accent)
        const fillW = Math.max(0, Math.min(barW, (val / 10) * barW));
        stream += addRectFill(boxX + padX + 160, yy - 1, fillW, barH, theme.barFill);
        stream += addText("F1", 10, boxX + padX + 160 + barW + 10, yy, txtv);
        yy -= leadIn;
      }

      y -= (boxH + 12);
      y -= 6;
      continue;
    }

      const contentW = (pageW - 2 * marginX);
      const gap = 12;
      const leftW = 200;
      const rightW = contentW - leftW - gap;
      const xL = marginX;
      const xR = marginX + leftW + gap;

      const linesL = [];
      if (le.date) linesL.push("Date : " + le.date);
      if (le.moment) linesL.push("Moment : " + le.moment);
      const rowH = Math.max(54, (Math.max(linesL.length, le.scores.length) * 14) + 12);
      if (!ensureSpace(rowH + 10)) { truncated = true; break; }

      // Left block
      stream += addRectFill(xL, y - (rowH - 4), leftW, rowH, 0.965);
      stream += addRectFill(xL, y - (rowH - 4), 3, rowH, 0.70);
      let yyL = y - 2;
      for (const l of linesL) {
        stream += addText("F1", 10, xL + 10, yyL, l);
        yyL -= 14;
      }

      // Right block
      stream += addRectFill(xR, y - (rowH - 4), rightW, rowH, 0.965);
      stream += addRectFill(xR, y - (rowH - 4), 3, rowH, 0.70);
      let yyR = y - 2;
      const barW = 110;
      const barH = 8;
      for (const s of le.scores.slice(0, 8)) {
        const label = String(s.label || "").trim();
        const val = (s.val == null) ? 0 : s.val;
        const txt = `${Math.round(val)}/10`;
        // Label
        stream += addText("F1", 10, xR + 10, yyR, label);
        // Bar background
        const bx = xR + 10 + 110;
        const by = yyR - 8;
        stream += addRectFill(bx, by, barW, barH, theme.barBg);
        stream += addRectFill(bx, by, Math.max(0, Math.min(barW, (barW * val / 10))), barH, theme.barFill);
        // Value
        stream += addText("F2", 10, bx + barW + 8, yyR, txt);
        yyR -= 14;
      }

      y -= (rowH + 12);
      y -= 6;
      continue;
    }

    // v0.5.79 — Contacts : médecin + pharmacie en 2 colonnes
		if (isContactsTitle(sec.title)) {
      const hc = parseContactsSection(sec.lines || []);
      const contentW = (pageW - 2 * marginX);
      const gap = 12;
      const colW = (contentW - gap) / 2;
      const x1 = marginX;
      const x2 = marginX + colW + gap;
      const wrapMax = Math.max(32, Math.floor(colW / 5.2));

      const padX = 10;
      const padTop = 10;
      const padBot = 10;
      const leadIn = 12;
      const cleanField = (v) => {
        const s = String(v ?? "").trim();
        if (!s) return "";
        if (s === "-" || s === "--") return "";
        return s;
      };

      const prepCard = (c) => {
        const name = cleanField(c && c.name);
        const phone = cleanField(c && c.phone);
        const address = cleanField(c && c.address);
        const shownName = name || "Non renseigné";
        const shownPhone = phone || "Non renseigné";
        const shownAddr = address || "Non renseigné";
        const addrParts = wrapWords("Adresse : " + shownAddr, wrapMax);
        const linesCount = 1 + 1 + addrParts.length;
        const cardH = padTop + 14 + (linesCount * leadIn) + padBot;
        return { shownName, shownPhone, addrParts, cardH };
      };

      const drawCard = (title, data, yStart, cardX, cardW, cardH) => {
        // Background + accent
        stream += addRectFill(cardX, yStart - (cardH - 4), cardW, cardH, 0.965);
        stream += addRectFill(cardX, yStart - (cardH - 4), 3, cardH, 0.70);
        // Title
        stream += addText("F2", 11, cardX + padX, yStart, title);
        // Content
        let yy = yStart - 14;
        stream += addText("F2", 10, cardX + padX, yy, data.shownName);
        yy -= leadIn;
        stream += addText("F1", 10, cardX + padX, yy, "Téléphone : " + data.shownPhone);
        yy -= leadIn;
        for (const p of data.addrParts) {
          stream += addText("F1", 10, cardX + padX, yy, p);
          yy -= leadIn;
        }
      };

      const d1 = prepCard(hc.doctor);
      const d2 = prepCard(hc.pharmacy);
      const rowH = Math.max(d1.cardH, d2.cardH);

      // Ensure space for the whole row
      if (!ensureSpace(rowH + 16)) { truncated = true; break; }

      drawCard("Médecin", d1, y, x1, colW, rowH);
      drawCard("Pharmacie", d2, y, x2, colW, rowH);
      y -= (rowH + 12);
      y -= 6;
      continue;
    }

    for (const rawLine of (sec.lines || [])) {
      if (!ensureSpace(lead + 2)) { truncated = true; y = maxY; break; }

      const line = normalizeLine(rawLine);
      if (!line) { y -= 8; continue; }

      const indent = inferIndent(rawLine);
      const x = marginX + indent;
      const maxChars = Math.max(30, maxCharsBase - Math.floor(indent / 2));
      const parts = wrapWords(line, maxChars);
      for (let i = 0; i < parts.length; i++) {
        if (!ensureSpace(lead + 2)) { truncated = true; y = maxY; break; }
        stream += addText("F1", bodyFont, x, y, parts[i]);
        y -= lead;
      }
    }

    y -= 10;
    if (y <= maxY) { truncated = true; break; }
  }

  if (truncated) {
    // petit rappel discret si le contenu dépasse 1 page
    stream += addText("F1", 9, marginX, marginBottom + 8, "(Résumé tronqué : 1 page)");
  }

  // Footer disclaimer
  // Éviter les caractères Unicode non garantis dans le PDF minimal (WinAnsi/Latin-1)
  const footer = "Attention : Info générale uniquement. En cas de doute/symptôme : médecin traitant. Urgence : 15.";
  stream += addRule(marginX, marginBottom - 10, pageW - marginX, marginBottom - 10, 0.85, 1);
  stream += addText("F1", 9, marginX, marginBottom - 26, footer);
  // Page number (right)
  const pg = "Page 1/1";
  stream += addText("F1", 9, (pageW - marginX) - Math.min(80, pg.length * 5.2), marginBottom - 26, pg);

  // Build PDF objects
  const streamLen = pdfLatin1Bytes(stream).length;

  const objs = [];
  const addObj = (s) => { objs.push(s); return objs.length; };

  addObj("<< /Type /Catalog /Pages 2 0 R >>");
  addObj("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  addObj("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + pageW + " " + pageH + "] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>");
  addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  addObj("<< /Length " + streamLen + " >>\nstream\n" + stream + "endstream");

  let pdf = "%PDF-1.4\n%âãÏÓ\n";
  const offsets = [0];
  for (let i = 0; i < objs.length; i++) {
    offsets.push(pdf.length);
    pdf += (i + 1) + " 0 obj\n" + objs[i] + "\nendobj\n";
  }
  const xrefPos = pdf.length;
  pdf += "xref\n0 " + (objs.length + 1) + "\n";
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objs.length; i++) {
    const off = String(offsets[i]).padStart(10, "0");
    pdf += off + " 00000 n \n";
  }
  pdf += "trailer\n<< /Size " + (objs.length + 1) + " /Root 1 0 R >>\nstartxref\n" + xrefPos + "\n%%EOF";

  const bytes = pdfLatin1Bytes(pdf);
  
return new Blob([bytes], { type: "application/pdf" });
}

// v0.5.65 — même rendu que makePrettyPdfFromSummaryLines, mais peut aller jusqu'à N pages (2 max en UI)


// v0.5.92 — Helpers partagés pour le rendu PDF paginé (évite le fallback en PDF simple)
// NB: versions "minimalistes" : si un rendu avancé n'est pas disponible, on retombe sur le rendu ligne à ligne.
function parseGoal(secLines) {
  try {
    for (const raw of (secLines || [])) {
      const t = String(raw ?? '').trim();
      if (!t) continue;
      if (/^\-\s*Objectif/i.test(t)) {
        const idx = t.indexOf(':');
        const val = (idx >= 0) ? t.slice(idx + 1).trim() : t.replace(/^\-\s*Objectif\s*/i, '').trim();
        if (!val || val === '-' || val === '--') return '';
        return val;
      }
    }
  } catch {}
  return '';
}

function parseLastEntry(secLines) {
  const out = { date: '', moment: '', scores: [], hasAny: false };
  try {
    for (const raw of (secLines || [])) {
      const t = String(raw ?? '').trim();
      if (!t) continue;
      const m = t.match(/^\-\s*([^:]+)\s*:\s*(.*)$/);
      if (!m) continue;
      const key = String(m[1] || '').trim();
      const val = String(m[2] || '').trim();
      if (/^Date$/i.test(key)) { out.date = (val && val !== '-' && val !== '--') ? val : ''; out.hasAny = out.hasAny || !!out.date; }
      else if (/^Moment$/i.test(key)) { out.moment = (val && val !== '-' && val !== '--') ? val : ''; out.hasAny = out.hasAny || !!out.moment; }
      else {
        const ms = val.match(/^(\d+(?:[\.,]\d+)?)\s*\/\s*10/);
        if (ms) {
          const v = parseFloat(String(ms[1]).replace(',', '.'));
          if (!isNaN(v)) { out.scores.push({ label: key, val: v }); out.hasAny = true; }
        }
      }
    }
  } catch {}
  return out;
}

function renderGoalBox(_) { return false; }
function renderLastEntryGrid(_) { return false; }

async function makePrettyPdfFromSummaryLinesPaged(lines, maxPages, themeKey, layoutKey, job) {
  const MP = Math.max(1, Math.min(4, parseInt(maxPages || 1, 10) || 1));
  // A4 portrait in points: 595 x 842
  const pageW = 595;
  const pageH = 842;
  const marginX = 48;
  const marginTop = 64;
  const marginBottom = 64;
  const maxY = marginBottom;

  const theme = (() => {
    const k = (themeKey === "bw") ? "bw" : "color";
    if (k === "bw") {
      return {
        mode: "bw",
        headerBg: 0.94,
        headerTitle: 0.0,
        headerSub: 0.15,
        sectionBg: 0.94,
        sectionStripe: 0.70,
        cardBg: 0.965,
        cardStripe: 0.70,
        barBg: 0.90,
        barFill: 0.20,
        text: 0.0,
        muted: 0.25,
        rule: 0.75,
      };
    }
    // Coloré (sobre, imprimable, contraste OK)
    return {
      mode: "color",
      headerBg: { r: 0.93, g: 0.96, b: 0.99 },
      headerTitle: { r: 0.10, g: 0.30, b: 0.55 },
      headerSub: { r: 0.15, g: 0.20, b: 0.30 },
      sectionBg: { r: 0.94, g: 0.97, b: 0.99 },
      sectionStripe: { r: 0.12, g: 0.36, b: 0.67 },
      cardBg: { r: 0.98, g: 0.99, b: 1.00 },
      cardStripe: { r: 0.12, g: 0.36, b: 0.67 },
      barBg: { r: 0.88, g: 0.91, b: 0.94 },
      barFill: { r: 0.12, g: 0.36, b: 0.67 },
      sliderLow: { r: 0.93, g: 0.27, b: 0.26 },
      sliderMid: { r: 0.96, g: 0.64, b: 0.13 },
      sliderHigh: { r: 0.22, g: 0.78, b: 0.35 },
      sliderThumbFill: { r: 1.00, g: 1.00, b: 1.00 },
      sliderThumbStroke: { r: 0.50, g: 0.54, b: 0.58 },
      text: { r: 0.06, g: 0.08, b: 0.10 },
      muted: { r: 0.20, g: 0.24, b: 0.30 },
      rule: { r: 0.70, g: 0.74, b: 0.78 },
    };
  })();

  // Layout: 'classic' (ancienne mise en page) ou 'visual' (comparatif + barres)
  const layout = (String(layoutKey || "classic") === "visual") ? "visual" : "classic";

  const safe = (s) => String(s ?? "");

// v0.6.13 — micro-yields pour garder l’UI réactive (message “ça prend plus de temps…” + Annuler)
const __job = job || null;
let __lastYield = Date.now();
const __yieldToUI = () => new Promise((resolve) => {
  try { requestAnimationFrame(() => setTimeout(resolve, 0)); }
  catch (e) { setTimeout(resolve, 0); }
});
const maybeYield = async (force = false) => {
  if (__job && __job.cancelled) return false;
  const now = Date.now();
  if (force || (now - __lastYield > 16)) {
    __lastYield = now;
    await __yieldToUI();
    if (__job && __job.cancelled) return false;
  }
  return true;
};


  // Extract meta
  let mode = "";
  let generated = "";
  for (const raw of (lines || [])) {
    const line = safe(raw).trim();
    if (!mode && line.startsWith("Mode :")) mode = line.replace(/^Mode\s*:\s*/i, "").trim();
    if (!generated && (line.startsWith("Généré le :") || line.startsWith("Genere le :"))) {
      generated = line.replace(/^(Généré|Genere)\s*le\s*:\s*/i, "").trim();
    }
  }

  // Parse sections by lines ending with ':'
  const sections = [];
  let cur = null;
  for (const raw of (lines || [])) {
    const line = safe(raw);
    const t = line.trim();
    if (!t) { if (cur) cur.lines.push(""); continue; }
    if (/^https?:\/\//i.test(t)) { if (cur) cur.lines.push(t); continue; }
    // Sections = titres "niveau 0" (ex: "Pré-consultation :").
    // Ne pas interpréter les puces comme des titres (ex: "- Médecin :") : sinon doublons.
    if (/^\-\s+/.test(t)) { if (cur) cur.lines.push(line); continue; }
    if (/:\s*$/.test(t) && t.length <= 48) {
      // IMPORTANT: trim to avoid invisible trailing spaces (NBSP) breaking exact title matches
      cur = { title: t.replace(/:\s*$/, "").replace(/\u00A0/g, " ").trim(), lines: [] };
      sections.push(cur);
      continue;
    }
    if (cur) cur.lines.push(line);
  }

  // Wrap helpers (character-based)
  const wrapWords = (text, maxLen) => {
    const s = safe(text).replace(/\s+/g, " ").trim();
    if (!s) return [];
    if (s.length <= maxLen) return [s];
    const words = s.split(" ");
    const out = [];
    let cur = "";
    for (const w of words) {
      if (!cur) { cur = w; continue; }
      if ((cur.length + 1 + w.length) <= maxLen) cur += " " + w;
      else { out.push(cur); cur = w; }
    }
    if (cur) out.push(cur);
    const out2 = [];
    for (const line of out) {
      if (line.length <= maxLen) { out2.push(line); continue; }
      let i = 0;
      while (i < line.length) { out2.push(line.slice(i, i + maxLen)); i += maxLen; }
    }
    return out2;
  };

  const inferIndent = (raw) => {
    const s = safe(raw);
    const m = s.match(/^(\s+)/);
    const spaces = m ? m[1].length : 0;
    const level = Math.floor(spaces / 2);
    let indent = level * 14;
    const t = s.trim();
    if (t.startsWith("- ")) indent = Math.max(indent, 14);
    return Math.min(56, indent);
  };

  const normalizeLine = (raw) => {
    const s = safe(raw);
    const t = s.trim();
    if (!t) return "";
    if (t.startsWith("- ")) return "- " + t.slice(2).trim();
    return t;
  };  // PDF stream primitives (support Coloré / N&B)
  const esc = pdfEscape;
  const colorFillOp = (c) => {
    // Fill color operator (PDF): rgb => 'rg', gray => 'g'
    if (c && typeof c === "object") return (c.r + " " + c.g + " " + c.b + " rg\n");
    if (typeof c === "number") return (c + " g\n");
    return "0 g\n";
  };
  const colorStrokeOp = (c) => {
    // Stroke color operator (PDF): rgb => 'RG', gray => 'G'
    if (c && typeof c === "object") return (c.r + " " + c.g + " " + c.b + " RG\n");
    if (typeof c === "number") return (c + " G\n");
    return "0 G\n";
  };
  const addText = (fontKey, fontSize, x, y, txt, fill) => {
    const op = colorFillOp(fill == null ? theme.text : fill);
    return `BT
${op}/${fontKey} ${fontSize} Tf
${x} ${y} Td
(${esc(txt)}) Tj
ET
`;
  };
  const addRule = (x1, y1, x2, y2, stroke, w) => {
    const lw = (w == null) ? 1 : w;
    const op = colorStrokeOp(stroke == null ? theme.rule : stroke);
    return `q
${lw} w
${op}${x1} ${y1} m
${x2} ${y2} l
S
Q
`;
  };
  const addRectFill = (x, y, w, h, fill) => {
    const op = colorFillOp(fill == null ? theme.cardBg : fill);
    return `q
${op}${x} ${y} ${w} ${h} re
f
Q
`;
  };

  // v0.6.42 — Curseurs colorés (PDF) : dégradé + curseur
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerpRgb = (c1, c2, t) => ({
    r: lerp(c1.r, c2.r, t),
    g: lerp(c1.g, c2.g, t),
    b: lerp(c1.b, c2.b, t),
  });

  const sliderColorAt = (t) => {
    const tt = clamp(t, 0, 1);
    if (!theme || theme.mode !== "color") return theme && theme.barFill ? theme.barFill : { r: 0, g: 0, b: 0 };
    if (tt <= 0.5) return lerpRgb(theme.sliderLow, theme.sliderMid, tt / 0.5);
    return lerpRgb(theme.sliderMid, theme.sliderHigh, (tt - 0.5) / 0.5);
  };

  const addCircle = (cx, cy, r, fill, stroke, lw) => {
    const k = 0.5522847498307936;
    const ox = r * k;
    const oy = r * k;
    const w = (lw == null) ? 1 : lw;
    let out = `q
${w} w
`;
    if (fill != null) out += colorFillOp(fill);
    if (stroke != null) out += colorStrokeOp(stroke);
    out += `${cx + r} ${cy} m
`;
    out += `${cx + r} ${cy + oy} ${cx + ox} ${cy + r} ${cx} ${cy + r} c
`;
    out += `${cx - ox} ${cy + r} ${cx - r} ${cy + oy} ${cx - r} ${cy} c
`;
    out += `${cx - r} ${cy - oy} ${cx - ox} ${cy - r} ${cx} ${cy - r} c
`;
    out += `${cx + ox} ${cy - r} ${cx + r} ${cy - oy} ${cx + r} ${cy} c
`;
    if (fill != null && stroke != null) out += `B
`;
    else if (fill != null) out += `f
`;
    else out += `S
`;
    out += `Q
`;
    return out;
  };

  const addSliderTrack = (x, y, w, h) => {
    if (!theme || theme.mode !== "color") return addRectFill(x, y, w, h, theme.barBg);
    const n = 28;
    const segW = w / n;
    let s = "";
    for (let i = 0; i < n; i++) {
      const t = (n <= 1) ? 0 : (i / (n - 1));
      const c = sliderColorAt(t);
      // Petit chevauchement pour éviter les micro-trous (arrondis PDF).
      s += addRectFill(x + (i * segW), y, segW + 0.25, h, c);
    }
    return s;
  };

  const addSliderThumb = (x, y, w, h, value0to10) => {
    const v = clamp(value0to10, 0, 10);
    const r = Math.max(4.8, h * 0.75);
    let cx = x + (v / 10) * w;
    cx = clamp(cx, x + r, x + w - r);
    const cy = y + (h / 2);
    return addCircle(cx, cy, r, theme.sliderThumbFill, theme.sliderThumbStroke, 0.9);
  };

  const footerText = "Attention : Info générale uniquement. En cas de doute/symptôme : médecin traitant. Urgence : 15.";

  const headerLine1 = `${APP_NAME}`;
  const headerLine2_first = (MP <= 1) ? "Résumé (1 page) - Pré-consultation" : "Résumé (jusqu'à 2 pages) - Pré-consultation";
  const headerLine2_cont = "Résumé (suite) - Pré-consultation";

  const streams = [];
  let y = 0;
  let truncated = false;

    // v0.5.67 — Rendu "cartes" pour la section Contacts santé (version paginée)
  const parseContactsSection2 = (secLines) => {
    const out = {
      doctor: { name: "", phone: "", address: "" },
      pharmacy: { name: "", phone: "", address: "" },
    };
    let cur = null;

    const clean = (v) => {
      const s = String(v ?? "").trim();
      if (!s) return "";
      if (s === "-" || s === "--") return "";
      return s;
    };

    const stripBullet = (s) => String(s || "").replace(/^[\-•–—]\s*/u, "").trim();

    for (const raw of (secLines || [])) {
      const t0 = clean(safe(raw));
      if (!t0) continue;
      const t = stripBullet(t0);
      if (!t) continue;

      // Titres de section (ex. "Médecin" / "Pharmacie")
      if (/^médecin\s*:?$/i.test(t)) { cur = out.doctor; continue; }
      if (/^pharmacie\s*:?$/i.test(t)) { cur = out.pharmacy; continue; }

      // Lignes de type "Médecin : <nom>" / "Pharmacie : <nom>"
      let m = t.match(/^(Médecin|Pharmacie)\s*:\s*(.*)$/i);
      if (m) {
        const who = String(m[1] || "").toLowerCase();
        const val = clean(m[2]);
        cur = who.startsWith("m") ? out.doctor : out.pharmacy;
        if (val) cur.name = val;
        continue;
      }

      // Champs classiques
      m = t.match(/^(Nom|Téléphone|Telephone|Adresse)\s*:\s*(.*)$/i);
      if (m) {
        if (!cur) continue;
        const key = String(m[1] || "").toLowerCase();
        const val = clean(m[2]);
        if (key.startsWith("nom")) cur.name = val;
        else if (key.startsWith("t")) cur.phone = val;
        else if (key.startsWith("a")) cur.address = val;
        continue;
      }

      // Fallback : dans un bloc, une ligne sans ':' est très souvent le nom
      if (cur && !cur.name && !/:/.test(t) && !/^non\s+renseigné$/i.test(t)) {
        cur.name = t;
        continue;
      }
    }
    return out;
  };

const renderContactCard2 = (title, c, yStart) => {
    const contentW = (pageW - 2 * marginX);
    const cardX = marginX;
    const cardW = contentW;
    const padX = 10;
    const padTop = 10;
    const padBot = 10;
    const leadIn = 12;

    const name = (c && c.name) ? String(c.name).trim() : "";
    const phone = (c && c.phone) ? String(c.phone).trim() : "";
    const address = (c && c.address) ? String(c.address).trim() : "";

    const shownName = name || "Non renseigné";
    const shownPhone = phone || "Non renseigné";
    const shownAddr = address || "Non renseigné";

    const addrParts = wrapWords("Adresse : " + shownAddr, 92);
    const linesCount = 1 + 1 + addrParts.length;
    const cardH = padTop + 14 + (linesCount * leadIn) + padBot;

    append(addRectFill(cardX, yStart - (cardH - 4), cardW, cardH, theme.cardBg));
    append(addRectFill(cardX, yStart - (cardH - 4), 3, cardH, theme.cardStripe));
    append(addText("F2", 11, cardX + padX, yStart, title));

    let yy = yStart - 14;
    append(addText("F2", 10, cardX + padX, yy, shownName));
    yy -= leadIn;
    append(addText("F1", 10, cardX + padX, yy, "Téléphone : " + shownPhone));
    yy -= leadIn;
    for (const p of addrParts) {
      append(addText("F1", 10, cardX + padX, yy, p));
      yy -= leadIn;
    }

    return { cardH };
  };


  const rightX = pageW - marginX;

  const beginPage = (isCont) => {
    const subtitle = isCont ? headerLine2_cont : headerLine2_first;
    let stream = "";

    // Header
    const rightText1 = `v${APP_VERSION}`;
    const rightText2 = generated ? generated : new Date().toLocaleString();

    if (layout === "visual") {
      // Mise en page "CTE" : en-tête discret (pas de gros bandeau), priorité à la grille.
      stream += addText("F2", 14, marginX, pageH - 34, headerLine1, theme.headerTitle);
      stream += addText("F1", 10, marginX, pageH - 50, subtitle, theme.headerSub);
      stream += addText("F2", 11, rightX - Math.min(160, rightText1.length * 6), pageH - 34, rightText1, theme.headerTitle);
      stream += addText("F1", 9, rightX - Math.min(220, rightText2.length * 5), pageH - 50, rightText2, theme.headerSub);
      stream += addRule(marginX, pageH - 58, pageW - marginX, pageH - 58, theme.rule, 1);

      y = pageH - 78; // démarre sous la règle
    } else {
      // Header bar (compact)
      stream += addRectFill(0, pageH - 48, pageW, 48, theme.headerBg);
      stream += addText("F2", 16, marginX, pageH - 32, headerLine1, theme.headerTitle);
      stream += addText("F1", 10, marginX, pageH - 46, subtitle, theme.headerSub);
      stream += addText("F2", 11, rightX - Math.min(160, rightText1.length * 6), pageH - 32, rightText1, theme.headerTitle);
      stream += addText("F1", 9, rightX - Math.min(220, rightText2.length * 5), pageH - 46, rightText2, theme.headerSub);
      stream += addRule(marginX, pageH - 50, pageW - marginX, pageH - 50, theme.rule, 1);

      // Meta line
      y = pageH - marginTop - 10;
      if (mode) {
        stream += addText("F1", 10, marginX, y, `Mode : ${mode}`, theme.muted);
        y -= 14;
      }
      y -= 6;
    }

    streams.push(stream);
  };

  const append = (s) => { streams[streams.length - 1] += s; };

  const writeSectionHeader = (title, isSuite) => {
    const t = isSuite ? (String(title) + " (suite)") : String(title);
    const sh = 16;
    append(addRectFill(marginX, y - 13, (pageW - 2*marginX), sh, theme.sectionBg));
    append(addRectFill(marginX, y - 13, 3, sh, theme.sectionStripe));
    append(addText("F2", 12, marginX + 8, y, t));
    y -= (sh + 10);
  };

  const ensureSpace = (need) => (y - need) >= maxY;

  // v0.6.00 — Helpers CTE (paginé) : Matin | Soir côte à côte + barres
  const parseLastEntrySection = (secLines) => parseLastEntry(secLines);
  const parseAveragesSection = (secLines) => parseLastEntry(secLines);

  let currentSectionTitle = "";

  const maybePageBreakFor = (need) => {
    if (ensureSpace(need)) return true;
    if (streams.length < MP) {
      beginPage(true);
      if (!ensureSpace(28)) return false;
      if (currentSectionTitle) writeSectionHeader(currentSectionTitle, true);
      return ensureSpace(need);
    }
    return false;
  };

  const renderDualBoxWithBars = (titleLeft, dataLeft, titleRight, dataRight) => {
    const contentW = (pageW - 2 * marginX);
    const gap = 12;
    const colW = (contentW - gap) / 2;
    const x1 = marginX;
    const x2 = marginX + colW + gap;

    const padX = 10;
    const padTop = 10;
    const padBot = 10;
    const leadIn = 13;

    const prep = (title, d) => {
      const date = (d && d.date) ? String(d.date).trim() : "";
      const moment = (d && d.moment) ? String(d.moment).trim() : "";
      const scores = (d && d.scores) ? d.scores.slice(0, 8) : [];
      const meta = [];
      if (date) meta.push("Date : " + date);
      if (moment) meta.push("Moment : " + moment);
      const linesCount = 1 + meta.length + scores.length;
      const h = padTop + 14 + (linesCount * leadIn) + padBot + 8;
      return { title, meta, scores, h };
    };

    const L = prep(titleLeft, dataLeft);
    const R = prep(titleRight, dataRight);
    const rowH = Math.max(L.h, R.h);

    if (!maybePageBreakFor(rowH + 14)) return false;

    const drawCol = (colX, d) => {
      append(addRectFill(colX, y - (rowH - 4), colW, rowH, theme.cardBg));
      append(addRectFill(colX, y - (rowH - 4), 3, rowH, theme.cardStripe));
      append(addText("F2", 11, colX + padX, y, d.title));
      let yy = y - 16;

      for (const ml of d.meta) {
        append(addText("F1", 9, colX + padX, yy, ml, theme.muted));
        yy -= leadIn;
      }

      const barH = 8;
      const barX = colX + padX + 110;
      const barW = Math.max(90, colW - padX*2 - 110 - 40);

      for (const s of d.scores) {
        const label = String(s.label || "").trim();
        const hasVal = (s.val != null) && !isNaN(s.val);
        const val = hasVal ? s.val : null;
        const txtv = hasVal ? `${Math.round(val)}/10` : "-";

        append(addText("F1", 10, colX + padX, yy, label));

        const by = yy - 1;
        if (theme.mode === "color") {
          if (hasVal) {
            append(addSliderTrack(barX, by, barW, barH));
            append(addSliderThumb(barX, by, barW, barH, val));
          } else {
            append(addRectFill(barX, by, barW, barH, theme.barBg));
          }
        } else {
          append(addRectFill(barX, by, barW, barH, theme.barBg));
          const fillW = hasVal ? Math.max(0, Math.min(barW, (val / 10) * barW)) : 0;
          if (fillW > 0) append(addRectFill(barX, by, fillW, barH, theme.barFill));
        }

        append(addText("F1", 10, barX + barW + 8, yy, txtv));
        yy -= leadIn;
      }
    };

    drawCol(x1, L);
    drawCol(x2, R);

    y -= (rowH + 10);
    return true;
  };

  const renderDualEntriesSideBySide = (am, pm) => renderDualBoxWithBars("Matin", am, "Soir", pm);
  const renderDualAveragesSideBySide = (am, pm) => renderDualBoxWithBars("Moyenne (Matin)", am, "Moyenne (Soir)", pm);

  // Start first page
  beginPage(false);

  const bodyFont = 10;
  const lead = 13;
  const maxCharsBase = 98;

  // Robust title matcher (avoid exact-string issues with hidden spaces/variants)
  const isContactsTitle2 = (t) => {
    const s = String(t || "").replace(/\u00A0/g, " ").trim();
    return /contacts\s*sant/i.test(s) || /professionnels\s+de\s+sant/i.test(s);
  };

  // v0.5.98 — Fusion automatique Matin/Soir (mise en page "Comparatif")
  const workSections = (() => {
    if (layout !== "visual") return sections;
    const out = [];
    for (let i = 0; i < sections.length; i++) {
      const a = sections[i];
      const b = sections[i + 1];
      const ta = String(a && a.title || "");
      const tb = String(b && b.title || "");
      // Dernière entrée Matin + Soir => une section dual
      if (/^Dernière entrée\s*\(Matin\)/i.test(ta) && /^Dernière entrée\s*\(Soir\)/i.test(tb)) {
        out.push({
          title: "Dernière entrée (Matin / Soir)",
          __dual: "lastEntry",
          leftLines: a.lines || [],
          rightLines: b.lines || [],
        });
        i++;
        continue;
      }
      // Moyennes Matin + Soir => une section dual
      if (/^Moyennes\s*\(.*\)\s*\(Matin\)/i.test(ta) && /^Moyennes\s*\(.*\)\s*\(Soir\)/i.test(tb)) {
        const m = ta.match(/^Moyennes\s*\(([^)]+)\)/i);
        const label = m ? m[1] : "";
        out.push({
          title: label ? `Moyennes (${label}) (Matin / Soir)` : "Moyennes (Matin / Soir)",
          __dual: "averages",
          leftLines: a.lines || [],
          rightLines: b.lines || [],
        });
        i++;
        continue;
      }
      out.push(a);
    }
    return out;
  })();

  for (const sec of workSections) {
    if (!(await maybeYield())) return null;
    if (truncated) break;
    if (!sec || !sec.title) continue;

    // Ensure space for section header
    if (!ensureSpace(28)) {
      if (streams.length < MP) {
        beginPage(true);
      } else {
        truncated = true;
        break;
      }
    }

    const secDisplayTitle2 = (isContactsTitle2(sec.title)) ? "Mes professionnels de santé" : sec.title;
    currentSectionTitle = secDisplayTitle2;
    writeSectionHeader(secDisplayTitle2, false);

    // v0.5.80 — Pré-consultation : objectif en encadré lisible
    if (sec.title === "Pré-consultation") {
      const goal = parseGoal(sec.lines || []);
      if (renderGoalBox(goal)) {
        y -= 2;
        continue;
      }
      // fallback si pas de place : rendu ligne à ligne
    }

    // v0.5.98 — Dernière entrée + Moyennes en mode comparatif (Matin/Soir côte à côte)
    if (sec.__dual === "lastEntry") {
      const am = parseLastEntrySection(sec.leftLines || []);
      const pm = parseLastEntrySection(sec.rightLines || []);
      if (renderDualEntriesSideBySide(am, pm)) {
        y -= 2;
        continue;
      }
    }
    if (sec.__dual === "averages") {
      const am = parseAveragesSection(sec.leftLines || []);
      const pm = parseAveragesSection(sec.rightLines || []);
      if (renderDualAveragesSideBySide(am, pm)) {
        y -= 2;
        continue;
      }
    }

    // v0.5.80 — Dernière entrée : vue simple (si pas de Matin/Soir)
    if (/^Dernière entrée/i.test(sec.title)) {
      const d = parseLastEntry(sec.lines || []);
      if ((d.date || d.moment || (d.scores && d.scores.length)) && renderLastEntryGrid(d)) {
        y -= 2;
        continue;
      }
      // fallback sinon
    }

    // v0.5.83 — Moyennes : mini-barres (si pas de Matin/Soir)
    if (/^Moyennes/i.test(sec.title)) {
      const av = parseLastEntry(sec.lines || []);
      if ((!av || !av.scores || !av.scores.length) && !av.hasAny) {
        if (!ensureSpace(lead + 2)) { truncated = true; break; }
        append(addText("F1", bodyFont, marginX, y, "- aucune"));
        y -= lead;
        y -= 10;
        continue;
      }

      const contentW = (pageW - 2 * marginX);
      const boxX = marginX;
      const boxW = contentW;
      const padX = 10;
      const leadIn = 14;
      const shownScores = (av.scores || []).slice(0, 9);
      const boxH = 12 + (shownScores.length * leadIn) + 16;
      if (!ensureSpace(boxH + 10)) { truncated = true; break; }

      append(addRectFill(boxX, y - (boxH - 4), boxW, boxH, theme.cardBg));
      append(addRectFill(boxX, y - (boxH - 4), 3, boxH, theme.cardStripe));

      let yy = y - 4;
      const barW = 170;
      const barH = 8;
      for (const s of shownScores) {
        yy -= leadIn;
        const label = String(s.label || "").trim();
        const hasVal = (s.val != null) && !isNaN(s.val);
        const val = hasVal ? s.val : null;
        const txtv = hasVal ? `${Math.round(val)}/10` : "-";
        append(addText("F1", 10, boxX + padX, yy, label));

        const bx = boxX + padX + 160;
        const by = yy - 1;
        if (theme.mode === "color") {
          if (hasVal) {
            append(addSliderTrack(bx, by, barW, barH));
            append(addSliderThumb(bx, by, barW, barH, val));
          } else {
            append(addRectFill(bx, by, barW, barH, theme.barBg));
          }
        } else {
          append(addRectFill(bx, by, barW, barH, theme.barBg));
          const fillW = hasVal ? Math.max(0, Math.min(barW, (val / 10) * barW)) : 0;
          if (fillW > 0) append(addRectFill(bx, by, fillW, barH, theme.barFill));
        }

        append(addText("F1", 10, bx + barW + 10, yy, txtv));
      }

      y -= (boxH + 12);
      y -= 6;
      continue;
    }

    // v0.5.79 — Contacts : médecin + pharmacie en 2 colonnes (version paginée)
    if (isContactsTitle2(sec.title)) {
      const hc = parseContactsSection2(sec.lines || []);
      const contentW = (pageW - 2 * marginX);
      const gap = 12;
      const colW = (contentW - gap) / 2;
      const x1 = marginX;
      const x2 = marginX + colW + gap;
      const wrapMax = Math.max(32, Math.floor(colW / 5.2));

      const padX = 10;
      const padTop = 10;
      const padBot = 10;
      const leadIn = 12;
      const cleanField = (v) => {
        const s = String(v ?? "").trim();
        if (!s) return "";
        if (s === "-" || s === "--") return "";
        return s;
      };
      const prepCard = (c) => {
        const name = cleanField(c && c.name);
        const phone = cleanField(c && c.phone);
        const address = cleanField(c && c.address);
        const shownName = name || "Non renseigné";
        const shownPhone = phone || "Non renseigné";
        const shownAddr = address || "Non renseigné";
        const addrParts = wrapWords("Adresse : " + shownAddr, wrapMax);
        const linesCount = 1 + 1 + addrParts.length;
        const cardH = padTop + 14 + (linesCount * leadIn) + padBot;
        return { shownName, shownPhone, addrParts, cardH };
      };

      const drawCard = (title, data, yStart, cardX, cardW, cardH) => {
        append(addRectFill(cardX, yStart - (cardH - 4), cardW, cardH, theme.cardBg));
        append(addRectFill(cardX, yStart - (cardH - 4), 3, cardH, theme.cardStripe));
        append(addText("F2", 11, cardX + padX, yStart, title));
        let yy = yStart - 14;
        append(addText("F2", 10, cardX + padX, yy, data.shownName));
        yy -= leadIn;
        append(addText("F1", 10, cardX + padX, yy, "Téléphone : " + data.shownPhone));
        yy -= leadIn;
        for (const p of data.addrParts) {
          append(addText("F1", 10, cardX + padX, yy, p));
          yy -= leadIn;
        }
      };

      const d1 = prepCard(hc.doctor);
      const d2 = prepCard(hc.pharmacy);
      const rowH = Math.max(d1.cardH, d2.cardH);

      // Ensure space for the whole row; otherwise page break and repeat header (suite)
      if (!ensureSpace(rowH + 24)) {
        if (streams.length < MP) {
          beginPage(true);
          if (!ensureSpace(28)) { truncated = true; break; }
          writeSectionHeader(secDisplayTitle2, true);
        } else { truncated = true; break; }
      }

      drawCard("Médecin", d1, y, x1, colW, rowH);
      drawCard("Pharmacie", d2, y, x2, colW, rowH);
      y -= (rowH + 12);
      y -= 6;
      continue;
    }

    for (const rawLine of (sec.lines || [])) {
      if (!(await maybeYield())) return null;
      if (truncated) break;

      // Need space for at least one line
      if (!ensureSpace(lead + 2)) {
        if (streams.length < MP) {
          beginPage(true);
          // Repeat section header on new page
          if (!ensureSpace(28)) { truncated = true; break; }
          writeSectionHeader(secDisplayTitle2, true);
        } else {
          truncated = true;
          break;
        }
      }

      const line = normalizeLine(rawLine);
      if (!line) { y -= 8; continue; }

      const indent = inferIndent(rawLine);
      const x = marginX + indent;
      const maxChars = Math.max(30, maxCharsBase - Math.floor(indent / 2));
      const parts = wrapWords(line, maxChars);

      for (let i = 0; i < parts.length; i++) {
        if (!(await maybeYield())) return null;
        if (!ensureSpace(lead + 2)) {
          if (streams.length < MP) {
            beginPage(true);
            if (!ensureSpace(28)) { truncated = true; break; }
            writeSectionHeader(secDisplayTitle2, true);
          } else {
            truncated = true;
            break;
          }
        }
        append(addText("F1", bodyFont, x, y, parts[i]));
        y -= lead;
      }
    }

    y -= 10;
    if (y <= maxY) {
      // If next section can't fit, pagination will handle at next loop; don't force truncation here.
      y = Math.max(y, maxY + 1);
    }
  }

  // If still truncated, add note on last page (above footer)
  if (truncated) {
    const note = (MP <= 1) ? "(Résumé tronqué : 1 page)" : `(Résumé tronqué : ${Math.min(MP, streams.length)} page(s))`;
    streams[streams.length - 1] += addText("F1", 9, marginX, marginBottom + 8, note);
  }

  // Footer on each page
  for (let i = 0; i < streams.length; i++) {
    if (!(await maybeYield())) return null;
    streams[i] += addRule(marginX, marginBottom - 10, pageW - marginX, marginBottom - 10, 0.85, 1);
    streams[i] += addText("F1", 9, marginX, marginBottom - 26, footerText);
    const pg = "Page " + (i + 1) + "/" + streams.length;
    streams[i] += addText("F1", 9, (pageW - marginX) - Math.min(90, pg.length * 5.2), marginBottom - 26, pg);
  }

  // Build PDF objects (multiple pages)
  const pageCount = streams.length;
  const objs = [];
  const addObj = (s) => { objs.push(s); return objs.length; };

  // Object numbering plan:
  // 1 Catalog
  // 2 Pages
  // 3 Font Helvetica
  // 4 Font Helvetica-Bold
  // 5..(4+pageCount) Page objects
  // (5+pageCount).. Content streams

  const pageStart = 5;
  const contentStart = pageStart + pageCount;

  addObj("<< /Type /Catalog /Pages 2 0 R >>");

  const kids = [];
  for (let i = 0; i < pageCount; i++) {
    if (!(await maybeYield())) return null; if (!(await maybeYield())) return null; kids.push(`${pageStart + i} 0 R`); }
  addObj(`<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pageCount} >>`);

  addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

  // Page objects
  for (let i = 0; i < pageCount; i++) {
    if (!(await maybeYield())) return null;
    const contentRef = `${contentStart + i} 0 R`;
    addObj(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentRef} >>`);
  }

  // Content streams
  for (let i = 0; i < pageCount; i++) {
    if (!(await maybeYield())) return null;
    const stream = streams[i];
    const streamLen = pdfLatin1Bytes(stream).length;
    addObj(`<< /Length ${streamLen} >>\nstream\n${stream}endstream`);
  }

  let pdf = "%PDF-1.4\n%âãÏÓ\n";
  const offsets = [0];
  for (let i = 0; i < objs.length; i++) {
    if (!(await maybeYield())) return null;
    offsets.push(pdf.length);
    pdf += (i + 1) + " 0 obj\n" + objs[i] + "\nendobj\n";
  }
  const xrefPos = pdf.length;
  pdf += "xref\n0 " + (objs.length + 1) + "\n";
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objs.length; i++) {
    const off = String(offsets[i]).padStart(10, "0");
    pdf += off + " 00000 n \n";
  }
  pdf += "trailer\n<< /Size " + (objs.length + 1) + " /Root 1 0 R >>\nstartxref\n" + xrefPos + "\n%%EOF";

  const bytes = pdfLatin1Bytes(pdf);
  return new Blob([bytes], { type: "application/pdf" });
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

let __pdfGenerating = false;
let __pdfCooldownUntil = 0;
let __pdfCooldownTimer = null;

// v0.6.18 — suivi du dernier résultat (pour appliquer une micro cooldown post succès/annulation)
let __pdfLastOutcome = "idle"; // idle | success | cancel | error

// v0.6.18 — mini feedback "Prêt ✅" pendant la micro cooldown
let __pdfReadyHintTimer = null;

// v0.6.19 — clic pendant cooldown : mini feedback "Encore 1 seconde…"
let __pdfCooldownClickHintTimer = null;
let __pdfReadyHintOrigText = null;

// v0.6.14 — mini feedback après annulation
let __pdfCancelHintTimer = null;

// v0.6.17 — mini feedback après export réussi
let __pdfDoneHintTimer = null;

// v0.6.15 — timer du message “ça prend plus de temps…” (pour l’annuler proprement)
let __pdfSlowHintTimer = null;
// v0.6.16 — timer du 2e message “toujours en cours…”
let __pdfVerySlowHintTimer = null;

// v0.6.23 — retour après changement d’onglet pendant export
let __pdfWasHiddenDuringExport = false;
let __pdfHiddenAt = 0;
let __pdfResumeHintTimer = null;

// v0.6.12 — job token pour annulation "UI-only" (sans interrompre forcément le calcul)
let __pdfJob = null;

function setPdfProgressVisible(isVisible) {
  const wrap = $("pdfProgressWrap");
  if (wrap) {
    try { wrap.style.display = isVisible ? "block" : "none"; } catch {}
  }
  const btnCancel = $("btnCancelPdf");
  if (btnCancel) {
    try { btnCancel.disabled = !isVisible; } catch {}
  }
  if (!isVisible) {
    const fill = $("pdfProgressFill");
    if (fill) { try { fill.style.width = "0%"; } catch {} }
  }
}

function setPdfProgressStep(step, total, label, ratio01 = null) {
  const text = $("pdfProgressText");
  if (text) {
    const s = Math.max(1, Number(step) || 1);
    const t = Math.max(1, Number(total) || 1);
    const lab = String(label || "").trim();
    try { text.textContent = `Étape ${Math.min(s,t)}/${t}` + (lab ? ` — ${lab}` : ""); } catch {}
  }
  const fill = $("pdfProgressFill");
  if (fill) {
    const r = (ratio01 == null) ? (Math.min(1, Math.max(0, (step / (total || 1))))) : Math.min(1, Math.max(0, ratio01));
    try { fill.style.width = Math.round(r * 100) + "%"; } catch {}
  }
}

function setPdfSlowHintVisible(isVisible) {
  const el = $("pdfSlowHint");
  if (!el) return;
  try { el.style.display = isVisible ? "block" : "none"; } catch {}

  // v0.6.23 — astuce affichée avec le 2e message “Toujours en cours…”
  try { setPdfEstimateHintVisible(!!isVisible); } catch {}
}

function setPdfEstimateHintVisible(isVisible) {
  const el = $("pdfEstimateHint");
  if (!el) return;
  try { el.style.display = isVisible ? "block" : "none"; } catch {}
}

function setPdfVerySlowHintVisible(isVisible) {
  const el = $("pdfVerySlowHint");
  if (!el) return;
  try { el.style.display = isVisible ? "block" : "none"; } catch {}
}


function setPdfResumeHintVisible(isVisible) {
  const el = $("pdfResumeHint");
  if (!el) return;
  try { el.style.display = isVisible ? "block" : "none"; } catch {}
}

function showPdfResumeHint(ms = 1200) {
  try {
    if (__pdfResumeHintTimer) { clearTimeout(__pdfResumeHintTimer); __pdfResumeHintTimer = null; }
  } catch {}
  try { setPdfResumeHintVisible(true); } catch {}
  try {
    __pdfResumeHintTimer = setTimeout(() => {
      __pdfResumeHintTimer = null;
      try { setPdfResumeHintVisible(false); } catch {}
    }, Math.max(300, Number(ms) || 1200));
  } catch {}
}

// v0.6.25 — au retour onglet pendant export PDF : 'Reprise…' + surligner l’étape en cours (1 s)
let __pdfProgressFlashTimer = null;
function flashPdfProgress(ms = 1000) {
  const wrap = $("pdfProgressWrap");
  if (!wrap) return;
  try { if (__pdfProgressFlashTimer) { clearTimeout(__pdfProgressFlashTimer); __pdfProgressFlashTimer = null; } } catch {}
  try { wrap.classList.remove("pdfProgress--flash"); void wrap.offsetWidth; wrap.classList.add("pdfProgress--flash"); } catch {}
  try {
    __pdfProgressFlashTimer = setTimeout(() => {
      __pdfProgressFlashTimer = null;
      try { wrap.classList.remove("pdfProgress--flash"); } catch {}
    }, Math.max(200, Number(ms) || 1000));
  } catch {}
}

function __isElementInViewport(el, padding = 0) {
  try {
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const vw = window.innerWidth || document.documentElement.clientWidth;
    return (r.bottom >= (0 + padding) && r.right >= (0 + padding) && r.top <= (vh - padding) && r.left <= (vw - padding));
  } catch { return false; }
}
function ensurePdfPanelVisibleAndScroll() {
  try {
    // Force l’onglet PDF si l’utilisateur était ailleurs
    const activeBtn = document.querySelector(".tab.is-active");
    const activeTab = activeBtn && activeBtn.dataset ? activeBtn.dataset.tab : null;
    if (activeTab !== "pdf") {
      try { setTab("pdf"); } catch {}
    }
  } catch {}
  try {
    // v0.6.27 — scroll doux UNIQUEMENT si le bloc de progression n’est pas visible.
    // (évite les “sauts” quand l’utilisateur est déjà au bon endroit)
    const progress = $("pdfProgressWrap");
    const fallback = $("btnPdf") || $("tab-pdf");
    const target = progress || fallback;
    if (!target) return;

    // Si on a le bloc progression, c’est lui la référence de visibilité (et pas le bouton).
    const visibilityRef = progress || target;

    if (__isElementInViewport(visibilityRef, 24)) return;

    requestAnimationFrame(() => {
      try { target.scrollIntoView({ behavior: "smooth", block: "start" }); } catch {
        try { target.scrollIntoView(true); } catch {}
      }
    });
  } catch {}
}


function setPdfCancelHintVisible(isVisible) {
  const el = $("pdfCancelHint");
  if (!el) return;
  try { el.style.display = isVisible ? "block" : "none"; } catch {}
}

function showPdfCancelHint(ms = 1500) {
  try {
    if (__pdfCancelHintTimer) { clearTimeout(__pdfCancelHintTimer); __pdfCancelHintTimer = null; }
  } catch {}
  try { setPdfCancelHintVisible(true); } catch {}
  try {
    __pdfCancelHintTimer = setTimeout(() => {
      __pdfCancelHintTimer = null;
      try { setPdfCancelHintVisible(false); } catch {}
    }, Math.max(300, Number(ms) || 1500));
  } catch {}
}

function setPdfDoneHintVisible(isVisible) {
  const el = $("pdfDoneHint");
  if (!el) return;
  try { el.style.display = isVisible ? "block" : "none"; } catch {}
}

function showPdfDoneHint(ms = 1500) {
  try {
    if (__pdfDoneHintTimer) { clearTimeout(__pdfDoneHintTimer); __pdfDoneHintTimer = null; }
  } catch {}
  try { setPdfDoneHintVisible(true); } catch {}
  try {
    __pdfDoneHintTimer = setTimeout(() => {
      __pdfDoneHintTimer = null;
      try { setPdfDoneHintVisible(false); } catch {}
    }, Math.max(300, Number(ms) || 1500));
  } catch {}
}

function setPdfReadyHintVisible(isVisible) {
  const el = $("pdfReadyHint");
  if (!el) return;
  try { el.style.display = isVisible ? "block" : "none"; } catch {}
}

function showPdfReadyHint(ms = 1000) {
  try {
    if (__pdfReadyHintTimer) { clearTimeout(__pdfReadyHintTimer); __pdfReadyHintTimer = null; }
  } catch {}
  try { setPdfReadyHintVisible(true); } catch {}
  try {
    __pdfReadyHintTimer = setTimeout(() => {
      __pdfReadyHintTimer = null;
      try { setPdfReadyHintVisible(false); } catch {}
    }, Math.max(300, Number(ms) || 1000));
  } catch {}
}

// v0.6.19 — si clic pendant la micro-cooldown : affiche “Encore 1 seconde…” sans relancer l’export
function showPdfCooldownClickHint() {
  const el = $("pdfReadyHint");
  if (!el) return;

  try {
    if (__pdfReadyHintOrigText === null) {
      __pdfReadyHintOrigText = (el.textContent || "Prêt ✅");
    }
  } catch {}

  // Stoppe tout timer existant sur ce hint
  try { if (__pdfReadyHintTimer) { clearTimeout(__pdfReadyHintTimer); __pdfReadyHintTimer = null; } } catch {}
  try { if (__pdfCooldownClickHintTimer) { clearTimeout(__pdfCooldownClickHintTimer); __pdfCooldownClickHintTimer = null; } } catch {}

  try { el.textContent = "Encore 1 seconde…"; } catch {}
  try { setPdfReadyHintVisible(true); } catch {}

  // v0.6.20 — si la micro-cooldown se termine pendant “Encore 1 seconde…”,
  // on bascule immédiatement sur “Prêt ✅” (au lieu d’attendre la fin des ~0,9 s).
  const remainingCooldown = (() => {
    try {
      const until = Number(__pdfCooldownUntil) || 0;
      const rem = until - Date.now();
      return Math.max(0, rem);
    } catch {
      return 0;
    }
  })();
  const hintMs = Math.max(120, Math.min(900, remainingCooldown > 0 ? remainingCooldown : 900));

  __pdfCooldownClickHintTimer = setTimeout(() => {
    __pdfCooldownClickHintTimer = null;
    try { el.textContent = (__pdfReadyHintOrigText || "Prêt ✅"); } catch {}
    // Si la cooldown est encore active, on laisse “Prêt ✅” visible (déjà géré par le flux v0.6.18).
    if (__pdfCooldownUntil && Date.now() < __pdfCooldownUntil) {
      try { setPdfReadyHintVisible(true); } catch {}
    } else {
      try { setPdfReadyHintVisible(false); } catch {}
    }
  }, hintMs);
}


function cancelPdfExportUIOnly() {
  const job = __pdfJob;
  if (!job) return;
  try { job.cancelled = true; } catch {}
  try { __pdfJob = null; } catch {}

  // v0.6.18 — marqueur de résultat
  try { __pdfLastOutcome = "cancel"; } catch {}

  // v0.6.18 — si “Prêt ✅” traînait, on nettoie
  try { if (__pdfReadyHintTimer) { clearTimeout(__pdfReadyHintTimer); __pdfReadyHintTimer = null; } } catch {}
  try { setPdfReadyHintVisible(false); } catch {}

  // v0.6.17 — si un “PDF téléchargé” traînait, on nettoie
  try { if (__pdfDoneHintTimer) { clearTimeout(__pdfDoneHintTimer); __pdfDoneHintTimer = null; } } catch {}
  try { setPdfDoneHintVisible(false); } catch {}

  // v0.6.15 — annule immédiatement le timer et masque le message “ça prend un peu plus de temps…”
  try { if (__pdfSlowHintTimer) { clearTimeout(__pdfSlowHintTimer); __pdfSlowHintTimer = null; } } catch {}
  try { setPdfSlowHintVisible(false); } catch {}

  // v0.6.16 — idem pour le 2e message “toujours en cours…”
  try { if (__pdfVerySlowHintTimer) { clearTimeout(__pdfVerySlowHintTimer); __pdfVerySlowHintTimer = null; } } catch {}
  try { setPdfVerySlowHintVisible(false); } catch {}

  // Stoppe l'UI immédiatement (même si le navigateur finit le calcul en arrière-plan)
  try { setPdfProgressVisible(false); } catch {}
  try { setPdfGeneratingUI(false); } catch {}

  // v0.6.14 — feedback doux puis retour à l'état normal
  try { showPdfCancelHint(1500); } catch {}
}

function setPdfGeneratingUI(isGenerating) {
  const next = !!isGenerating;
  // v0.6.23 — reset "reprise" state
  if (!next) {
    __pdfWasHiddenDuringExport = false;
    try { if (__pdfResumeHintTimer) { clearTimeout(__pdfResumeHintTimer); __pdfResumeHintTimer = null; } } catch {}
    try { setPdfResumeHintVisible(false); } catch {}
  } else {
    try { setPdfResumeHintVisible(false); } catch {}
  }
  const prev = __pdfGenerating;
  __pdfGenerating = next;

  // v0.6.11 — mini feedback "Génération en cours…" (texte discret)
  const hint = $("pdfGeneratingHint");
  if (hint) {
    try { hint.style.display = next ? "block" : "none"; } catch {}
  }

  // v0.6.13 — message rassurant si ça dure > ~3–4 s
  try { setPdfSlowHintVisible(false); } catch {}

  // v0.6.16 — reset du 2e message
  try { setPdfVerySlowHintVisible(false); } catch {}

  // v0.6.18 — reset du mini feedback “Prêt ✅”
  if (next) {
    try { if (__pdfReadyHintTimer) { clearTimeout(__pdfReadyHintTimer); __pdfReadyHintTimer = null; } } catch {}
    try { setPdfReadyHintVisible(false); } catch {}
  }

  // v0.6.14 — cache le feedback d'annulation dès qu'un export repart
  if (next) {
    try {
      if (__pdfCancelHintTimer) { clearTimeout(__pdfCancelHintTimer); __pdfCancelHintTimer = null; }
    } catch {}
    try { setPdfCancelHintVisible(false); } catch {}
  }


  // v0.6.12 — micro progression + annulation (UI)
  try { setPdfProgressVisible(next); } catch {}

  const btnMain = $("btnPdf");
  const btnRetry = $("btnRetryPdfQuick");
  const themeWrap = $("pdfTheme");
  const setThemeDisabled = (d) => {
    if (!themeWrap) return;
    try { themeWrap.querySelectorAll("button.seg").forEach((b) => { b.disabled = !!d; }); } catch {}
  };

  if (btnMain) {
    try {
      if (!btnMain.dataset.labelOrig) btnMain.dataset.labelOrig = btnMain.textContent || "Télécharger";
      btnMain.textContent = next ? "Génération…" : btnMain.dataset.labelOrig;
      btnMain.setAttribute("aria-busy", next ? "true" : "false");
    } catch {}
  }
  if (btnRetry) {
    try {
      if (!btnRetry.dataset.labelOrig) btnRetry.dataset.labelOrig = btnRetry.textContent || "Re-tenter l’export";
      btnRetry.textContent = next ? "Génération…" : btnRetry.dataset.labelOrig;
    } catch {}
  }

  // Enter generating
  if (next) {
    try {
      if (__pdfCooldownTimer) { clearTimeout(__pdfCooldownTimer); __pdfCooldownTimer = null; }
      __pdfCooldownUntil = 0;
    } catch {}

    if (btnMain) { try { btnMain.disabled = true; } catch {} }
    if (btnRetry) { try { btnRetry.disabled = true; } catch {} }
    setThemeDisabled(true);
    return;
  }

  // Leave generating (or ensure idle)
  const outcome = (() => { try { return String(__pdfLastOutcome || ""); } catch { return ""; } })();
  const cooldownMs = (prev && (outcome === "success" || outcome === "cancel")) ? 1000 : (prev ? 550 : 0); // v0.6.18
  const enableNow = () => {
    if (__pdfGenerating) return;
    if (__pdfCooldownUntil && Date.now() < __pdfCooldownUntil) return;
    if (btnMain) { try { btnMain.disabled = false; } catch {} }
    if (btnRetry) { try { btnRetry.disabled = false; } catch {} }
    setThemeDisabled(false);

    // v0.6.18 — cache “Prêt ✅” quand on redevient cliquable
    try { if (__pdfReadyHintTimer) { clearTimeout(__pdfReadyHintTimer); __pdfReadyHintTimer = null; } } catch {}
    try { if (__pdfCooldownClickHintTimer) { clearTimeout(__pdfCooldownClickHintTimer); __pdfCooldownClickHintTimer = null; } } catch {}
    try { const el = $("pdfReadyHint"); if (el && __pdfReadyHintOrigText !== null) el.textContent = __pdfReadyHintOrigText; } catch {}
    try { setPdfReadyHintVisible(false); } catch {}
  };

  if (cooldownMs > 0) {
    __pdfCooldownUntil = Date.now() + cooldownMs;
    if (btnMain) { try { btnMain.disabled = true; } catch {} }
    if (btnRetry) { try { btnRetry.disabled = true; } catch {} }
    setThemeDisabled(true);

    try { if (__pdfCooldownTimer) clearTimeout(__pdfCooldownTimer); } catch {}
    __pdfCooldownTimer = setTimeout(() => {
      __pdfCooldownTimer = null;
      enableNow();
    }, cooldownMs);

    // v0.6.18 — pendant la micro cooldown post succès/annulation : “Prêt ✅”
    try {
      if (outcome === "success" || outcome === "cancel") {
        showPdfReadyHint(cooldownMs);
      }
    } catch {}
  } else {
    enableNow();
  }
}

function nextPaint() {
  return new Promise((resolve) => {
    try {
      requestAnimationFrame(() => setTimeout(resolve, 0));
    } catch (e) {
      setTimeout(resolve, 0);
    }
  });
}

async function exportPdf() {
  if (__pdfGenerating) return;
  if (__pdfCooldownUntil && Date.now() < __pdfCooldownUntil) {
    try { showPdfCooldownClickHint(); } catch {}
    return;
  }

  // v0.6.12 — token d'annulation (UI-only)
  const job = { startedAt: Date.now(), cancelled: false };
  __pdfJob = job;

  // v0.6.18 — reset résultat de la tentative
  try { __pdfLastOutcome = "idle"; } catch {}

    // v0.6.65 — sauvegarde silencieuse des contacts avant génération PDF
  try { syncHealthContactsFromUI(); } catch (e) {}

setPdfGeneratingUI(true);
  // v0.6.17 — reset feedback “PDF téléchargé”
  try { if (__pdfDoneHintTimer) { clearTimeout(__pdfDoneHintTimer); __pdfDoneHintTimer = null; } } catch {}
  try { setPdfDoneHintVisible(false); } catch {}
  await nextPaint();

  // v0.6.13 — si ça dépasse ~3–4 s : message rassurant (sans cacher “Annuler”)
  // v0.6.15 — on garde le timer en global pour pouvoir l'annuler dès que l'utilisateur clique “Annuler”
  let slowTimer = null;
  let verySlowTimer = null;
  try {
    try { if (__pdfSlowHintTimer) { clearTimeout(__pdfSlowHintTimer); __pdfSlowHintTimer = null; } } catch {}
    slowTimer = setTimeout(() => {
      try {
        if (__pdfJob === job && __pdfGenerating && !job.cancelled) setPdfSlowHintVisible(true);
      } catch {}
    }, 3500);
    __pdfSlowHintTimer = slowTimer;

    // v0.6.16 — 2e message si ça dépasse ~8–10 s
    try { if (__pdfVerySlowHintTimer) { clearTimeout(__pdfVerySlowHintTimer); __pdfVerySlowHintTimer = null; } } catch {}
    verySlowTimer = setTimeout(() => {
      try {
        if (__pdfJob === job && __pdfGenerating && !job.cancelled) {
          // Remplace le 1er message pour éviter l’empilement
          try { setPdfSlowHintVisible(false); } catch {}
          try { setPdfVerySlowHintVisible(true); } catch {}
        }
      } catch {}
    }, 9000);
    __pdfVerySlowHintTimer = verySlowTimer;
  } catch {}

  const errEl = $("pdfError");
  if (errEl) { errEl.style.display = "none"; errEl.textContent = ""; }

  const cleanupCancelled = () => {
    // v0.6.18 — si on sort par annulation, on marque le résultat
    try { if (job.cancelled) __pdfLastOutcome = "cancel"; } catch {}
    try { if (__pdfJob === job) __pdfJob = null; } catch {}
    try { if (slowTimer) clearTimeout(slowTimer); } catch {}
    // v0.6.15 — évite que le message réapparaisse après annulation
    try { if (__pdfSlowHintTimer === slowTimer) __pdfSlowHintTimer = null; } catch {}
    try { setPdfSlowHintVisible(false); } catch {}
    try { if (verySlowTimer) clearTimeout(verySlowTimer); } catch {}
    try { if (__pdfVerySlowHintTimer === verySlowTimer) __pdfVerySlowHintTimer = null; } catch {}
    try { setPdfSlowHintVisible(false); } catch {}
    try { setPdfVerySlowHintVisible(false); } catch {}
    setPdfGeneratingUI(false);
  };

  try { setPdfSupportVisible(false); } catch {}

  // Réinitialise l'erreur PDF (tentative en cours)
  try { setPdfLastError(null); } catch {}

  // Étape 1/2 — Préparation
  try { setPdfProgressStep(1, 2, "Préparation…", 0.35); } catch {}
  await nextPaint();
  if (job.cancelled) { cleanupCancelled(); return; }

  const summary = buildSummaryText();
  const lines = summary.split(/\n/);

  // Étape 2/2 — Génération
  try { setPdfProgressStep(2, 2, "Génération du PDF…", 0.75); } catch {}
  await nextPaint();
  // Laisse une fenêtre pour "Annuler" avant le calcul lourd
  await new Promise((r) => setTimeout(r, 0));
  if (job.cancelled) { cleanupCancelled(); return; }

  // v0.6.29 — mode simulation PDF lent (tests des messages / annulation)
  try {
    if (isDebugPdfSlowMode()) {
      // ~11s : déclenche les messages “lent” + “très lent”
      const ok = await debugPdfSlowWait(11000, job);
      if (!ok || job.cancelled) { cleanupCancelled(); return; }
    }
  } catch {}

  
  // v0.6.32 — mode simulation erreur PDF (tests du parcours “Aide PDF”)
  if (isDebugPdfFailMode()) {
    // Petite pause pour afficher l'état avant l'erreur (utile sur Safari)
    await new Promise((r) => setTimeout(r, 200));
    if (job.cancelled) { cleanupCancelled(); return; }
    throw new Error("DEBUG_PDF_FAIL: erreur simulée");
  }

// v0.6.00 — PDF CTE verrouillé (pas de fallback silencieux)
  const maxPages = 2;
  const layout = "visual";

  try {
    const blob = await makePrettyPdfFromSummaryLinesPaged(lines, maxPages, getPdfTheme(), layout, job);
    if (!blob) { cleanupCancelled(); return; }
    if (job.cancelled) { cleanupCancelled(); return; }
    try { setPdfProgressStep(2, 2, "Finalisation…", 1.0); } catch {}
    const ts = makeExportStamp();
    downloadBlob(blob, `boussole_resume_v${APP_VERSION}_${ts}.pdf`);
    // v0.6.18 — marqueur de succès
    try { __pdfLastOutcome = "success"; } catch {}
    // v0.6.17 — mini feedback après succès
    try { showPdfDoneHint(1500); } catch {}
  } catch (e) {
    if (job.cancelled) { cleanupCancelled(); return; }
    // v0.6.18 — marqueur d'erreur
    try { __pdfLastOutcome = "error"; } catch {}
    console.error("[PDF] Erreur génération (CTE verrouillé).", e);
    let msg = "Erreur : impossible de générer le PDF (mise en page CTE). Réessaie. Si ça persiste, utilise le bloc “Aide PDF” ci‑dessous.";
    // v0.6.34 — indication explicite en mode debug erreur
    try {
      const em = (e && (e.message || e.toString)) ? String(e.message || e.toString()) : "";
      if (isDebugPdfFailMode() || em.includes("DEBUG_PDF_FAIL")) {
        msg += "\nErreur simulée (test).";
      }
    } catch {}

    const tech = (() => {
      try {
        if (e && typeof e === "object") {
          if (e.stack) return String(e.stack);
          if (e.message) return String(e.message);
        }
        return String(e || "");
      } catch { return ""; }
    })();
    const techShort = String(tech || "").replace(/\s+/g, " ").trim().slice(0, 900);

    try {
      setPdfLastError({
        ts: nowISO(),
        messageUser: msg,
        messageTech: techShort,
        theme: (() => { try { return getPdfTheme(); } catch { return ""; } })(),
        url: location.href,
      });
    } catch {}

    try {
      pushError({
        ts: nowISO(),
        type: "pdf",
        message: msg + (techShort ? (" | " + techShort) : ""),
      });
    } catch {}

    if (errEl) { errEl.style.display = "block"; errEl.textContent = msg; }
    else { try { alert(msg); } catch (e2) {} }

    try { setPdfSupportVisible(true); } catch {}

    // v0.6.08 — mini guidance (auto-masqué)
    try { showPdfGuideHint(); } catch {}

    // v0.6.07 — en cas d'erreur : scroll vers le bloc Aide PDF + mise en évidence légère
    try { scrollToPdfSupportAndFlash(); } catch {}
  } finally {
    try { if (__pdfJob === job) __pdfJob = null; } catch {}
    // v0.6.15 — nettoyage du timer “ça prend plus de temps…”
    try { if (__pdfSlowHintTimer === slowTimer) { clearTimeout(__pdfSlowHintTimer); __pdfSlowHintTimer = null; } } catch {}
    // v0.6.16 — nettoyage du 2e timer “toujours en cours…”
    try { if (__pdfVerySlowHintTimer === verySlowTimer) { clearTimeout(__pdfVerySlowHintTimer); __pdfVerySlowHintTimer = null; } } catch {}
    try { setPdfSlowHintVisible(false); } catch {}
    try { setPdfVerySlowHintVisible(false); } catch {}
    setPdfGeneratingUI(false);
  }
}
function makePreConsultFormPdf(themeKey) {
  const pageW = 595;
  const pageH = 842;
  const marginX = 48;
  const marginTop = 64;
  const marginBottom = 54;

  const theme = (() => {
    const k = (themeKey === "bw") ? "bw" : "color";
    if (k === "bw") {
      return {
        mode: "bw",
        headerBg: 0.93,
        headerTitle: 0.0,
        headerSub: 0.15,
        band: 0.95,
        stripe: 0.70,
        text: 0.0,
        muted: 0.25,
        rule: 0.78,
        box: 0.55,
      };
    }
    return {
      mode: "color",
      headerBg: { r: 0.93, g: 0.96, b: 0.99 },
      headerTitle: { r: 0.10, g: 0.30, b: 0.55 },
      headerSub: { r: 0.15, g: 0.20, b: 0.30 },
      band: { r: 0.96, g: 0.98, b: 1.00 },
      stripe: { r: 0.12, g: 0.36, b: 0.67 },
      text: { r: 0.06, g: 0.08, b: 0.10 },
      muted: { r: 0.20, g: 0.24, b: 0.30 },
      rule: { r: 0.70, g: 0.74, b: 0.78 },
      box: { r: 0.40, g: 0.45, b: 0.50 },
    };
  })();

  const esc = pdfEscape;
  const colorFillOp = (c) => {
    if (c && typeof c === "object") return `${c.r} ${c.g} ${c.b} rg
`;
    if (typeof c === "number") return `${c} g
`;
    return "0 g\n";
  };
  const colorStrokeOp = (c) => {
    if (c && typeof c === "object") return `${c.r} ${c.g} ${c.b} RG
`;
    if (typeof c === "number") return `${c} G
`;
    return "0 G\n";
  };
  const addText = (fontKey, fontSize, x, y, txt, fill) => {
    const op = colorFillOp(fill == null ? theme.text : fill);
    return `BT
${op}/${fontKey} ${fontSize} Tf
${x} ${y} Td
(${esc(txt)}) Tj
ET
`;
  };
  const addRule = (x1, y1, x2, y2, stroke, w) => {
    const lw = (w == null) ? 1 : w;
    const op = colorStrokeOp(stroke == null ? theme.rule : stroke);
    return `q
${lw} w
${op}${x1} ${y1} m
${x2} ${y2} l
S
Q
`;
  };
  const addRectFill = (x, y, w, h, fill) => {
    const op = colorFillOp(fill == null ? theme.band : fill);
    return `q
${op}${x} ${y} ${w} ${h} re
f
Q
`;
  };
  const addRectStroke = (x, y, w, h, stroke, lw) => {
    const w2 = (lw == null) ? 1 : lw;
    const op = colorStrokeOp(stroke == null ? theme.rule : stroke);
    return `q
${w2} w
${op}${x} ${y} ${w} ${h} re
S
Q
`;
  };
  const checkbox = (x, y, size=10) => addRectStroke(x, y, size, size, theme.box, 1);

  let stream = "";

  // Header
  stream += addRectFill(0, pageH - 56, pageW, 56, theme.headerBg);
  stream += addText("F2", 18, marginX, pageH - 34, "FICHE PRÉ‑CONSULTATION", theme.headerTitle);
  stream += addText("F1", 11, marginX, pageH - 50, "(ultra courte – 1 page) à remplir", theme.headerSub);
  const right = pageW - marginX;
  const rightText = `v${APP_VERSION}`;
  stream += addText("F2", 11, right - Math.min(140, rightText.length * 6), pageH - 34, rightText);
  stream += addRule(marginX, pageH - 58, pageW - marginX, pageH - 58, 0.80, 1);

  let y = pageH - marginTop - 12;

  // Small identity row
  stream += addText("F2", 11, marginX, y, "Nom / Prenom :");
  stream += addRule(marginX + 92, y - 2, marginX + 290, y - 2, 0.55, 1);
  stream += addText("F2", 11, marginX + 320, y, "Date :");
  stream += addRule(marginX + 360, y - 2, pageW - marginX, y - 2, 0.55, 1);
  y -= 22;

  stream += addText("F2", 11, marginX, y, "Motif principal :");
  stream += addRule(marginX + 108, y - 2, pageW - marginX, y - 2, 0.55, 1);
  y -= 18;

  const section = (n, title, height) => {
    const padY = 10;
    const boxH = height;
    const boxY = y - boxH;
    stream += addRectFill(marginX, boxY, pageW - 2 * marginX, boxH, theme.cardBg);
    stream += addRectStroke(marginX, boxY, pageW - 2 * marginX, boxH, 0.85, 1);
    stream += addText("F2", 12, marginX + 10, y - padY - 2, `${n}  ${title}`);
    return { topY: y, bottomY: boxY };
  };

  // 1) 3 symptoms
  let s = section(1, "Mes 3 symptomes principaux", 96);
  let yy = y - 34;
  for (let i = 1; i <= 3; i++) {
    stream += addText("F1", 11, marginX + 14, yy, `${i}.`);
    stream += addRule(marginX + 34, yy - 2, pageW - marginX - 10, yy - 2, 0.70, 1);
    yy -= 22;
  }
  y = s.bottomY - 14;

  // 2) frequency + moments
  s = section(2, "Frequence + moments", 88);
  yy = y - 34;
  stream += addText("F2", 11, marginX + 14, yy, "Frequence :");
  stream += checkbox(marginX + 98, yy - 9);
  stream += addText("F1", 11, marginX + 112, yy, "Quotidien");
  stream += checkbox(marginX + 190, yy - 9);
  stream += addText("F1", 11, marginX + 204, yy, "Intermittent");
  yy -= 22;
  stream += addText("F2", 11, marginX + 14, yy, "Moments :");
  stream += addText("F1", 11, marginX + 78, yy, "Matin / Apres-midi / Soir / Nuit");
  yy -= 22;
  stream += addText("F2", 11, marginX + 14, yy, "Depuis quand :");
  stream += addRule(marginX + 106, yy - 2, pageW - marginX - 10, yy - 2, 0.70, 1);
  y = s.bottomY - 14;

  // 3) triggers
  s = section(3, "Declencheurs (ce qui aggrave)", 78);
  yy = y - 34;
  const opts1 = ["Chaleur", "Effort", "Stress", "Repas", "Debout", "Bruit/lumiere"];
  let x = marginX + 14;
  for (let i = 0; i < opts1.length; i++) {
    stream += checkbox(x, yy - 9);
    stream += addText("F1", 10, x + 14, yy, opts1[i]);
    x += 84;
    if (i === 2) { yy -= 20; x = marginX + 14; }
  }
  yy -= 20;
  stream += checkbox(marginX + 14, yy - 9);
  stream += addText("F1", 10, marginX + 28, yy, "Autre :");
  stream += addRule(marginX + 66, yy - 2, pageW - marginX - 10, yy - 2, 0.70, 1);
  y = s.bottomY - 14;

  // 4) helps
  s = section(4, "Ce qui soulage un peu", 70);
  yy = y - 34;
  const opts2 = ["Repos", "Hydratation", "Respiration lente", "Environnement calme"];
  x = marginX + 14;
  for (let i = 0; i < opts2.length; i++) {
    stream += checkbox(x, yy - 9);
    stream += addText("F1", 10, x + 14, yy, opts2[i]);
    x += 130;
    if (i === 1) { yy -= 20; x = marginX + 14; }
  }
  yy -= 20;
  stream += checkbox(marginX + 14, yy - 9);
  stream += addText("F1", 10, marginX + 28, yy, "Autre :");
  stream += addRule(marginX + 66, yy - 2, pageW - marginX - 10, yy - 2, 0.70, 1);
  y = s.bottomY - 14;

  // 5) impact
  s = section(5, "Impact concret", 86);
  yy = y - 34;
  const impact = ["Sommeil", "Concentration (lecture / ecriture)", "Humeur", "Activites limitees"];
  for (let i = 0; i < impact.length; i++) {
    stream += checkbox(marginX + 14, yy - 9);
    stream += addText("F1", 10, marginX + 28, yy, impact[i] + " :");
    stream += addRule(marginX + 220, yy - 2, pageW - marginX - 10, yy - 2, 0.70, 1);
    yy -= 19;
  }
  y = s.bottomY - 14;

  // 6) already tried
  s = section(6, "Deja essaye (medicamenteux ou non)", 72);
  yy = y - 34;
  for (let i = 0; i < 2; i++) {
    stream += addText("F1", 10, marginX + 14, yy, "- ");
    stream += addRule(marginX + 30, yy - 2, marginX + 250, yy - 2, 0.70, 1);
    stream += addText("F2", 10, marginX + 262, yy, "=> Effet :");
    stream += addRule(marginX + 320, yy - 2, pageW - marginX - 10, yy - 2, 0.70, 1);
    yy -= 22;
  }
  y = s.bottomY - 14;

  // 7) objectives + questions
  s = section(7, "Mes 3 priorites (objectifs) / questions", 104);
  yy = y - 34;
  const qs = [
    "Quels symptomes surveiller en priorite ?",
    "Quel plan progressif sur 4-8 semaines ?",
    "Quels examens / orientations utiles dans mon cas ?",
    "Comment mieux gerer brouillard + dysautonomie au quotidien ?",
  ];
  for (let i = 0; i < qs.length; i++) {
    stream += checkbox(marginX + 14, yy - 9);
    stream += addText("F1", 10, marginX + 28, yy, qs[i]);
    yy -= 18;
  }
  y = s.bottomY - 16;

  // Footer warning
  stream += addRule(marginX, marginBottom - 10, pageW - marginX, marginBottom - 10, 0.85, 1);
  stream += addText("F1", 9, marginX, marginBottom - 26, "Infos generales uniquement. Pas d'avis medical personnalise en ligne.");
  stream += addText("F1", 9, marginX, marginBottom - 40, "En cas de doute / symptome : medecin traitant. Urgences : 15");

  // Build PDF objects
  const objs = [];
  const addObj = (s) => { objs.push(s); return objs.length; };

  addObj("<< /Type /Catalog /Pages 2 0 R >>");
  addObj("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  addObj("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + pageW + " " + pageH + "] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>");
  addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const streamLen = pdfLatin1Bytes(stream).length;
  addObj("<< /Length " + streamLen + " >>\nstream\n" + stream + "endstream");

  let pdf = "%PDF-1.4\n%âãÏÓ\n";
  const offsets = [0];
  for (let i = 0; i < objs.length; i++) {
    offsets.push(pdf.length);
    pdf += (i + 1) + " 0 obj\n" + objs[i] + "\nendobj\n";
  }
  const xrefPos = pdf.length;
  pdf += "xref\n0 " + (objs.length + 1) + "\n";
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objs.length; i++) {
    const off = String(offsets[i]).padStart(10, "0");
    pdf += off + " 00000 n \n";
  }
  pdf += "trailer\n<< /Size " + (objs.length + 1) + " /Root 1 0 R >>\nstartxref\n" + xrefPos + "\n%%EOF";

  const bytes = pdfLatin1Bytes(pdf);
  return new Blob([bytes], { type: "application/pdf" });
}

function exportPdfForm() {
  let blob = null;
  try {
    blob = makePreConsultFormPdf(getPdfTheme());
    } catch (e) {
    // fallback minimal: simple text
    const lines = [
      "Fiche pre-consultation (1 page)",
      "- 3 symptomes principaux",
      "- Frequence + moments",
      "- Declencheurs",
      "- Ce qui soulage",
      "- Impact",
      "- Deja essaye",
      "- Priorites / questions",
      "Infos generales uniquement. Pas d'avis medical personnalise en ligne. Urgences : 15",
    ];
    blob = makeSimplePdfFromLines(lines);
  }
  const ts = makeExportStamp();
  downloadBlob(blob, `boussole_pre-consultation_v${APP_VERSION}_${ts}.pdf`);
}

let __pdfPreviewVisible = false;

function renderPdfPreview(force=false) {
  const el = $("pdfPreview");
  if (!el) return;
  if (!force && !__pdfPreviewVisible) return;
  const summary = buildSummaryText();
  el.textContent = summary;
  if (force) {
    __pdfPreviewVisible = true;
    try { el.style.display = "block"; } catch {}
  }
}

/* ---------- Mode diagnostic ----------
   Exporte un JSON contenant :
   - version, date/heure, langue, user-agent
   - paramètres
   - 20 dernières entrées (optionnel, anonymisé)
*/
function getSettings() {
  const s = safeJsonParse(safeStorageGet(LS_KEYS.settings), {});
  return (s && typeof s === "object" && !Array.isArray(s)) ? s : {};
}

function setSettings(obj) {
  const v = (obj && typeof obj === "object" && !Array.isArray(obj)) ? obj : {};
  // v0.6.81 — retourne un booléen : persistance OK (localStorage) vs fallback mémoire
  return safeStorageSet(LS_KEYS.settings, JSON.stringify(v));
}

// v0.5.30 — Objectif de la consultation (1 phrase) pour le PDF
function getConsultGoal() {
  const v = safeStorageGet(LS_KEYS.consultGoal);
  const s = (v == null) ? "" : String(v);
  return s.trim();
}

function setConsultGoal(value) {
  const maxLen = 140;
  const s = String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLen);
  // v0.6.78 — stockage robuste (Safari iOS / navigation privée) : éviter qu'une exception localStorage
  // ne casse la sauvegarde silencieuse (contacts, PDF, etc.).
  safeStorageSet(LS_KEYS.consultGoal, s);
  return s;
}

function updateConsultGoalCount() {
  const el = $("consultGoal");
  const c = $("consultGoalCount");
  if (!el || !c) return;
  const maxLen = parseInt(el.getAttribute("maxlength") || "140", 10) || 140;
  const cur = (el.value || "").length;
  c.textContent = `${cur}/${maxLen}`;
}

// v0.5.61 — Contacts santé (médecin / pharmacie)
function getHealthContacts(opts) {
  const preferUI = !!(opts && opts.preferUI);

  const fromStored = () => {
    const s = getSettings();
    const hc = (s && typeof s.healthContacts === "object" && s.healthContacts && !Array.isArray(s.healthContacts)) ? s.healthContacts : {};
    const norm = (o) => {
      const v = (o && typeof o === "object" && !Array.isArray(o)) ? o : {};
      return {
        name: String(v.name ?? "").trim(),
        phone: String(v.phone ?? "").trim(),
        address: String(v.address ?? "").trim(),
      };
    };
    return {
      doctor: norm(hc.doctor),
      pharmacy: norm(hc.pharmacy),
    };
  };

  if (!preferUI) return fromStored();

  // v0.6.68 — PDF/aperçu : si les champs existent, on privilégie l’état visible (autoremplissage silencieux, blocage stockage, etc.)
  try {
    const ids = ["doctorName","doctorPhone","doctorAddress","pharmacyName","pharmacyPhone","pharmacyAddress"];
    const anyEl = ids.some(id => !!$(id));
    if (!anyEl) return fromStored();

    const read = (id) => {
      const el = $(id);
      if (!el) return "";
      return String(el.value || "").trim();
    };

    const ui = {
      doctor: { name: read("doctorName"), phone: normalizeFrPhone(read("doctorPhone")), address: read("doctorAddress") },
      pharmacy: { name: read("pharmacyName"), phone: normalizeFrPhone(read("pharmacyPhone")), address: read("pharmacyAddress") },
    };

    // Best-effort : on persiste silencieusement (sans dépendre du timing pour le PDF)
    try {
      const stored = fromStored();
      const diff =
        (ui.doctor.name !== stored.doctor.name) ||
        (ui.doctor.phone !== stored.doctor.phone) ||
        (ui.doctor.address !== stored.doctor.address) ||
        (ui.pharmacy.name !== stored.pharmacy.name) ||
        (ui.pharmacy.phone !== stored.pharmacy.phone) ||
        (ui.pharmacy.address !== stored.pharmacy.address);

      if (diff) {
        const persist = () => { try { syncHealthContactsFromUI(); } catch (e) {} };
        if (typeof requestIdleCallback === "function") requestIdleCallback(persist, { timeout: 600 });
        else setTimeout(persist, 0);
      }
    } catch (e) {}

    return ui;
  } catch (e) {
    return fromStored();
  }
}

function setHealthContact(kind, patch) {
  const s = getSettings();
  const hc = (s.healthContacts && typeof s.healthContacts === "object" && !Array.isArray(s.healthContacts)) ? s.healthContacts : {};
  const cur = (hc[kind] && typeof hc[kind] === "object" && !Array.isArray(hc[kind])) ? hc[kind] : {};
  hc[kind] = { ...cur, ...(patch || {}) };
  s.healthContacts = hc;
  return setSettings(s);
}

function formatContactLine(c) {
  const name = (c && c.name) ? String(c.name).trim() : "";
  const phone = (c && c.phone) ? String(c.phone).trim() : "";
  const addr = (c && c.address) ? String(c.address).trim() : "";
  const parts = [];
  if (name) parts.push(name);
  if (phone) parts.push(phone);
  if (addr) parts.push(addr);
  return parts.join(" • ");
}

// v0.6.76 — Normalisation téléphone FR (utile si auto-remplissage silencieux)
function normalizeFrPhone(raw) {
  const s = String(raw || "");
  let d = s.replace(/[^0-9+]/g, "");
  // +33XXXXXXXXX -> 0XXXXXXXXX
  if (d.startsWith("+33")) d = "0" + d.slice(3);
  d = d.replace(/[^0-9]/g, "");
  if (!d) return "";
  if (d.length > 10) d = d.slice(0, 10);
  // Format : 0X XX XX XX XX
  const parts = [];
  for (let i = 0; i < d.length; i += 2) parts.push(d.slice(i, i + 2));
  return parts.join(" ").trim();
}


function syncHealthContactsFromUI() {
  // v0.6.65 — robustesse + auto-remplissage navigateur :
  // - détecte les changements même si aucun événement "input" n'a été déclenché
  // - garantit que les exports (PDF/texte) reflètent l'état visible des champs
  try {
    const read = (id) => {
      const el = $(id);
      if (!el) return "";
      return String(el.value || "").trim();
    };

    const ui = {
      doctor: {
        name: read("doctorName"),
        phone: normalizeFrPhone(read("doctorPhone")),
        address: read("doctorAddress"),
      },
      pharmacy: {
        name: read("pharmacyName"),
        phone: normalizeFrPhone(read("pharmacyPhone")),
        address: read("pharmacyAddress"),
      },
    };

    // v0.6.76 — si l’autoremplissage injecte un numéro non formaté, on le normalise aussi côté UI
    try {
      const dEl = $("doctorPhone");
      if (dEl) {
        const f = normalizeFrPhone(dEl.value);
        if (f && f !== String(dEl.value || "").trim()) dEl.value = f;
      }
      const pEl = $("pharmacyPhone");
      if (pEl) {
        const f2 = normalizeFrPhone(pEl.value);
        if (f2 && f2 !== String(pEl.value || "").trim()) pEl.value = f2;
      }
    } catch (e) {}

    const cur = getHealthContacts();
    const diff =
      (ui.doctor.name !== cur.doctor.name) ||
      (ui.doctor.phone !== cur.doctor.phone) ||
      (ui.doctor.address !== cur.doctor.address) ||
      (ui.pharmacy.name !== cur.pharmacy.name) ||
      (ui.pharmacy.phone !== cur.pharmacy.phone) ||
      (ui.pharmacy.address !== cur.pharmacy.address);

    if (!diff) return;

    const ok1 = setHealthContact("doctor", { name: ui.doctor.name, phone: ui.doctor.phone, address: ui.doctor.address });
    const ok2 = setHealthContact("pharmacy", { name: ui.pharmacy.name, phone: ui.pharmacy.phone, address: ui.pharmacy.address });

    // v0.6.81 — feedback discret de persistance (si l'indicateur existe)
    try {
      if (typeof setContactsSaveIndicator === "function") {
        const anyFilled = [ui.doctor.name, ui.doctor.phone, ui.doctor.address, ui.pharmacy.name, ui.pharmacy.phone, ui.pharmacy.address]
          .some(v => String(v || "").trim().length > 0);
        if (anyFilled) setContactsSaveIndicator((ok1 && ok2) ? "saved" : "unavailable");
      }
    } catch (e) {}

    // v0.6.72 — met à jour le snapshot global pour éviter une boucle (polling/autofill)
    try {
      window.__hcLast = [ui.doctor.name, ui.doctor.phone, ui.doctor.address, ui.pharmacy.name, ui.pharmacy.phone, ui.pharmacy.address].map(v => String(v || "").trim()).join("\u241F");
    } catch (e) {}

    try { renderPdfPreview(); } catch (e) {}
  } catch (e) {}
}



function syncHealthContactsUI() {
  const hc = getHealthContacts();
  const setVal = (id, v) => { const el = $(id); if (el) el.value = v ?? ""; };
  setVal("doctorName", hc.doctor.name);
  setVal("doctorPhone", hc.doctor.phone);
  setVal("doctorAddress", hc.doctor.address);
  setVal("pharmacyName", hc.pharmacy.name);
  setVal("pharmacyPhone", hc.pharmacy.phone);
  setVal("pharmacyAddress", hc.pharmacy.address);
}

// v0.6.85 — Contacts : copier les coordonnées (médecin / pharmacie) en un clic
async function copyHealthContactBlock(kind, btnEl = null) {
  const k = (kind === "pharmacy") ? "pharmacy" : "doctor";
  const title = (k === "pharmacy") ? "Pharmacie" : "Médecin";

  const hc = getHealthContacts({ preferUI: true });
  const c = (k === "pharmacy") ? hc.pharmacy : hc.doctor;

  const lines = [title];
  if (c && c.name) lines.push(`Nom : ${c.name}`);
  if (c && c.phone) lines.push(`Téléphone : ${c.phone}`);
  if (c && c.address) lines.push(`Adresse : ${c.address}`);

  // Rien à copier si seul le titre est présent
  if (lines.length <= 1) {
    showAppMessage("Rien à copier.", false);
    return false;
  }

  const txt = lines.join("\n");
  const ok = await copyTextToClipboard(txt);

  // Feedback bouton (discret)
  if (btnEl) {
    try {
      const label0 = btnEl.getAttribute("data-label0") || btnEl.textContent || "Copier";
      btnEl.setAttribute("data-label0", label0);
      btnEl.textContent = ok ? "Copié ✅" : "Copie impossible";
      setTimeout(() => {
        try { btnEl.textContent = label0; } catch {}
      }, ok ? 850 : 1200);
    } catch {}
  }

  showAppMessage(ok ? `${title} copié ✅` : "Copie impossible (presse‑papiers bloqué).", !ok);
  return ok;
}


// v0.5.61 — Recherche & import (Annuaire Santé, optionnel)
const AS_DOC_URL = "https://ansforge.github.io/annuaire-sante-fhir-documentation/pages/guide/version-2/quickstart/get-an-api-key.html";
const AS_BASE_URL = "https://gateway.api.esante.gouv.fr/fhir/v2";

let __asTarget = "doctor"; // quel formulaire remplir
let __asMode = "doctor";   // onglet recherche
let __asDoctorResults = [];

function getAsApiKey() {
  try { return String(safeStorageGet(LS_KEYS.asApiKey) || "").trim(); } catch (e) { return ""; }
}
function setAsApiKey(v) {
  try { safeStorageSet(LS_KEYS.asApiKey, String(v || "")); } catch (e) {}
}

function openContactsModal(target) {
  __asTarget = (target === "pharmacy") ? "pharmacy" : "doctor";
  __asMode = __asTarget;
  __asDoctorResults = [];

  const m = $("contactsModal");
  if (!m) return;
  m.style.display = "flex";

  const key = $("asApiKey");
  if (key) key.value = getAsApiKey();
  const q = $("asQueryName");
  if (q) q.value = "";
  const c = $("asQueryCity");
  if (c) c.value = "";
  const p = $("asQueryPostal");
  if (p) p.value = "";

  setAsMode(__asMode);
  setAsStatus("Prêt.");
  clearAsResults();

  // Focus utile
  try { if (q) q.focus(); } catch (e) {}
}

function closeContactsModal() {
  const m = $("contactsModal");
  if (!m) return;
  m.style.display = "none";
  clearAsResults();
}

function setAsStatus(text, isError=false) {
  const s = $("asStatus");
  if (!s) return;
  s.textContent = text;
  s.style.color = isError ? "#ffb4b4" : "";
}

function setAsMode(mode) {
  __asMode = (mode === "pharmacy") ? "pharmacy" : "doctor";
  const b1 = $("contactsTabDoctor");
  const b2 = $("contactsTabPharmacy");
  if (b1) b1.classList.toggle("is-active", __asMode === "doctor");
  if (b2) b2.classList.toggle("is-active", __asMode === "pharmacy");
  // labels
  const q = $("asQueryName");
  if (q) q.placeholder = (__asMode === "doctor") ? "Nom du médecin (ex : Dupont)" : "Nom de la pharmacie (ex : Pharmacie du Centre)";
}

function clearAsResults() {
  const wrap = $("asResults");
  if (wrap) wrap.innerHTML = "";
}

function fhirHeaders() {
  const key = getAsApiKey();
  return {
    "Accept": "application/fhir+json",
    "ESANTE-API-KEY": key,
  };
}

function fmtAddress(addr) {
  if (!addr) return "";
  const line = Array.isArray(addr.line) ? addr.line.join(", ") : (addr.line ? String(addr.line) : "");
  const pc = addr.postalCode ? String(addr.postalCode) : "";
  const city = addr.city ? String(addr.city) : "";
  const tail = [pc, city].filter(Boolean).join(" ").trim();
  return [line, tail].filter(Boolean).join(", ").trim();
}

function pickPhone(telecom) {
  const t = Array.isArray(telecom) ? telecom : [];
  const phone = t.find(x => x && x.system === "phone" && x.value);
  return phone ? String(phone.value).trim() : "";
}

function practitionerDisplay(p) {
  try {
    const n = Array.isArray(p.name) ? p.name[0] : null;
    if (n && n.text) return String(n.text).trim();
    const given = (n && Array.isArray(n.given)) ? n.given.join(" ") : (n && n.given ? String(n.given) : "");
    const fam = (n && n.family) ? String(n.family) : "";
    const pre = (n && Array.isArray(n.prefix)) ? n.prefix.join(" ") : (n && n.prefix ? String(n.prefix) : "");
    const suf = (n && Array.isArray(n.suffix)) ? n.suffix.join(" ") : (n && n.suffix ? String(n.suffix) : "");
    return [pre, given, fam, suf].filter(Boolean).join(" ").trim();
  } catch (e) {
    return "";
  }
}

function idValue(res) {
  const ids = Array.isArray(res.identifier) ? res.identifier : [];
  const first = ids.find(x => x && x.value) || null;
  return first ? String(first.value).trim() : "";
}

async function asSearch() {
  const key = getAsApiKey();
  if (!key) {
    setAsStatus("Ajoute une clé API pour utiliser la recherche (sinon : remplis à la main).", true);
    clearAsResults();
    return;
  }

  const name = String($("asQueryName")?.value || "").trim();
  const city = String($("asQueryCity")?.value || "").trim();
  const postal = String($("asQueryPostal")?.value || "").trim();

  if (!name) {
    setAsStatus("Saisis un nom.", true);
    return;
  }

  setAsStatus("Recherche…");
  clearAsResults();

  try {
    if (__asMode === "pharmacy") {
      const params = [];
      params.push(`name:contains=${encodeURIComponent(name)}`);
      if (city) params.push(`address-city=${encodeURIComponent(city)}`);
      if (postal) params.push(`address-postalcode=${encodeURIComponent(postal)}`);
      params.push(`_count=20`);

      const url = `${AS_BASE_URL}/Organization?${params.join("&")}`;
      const r = await fetch(url, { headers: fhirHeaders() });
      if (!r.ok) {
        setAsStatus(`Erreur (${r.status}) : recherche impossible.`, true);
        return;
      }
      const bundle = await r.json();
      const resources = (bundle && Array.isArray(bundle.entry)) ? bundle.entry.map(e => e && e.resource).filter(Boolean) : [];
      const orgs = resources.filter(x => x.resourceType === "Organization");

      if (!orgs.length) {
        setAsStatus("Aucun résultat.");
        return;
      }

      setAsStatus(`${orgs.length} résultat(s).`);
      renderOrgResults(orgs);
      return;
    }

    // doctor
    const url = `${AS_BASE_URL}/Practitioner?name=${encodeURIComponent(name)}&_count=20`;
    const r = await fetch(url, { headers: fhirHeaders() });
    if (!r.ok) {
      setAsStatus(`Erreur (${r.status}) : recherche impossible.`, true);
      return;
    }
    const bundle = await r.json();
    const resources = (bundle && Array.isArray(bundle.entry)) ? bundle.entry.map(e => e && e.resource).filter(Boolean) : [];
    const practitioners = resources.filter(x => x.resourceType === "Practitioner");

    __asDoctorResults = practitioners;
    if (!practitioners.length) {
      setAsStatus("Aucun résultat.");
      return;
    }

    setAsStatus(`${practitioners.length} résultat(s). Choisis un médecin pour afficher ses lieux.`);
    renderPractitionerResults(practitioners);
  } catch (e) {
    setAsStatus("Recherche impossible (réseau/CORS).", true);
  }
}

function renderOrgResults(orgs) {
  const wrap = $("asResults");
  if (!wrap) return;
  wrap.innerHTML = "";

  orgs.forEach(org => {
    const title = String(org.name || "Organisation").trim();
    const addr = fmtAddress(Array.isArray(org.address) ? org.address[0] : null);
    const phone = pickPhone(org.telecom);
    const meta = [addr, phone].filter(Boolean).join(" • ") || "";

    const div = document.createElement("div");
    div.className = "asItem";
    div.innerHTML = `
      <div class="asItem__main">
        <div class="asItem__title">${escapeHtml(title)}</div>
        <div class="asItem__meta">${escapeHtml(meta)}</div>
      </div>
      <button class="btn btn--ghost btn--small" type="button">Importer</button>
    `;
    const btn = div.querySelector("button");
    btn.addEventListener("click", () => {
      const patch = { name: title, phone: phone, address: addr };
      setHealthContact("pharmacy", patch);
      syncHealthContactsUI();
      try { renderPdfPreview(); } catch (e) {}
      closeContactsModal();
    });
    wrap.appendChild(div);
  });
}

function renderPractitionerResults(practitioners) {
  const wrap = $("asResults");
  if (!wrap) return;
  wrap.innerHTML = "";

  practitioners.forEach(p => {
    const disp = practitionerDisplay(p) || "Médecin";
    const rpps = idValue(p);
    const meta = rpps ? `Identifiant : ${rpps}` : "";

    const div = document.createElement("div");
    div.className = "asItem";
    div.innerHTML = `
      <div class="asItem__main">
        <div class="asItem__title">${escapeHtml(disp)}</div>
        <div class="asItem__meta">${escapeHtml(meta)}</div>
      </div>
      <button class="btn btn--ghost btn--small" type="button">Voir lieux</button>
    `;
    const btn = div.querySelector("button");
    btn.addEventListener("click", () => asLoadDoctorSites(p));
    wrap.appendChild(div);
  });
}

async function asLoadDoctorSites(practitioner) {
  const pid = practitioner && practitioner.id ? String(practitioner.id) : "";
  if (!pid) {
    setAsStatus("Impossible : identifiant manquant.", true);
    return;
  }

  setAsStatus("Chargement des lieux…");
  clearAsResults();

  try {
    const url = `${AS_BASE_URL}/PractitionerRole?practitioner=Practitioner/${encodeURIComponent(pid)}&active=true&_include=PractitionerRole:organization&_count=20`;
    const r = await fetch(url, { headers: fhirHeaders() });
    if (!r.ok) {
      setAsStatus(`Erreur (${r.status}) : lieux indisponibles.`, true);
      renderBackToPractitioners();
      return;
    }
    const bundle = await r.json();
    const resources = (bundle && Array.isArray(bundle.entry)) ? bundle.entry.map(e => e && e.resource).filter(Boolean) : [];
    const roles = resources.filter(x => x.resourceType === "PractitionerRole");
    const orgs = resources.filter(x => x.resourceType === "Organization");
    const orgById = {};
    orgs.forEach(o => { if (o && o.id) orgById[String(o.id)] = o; });

    setAsStatus(roles.length ? "Choisis un lieu." : "Aucun lieu trouvé.");
    renderDoctorSites(practitioner, roles, orgById);
  } catch (e) {
    setAsStatus("Chargement impossible (réseau/CORS).", true);
    renderBackToPractitioners();
  }
}

function renderBackToPractitioners() {
  const wrap = $("asResults");
  if (!wrap) return;
  wrap.innerHTML = "";
  const div = document.createElement("div");
  div.className = "asItem";
  div.innerHTML = `
    <div class="asItem__main">
      <div class="asItem__title">← Retour</div>
      <div class="asItem__meta">Revenir aux résultats médecins.</div>
    </div>
    <button class="btn btn--ghost btn--small" type="button">Retour</button>
  `;
  div.querySelector("button").addEventListener("click", () => {
    setAsStatus(`${__asDoctorResults.length} résultat(s). Choisis un médecin pour afficher ses lieux.`);
    renderPractitionerResults(__asDoctorResults);
  });
  wrap.appendChild(div);
}

function renderDoctorSites(practitioner, roles, orgById) {
  const wrap = $("asResults");
  if (!wrap) return;
  wrap.innerHTML = "";

  // Retour
  const back = document.createElement("div");
  back.className = "asItem";
  back.innerHTML = `
    <div class="asItem__main">
      <div class="asItem__title">← Retour</div>
      <div class="asItem__meta">Revenir aux résultats médecins.</div>
    </div>
    <button class="btn btn--ghost btn--small" type="button">Retour</button>
  `;
  back.querySelector("button").addEventListener("click", () => {
    setAsStatus(`${__asDoctorResults.length} résultat(s). Choisis un médecin pour afficher ses lieux.`);
    renderPractitionerResults(__asDoctorResults);
  });
  wrap.appendChild(back);

  const disp = practitionerDisplay(practitioner) || "Médecin";

  if (!roles.length) {
    const div = document.createElement("div");
    div.className = "asItem";
    div.innerHTML = `
      <div class="asItem__main">
        <div class="asItem__title">${escapeHtml(disp)}</div>
        <div class="asItem__meta">Aucun lieu trouvé. Tu peux importer seulement le nom.</div>
      </div>
      <button class="btn btn--ghost btn--small" type="button">Importer nom</button>
    `;
    div.querySelector("button").addEventListener("click", () => {
      setHealthContact("doctor", { name: disp });
      syncHealthContactsUI();
      try { renderPdfPreview(); } catch (e) {}
      closeContactsModal();
    });
    wrap.appendChild(div);
    return;
  }

  roles.forEach(role => {
    const orgRef = role && role.organization && role.organization.reference ? String(role.organization.reference) : "";
    const orgId = orgRef.startsWith("Organization/") ? orgRef.split("/")[1] : "";
    const org = orgId ? orgById[orgId] : null;

    const orgName = org && org.name ? String(org.name).trim() : "Lieu";
    const addr = fmtAddress(Array.isArray(org?.address) ? org.address[0] : null) || fmtAddress(Array.isArray(role?.location) ? role.location[0] : null);
    const phone = pickPhone(role?.telecom) || pickPhone(org?.telecom);
    const meta = [orgName, addr, phone].filter(Boolean).join(" • ");

    const div = document.createElement("div");
    div.className = "asItem";
    div.innerHTML = `
      <div class="asItem__main">
        <div class="asItem__title">${escapeHtml(disp)}</div>
        <div class="asItem__meta">${escapeHtml(meta)}</div>
      </div>
      <button class="btn btn--ghost btn--small" type="button">Importer</button>
    `;
    div.querySelector("button").addEventListener("click", () => {
      setHealthContact("doctor", { name: disp, phone: phone, address: addr });
      syncHealthContactsUI();
      try { renderPdfPreview(); } catch (e) {}
      closeContactsModal();
    });
    wrap.appendChild(div);
  });
}
function getTwiceDailyEnabled() {
  const s = getSettings();
  return !!s.twiceDaily;
}


// v0.5.65 — Option PDF plus détaillé (jusqu'à 2 pages)
function getPdfTwoPagesEnabled() {
  const s = getSettings();
  return !!s.pdfTwoPages;
}
function setPdfTwoPagesEnabled(enabled) {
  const s = getSettings();
  s.pdfTwoPages = !!enabled;
  setSettings(s);
}

function getPdfTheme() {
  const s = getSettings();
  const t = String((s && s.pdfTheme) ? s.pdfTheme : "color");
  return (t === "bw") ? "bw" : "color";
}
function setPdfTheme(theme) {
  const s = getSettings();
  s.pdfTheme = (theme === "bw") ? "bw" : "color";
  setSettings(s);
}
function syncPdfThemeUI() {
  const wrap = $("pdfTheme");
  if (!wrap) return;
  const cur = getPdfTheme();
  const btns = wrap.querySelectorAll ? wrap.querySelectorAll("button.seg[data-theme]") : [];
  for (const b of btns) {
    const t = String(b.dataset.theme || "color");
    const on = (t === cur);
    b.classList.toggle("is-active", on);
    try { b.setAttribute("aria-pressed", on ? "true" : "false"); } catch (e) {}
  }
}

// v0.5.93 — Mise en page du PDF (Classique / Comparatif)
function getPdfLayout() {
  const s = getSettings();
  // Par défaut, on privilégie le rendu "comparatif" (Matin | Soir), qui correspond à la mise en page cible.
  const t = String((s && s.pdfLayout) ? s.pdfLayout : "visual");
  return (t === "classic") ? "classic" : "visual";
}
function setPdfLayout(layout) {
  const s = getSettings();
  s.pdfLayout = (String(layout) === "classic") ? "classic" : "visual";
  setSettings(s);
}
function syncPdfLayoutUI() {
  const wrap = $("pdfLayout");
  if (!wrap) return;
  const cur = getPdfLayout();
  const btns = wrap.querySelectorAll ? wrap.querySelectorAll("button.seg[data-layout]") : [];
  for (const b of btns) {
    const t = String(b.dataset.layout || "classic");
    const on = (t === cur);
    b.classList.toggle("is-active", on);
    try { b.setAttribute("aria-pressed", on ? "true" : "false"); } catch (e) {}
  }
}

// Expose for UI init even if functions live inside an IIFE/block scope.
try { window.syncPdfLayoutUI = syncPdfLayoutUI; } catch (e) {}


function syncPdfTwoPagesUI() {
  const el = $("pdfTwoPages");
  if (el) el.checked = getPdfTwoPagesEnabled();
}


// v0.5.26 — Période “Évolution” (7 / 14 / 30 jours)
function getEvolutionWindowDays() {
  const s = getSettings();
  const n = parseInt((s && s.evoWindowDays) ?? 14, 10);
  return (n === 7 || n === 14 || n === 30) ? n : 14;
}
function setEvolutionWindowDays(days) {
  const n = parseInt(days, 10);
  const v = (n === 7 || n === 14 || n === 30) ? n : 14;
  const s = getSettings();
  s.evoWindowDays = v;
  setSettings(s);
}
function syncEvolutionWindowUI() {
  const wrap = $("evoWindow");
  if (!wrap) return;
  const cur = getEvolutionWindowDays();
  const btns = wrap.querySelectorAll ? wrap.querySelectorAll("button.seg[data-days]") : [];
  for (const b of btns) {
    const d = parseInt(b.dataset.days || "14", 10);
    const on = (d === cur);
    b.classList.toggle("is-active", on);
    try { b.setAttribute("aria-pressed", on ? "true" : "false"); } catch (e) {}
  }
}

function syncPdfWindowUI() {
  const wrap = $("pdfWindow");
  if (!wrap) return;
  const cur = getEvolutionWindowDays();
  const btns = wrap.querySelectorAll ? wrap.querySelectorAll("button.seg[data-days]") : [];
  for (const b of btns) {
    const d = parseInt(b.dataset.days || "14", 10);
    const on = (d === cur);
    b.classList.toggle("is-active", on);
    try { b.setAttribute("aria-pressed", on ? "true" : "false"); } catch (e) {}
  }
}



function scrollEvolutionToTop() {
  const panel = $("tab-evolution");
  if (!panel) return;
  if (!panel.classList || !panel.classList.contains("is-active")) return;

  const anchor = $("evolutionTitle") || panel;
  try {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    anchor.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  } catch (e) {
    try { anchor.scrollIntoView(true); } catch (e2) {}
  }
}


function setTwiceDailyEnabled(enabled) {
  const s = getSettings();
  s.twiceDaily = !!enabled;
  setSettings(s);
}


function syncTwiceDailySettingsUI() {
  const el = $("set_twice_daily");
  if (el) el.checked = getTwiceDailyEnabled();
  applySlotUI();
}

function slotLabel(slot) {
  if (slot === "PM") return "Soir";
  return "Matin";
}

function getSelectedSlot() {
  const sel = $("slotSelect");
  const v = sel ? String(sel.value || "AM") : "AM";
  return (v === "PM") ? "PM" : "AM";
}

function applySlotUI() {
  const field = $("slotField");
  if (!field) return;
  field.style.display = getTwiceDailyEnabled() ? "block" : "none";
  try { updateSlotToggleUI(); } catch {}
}

function setSelectedSlot(slot) {
  const v = (slot === "PM") ? "PM" : "AM";
  const sel = $("slotSelect");
  if (sel) sel.value = v;
  updateSlotToggleUI();
}

function updateSlotToggleUI() {
  const v = getSelectedSlot();
  const hint = $("slotHint");
  if (hint) hint.textContent = slotLabel(v);

  const wrap = $("slotToggle");
  if (wrap) {
    wrap.querySelectorAll("button[data-slot]").forEach((b) => {
      const s = (String(b.dataset.slot || "AM") === "PM") ? "PM" : "AM";
      const active = (s === v);
      b.classList.toggle("is-active", active);
      try { b.setAttribute("aria-pressed", active ? "true" : "false"); } catch {}
    });
  }
}

function dateKeyFromTs(ts) {
  try { return new Date(ts).toISOString().slice(0,10); } catch { return ""; }
}

function findLatestEntryForDaySlot(dateKey, slot) {
  const entries = loadEntries();
  const wantSlot = (slot === "PM") ? "PM" : "AM";
  let best = null;
  let bestT = -1;
  for (const e of entries) {
    if (!e || !e.ts) continue;
    if (dateKeyFromTs(e.ts) !== dateKey) continue;
    const s = (e.slot === "PM") ? "PM" : "AM"; // compat : absence de slot => Matin
    if (s !== wantSlot) continue;
    const t = new Date(e.ts).getTime();
    if (Number.isFinite(t) && t >= bestT) { best = e; bestT = t; }
  }
  return best;
}

function resetTodayFormToUnset() {
  setSliderValue("energy", null);
  setSliderValue("sleep", null);
  setSliderValue("comfort", null);
  setSliderValue("memory", null);
  setSliderValue("concentration", null);
  setSliderValue("orthostatic", null);
  setSliderValue("mood", null);
  setSliderValue("serenity", null);
}

function fillTodayFormFromEntry(e) {
  if (!e) { resetTodayFormToUnset(); return; }

  setSliderValue("energy", e.energy);
  setSliderValue("sleep", e.sleep);
  setSliderValue("comfort", e.comfort);

  // Extras : si absents, on laisse vide (—)
  const legacyClarity = (e && e.clarity != null) ? e.clarity : null;

  const memV = (e.memory != null) ? e.memory : legacyClarity;
  setSliderValue("memory", memV != null ? memV : null);

  const conV = (e.concentration != null) ? e.concentration : legacyClarity;
  setSliderValue("concentration", conV != null ? conV : null);

  setSliderValue("orthostatic", e.orthostatic != null ? e.orthostatic : null);
  setSliderValue("mood", e.mood != null ? e.mood : null);
  setSliderValue("serenity", e.serenity != null ? e.serenity : null);
}



// v0.6.41 — assainit certains brouillons créés par d’anciennes valeurs par défaut
function sanitizeDraftForTodaySlot(dateKey, slot, d) {
  try {
    if (!d || typeof d !== "object") return d;
    const isNull = (v) => (v == null);
    const coreKeys = ["energy","sleep","comfort","memory","concentration","orthostatic","mood"];
    const othersAllNull = coreKeys.every(k => isNull(d[k]));
    const allKeys = coreKeys.concat(["serenity"]);
    const isAllNullDraft = (obj) => allKeys.every(k => isNull(obj[k]));

    // Cas historique : “Sérénité” restait à 6 par défaut alors que tout le reste était vide.
    if (othersAllNull && d.serenity === 6) {
      const dd = { ...d, serenity: null };
      try { setDraft(dateKey, slot, dd); } catch {}
      if (isAllNullDraft(dd)) {
        try { setDraft(dateKey, slot, null); } catch {}
        return null;
      }
      return dd;
    }

    // Nettoyage : si brouillon entièrement vide, on le supprime
    if (isAllNullDraft(d)) {
      try { setDraft(dateKey, slot, null); } catch {}
      return null;
    }
  } catch {}
  return d;
}
function loadOrResetTodayForSelectedSlot() {
  if (!getTwiceDailyEnabled()) return;
  const dateKey = getTodayDateKey();
  const slot = getSelectedSlot();

  // Priorité : entrée enregistrée -> brouillon -> vide
  const e = findLatestEntryForDaySlot(dateKey, slot);
  if (e) {
    fillTodayFormFromEntry(e);
  } else {
    const d0 = getDraft(dateKey, slot);
    const d = sanitizeDraftForTodaySlot(dateKey, slot, d0);
    if (d) applyDraftToForm(d);
    else resetTodayFormToUnset();
  }

  try {
    const note = $("slotNote");
    if (note) {
      if (e) note.textContent = "Valeurs enregistrées chargées.";
      else if (getDraft(dateKey, slot)) note.textContent = "Brouillon chargé (non enregistré).";
      else note.textContent = "Aucun bilan enregistré pour ce moment : champs vides.";
    }
  } catch {}
}

function migrateClarityToMemoryConcentration() {
  const KEY = "boussole_migrated_v0_5_1_memory_concentration";
  try {
    if (safeStorageGet(KEY) === "1") return;

    // Réglages : extra.clarity -> extra.memory + extra.concentration
    const s = getSettings();
    let settingsChanged = false;
    if (s.extra && typeof s.extra === "object" && !Array.isArray(s.extra) && ("clarity" in s.extra)) {
      const was = !!s.extra.clarity;
      if (s.extra.memory == null) { s.extra.memory = was; settingsChanged = true; }
      if (s.extra.concentration == null) { s.extra.concentration = was; settingsChanged = true; }
      delete s.extra.clarity;
      settingsChanged = true;
    }
    if (settingsChanged) setSettings(s);

    // Données : entries[].clarity -> memory + concentration (sans supprimer clarity)
    const entries = loadEntries();
    let entriesChanged = false;
    for (const e of entries) {
      if (!e || typeof e !== "object") continue;
      if (e.clarity == null) continue;
      const v = clamp0to10(e.clarity);
      if (e.memory == null) { e.memory = v; entriesChanged = true; }
      if (e.concentration == null) { e.concentration = v; entriesChanged = true; }
    }
    if (entriesChanged) saveEntries(entries);

    safeStorageSet(KEY, "1");
  } catch {}
}

// v0.5.37 — si “Humeur” est activée, activer “Sérénité” par défaut (évite une étape en plus).
function migrateMoodToSerenity() {
  const KEY = "boussole_migrated_v0_5_36_serenity";
  try {
    if (safeStorageGet(KEY) === "1") return;
    const s = getSettings();
    let changed = false;
    if (s && s.extra && typeof s.extra === "object" && !Array.isArray(s.extra)) {
      if (s.extra.mood === true && s.extra.serenity == null) {
        s.extra.serenity = true;
        changed = true;
      }
    }
    if (changed) setSettings(s);
    safeStorageSet(KEY, "1");
  } catch {}
}

function setExtraEnabled(key, enabled) {
  const s = getSettings();
  s.extra = (s.extra && typeof s.extra === "object" && !Array.isArray(s.extra)) ? s.extra : {};
  s.extra[key] = !!enabled;
  setSettings(s);
}

function getExtraEnabled(key) {
  const s = getSettings();
  return !!(s.extra && s.extra[key]);
}

function anyExtraEnabled() {
  return getExtraEnabled("memory") || getExtraEnabled("concentration") || getExtraEnabled("orthostatic") || getExtraEnabled("mood") || getExtraEnabled("serenity");
}

function syncExtraSettingsUI() {
  const mem = $("set_memory");
  const con = $("set_concentration");
  const o = $("set_orthostatic");
  const m = $("set_mood");
  const se = $("set_serenity");
  if (mem) mem.checked = getExtraEnabled("memory");
  if (con) con.checked = getExtraEnabled("concentration");
  if (o) o.checked = getExtraEnabled("orthostatic");
  if (m) m.checked = getExtraEnabled("mood");
  if (se) se.checked = getExtraEnabled("serenity");
  applyExtraSection();
}


/*
  Assistant de démarrage (v0.4.8)
  Objectif : si aucun réglage n'existe, proposer un pré‑réglage au 1er lancement.
*/
function hasAnySavedSettings() {
  return safeStorageGet(LS_KEYS.settings) !== null;
}

function ensureSettingsObjectExists() {
  if (safeStorageGet(LS_KEYS.settings) === null) setSettings({});
}

function applyPresetCovidLong() {
  setExtraEnabled("memory", true);
  setExtraEnabled("concentration", true);
  setExtraEnabled("orthostatic", true);
  setExtraEnabled("mood", true);
  setExtraEnabled("serenity", true);
  syncExtraSettingsUI();
  applyExtraSection();
  renderEvolution();
}

function applyPresetSimple() {
  // Conserve uniquement Fatigue / Sommeil / Douleur (extras OFF)
  ensureSettingsObjectExists();
  const s = getSettings();
  if (s.extra) delete s.extra; // garde le status propre
  setSettings(s);
  syncExtraSettingsUI();
  applyExtraSection();
  renderEvolution();
}

function openStarterModal() {
  const modal = $("starterModal");
  if (!modal) return;
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeStarterModal() {
  const modal = $("starterModal");
  if (!modal) return;
  modal.style.display = "none";
  document.body.style.overflow = "";
}

function maybeRunStarterWizard() {
  if (hasAnySavedSettings()) return;
  openStarterModal();
}

// Réinitialise uniquement les réglages (sans toucher aux entrées)
function resetOnlySettings() {
  // Supprime la clé de réglages (déclenche le même comportement que "1er lancement")
  safeStorageRemove(LS_KEYS.settings);
  // Remet le diagnostic "Inclure les données" à OFF (valeur par défaut)
  setDiagInclude(false);
}

// Réinitialise uniquement le diagnostic (sans toucher aux entrées ni aux réglages)
function resetOnlyDiagnostic() {
  clearErrors();
  setDiagInclude(false);
}


function syncDiagToggle() {
  const el = $("diagIncludeData");
  if (!el) return;
  const v = safeStorageGet(LS_KEYS.diagInclude) === "1";
  el.checked = v;
}

function setDiagInclude(v) {
  safeStorageSet(LS_KEYS.diagInclude, v ? "1" : "0");
}

function getDiagInclude() {
  return safeStorageGet(LS_KEYS.diagInclude) === "1";
}

function approxLocalStorageSize() {
  let total = 0;
  for (const k of safeStorageKeys()) {
    const v = safeStorageGet(k) || "";
    total += (String(k).length + String(v).length) * 2; // rough UTF-16 bytes
  }
  return total;
}

function anonymizeEntry(e) {
  if (!e || typeof e !== "object") return null;
  const out = {
    date: (e.ts || "").slice(0,10), // pas d'heure
    energy: clamp0to10(e.energy),
    sleep: clamp0to10(e.sleep),
    comfort: clamp0to10(e.comfort),
  };
  if (e.memory != null) out.memory = clamp0to10(e.memory);
  if (e.concentration != null) out.concentration = clamp0to10(e.concentration);
  if (e.orthostatic != null) out.orthostatic = clamp0to10(e.orthostatic);
  if (e.mood != null) out.mood = clamp0to10(e.mood);
  // Legacy: conserve "clarity" si présent
  if (e.clarity != null) out.clarity = clamp0to10(e.clarity);
  return out;
}

function loadErrors() {
  const arr = safeJsonParse(safeStorageGet(LS_KEYS.errors), []);
  return Array.isArray(arr) ? arr : [];
}

function getErrorsCount() {
  return loadErrors().length;
}

function formatErrorsText(errors) {
  const lines = [];
  lines.push(`${APP_NAME} v${APP_VERSION} — erreurs locales (n=${errors.length})`);
  lines.push(`Généré: ${nowISO()}`);
  lines.push("—");
  if (!errors.length) {
    lines.push("Aucune erreur locale enregistrée.");
    return lines.join("\n");
  }
  for (const e of errors) {
    const ts = (e.ts || "").replace("T"," ").replace("Z","");
    const type = e.type || "error";
    const msg = String(e.message || "").replace(/\s+/g," ").trim();
    let src = "";
    if (e.source) {
      const ln = (e.lineno != null) ? String(e.lineno) : "";
      const cn = (e.colno != null) ? String(e.colno) : "";
      src = ` | ${e.source}${ln ? ":"+ln : ""}${cn ? ":"+cn : ""}`;
    }
    lines.push(`${ts} | ${type} | ${msg}${src}`);
  }
  return lines.join("\n");
}

function pushError(err) {
  const errors = loadErrors();
  errors.push(err);
  const trimmed = errors.slice(-20);
  safeStorageSet(LS_KEYS.errors, JSON.stringify(trimmed));
  try { syncErrorsIndicator(); } catch {}
}

function clearErrors() {
  safeStorageRemove(LS_KEYS.errors);
  try { syncErrorsIndicator(); } catch {}
}

window.addEventListener("error", (ev) => {
  try {
    pushError({
      ts: nowISO(),
      type: "error",
      message: String(ev.message || "Unknown error"),
      source: String(ev.filename || ""),
      lineno: ev.lineno || null,
      colno: ev.colno || null,
    });
  } catch {}
});

window.addEventListener("unhandledrejection", (ev) => {
  try {
    const msg = (ev.reason && ev.reason.message) ? ev.reason.message : String(ev.reason || "Unhandled rejection");
    pushError({
      ts: nowISO(),
      type: "unhandledrejection",
      message: String(msg),
    });
  } catch {}
});

let __errorsTextCache = "";

function syncErrorsIndicator() {
  const countEl = $("errorsCount");
  const btn = $("btnViewErrors");
  if (!countEl || !btn) return;
  const n = getErrorsCount();
  countEl.textContent = String(n);
  btn.disabled = n === 0;
}

function openErrorsModal() {
  const modal = $("errorsModal");
  const out = $("errorsText");
  if (!modal || !out) return;
  const errors = loadErrors();
  __errorsTextCache = formatErrorsText(errors);
  out.textContent = __errorsTextCache;
  modal.style.display = "flex";
}

function closeErrorsModal() {
  const modal = $("errorsModal");
  if (!modal) return;
  modal.style.display = "none";
}


/* ---------- Notes de version (changelog) ---------- */
let __rnPrevFocus = null;
let __rnLoadedOnce = false;
let __rnLoading = false;
let __rnLastEntries = [];

// Changelog complet ("Voir tout")
let __rnAllPrevFocus = null;
let __rnAllLoadedOnce = false;
let __rnAllLoading = false;
let __rnAllLastEntries = [];

function getReleaseNotesSeenVersion(){
  try { return String(safeStorageGet(LS_KEYS.releaseNotesSeen) || "").trim(); } catch { return ""; }
}
function setReleaseNotesSeenVersion(v){
  try { safeStorageSet(LS_KEYS.releaseNotesSeen, String(v || "").trim()); } catch {}
}
function syncReleaseNotesNewBadge(){
  const badge = $("releaseNotesNewBadge");
  const btn = $("btnReleaseNotes");
  if (!badge || !btn) return;
  const seen = getReleaseNotesSeenVersion();
  const isNew = String(seen || "") !== String(APP_VERSION);
  try { badge.hidden = !isNew; } catch {
    try { if (isNew) badge.removeAttribute("hidden"); else badge.setAttribute("hidden", ""); } catch {}
  }
  try { btn.setAttribute("aria-label", isNew ? "Notes de version (nouveau)" : "Notes de version"); } catch {}
  try { btn.setAttribute("title", isNew ? "Notes de version (nouveau)" : "Notes de version"); } catch {}
}
function markReleaseNotesSeen(){
  try { setReleaseNotesSeenVersion(APP_VERSION); } catch {}
  try { syncReleaseNotesNewBadge(); } catch {}
}


function normalizeVersionLabel(v) {
  try {
    const s = String(v || "").trim();
    if (!s) return "";
    if (s.toLowerCase().startsWith("v")) return "v" + s.slice(1);
    return "v" + s;
  } catch { return ""; }
}

function parseChangelogMd(mdText, maxVersions = 10, maxLinesPerVersion = 2) {
  const lines = String(mdText || "").split(/\r?\n/);
  const out = [];
  let cur = null;

  const pushCur = () => {
    if (!cur) return;
    const bullets = (cur.bullets || []).map((s) => String(s || "").trim()).filter(Boolean);
    if (bullets.length === 0) { cur = null; return; }
    const maxL = Math.max(1, Number(maxLinesPerVersion) || 2);
    let shown = bullets.slice(0, maxL);
    if (bullets.length > shown.length) {
      const i = Math.max(0, shown.length - 1);
      shown[i] = (shown[i] || "").trimEnd() + " (…)";
      shown[i] = shown[i].replace(/\(…\)/, "(…)");
    }
    out.push({ version: cur.version, lines: shown });
    cur = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const m = raw.match(/^##\s*([vV]?\d+\.\d+\.\d+)\s*$/);
    if (m) {
      if (cur) pushCur();
      cur = { version: normalizeVersionLabel(m[1]), bullets: [] };
      continue;
    }
    if (!cur) continue;
    const t = String(raw || "").trim();
    if (t.startsWith("##")) { pushCur(); continue; }
    const bm = t.match(/^[-*]\s+(.+)$/);
    if (bm) cur.bullets.push(bm[1]);
  }
  if (cur) pushCur();

  // Le fichier est en général en ordre antéchronologique.
  // On retient au maximum les 10 dernières versions.
  const cleaned = out.filter((e) => e && e.version && Array.isArray(e.lines) && e.lines.length);
  return cleaned.slice(0, Math.max(1, Number(maxVersions) || 10));
}

function renderReleaseNotes(entries) {
  const list = $("releaseNotesList");
  if (!list) return;
  try { __rnLastEntries = Array.isArray(entries) ? entries.slice() : []; } catch { __rnLastEntries = []; }
  try { list.innerHTML = ""; } catch {}

  if (!Array.isArray(entries) || entries.length === 0) {
    const item = document.createElement("div");
    item.className = "rnItem";
    item.setAttribute("role", "listitem");
    const v = document.createElement("div");
    v.className = "rnVer";
    v.textContent = "Aucune note de version trouvée.";
    item.appendChild(v);
    list.appendChild(item);
    return;
  }

  entries.forEach((e) => {
    const item = document.createElement("div");
    item.className = "rnItem";
    item.setAttribute("role", "listitem");

    const ver = document.createElement("div");
    ver.className = "rnVer";
    ver.textContent = e.version || "";
    item.appendChild(ver);

    (e.lines || []).forEach((ln) => {
      const line = document.createElement("div");
      line.className = "rnLine";
      line.textContent = String(ln || "");
      item.appendChild(line);
    });

    list.appendChild(item);
  });
}

function renderReleaseNotesAll(entries) {
  const list = $("releaseNotesAllList");
  if (!list) return;
  try { __rnAllLastEntries = Array.isArray(entries) ? entries.slice() : []; } catch { __rnAllLastEntries = []; }
  try { list.innerHTML = ""; } catch {}

  if (!Array.isArray(entries) || entries.length === 0) {
    const item = document.createElement("div");
    item.className = "rnItem";
    item.setAttribute("role", "listitem");
    const v = document.createElement("div");
    v.className = "rnVer";
    v.textContent = "Aucune note de version trouvée.";
    item.appendChild(v);
    list.appendChild(item);
    return;
  }

  entries.forEach((e) => {
    const item = document.createElement("div");
    item.className = "rnItem";
    item.setAttribute("role", "listitem");

    const ver = document.createElement("div");
    ver.className = "rnVer";
    ver.textContent = e.version || "";
    item.appendChild(ver);

    (e.lines || []).forEach((ln) => {
      const line = document.createElement("div");
      line.className = "rnLine";
      line.textContent = String(ln || "");
      item.appendChild(line);
    });

    list.appendChild(item);
  });
}

function isReleaseNotesPlaceholder(entries){
  try{
    if(!Array.isArray(entries) || entries.length===0) return true;
    if(entries.length===1){
      const v = String(entries[0]?.version || "");
      if(/Chargement/i.test(v)) return true;
    }
    return false;
  }catch{ return true; }
}

function buildReleaseNotesCopyText(entries){
  const arr = Array.isArray(entries) ? entries : [];
  const out = [];
  arr.forEach((e) => {
    const ver = String(e?.version || "").trim();
    if(!ver) return;
    out.push(ver);
    const lines = Array.isArray(e?.lines) ? e.lines : [];
    lines.forEach((ln) => {
      const t = String(ln || "").trim();
      if(!t) return;
      out.push(`- ${t}`);
    });
    out.push("");
  });
  return out.join("\n").trim() + "\n";
}

async function copyReleaseNotesToClipboard(){
  if(__rnLoading){
    showAppMessage("Chargement… essaie dans un instant.");
    return false;
  }

  try{
    if(isReleaseNotesPlaceholder(__rnLastEntries)){
      await loadAndRenderReleaseNotes(true);
    }
  }catch{}

  if(isReleaseNotesPlaceholder(__rnLastEntries)){
    showAppMessage("Notes de version indisponibles.", true);
    return false;
  }

  const text = buildReleaseNotesCopyText(__rnLastEntries);
  const ok = await copyTextToClipboard(text);
  if(ok){
    showAppMessage("Notes de version copiées ✅");
  }else{
    showAppMessage("Copie impossible : essaie une sélection manuelle.", true);
  }
  return ok;
}

async function copyReleaseNotesAllToClipboard(){
  if(__rnAllLoading){
    showAppMessage("Chargement… essaie dans un instant.");
    return false;
  }

  try{
    if(isReleaseNotesPlaceholder(__rnAllLastEntries)){
      await loadAndRenderReleaseNotesAll(true);
    }
  }catch{}

  if(isReleaseNotesPlaceholder(__rnAllLastEntries)){
    showAppMessage("Changelog complet indisponible.", true);
    return false;
  }

  const text = buildReleaseNotesCopyText(__rnAllLastEntries);
  const ok = await copyTextToClipboard(text);
  if(ok) showAppMessage("Changelog copié ✅");
  else showAppMessage("Copie impossible : essaie une sélection manuelle.", true);
  return ok;
}

async function loadAndRenderReleaseNotes(force = false) {
  if (__rnLoading) return;
  if (__rnLoadedOnce && !force) return;
  __rnLoading = true;

  try {
    renderReleaseNotes([{ version: "Chargement…", lines: [] }]);
    const url = `CHANGELOG.md?v=${encodeURIComponent(APP_VERSION)}`;
    const res = await fetch(url);
    if (!res || !res.ok) throw new Error("fetch_failed");
    const md = await res.text();
    const entries = parseChangelogMd(md, 10, 2);
    renderReleaseNotes(entries);
    __rnLoadedOnce = true;
  } catch (e) {
    renderReleaseNotes([
      {
        version: "Impossible de charger les notes de version.",
        lines: ["Hors ligne ? Le fichier CHANGELOG.md est inclus dans l’app."]
      }
    ]);
  } finally {
    __rnLoading = false;
  }
}

async function loadAndRenderReleaseNotesAll(force = false) {
  if (__rnAllLoading) return;
  if (__rnAllLoadedOnce && !force) return;
  __rnAllLoading = true;

  try {
    renderReleaseNotesAll([{ version: "Chargement…", lines: [] }]);
    const url = `CHANGELOG.md?v=${encodeURIComponent(APP_VERSION)}`;
    const res = await fetch(url);
    if (!res || !res.ok) throw new Error("fetch_failed");
    const md = await res.text();
    const entries = parseChangelogMd(md, 9999, 9999);
    renderReleaseNotesAll(entries);
    __rnAllLoadedOnce = true;
  } catch (e) {
    renderReleaseNotesAll([
      {
        version: "Impossible de charger le changelog.",
        lines: ["Hors ligne ? Le fichier CHANGELOG.md est inclus dans l’app."]
      }
    ]);
  } finally {
    __rnAllLoading = false;
  }
}

function openReleaseNotesModal() {
  const modal = $("releaseNotesModal");
  if (!modal) return;
  try { markReleaseNotesSeen(); } catch {}
  try { __rnPrevFocus = document.activeElement; } catch { __rnPrevFocus = null; }
  modal.style.display = "flex";
  try { loadAndRenderReleaseNotes(false); } catch {}
  const btnClose = $("btnCloseReleaseNotes");
  if (btnClose) setTimeout(() => { try { btnClose.focus(); } catch {} }, 50);
}

function openReleaseNotesAllModal() {
  const modal = $("releaseNotesAllModal");
  if (!modal) return;
  try { __rnAllPrevFocus = document.activeElement; } catch { __rnAllPrevFocus = null; }
  modal.style.display = "flex";
  try { loadAndRenderReleaseNotesAll(false); } catch {}
  const btnClose = $("btnCloseReleaseNotesAll");
  if (btnClose) setTimeout(() => { try { btnClose.focus(); } catch {} }, 50);
}

function closeReleaseNotesModal() {
  const modal = $("releaseNotesModal");
  if (!modal) return;
  modal.style.display = "none";
  try { if (__rnPrevFocus && __rnPrevFocus.focus) __rnPrevFocus.focus(); } catch {}
  __rnPrevFocus = null;
}

function closeReleaseNotesAllModal() {
  const modal = $("releaseNotesAllModal");
  if (!modal) return;
  modal.style.display = "none";
  try { if (__rnAllPrevFocus && __rnAllPrevFocus.focus) __rnAllPrevFocus.focus(); } catch {}
  __rnAllPrevFocus = null;
}

/* ---------- À propos / Aide (modale) ---------- */

let __aboutPrevFocus = null;

function openAboutModal() {
  const modal = $("aboutModal");
  if (!modal) return;
  try { __aboutPrevFocus = document.activeElement; } catch { __aboutPrevFocus = null; }
  modal.style.display = "flex";
  const btnClose = $("btnCloseAbout");
  if (btnClose) setTimeout(() => { try { btnClose.focus(); } catch {} }, 50);
}

function closeAboutModal() {
  const modal = $("aboutModal");
  if (!modal) return;
  modal.style.display = "none";
  try { if (__aboutPrevFocus && __aboutPrevFocus.focus) __aboutPrevFocus.focus(); } catch {}
  __aboutPrevFocus = null;

function buildAboutSupportText() {
  const v = (typeof APP_VERSION !== "undefined") ? String(APP_VERSION) : "";
  let storageText = "Indisponible";
  try { storageText = isPersistentStorageAvailable() ? "OK" : "Indisponible (mode privé ?)"; } catch {}
  let ua = "";
  try { ua = String(navigator.userAgent || ""); } catch {}
  let appUrl = "";
  try { appUrl = (location && location.origin) ? String(location.origin) + "/app/" : ""; } catch {}
  const reportLine = appUrl ? ("Signalement : " + appUrl + " (bouton “Signaler un problème”)") : "Signalement : dans l’app → Réglages → Signaler un problème";
  return [
    "Boussole — infos support",
    "Version : v" + v,
    "Stockage local : " + storageText,
    "Navigateur : " + ua,
    reportLine
  ].join("\n");
}

async function copyAboutSupportToClipboard() {
  const text = buildAboutSupportText();
  const ok = await copyTextToClipboard(text);
  if (ok) showAppMessage("Copié ✅");
  else showAppMessage("Copie bloquée : copie manuelle nécessaire", true);
  return ok;
}

}

/* ---------- Aide curseurs (définitions) ---------- */

const SLIDER_HELP_FR = {
  energy: {
    title: "Énergie",
    paragraphs: [
      "Capacité à faire ta journée sans te sentir vidé.",
      "0 = épuisé. 10 = plein d’énergie."
    ],
    examples: [
      "Épuisement au moindre effort",
      "Besoin de pauses fréquentes",
      "Coup de fatigue brutal"
    ]
  },
  sleep: {
    title: "Sommeil",
    paragraphs: [
      "Qualité perçue du sommeil : continuité + sensation réparatrice.",
      "0 = très mauvais. 10 = très bon."
    ],
    examples: [
      "Réveils multiples",
      "Sommeil non réparateur",
      "Difficulté d’endormissement"
    ]
  },
  comfort: {
    title: "Confort",
    paragraphs: [
      "Confort corporel : douleur faible et gêne minimale.",
      "0 = très inconfortable. 10 = quasi pas de douleur/gêne."
    ],
    examples: [
      "Douleurs diffuses",
      "Sensibilité accrue",
      "Gêne corporelle"
    ]
  },
  memory: {
    title: "Mémoire",
    paragraphs: [
      "Facilité à retenir et à retrouver une info (mots, consignes, rendez‑vous).",
      "0 = très difficile. 10 = très facile."
    ],
    examples: [
      "Oublis récents",
      "Mot sur le bout de la langue",
      "Perte du fil"
    ]
  },
  concentration: {
    title: "Concentration",
    paragraphs: [
      "Capacité à rester focalisé (lecture, conversation, tâche).",
      "0 = impossible. 10 = facile."
    ],
    examples: [
      "Lecture difficile",
      "Distractibilité",
      "Fatigue mentale rapide"
    ]
  },
  orthostatic: {
    title: "Orthostatisme",
    paragraphs: [
      "La tolérance à l’orthostatisme (ou tolérance orthostatique), c’est la capacité à rester debout sans symptômes gênants malgré l’effet de la gravité sur la circulation.",
      "Quand ça ne marche pas, on parle d’intolérance orthostatique (tête qui tourne, vision floue, palpitations, malaise…)."
    ],
    examples: [
      "Tête qui tourne en se levant",
      "Vision floue debout",
      "Malaise / pré‑syncope"
    ]
  },
  mood: {
    title: "Humeur",
    paragraphs: [
      "Tonalité émotionnelle du jour (moral, stabilité).",
      "0 = très bas. 10 = très bon."
    ],
    examples: [
      "Irritabilité",
      "Tristesse",
      "Variations rapides"
    ]
  },
  serenity: {
    title: "Sérénité",
    paragraphs: [
      "Niveau de calme intérieur (tension, hyper‑éveil).",
      "0 = très tendu. 10 = très calme."
    ],
    examples: [
      "Tension intérieure",
      "Hyper‑éveil",
      "Agitation"
    ]
  },
};

// Minimal EN (fallback to FR if missing)
const SLIDER_HELP_EN = {
  energy: {
    title: "Energy",
    paragraphs: ["Your perceived energy today.", "0 = exhausted. 10 = full of energy."],
    examples: ["Fatigue with minimal effort", "Needing frequent breaks", "Sudden energy crash"]
  },
  sleep: {
    title: "Sleep",
    paragraphs: ["Perceived sleep quality (continuity + restorative feel).", "0 = very poor. 10 = very good."],
    examples: ["Multiple awakenings", "Unrefreshing sleep", "Difficulty falling asleep"]
  },
  comfort: {
    title: "Comfort (low pain)",
    paragraphs: ["Body comfort: low pain and minimal discomfort.", "0 = very uncomfortable. 10 = almost no pain/discomfort."],
    examples: ["Diffuse aches", "Increased sensitivity", "Body discomfort"]
  },
  memory: {
    title: "Memory",
    paragraphs: ["Ease of remembering and retrieving information.", "0 = very difficult. 10 = very easy."],
    examples: ["Recent forgetfulness", "Word-finding issues", "Losing your train of thought"]
  },
  concentration: {
    title: "Focus",
    paragraphs: ["Ability to stay focused (reading, conversation, tasks).", "0 = impossible. 10 = easy."],
    examples: ["Hard to read", "Easily distracted", "Fast mental fatigue"]
  },
  orthostatic: {
    title: "Orthostatic tolerance",
    paragraphs: [
      "Ability to stay upright without bothersome symptoms despite gravity affecting circulation.",
      "If it fails: orthostatic intolerance (dizziness, blurred vision, palpitations, near-fainting…)."
    ],
    examples: ["Dizziness on standing", "Blurred vision while upright", "Near-fainting"]
  },
  mood: {
    title: "Mood",
    paragraphs: ["Overall emotional tone today.", "0 = very low. 10 = very good."],
    examples: ["Irritability", "Low mood", "Rapid swings"]
  },
  serenity: {
    title: "Calm",
    paragraphs: ["Inner calm vs tension/hyperarousal.", "0 = very tense. 10 = very calm."],
    examples: ["Inner tension", "Hyperarousal", "Restlessness"]
  },
};

let __sliderHelpPrevFocus = null;
let __sliderHelpLastKey = null;

function getUiLang() {
  try {
    const l = (document.documentElement?.lang || "").toLowerCase();
    if (l) return l;
  } catch {}
  try {
    const n = (navigator.language || "").toLowerCase();
    if (n) return n;
  } catch {}
  return "fr";
}

function getSliderHelpEntry(key) {
  const k = String(key || "").trim();
  if (!k) return null;
  const lang = getUiLang();
  const src = (lang.startsWith("en") ? SLIDER_HELP_EN : SLIDER_HELP_FR);
  return src[k] || SLIDER_HELP_FR[k] || null;
}

function renderSliderHelpBody(entry) {
  const body = $("sliderHelpBody");
  if (!body) return;
  body.innerHTML = "";
  const paras = Array.isArray(entry?.paragraphs) ? entry.paragraphs : [];
  paras.forEach((t) => {
    const p = document.createElement("p");
    p.textContent = String(t || "");
    body.appendChild(p);
  });

  const ex = Array.isArray(entry?.examples) ? entry.examples.filter(Boolean) : [];
  if (ex.length) {
    const h = document.createElement("div");
    h.className = "modal__sub";
    h.textContent = (getUiLang().startsWith("en") ? "Symptom examples" : "Exemples de symptômes");
    body.appendChild(h);

    const ul = document.createElement("ul");
    ul.className = "modal__list";
    ex.slice(0, 3).forEach((t) => {
      const li = document.createElement("li");
      li.textContent = String(t || "");
      ul.appendChild(li);
    });
    body.appendChild(ul);
  }
}

function openSliderHelpModal(key) {
  const modal = $("sliderHelpModal");
  if (!modal) return;
  const entry = getSliderHelpEntry(key);
  if (!entry) {
    showAppMessage("Aide indisponible pour ce curseur.", true);
    return;
  }
  __sliderHelpLastKey = String(key || "");
  try { __sliderHelpPrevFocus = document.activeElement; } catch { __sliderHelpPrevFocus = null; }

  const titleEl = $("sliderHelpTitle");
  if (titleEl) titleEl.textContent = entry.title || "Comprendre ce curseur";
  renderSliderHelpBody(entry);
  modal.style.display = "flex";
  const btnClose = $("btnCloseSliderHelp");
  if (btnClose) setTimeout(() => { try { btnClose.focus(); } catch {} }, 50);
}

function closeSliderHelpModal() {
  const modal = $("sliderHelpModal");
  if (!modal) return;
  modal.style.display = "none";
  try { if (__sliderHelpPrevFocus && __sliderHelpPrevFocus.focus) __sliderHelpPrevFocus.focus(); } catch {}
  __sliderHelpPrevFocus = null;
  __sliderHelpLastKey = null;
}

/* ---------- Fiches pratiques (bêta) ---------- */

function getFichesFavSet() {
  if (__fichesFavSet) return __fichesFavSet;
  let raw = null;
  try { raw = safeJsonParse(safeStorageGet(LS_KEYS.fichesFav), []); } catch { raw = []; }

  const set = new Set();
  if (Array.isArray(raw)) {
    raw.forEach((id) => { if (typeof id === "string" && id) set.add(id); });
  } else if (raw && typeof raw === "object") {
    // tolérance (ancien format éventuel)
    Object.keys(raw).forEach((k) => { if (raw[k]) set.add(k); });
  }

  __fichesFavSet = set;
  return __fichesFavSet;
}

function saveFichesFavSet() {
  try {
    const set = getFichesFavSet();
    safeStorageSet(LS_KEYS.fichesFav, JSON.stringify(Array.from(set)));
  } catch {}
}

function updateFichesEntryQuickUI() {
  const el = $("fichesFavCount");
  const btn = $("btnFichesFavQuick");
  let n = 0;
  try { n = getFichesFavSet().size || 0; } catch { n = 0; }
  if (el) {
    el.textContent = (n === 1) ? "⭐ 1 favori" : ("⭐ " + n + " favoris");
  }
  if (btn) {
    try { btn.disabled = false; } catch {}
    try { btn.classList.remove("is-disabled"); } catch {}
    try { btn.setAttribute("aria-disabled", "false"); } catch {}
  }
}

function getFichesScrollMap() {
  // Map de positions de scroll, par combinaison de filtres (ex. "all", "fav", "all|t:stress", "all|t:stress|q:resp", etc.)
  let raw = null;
  try { raw = safeJsonParse(safeStorageGet(LS_KEYS.fichesScroll), null); } catch { raw = null; }

  const out = {};
  if (raw && typeof raw === "object") {
    try {
      Object.keys(raw).forEach((k) => {
        const v = raw[k];
        if (Number.isFinite(v)) out[k] = Math.max(0, Math.floor(v));
      });
    } catch {}
  }

  // Garde-fous : clés de base
  if (!Number.isFinite(out.all)) out.all = 0;
  if (!Number.isFinite(out.fav)) out.fav = 0;

  return out;
}

function getFichesScrollKey() {
  const mode = getFichesFilterMode();
  const tag = getFichesTag ? getFichesTag() : "all";
  const q = normalizeForSearch(getFichesSearchQuery());

  const tPart = (tag && tag !== "all") ? ("|t:" + tag) : "";
  const qPart = q ? ("|q:" + q) : "";

  return mode + tPart + qPart;
}

function saveFichesScrollPos() {
  const wrap = $("fichesGridWrap");
  if (!wrap) return;
  const key = getFichesScrollKey();
  const map = getFichesScrollMap();
  map[key] = Math.max(0, Math.floor(wrap.scrollTop || 0));
  try { safeStorageSet(LS_KEYS.fichesScroll, JSON.stringify(map)); } catch {}
}

function restoreFichesScrollPos(fromSearchChange) {
  const wrap = $("fichesGridWrap");
  if (!wrap) return;
  const key = getFichesScrollKey();
  const map = getFichesScrollMap();
  let target = Math.max(0, Math.floor(map[key] || 0));

  // Si on vient de changer la recherche, on privilégie un retour en haut
  if (fromSearchChange) target = 0;

  requestAnimationFrame(() => {
    try { wrap.scrollTop = target; } catch {}
  });
}
function isFicheFav(id) {
  try { return getFichesFavSet().has(id); } catch { return false; }
}

function toggleFicheFav(id) {
  if (!id || !FICHES[id]) return;
  const set = getFichesFavSet();
  if (set.has(id)) set.delete(id); else set.add(id);
  saveFichesFavSet();
  try { updateFichesEntryQuickUI(); } catch {}
}

function getFichesFilterMode() {
  if (__fichesFilterMode) return __fichesFilterMode;
  let v = "all";
  try {
    const raw = String(safeStorageGet(LS_KEYS.fichesFilter) || "");
    v = (raw === "fav") ? "fav" : "all";
  } catch {}
  __fichesFilterMode = v;
  return __fichesFilterMode;
}

function setFichesFilterMode(mode) {
  // Mémoriser la position du mode courant avant de basculer
  try { saveFichesScrollPos(); } catch {}

  const m = (mode === "fav") ? "fav" : "all";
  __fichesFilterMode = m;
  try { safeStorageSet(LS_KEYS.fichesFilter, m); } catch {}
  try { updateFichesFilterUI(); } catch {}
  try { updateFichesSearchUI(); } catch {}
  try { renderFichesGrid(); } catch {}
  try { restoreFichesScrollPos(false); } catch {}
}

function updateFichesFilterUI() {
  const btnAll = $("btnFichesFilterAll");
  const btnFav = $("btnFichesFilterFav");
  if (!btnAll || !btnFav) return;
  const m = getFichesFilterMode();
  btnAll.classList.toggle("is-active", m === "all");
  btnFav.classList.toggle("is-active", m === "fav");
  try {
    btnAll.setAttribute("aria-selected", (m === "all") ? "true" : "false");
    btnFav.setAttribute("aria-selected", (m === "fav") ? "true" : "false");
  } catch {}
}

function getAllFichesTagsWithCount() {
  // { tag: count }
  const counts = {};
  try {
    Object.keys(FICHES || {}).forEach((id) => {
      const f = FICHES[id];
      const tags = (f && Array.isArray(f.tags)) ? f.tags : [];
      tags.forEach((t) => {
        const k = String(t || "").trim();
        if (!k) return;
        counts[k] = (counts[k] || 0) + 1;
      });
    });
  } catch {}
  return counts;
}

function listAllFichesTags() {
  const counts = getAllFichesTagsWithCount();
  const tags = Object.keys(counts || {});
  tags.sort((a, b) => {
    const ca = counts[a] || 0;
    const cb = counts[b] || 0;
    if (cb !== ca) return cb - ca; // + fréquents d'abord
    try { return a.localeCompare(b, "fr"); } catch { return (a < b ? -1 : 1); }
  });
  return tags;
}

function tagLabel(tag) {
  const t = String(tag || "").trim();
  if (!t) return "";
  // Petites corrections d'accents si besoin (affichage uniquement)
  const map = { recuperation: "Récupération" };
  const base = map[t] || t;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function getFichesTag() {
  if (__fichesTag) return __fichesTag;
  let v = "all";
  try {
    const raw = String(safeStorageGet(LS_KEYS.fichesTag) || "");
    v = raw ? raw : "all";
  } catch {}

  // Validation : si tag inconnu, revenir à "all"
  try {
    if (v !== "all") {
      const allowed = listAllFichesTags();
      if (!allowed.includes(v)) v = "all";
    }
  } catch { v = "all"; }

  __fichesTag = v;
  return __fichesTag;
}

function setFichesTag(tag) {
  // Mémoriser la position avant de basculer
  try { saveFichesScrollPos(); } catch {}

  const t = String(tag || "").trim();
  let v = t ? t : "all";

  // Validation
  try {
    if (v !== "all") {
      const allowed = listAllFichesTags();
      if (!allowed.includes(v)) v = "all";
    }
  } catch { v = "all"; }

  __fichesTag = v;
  try { safeStorageSet(LS_KEYS.fichesTag, v); } catch {}
  try { updateFichesTagUI(); } catch {}
  try { renderFichesGrid(); } catch {}
  try { restoreFichesScrollPos(false); } catch {}
}

function updateFichesTagUI() {
  const wrap = $("fichesTags");
  if (!wrap) return;
  const active = getFichesTag();
  try {
    const chips = wrap.querySelectorAll(".tagChip");
    chips.forEach((btn) => {
      const t = (btn && btn.dataset) ? (btn.dataset.tag || "all") : "all";
      const on = (t === active);
      btn.classList.toggle("is-active", on);
      try { btn.setAttribute("aria-selected", on ? "true" : "false"); } catch {}
    });
  } catch {}
}

function buildFichesTagsUI() {
  const wrap = $("fichesTags");
  if (!wrap) return;

  const tags = listAllFichesTags();

  wrap.innerHTML = "";

  // "Tous"
  const mk = (label, tag) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tagChip";
    b.textContent = label;
    try { b.dataset.tag = tag; } catch {}
    return b;
  };

  wrap.appendChild(mk("Tous", "all"));

  tags.forEach((t) => {
    wrap.appendChild(mk(tagLabel(t), t));
  });

  try { updateFichesTagUI(); } catch {}
}



function wireFichesLibraryControlsOnce() {
  const modal = $("fichesLibraryModal");
  if (!modal) return;
  try {
    if (modal.dataset && modal.dataset.wired) return;
  } catch {}

  const btnAll = $("btnFichesFilterAll");
  const btnFav = $("btnFichesFilterFav");
  const btnTopFav = $("btnFichesTopFav");

  const inpSearch = $("fichesSearchInput");
  const btnSearchClear = $("btnFichesSearchClear");

  if (btnAll) btnAll.addEventListener("click", () => { try { setFichesFilterMode("all"); } catch {} });
  if (btnFav) btnFav.addEventListener("click", () => { try { setFichesFilterMode("fav"); } catch {} });
  if (btnTopFav) btnTopFav.addEventListener("click", () => { try { setFichesFilterMode("fav"); } catch {} });

  if (inpSearch) {
    inpSearch.addEventListener("input", () => {
      try { setFichesSearchQuery(inpSearch.value); } catch {}
    });
    inpSearch.addEventListener("keydown", (ev) => {
      try {
        if (ev && ev.key === "Escape") {
          ev.preventDefault();
          inpSearch.value = "";
          setFichesSearchQuery("");
        }
      } catch {}
    });
  }
  if (btnSearchClear) btnSearchClear.addEventListener("click", () => {
    try {
      if (inpSearch) inpSearch.value = "";
      setFichesSearchQuery("");
      if (inpSearch) inpSearch.focus();
    } catch {}
  });


  const tagsWrap = $("fichesTags");
  if (tagsWrap) {
    tagsWrap.addEventListener("click", (ev) => {
      try {
        const tgt = (ev && ev.target) ? ev.target : null;
        if (!tgt || !tgt.classList || !tgt.classList.contains("tagChip")) return;
        const tag = (tgt.dataset && tgt.dataset.tag) ? tgt.dataset.tag : "all";
        setFichesTag(tag);
      } catch {}
    });
  }

  const wrap = $("fichesGridWrap");
  if (wrap) {
    wrap.addEventListener("scroll", () => {
      try {
        if (__fichesScrollSaveT) clearTimeout(__fichesScrollSaveT);
        __fichesScrollSaveT = setTimeout(() => { try { saveFichesScrollPos(); } catch {} }, 120);
      } catch {}
    });
  }

  try { if (modal.dataset) modal.dataset.wired = "1"; } catch {}
}

function computeFichesShownIds() {
  const mode = getFichesFilterMode();
  const favOnly = (mode === "fav");
  const favs = getFichesFavSet();

  const qRaw = getFichesSearchQuery();
  const q = normalizeForSearch(qRaw);

  const ids = Object.keys(FICHES).filter((id) => !!FICHES[id]);

  let shown = [];
  if (favOnly) {
    shown = ids.filter((id) => favs.has(id));
  } else {
    const favIds = ids.filter((id) => favs.has(id));
    const otherIds = ids.filter((id) => !favs.has(id));
    shown = favIds.concat(otherIds);
  }

  const tag = getFichesTag();
  if (tag && tag !== "all") {
    shown = shown.filter((id) => {
      try {
        const f = FICHES[id];
        const tags = (f && Array.isArray(f.tags)) ? f.tags : [];
        return tags.includes(tag);
      } catch { return false; }
    });
  }

  if (q) {
    shown = shown.filter((id) => {
      try {
        const f = FICHES[id];
        if (!f) return false;
        const t = normalizeForSearch(f.title || "");
        const d = normalizeForSearch(f.desc || "");
        const g = normalizeForSearch((f && Array.isArray(f.tags)) ? f.tags.join(" ") : "");
        return t.includes(q) || d.includes(q) || g.includes(q);
      } catch { return false; }
    });
  }

  return shown;
}

function renderFichesGrid() {
  const grid = $("fichesGrid");
  if (!grid) return;

  const mode = getFichesFilterMode();
  const favOnly = (mode === "fav");
  const favs = getFichesFavSet();

  const qRaw = getFichesSearchQuery();
  const q = normalizeForSearch(qRaw);

  const ids = Object.keys(FICHES).filter((id) => !!FICHES[id]);

  let shown = [];
  if (favOnly) {
    shown = ids.filter((id) => favs.has(id));
  } else {
    // En mode "Tout", afficher les ⭐ favoris en premier (ordre stable)
    const favIds = ids.filter((id) => favs.has(id));
    const otherIds = ids.filter((id) => !favs.has(id));
    shown = favIds.concat(otherIds);
  }


  const tag = getFichesTag();
  if (tag && tag !== "all") {
    shown = shown.filter((id) => {
      try {
        const f = FICHES[id];
        const tags = (f && Array.isArray(f.tags)) ? f.tags : [];
        return tags.includes(tag);
      } catch {
        return false;
      }
    });
  }

  // Filtre recherche (titre + description + tags)
  if (q) {
    shown = shown.filter((id) => {
      try {
        const f = FICHES[id];
        if (!f) return false;
        const t = normalizeForSearch(f.title || "");
        const d = normalizeForSearch(f.desc || "");
        const g = normalizeForSearch((f && Array.isArray(f.tags)) ? f.tags.join(" ") : "");
        return t.includes(q) || d.includes(q) || g.includes(q);
      } catch {
        return false;
      }
    });
  }

  try { __fichesLastShownOrder = shown.slice(); } catch { __fichesLastShownOrder = []; }

  // Info "x résultat(s)" (sous la barre de recherche)
  try {
    const info = $("fichesResultsInfo");
    if (info) {
      const n = shown.length;
      let label = "";
      if (q) {
        label = (n === 1) ? "1 résultat" : (n + " résultats");
      } else if (favOnly) {
        label = (n === 1) ? "1 favori" : (n + " favoris");
      } else {
        label = (n === 1) ? "1 fiche" : (n + " fiches");
      }
      info.textContent = label;
    }
  } catch {}

  grid.innerHTML = "";

  if (!shown.length) {
    const empty = document.createElement("div");
    empty.className = "fichesEmpty";

    // Message compact
    if (q) {
      empty.textContent = favOnly ? "Aucun favori." : "Aucun résultat.";
      const sub = document.createElement("span");
      sub.className = "fichesEmpty__sub";
      sub.textContent = "“" + qRaw + "”";
      empty.appendChild(sub);
    } else {
      empty.textContent = favOnly ? "Aucun favori." : "Aucune fiche.";
    }

    grid.appendChild(empty);
    return;
  }

  shown.forEach((id) => {
    const f = FICHES[id];
    if (!f) return;

    const card = document.createElement("div");
    card.className = "ficheCard";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", f.title || "Fiche");

    const thumb = document.createElement("div");
    thumb.className = "ficheThumb";

    const img = document.createElement("img");
    img.src = f.src || "";
    img.alt = f.title || "Fiche";
    img.loading = "lazy";
    thumb.appendChild(img);

    // ⭐ Favori (bouton séparé pour éviter les clics accidentels)
    const favBtn = document.createElement("button");
    favBtn.type = "button";
    const fav = isFicheFav(id);
    favBtn.className = "ficheFavBtn" + (fav ? " is-fav" : "");
    favBtn.textContent = fav ? "★" : "☆";
    favBtn.title = fav ? "Retirer des favoris" : "Ajouter aux favoris";
    favBtn.setAttribute("aria-label", favBtn.title);
    favBtn.addEventListener("click", (ev) => {
      try {
        ev.preventDefault();
        ev.stopPropagation();
        toggleFicheFav(id);
        try { saveFichesScrollPos(); } catch {}
        renderFichesGrid();
        try { restoreFichesScrollPos(false); } catch {}
      } catch {}
    });
    thumb.appendChild(favBtn);

    const meta = document.createElement("div");
    const t = document.createElement("div");
    t.className = "ficheMeta__title";
    t.innerHTML = highlightHtml(f.title || "Fiche", qRaw);
    const d = document.createElement("div");
    d.className = "ficheMeta__desc";
    d.innerHTML = highlightHtml(f.desc || "", qRaw);
    meta.appendChild(t);
    meta.appendChild(d);

    const tags = (f && Array.isArray(f.tags)) ? f.tags : [];
    if (tags.length) {
      const tg = document.createElement("div");
      tg.className = "ficheMeta__tags";
      tg.innerHTML = highlightHtml(tags.join(" • "), qRaw);
      meta.appendChild(tg);
    }

    card.appendChild(thumb);
    card.appendChild(meta);

    const open = () => {
      try { closeFichesLibrary(); } catch {}
      try { openFiche(id); } catch {}
    };

    card.addEventListener("click", open);
    card.addEventListener("keydown", (ev) => {
      if (!ev) return;
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        open();
      }
    });

    grid.appendChild(card);
  });
}

function computeFicheNavOrderFor(id) {
  const fid = String(id || "");
  let list = [];
  try { if (Array.isArray(__fichesLastShownOrder)) list = __fichesLastShownOrder.slice(); } catch {}
  if (list && list.length && fid && list.includes(fid)) return list;

  try { list = computeFichesShownIds(); } catch { list = []; }
  if (list && list.length && fid && list.includes(fid)) return list;

  try { list = Object.keys(FICHES).filter((k) => !!FICHES[k]); } catch { list = []; }
  return Array.isArray(list) ? list : [];
}

function updateFicheNavUI() {
  const btnPrev = $("btnFichePrev");
  const btnNext = $("btnFicheNext");
  const list = Array.isArray(__ficheNavOrder) ? __ficheNavOrder : [];
  const idx = Number(__ficheNavIndex);

  const canShow = list.length > 1 && Number.isFinite(idx) && idx >= 0;
  const prevOk = canShow && idx > 0;
  const nextOk = canShow && idx < (list.length - 1);

  const apply = (btn, ok, show) => {
    if (!btn) return;
    try {
      btn.style.visibility = show ? "visible" : "hidden";
      btn.style.pointerEvents = show ? "auto" : "none";
      btn.disabled = !ok;
      btn.classList.toggle("is-disabled", !ok);
      btn.setAttribute("aria-disabled", ok ? "false" : "true");
    } catch {}
  };

  apply(btnPrev, prevOk, canShow);
  apply(btnNext, nextOk, canShow);
}

function updateFicheFavUI() {
  const btn = $("btnFicheFav");
  if (!btn) return;
  const id = __ficheCurrentId ? String(__ficheCurrentId) : "";
  const ok = !!(id && FICHES[id]);
  try { btn.style.display = ok ? "inline-flex" : "none"; } catch {}
  if (!ok) return;

  const fav = isFicheFav(id);
  const label = fav ? "⭐ Retirer des favoris" : "⭐ Ajouter aux favoris";
  try { btn.textContent = label; } catch {}
  try { btn.title = fav ? "Retirer des favoris" : "Ajouter aux favoris"; } catch {}
  try { btn.setAttribute("aria-label", label); } catch {}
  try { btn.classList.toggle("is-active", fav); } catch {}
}

function navigateFiche(delta) {
  try {
    const list = Array.isArray(__ficheNavOrder) ? __ficheNavOrder : [];
    if (!list.length) return;
    const idx = Number(__ficheNavIndex);
    if (!Number.isFinite(idx) || idx < 0) return;

    const nextIdx = idx + (delta < 0 ? -1 : 1);
    if (nextIdx < 0 || nextIdx >= list.length) return;

    const id = list[nextIdx];
    if (!id) return;
    openFiche(id, { keepNav: true, index: nextIdx });
  } catch {}
}

// v0.5.71 — Mode lecture (Agrandir/Réduire)
function setFicheReadingMode(on) {
  try {
    __ficheReadingMode = !!on;
    const m = $("ficheModal");
    if (m) m.classList.toggle("is-reading", __ficheReadingMode);

    const btn = $("btnFicheRead");
    if (btn) {
      btn.textContent = __ficheReadingMode ? "Réduire" : "Agrandir";
      btn.setAttribute("aria-label", __ficheReadingMode ? "Réduire la lecture" : "Agrandir la lecture");
    }
  } catch {}
}

function toggleFicheReadingMode() {
  try { setFicheReadingMode(!__ficheReadingMode); } catch {}
}

function openFiche(id, opts) {
  const o = opts || {};
  try {
    if (!(o.keepNav && Array.isArray(__ficheNavOrder) && __ficheNavOrder.length)) {
      __ficheNavOrder = computeFicheNavOrderFor(id);
    }
    if (Number.isFinite(o.index)) __ficheNavIndex = o.index;
    else __ficheNavIndex = Array.isArray(__ficheNavOrder) ? __ficheNavOrder.indexOf(String(id)) : -1;
  } catch { __ficheNavIndex = -1; }
  try { updateFicheNavUI(); } catch {}

  const f = (id && FICHES[id]) ? FICHES[id] : null;
  const modal = $("ficheModal");
  const title = $("ficheTitle");
  const desc = $("ficheDesc");
  const tagsWrap = $("ficheTags");
  const img = $("ficheImg");
  const btnCopy = $("btnFicheCopy");
  if (!f || !modal || !title || !desc || !img) return;

  // Ouvre toujours en mode normal (évite de rester bloqué en “Lecture” en changeant de fiche)
  try { setFicheReadingMode(false); } catch {}

  title.textContent = f.title || "Fiche";
  desc.textContent = f.desc || "";

  // Tags cliquables → ouvre la bibliothèque filtrée sur ce tag
  if (tagsWrap) {
    try {
      const tags = Array.isArray(f.tags) ? f.tags.filter(Boolean).slice(0, 8) : [];
      if (!tags.length) {
        tagsWrap.innerHTML = "";
        tagsWrap.style.display = "none";
      } else {
        tagsWrap.style.display = "flex";
        tagsWrap.innerHTML = tags.map(t => {
          const safe = escapeHtml(String(t));
          return `<button type="button" class="tagChip" data-tag="${safe}" aria-label="Voir les fiches : ${safe}">${safe}</button>`;
        }).join("");

        const btns = tagsWrap.querySelectorAll("button[data-tag]");
        btns.forEach(b => {
          b.addEventListener("click", (ev) => {
            try { ev.preventDefault(); } catch {}
            const tag = String(b.getAttribute("data-tag") || "").trim();
            if (!tag) return;
            try { setFichesSearchQuery(""); } catch {}
            try { setFichesFilterMode("all"); } catch {}
            try { setFichesTag(tag); } catch {}
            try { closeFicheModal(); } catch {}
            try { openFichesLibrary(); } catch {}
          });
        });
      }
    } catch {
      try { tagsWrap.innerHTML = ""; tagsWrap.style.display = "none"; } catch {}
    }
  }

  const rawSrc = f.src || "";
  img.src = "";
  img.alt = f.title || "Fiche";
  __ficheCurrentId = String(id || "");
  __ficheCurrentSrc = rawSrc || null;
  __ficheCurrentTitle = f.title || null;
  __ficheCurrentCopyText = f.copyText ? String(f.copyText) : null;
  try { updateFicheFavUI(); } catch {}
  if (btnCopy) {
    const has = !!__ficheCurrentCopyText;
    btnCopy.style.display = has ? "inline-flex" : "none";
    try { btnCopy.disabled = !has; } catch {}
    try { btnCopy.textContent = "Copier"; } catch {}
  }
  modal.style.display = "flex";

  // Charge la source (support db: via IndexedDB)
  try {
    const curId = String(id || "");
    resolveFicheSrc(rawSrc).then((u) => {
      try {
        if (__ficheCurrentId !== curId) return;
        const im = $("ficheImg");
        if (im) im.src = u || "";
      } catch {}
    });
  } catch {}
}

function closeFicheModal() {
  const modal = $("ficheModal");
  if (!modal) return;
  modal.style.display = "none";
  try { setFicheReadingMode(false); } catch {}
  __ficheCurrentId = null;
  __ficheCurrentSrc = null;
  __ficheCurrentTitle = null;
  __ficheCurrentCopyText = null;
  try { if (__ficheObjectUrl) { URL.revokeObjectURL(__ficheObjectUrl); __ficheObjectUrl = null; } } catch {}
  try { if (__ficheObjectUrl) { URL.revokeObjectURL(__ficheObjectUrl); __ficheObjectUrl = null; } } catch {}
  __ficheNavOrder = null;
  __ficheNavIndex = -1;
  try { updateFicheNavUI(); } catch {}
  try { updateFicheFavUI(); } catch {}
}

function openFichesLibrary() {
  const modal = $("fichesLibraryModal");
  const grid = $("fichesGrid");
  if (!modal || !grid) return;

  // Afficher d'abord : permet à la zone scrollable de calculer sa hauteur
  modal.style.display = "flex";

  try { wireFichesLibraryControlsOnce(); } catch {}
  try { updateFichesFilterUI(); } catch {}
  try { buildFichesTagsUI(); } catch {}
  try { updateFichesSearchUI(); } catch {}
  try { renderFichesGrid(); } catch {}
  try { restoreFichesScrollPos(false); } catch {}
}

function closeFichesLibrary() {
  const modal = $("fichesLibraryModal");
  if (!modal) return;
  try { saveFichesScrollPos(); } catch {}
  modal.style.display = "none";
}

function openFicheFullscreen() {
  if (!__ficheCurrentSrc) return;
  try {
    const base = "fiches/viewer.html";
    const qs = "src=" + encodeURIComponent(__ficheCurrentSrc) +
               ( __ficheCurrentTitle ? ("&title=" + encodeURIComponent(__ficheCurrentTitle)) : "" );
    window.open(base + "?" + qs, "_blank", "noopener");
  } catch {}
}

// v0.5.70 — Partager une fiche : Web Share si dispo, sinon copie un lien "propre"
function buildFicheShareUrl(ficheId) {
  try {
    const id = String(ficheId || "").trim();
    if (!id) return window.location.href;

    const u = new URL(window.location.href);
    // Nettoie les paramètres liés au viewer / autres
    u.searchParams.delete("src");
    u.searchParams.delete("title");
    // Deep-link simple vers la fiche
    u.searchParams.set("fiche", id);
    // Garde l'onglet app
    return u.toString();
  } catch {
    try {
      const id = String(ficheId || "").trim();
      return (window.location.origin + window.location.pathname + "?fiche=" + encodeURIComponent(id));
    } catch {
      return window.location.href;
    }
  }
}

async function shareCurrentFiche() {
  try {
    const id = __ficheCurrentId ? String(__ficheCurrentId) : "";
    if (!id || !FICHES[id]) return;
    const f = FICHES[id];
    const title = f && f.title ? String(f.title) : "Fiche Boussole";
    const text = (f && f.desc) ? String(f.desc) : "";
    const url = buildFicheShareUrl(id);

    const canShare = !!(navigator && navigator.share);
    if (canShare) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // L'utilisateur peut annuler : on ne fait pas d'alerte. On tente juste la copie.
      }
    }

    const ok = await copyTextToClipboard(url);
    if (ok) {
      const btn = $("btnFicheShare");
      if (btn) {
        const label0 = btn.textContent || "Partager";
        btn.textContent = "Lien copié ✅";
        setTimeout(() => { try { btn.textContent = label0; } catch {} }, 900);
      } else {
        alert("Lien copié ✅");
      }
    } else {
      alert("Impossible de partager automatiquement. Copie ce lien :\n\n" + url);
    }
  } catch {}
}


// v0.5.78 — Télécharger une fiche en PNG avec bandeau d’avertissement (utile hors app)
const FICHE_PNG_DISCLAIMER = "⚠️ Infos générales uniquement. Pas d’avis médical personnalisé en ligne.\nEn cas de doute/symptôme : médecin traitant. Urgence : 15.";

function slugifyFilename(s) {
  try {
    return String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60) || "fiche";
  } catch {
    return "fiche";
  }
}

async function getFicheImageBlobFromSrc(src) {
  try {
    const s = String(src || "");
    if (!s) return null;
    if (s.startsWith("db:")) {
      const key = s.slice(3);
      if (!key) return null;
      return await idbGet(key);
    }
    const r = await fetch(s, { cache: "no-store" });
    if (!r || !r.ok) return null;
    return await r.blob();
  } catch {
    return null;
  }
}

async function bitmapFromBlob(blob) {
  try {
    if (typeof createImageBitmap === "function") {
      const bmp = await createImageBitmap(blob);
      return { kind: "bmp", bmp };
    }
  } catch {}

  // Fallback (Safari)
  return await new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => resolve({ kind: "img", img, url });
      img.onerror = () => {
        try { URL.revokeObjectURL(url); } catch {}
        resolve(null);
      };
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

function wrapCanvasText(ctx, text, maxWidth) {
  const out = [];
  const parts = String(text || "").split(/\n+/g);
  for (let p = 0; p < parts.length; p++) {
    const line = parts[p].trim();
    if (!line) { out.push(""); continue; }
    const words = line.split(/\s+/g);
    let cur = "";
    for (const w of words) {
      const cand = cur ? (cur + " " + w) : w;
      if (ctx.measureText(cand).width <= maxWidth) {
        cur = cand;
      } else {
        if (cur) out.push(cur);
        cur = w;
      }
    }
    if (cur) out.push(cur);
    if (p !== parts.length - 1) out.push("");
  }
  // Nettoyer les blancs finaux
  while (out.length && out[out.length - 1] === "") out.pop();
  return out;
}

async function downloadCurrentFichePng() {
  try {
    const id = __ficheCurrentId ? String(__ficheCurrentId) : "";
    if (!id || !FICHES[id]) return;

    const btn = $("btnFicheDownload");
    const label0 = btn ? (btn.textContent || "Télécharger") : "Télécharger";
    if (btn) { btn.textContent = "Préparation…"; btn.disabled = true; }

    const src = __ficheCurrentSrc ? String(__ficheCurrentSrc) : (FICHES[id].src || "");
    const blob = await getFicheImageBlobFromSrc(src);
    if (!blob) throw new Error("Image introuvable");

    const bm = await bitmapFromBlob(blob);
    if (!bm) throw new Error("Image non supportée");

    const w = (bm.kind === "bmp") ? bm.bmp.width : bm.img.naturalWidth;
    const h = (bm.kind === "bmp") ? bm.bmp.height : bm.img.naturalHeight;
    if (!w || !h) throw new Error("Dimensions invalides");

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponible");

    // Image
    if (bm.kind === "bmp") ctx.drawImage(bm.bmp, 0, 0);
    else ctx.drawImage(bm.img, 0, 0);

    // Bandeau
    const bannerH = Math.max(120, Math.min(220, Math.round(h * 0.14)));
    const pad = Math.max(18, Math.round(w * 0.03));

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.68)";
    ctx.fillRect(0, h - bannerH, w, bannerH);

    // Texte
    let font = Math.max(18, Math.min(40, Math.round(w / 30)));
    const maxW = w - 2 * pad;
    let lines = [];
    let lineH = 0;
    const availH = bannerH - 2 * pad;

    while (font >= 14) {
      ctx.font = `700 ${font}px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;
      lines = wrapCanvasText(ctx, FICHE_PNG_DISCLAIMER, maxW);
      lineH = Math.round(font * 1.25);
      const need = lines.length * lineH;
      if (need <= availH) break;
      font -= 2;
    }

    // Si trop long malgré tout : couper proprement
    const maxLines = Math.max(2, Math.floor(availH / (lineH || 18)));
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      const last = lines[lines.length - 1] || "";
      lines[lines.length - 1] = last.replace(/\s*$/, "") + "…";
    }

    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    let yy = h - bannerH + pad;
    for (const ln of lines) {
      if (!ln) { yy += Math.round(lineH * 0.45); continue; }
      ctx.fillText(ln, pad, yy);
      yy += lineH;
    }

    ctx.restore();

    const png = await new Promise((resolve) => {
      try {
        canvas.toBlob((b) => resolve(b), "image/png");
      } catch {
        resolve(null);
      }
    });

    if (!png) throw new Error("Export PNG impossible");

    const title = (FICHES[id] && FICHES[id].title) ? String(FICHES[id].title) : "fiche";
    const stamp = makeExportStamp();
    const file = `boussole_fiche_${slugifyFilename(title)}_v${APP_VERSION}_${stamp}.png`;
    downloadBlob(png, file);

    // Cleanup
    try {
      if (bm.kind === "bmp" && bm.bmp && bm.bmp.close) bm.bmp.close();
    } catch {}
    try {
      if (bm.kind === "img" && bm.url) URL.revokeObjectURL(bm.url);
    } catch {}

    if (btn) { btn.textContent = "Téléchargé ✅"; }
    setTimeout(() => {
      try { if (btn) { btn.textContent = label0; btn.disabled = false; } } catch {}
    }, 900);
  } catch (e) {
    try {
      const btn = $("btnFicheDownload");
      if (btn) { btn.textContent = "Télécharger"; btn.disabled = false; }
    } catch {}
    alert("Impossible de générer l’image.\n\n" + (e && e.message ? e.message : "Erreur"));
  }
}


// v0.5.32 — Rappel optionnel (données locales)
const REMINDER_DEFAULT_TIME = "09:00";

function ymdLocal(d = new Date()) {
  try {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  } catch {
    return "";
  }
}

function loadReminder() {
  const v = safeJsonParse(safeStorageGet(LS_KEYS.reminder), null);
  if (!v || typeof v !== "object") {
    return { enabled:false, time: REMINDER_DEFAULT_TIME, nextAt:null, lastPromptYMD:null, lastSkipYMD:null, lastDueShownYMD:null };
  }
  return {
    enabled: !!v.enabled,
    time: (typeof v.time === "string" && v.time) ? v.time : REMINDER_DEFAULT_TIME,
    nextAt: (typeof v.nextAt === "string" && v.nextAt) ? v.nextAt : null,
    lastPromptYMD: (typeof v.lastPromptYMD === "string" && v.lastPromptYMD) ? v.lastPromptYMD : null,
    lastSkipYMD: (typeof v.lastSkipYMD === "string" && v.lastSkipYMD) ? v.lastSkipYMD : null,
    lastDueShownYMD: (typeof v.lastDueShownYMD === "string" && v.lastDueShownYMD) ? v.lastDueShownYMD : null,
  };
}

function saveReminder(r) {
  try { safeStorageSet(LS_KEYS.reminder, JSON.stringify(r || {})); } catch {}
}

function makeTomorrowAt(timeStr) {
  const t = String(timeStr || REMINDER_DEFAULT_TIME);
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  const hh = m ? Math.max(0, Math.min(23, Number(m[1]))) : 9;
  const mm = m ? Math.max(0, Math.min(59, Number(m[2]))) : 0;
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}

function getLastEntryYMD() {
  const entries = loadEntries();
  if (!entries.length) return null;
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (!e || !e.ts) continue;
    const d = new Date(e.ts);
    if (Number.isNaN(d.getTime())) continue;
    return ymdLocal(d);
  }
  return null;
}

let __reminderTimer = null;

function scheduleReminderTimer() {
  try { if (__reminderTimer) clearTimeout(__reminderTimer); } catch {}
  __reminderTimer = null;

  const r = loadReminder();
  if (!r.enabled || !r.nextAt) return;

  const target = new Date(r.nextAt);
  if (Number.isNaN(target.getTime())) return;

  const ms = target.getTime() - Date.now();
  if (ms <= 0) return;

  __reminderTimer = setTimeout(() => {
    try { showReminderDueIfNeeded(true); } catch {}
  }, Math.min(ms, 2147483647));
}

function openReminderDueModal() {
  const modal = $("reminderDueModal");
  if (!modal) return;
  modal.style.display = "flex";
  try {
    modal.onclick = (ev) => {
      if (ev && ev.target === modal) closeReminderDueModal();
    };
  } catch {}
}

function closeReminderDueModal() {
  const modal = $("reminderDueModal");
  if (!modal) return;
  modal.style.display = "none";
}

function showReminderDueIfNeeded(fromTimer=false) {
  const r = loadReminder();
  if (!r.enabled || !r.nextAt) return;

  const target = new Date(r.nextAt).getTime();
  if (!Number.isFinite(target) || Date.now() < target) return;

  const today = ymdLocal(new Date());
  const lastEntry = getLastEntryYMD();
  if (lastEntry === today) return;

  if (r.lastDueShownYMD === today) return;
  r.lastDueShownYMD = today;
  saveReminder(r);

  // Best-effort notification si autorisée + l’onglet est ouvert
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Boussole", { body: "Petit rappel : fais ton bilan quand tu veux. ✅" });
    }
  } catch {}

  openReminderDueModal();
}

function bumpReminderAfterSave() {
  const r = loadReminder();
  if (!r.enabled) return;
  r.nextAt = makeTomorrowAt(r.time);
  r.lastDueShownYMD = null;
  saveReminder(r);
  scheduleReminderTimer();
}

function openReminderModal() {
  const modal = $("reminderModal");
  const timeSel = $("reminderTime");
  if (!modal) return;

  const r = loadReminder();
  if (timeSel) {
    try {
      const t = (r && r.time) ? r.time : REMINDER_DEFAULT_TIME;
      timeSel.value = t;
    } catch {}
  }

  modal.style.display = "flex";

  try {
    modal.onclick = (ev) => {
      if (ev && ev.target === modal) { try { skipReminderPrompt(); } catch {} }
    };
  } catch {}
}

function closeReminderModal() {
  const modal = $("reminderModal");
  if (!modal) return;
  modal.style.display = "none";
}

function skipReminderPrompt() {
  const r = loadReminder();
  r.lastSkipYMD = ymdLocal(new Date());
  saveReminder(r);
  closeReminderModal();
}

async function enableReminderTomorrow() {
  const timeSel = $("reminderTime");
  const time = timeSel ? String(timeSel.value || REMINDER_DEFAULT_TIME) : REMINDER_DEFAULT_TIME;

  const r = loadReminder();
  r.enabled = true;
  r.time = time;
  r.nextAt = makeTomorrowAt(time);
  r.lastSkipYMD = null;
  r.lastDueShownYMD = null;
  saveReminder(r);

  // Permission notification (best-effort, sans promesse)
  try {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  } catch {}

  closeReminderModal();
  scheduleReminderTimer();
}

function maybeOpenReminderPrompt() {
  const r = loadReminder();
  if (r.enabled) return;
  const today = ymdLocal(new Date());
  if (r.lastSkipYMD === today) return;
  if (r.lastPromptYMD === today) return;

  r.lastPromptYMD = today;
  saveReminder(r);

  openReminderModal();
}
let __savedModalTimer = null;

function openSavedModal() {
  const modal = $("savedModal");
  const desc = $("savedDesc");
  const btn = $("btnSavedContinue");
  if (!modal) return;

  // Mini-phrase valorisante (courte)
  const lines = [
    "Bien joué — une donnée de plus pour ton suivi.",
    "Parfait. Ton suivi est à jour.",
    "C’est enregistré. Merci 🙌",
    "Noté. On avance 👍",
  ];
  if (desc) desc.textContent = lines[Math.floor(Math.random() * lines.length)];

  modal.style.display = "flex";

  // Clic hors carte => fermer
  try {
    modal.onclick = (ev) => {
      if (ev && ev.target === modal) closeSavedModal();
    };
  } catch {}

  // Focus doux sur le bouton, si possible
  try { if (btn && btn.focus) btn.focus(); } catch {}

  // Auto-fermeture (micro-écran, sans rallonger le parcours)
  try { if (__savedModalTimer) clearTimeout(__savedModalTimer); } catch {}
  __savedModalTimer = setTimeout(() => { try { closeSavedModal(); } catch {} }, 900);
}

function closeSavedModal() {
  const modal = $("savedModal");
  if (!modal) return;
  modal.style.display = "none";
  try { if (__savedModalTimer) clearTimeout(__savedModalTimer); } catch {}
  __savedModalTimer = null;

  // v0.5.32 — proposer un rappel optionnel (1×/jour max)
  try { setTimeout(() => { try { maybeOpenReminderPrompt(); } catch {} }, 80); } catch {}
}

async function copyTextToClipboard(text) {
  const t = String(text || "");
  if (!t) return false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(t);
      return true;
    }
  } catch {}
  // Fallback (works on most browsers)
  try {
    const ta = document.createElement("textarea");
    ta.value = t;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.left = "-1000px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return !!ok;
  } catch {
    return false;
  }
}

function buildDiagnostic(includeData) {
  const entries = loadEntries();
  const last20 = entries.slice(-20);
  return {
    app: { name: APP_NAME, version: APP_VERSION },
    generatedAt: nowISO(),
    locale: navigator.language || null,
    languages: navigator.languages || null,
    timezone: (Intl.DateTimeFormat().resolvedOptions().timeZone || null),
    userAgent: navigator.userAgent || null,
    platform: navigator.platform || null,
    online: navigator.onLine ?? null,
    screen: {
      width: window.screen?.width ?? null,
      height: window.screen?.height ?? null,
      pixelRatio: window.devicePixelRatio ?? null,
    },
    storage: {
      approxBytes: approxLocalStorageSize(),
      keys: Object.keys(localStorage).sort(),
    },
    settings: getSettings(),
    includeData: !!includeData,
    lastEntries: includeData ? last20.map(anonymizeEntry).filter(Boolean) : [],
    recentErrors: loadErrors(),
  };
}

function exportDiagnostic() {
  const includeData = getDiagInclude();
  const diag = buildDiagnostic(includeData);
  const json = JSON.stringify(diag, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const stamp = makeExportStamp();
  const name = `boussole_diagnostic_v${APP_VERSION}_${stamp}.json`;
  downloadBlob(blob, name);
}


function copyDiagnosticToClipboard() {
  const includeData = getDiagInclude();
  const diag = buildDiagnostic(includeData);
  const json = JSON.stringify(diag, null, 2);
  return copyTextToClipboard(json);
}


function exportStatusJson() {
  // Exporte les données locales (localStorage) au format attendu par le tableau de bord.
  const entries = loadEntries();
  const status = {
    app: { name: APP_NAME, version: APP_VERSION },
    exportedAt: new Date().toISOString(),
    settings: getSettings(),
    entries: entries,
  };
  const blob = new Blob([JSON.stringify(status, null, 2)], { type: "application/json" });
  downloadBlob(blob, "status.json");
}



function setImportBackup(snapshot) {
  safeStorageSet(LS_KEYS.importBackup, JSON.stringify(snapshot));
}
function getImportBackup() {
  return safeJsonParse(safeStorageGet(LS_KEYS.importBackup), null);
}
function clearImportBackup() {
  safeStorageRemove(LS_KEYS.importBackup);
}
function syncImportUI() {
  const btn = $("btnUndoImport");
  if (!btn) return;
  const has = !!getImportBackup();
  btn.disabled = !has;
  btn.style.opacity = has ? "1" : "0.5";
}

function importStatusJsonFromPayload(payload) {
  if (!payload || typeof payload !== "object") throw new Error("Fichier invalide.");
  if (!Array.isArray(payload.entries)) throw new Error("Ce fichier ne contient pas d’entrées.");

  const cleaned = [];
  for (const e of payload.entries) {
    if (!e || typeof e !== "object") continue;
    const ts = (typeof e.ts === "string" && e.ts) ? e.ts : null;
    if (!ts) continue;
    const item = {
      ts,
      energy: clamp0to10(e.energy),
      sleep: clamp0to10(e.sleep),
      comfort: clamp0to10(e.comfort),
    };
    if (e.memory != null) item.memory = clamp0to10(e.memory);
    if (e.concentration != null) item.concentration = clamp0to10(e.concentration);
    // Legacy: ancien champ "clarity" (Clarté mentale)
    if (e.clarity != null) {
      item.clarity = clamp0to10(e.clarity);
      if (item.memory == null) item.memory = item.clarity;
      if (item.concentration == null) item.concentration = item.clarity;
    }
    if (e.orthostatic != null) item.orthostatic = clamp0to10(e.orthostatic);
    if (e.mood != null) item.mood = clamp0to10(e.mood);
    // Optionnel : mode 2×/jour (Matin/Soir)
    const slot = (e.slot === "PM" || e.slot === "AM") ? e.slot : ((e.moment === "PM" || e.moment === "AM") ? e.moment : null);
    if (slot) item.slot = slot;
    cleaned.push(item);
  }

  setImportBackup({
    backedUpAt: nowISO(),
    entries: loadEntries(),
    settings: getSettings(),
  });

  saveEntries(cleaned);

  if (payload.settings && typeof payload.settings === "object" && !Array.isArray(payload.settings)) {
    setSettings(payload.settings);
  }

  renderLastSaved();
  syncExtraSettingsUI();
  syncTwiceDailySettingsUI();
  renderEvolution();
  syncImportUI();

  // Assistant de démarrage (1er lancement)
  const stCovid = $("starterCovid");
  const stSimple = $("starterSimple");
  const stCustom = $("starterCustom");
  if (stCovid) stCovid.addEventListener("click", () => { applyPresetCovidLong(); closeStarterModal(); });
  if (stSimple) stSimple.addEventListener("click", () => { applyPresetSimple(); closeStarterModal(); });
  if (stCustom) stCustom.addEventListener("click", () => {
    applyPresetSimple(); // crée les réglages (extras OFF) puis ouvre Réglages
    closeStarterModal();
    setTab("settings");
    syncDiagToggle(); syncExtraSettingsUI(); syncImportUI(); syncErrorsIndicator();
  });

  // Lance l'assistant si aucun réglage n'existe encore
  maybeRunStarterWizard();

  // v0.5.70 — Deep-link optionnel : /app/?fiche=<id>
  try {
    const u = new URL(window.location.href);
    const fid = String(u.searchParams.get("fiche") || "").trim();
    if (fid && FICHES[fid]) {
      // Ouvre directement la fiche (sans ouvrir la bibliothèque)
      setTimeout(() => { try { openFiche(fid); } catch {} }, 0);
    }
  } catch {}
}

function importStatusJson() {
  const input = $("fileImport");
  if (!input) return;
  input.value = "";
  input.click();
}

function undoImport() {
  const b = getImportBackup();
  if (!b) return;
  saveEntries(Array.isArray(b.entries) ? b.entries : []);
  if (b.settings) setSettings(b.settings);
  clearImportBackup();
  renderLastSaved();
  syncExtraSettingsUI();
  syncTwiceDailySettingsUI();
  renderEvolution();
  syncImportUI();

  // Assistant de démarrage (1er lancement)
  const stCovid = $("starterCovid");
  const stSimple = $("starterSimple");
  const stCustom = $("starterCustom");
  if (stCovid) stCovid.addEventListener("click", () => { applyPresetCovidLong(); closeStarterModal(); });
  if (stSimple) stSimple.addEventListener("click", () => { applyPresetSimple(); closeStarterModal(); });
  if (stCustom) stCustom.addEventListener("click", () => {
    applyPresetSimple(); // crée les réglages (extras OFF) puis ouvre Réglages
    closeStarterModal();
    setTab("settings");
    syncDiagToggle(); syncExtraSettingsUI(); syncImportUI(); syncErrorsIndicator();
  });

  // Lance l'assistant si aucun réglage n'existe encore
  maybeRunStarterWizard();
}

/* ---------- Support ----------
   Ouvre un email pré-rempli. Local.
*/

function getOsBrowserSummaryLine() {
  const browser = (() => {
    try {
      const uad = navigator.userAgentData;
      if (uad && Array.isArray(uad.brands) && uad.brands.length) {
        const b = uad.brands.find(x => x && x.brand && !/Not A Brand/i.test(x.brand)) || uad.brands[0];
        if (b && b.brand) return String(b.brand).trim();
      }
    } catch {}
    const ua = String(navigator.userAgent || "");
    try {
      if (/Edg\//.test(ua)) return "Microsoft Edge";
      if (/OPR\//.test(ua) || /Opera/.test(ua)) return "Opera";
      if (/Firefox\//.test(ua)) return "Firefox";
      if (/Chrome\//.test(ua) && !/Edg\//.test(ua) && !/OPR\//.test(ua)) return "Chrome";
      if (/Safari\//.test(ua) && /Version\//.test(ua) && !/Chrome\//.test(ua)) return "Safari";
    } catch {}
    return "(navigateur inconnu)";
  })();

  const os = (() => {
    try {
      const uad = navigator.userAgentData;
      if (uad && uad.platform) return String(uad.platform);
    } catch {}
    const ua = String(navigator.userAgent || "");
    try {
      if (/Windows NT/i.test(ua)) return "Windows";
      if (/Android/i.test(ua)) return "Android";
      if (/(iPhone|iPad|iPod)/i.test(ua)) return "iOS";
      if (/Mac OS X/i.test(ua)) return "macOS";
      if (/Linux/i.test(ua)) return "Linux";
    } catch {}
    return "(OS inconnu)";
  })();

  return `${os} — ${browser}`;
}


function buildBugEmailPayload() {
  const subject = `[Boussole v${APP_VERSION}] Signalement de problème`;
  const errors = loadErrors();
  const hasErrors = Array.isArray(errors) && errors.length > 0;
  let errorsText = formatErrorsText(errors);
  const MAX_ERR_CHARS = 2500;
  if (errorsText.length > MAX_ERR_CHARS) {
    errorsText = errorsText.slice(0, MAX_ERR_CHARS) + "\n… (tronqué)";
  }

  const tz = (window.Intl && Intl.DateTimeFormat) ? (Intl.DateTimeFormat().resolvedOptions().timeZone || "") : "";


  // v0.6.91 — infos support (sans données)
  let storageOk = false;
  try {
    const k = "__boussole_ls_test__";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    storageOk = true;
  } catch {}
  const storageLine = `Stockage local: ${storageOk ? "disponible" : "indisponible (mode privé ?)"}`;
  const pdfTestLine = `Modes test PDF: slow=${isDebugPdfSlowMode() ? "ON" : "OFF"}, fail=${isDebugPdfFailMode() ? "ON" : "OFF"}`;
  let swLine = "Service worker: non";
  try {
    const sw = navigator.serviceWorker;
    if (sw) swLine = `Service worker: ${sw.controller ? "actif" : "disponible (non contrôlé)"}`;
  } catch {}
  const envLines = [
    `${APP_NAME} v${APP_VERSION}`,
    `Adresse: ${location.href}`,
    `Date locale: ${new Date().toString()}`,
    `Fuseau: ${tz}`,
    `Langue: ${navigator.language || ""}`,
    `Agent utilisateur: ${navigator.userAgent || ""}`,
    storageLine,
    pdfTestLine,
    swLine,
  ];

  const bodyRaw =
`Bonjour Rémy,

Résumé (2 secondes) : ${getOsBrowserSummaryLine()}

Je rencontre un problème :

1) Ce que je fais :
- ...

2) Ce qui se passe :
- ...

3) Ce que j’attendais :
- ...

—
Journal d’erreurs inclus : ${hasErrors ? "oui" : "non"}

Erreurs locales de l’app (100% local, rien n’est envoyé automatiquement) :
${errorsText}

—
Infos techniques (optionnel) :
${envLines.join("\n")}

Optionnel : ajoute le fichier “diagnostic” exporté depuis l’app (sans données si tu préfères).

Merci !`;

  return { subject, bodyRaw };
}

function buildBugMessageToCopy() {
  const p = buildBugEmailPayload();
  return `Objet : ${p.subject}\n\nCorps :\n${p.bodyRaw}`;
}

function openBugMsgModal(autoSelect = false) {
  const modal = $("bugMsgModal");
  const subjectEl = $("bugMsgSubject");
  const bodyEl = $("bugMsgBody");
  if (!modal || !subjectEl || !bodyEl) return;
  const p = buildBugEmailPayload();
  subjectEl.value = p.subject;
  bodyEl.value = p.bodyRaw;
  modal.style.display = "flex";
  if (autoSelect) {
    setTimeout(() => {
      try {
        subjectEl.focus();
        subjectEl.select();
        subjectEl.setSelectionRange(0, subjectEl.value.length);
      } catch {}
    }, 50);
  }
}

function closeBugMsgModal() {
  const modal = $("bugMsgModal");
  if (!modal) return;
  modal.style.display = "none";
}

function selectBugMsgSubject() {
  const el = $("bugMsgSubject");
  if (!el) return;
  try {
    el.focus();
    el.select();
    el.setSelectionRange(0, el.value.length);
  } catch {}
}

function selectBugMsgBody() {
  const el = $("bugMsgBody");
  if (!el) return;
  try {
    el.focus();
    el.select();
    el.setSelectionRange(0, el.value.length);
  } catch {}
}

async function copyBugMsgSubject(btnEl = null) {
  const el = $("bugMsgSubject");
  if (!el) return false;
  const ok = await copyTextToClipboard(String(el.value || ""));
  if (btnEl) {
    const label0 = btnEl.getAttribute("data-label0") || btnEl.textContent || "Copier l’objet";
    btnEl.textContent = ok ? "Objet copié ✅" : "Sélection prête ✅";
    setTimeout(() => { try { btnEl.textContent = label0; } catch {} }, ok ? 900 : 1300);
  }
  if (ok) {
    showAppMessage("Objet copié ✅", false);
  } else {
    try { selectBugMsgSubject(); } catch {}
    showAppMessage("Sélection prête ✅", false);
  }
  return ok;
}

async function copyBugMsgBody(btnEl = null) {
  const el = $("bugMsgBody");
  if (!el) return false;
  const ok = await copyTextToClipboard(String(el.value || ""));
  if (btnEl) {
    const label0 = btnEl.getAttribute("data-label0") || btnEl.textContent || "Copier le corps";
    btnEl.textContent = ok ? "Corps copié ✅" : "Sélection prête ✅";
    setTimeout(() => { try { btnEl.textContent = label0; } catch {} }, ok ? 900 : 1300);
  }
  if (ok) {
    showAppMessage("Corps copié ✅", false);
  } else {
    try { selectBugMsgBody(); } catch {}
    showAppMessage("Sélection prête ✅", false);
  }
  return ok;
}

async function copyBugMsgAll(btnEl = null) {
  const subjEl = $("bugMsgSubject");
  const bodyEl = $("bugMsgBody");
  const subject = String(subjEl?.value || "").trim();
  const body = String(bodyEl?.value || "").trim();
  const combined = `Objet : ${subject}\nCorps :\n${body}`.trim();

  const ok = await copyTextToClipboard(combined);
  if (btnEl) {
    const label0 = btnEl.getAttribute("data-label0") || btnEl.textContent || "Copier tout";
    btnEl.textContent = ok ? "Tout copié ✅" : "Sélection prête ✅";
    setTimeout(() => { try { btnEl.textContent = label0; } catch {} }, ok ? 900 : 1300);
  }
  if (ok) {
    showAppMessage("Tout copié ✅", false);
  } else {
    try { selectBugMsgBody(); } catch {}
    showAppMessage("Sélection prête ✅", false);
  }
  return ok;
}

function downloadBugMessageTxt() {
  const text = buildBugMessageToCopy();
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const stamp = makeExportStamp();
  const filename = `boussole_export_signalement_v${APP_VERSION}_${stamp}.txt`;
  downloadBlob(blob, filename);
}


async function copyBugMessage(btnEl = null) {
  const txt = buildBugMessageToCopy();
  const ok = await copyTextToClipboard(txt);

  if (btnEl) {
    const label0 = btnEl.getAttribute("data-label0") || btnEl.textContent || "Copier";
    btnEl.textContent = ok ? "Message copié ✅" : "Copie manuelle ✅";
    setTimeout(() => {
      try { btnEl.textContent = label0; } catch {}
    }, ok ? 900 : 1300);
  }

  if (ok) {
    showAppMessage("Message copié ✅", false);
  } else {
    try { openBugMsgModal(true); } catch {}
    showAppMessage("Copie manuelle prête ✅", false);
  }
  return ok;
}

function openBugEmail() {
  const p = buildBugEmailPayload();
  const subject = encodeURIComponent(p.subject);
  const body = encodeURIComponent(p.bodyRaw);
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  window.location.href = mailto;
}




/* ---------- Aide PDF ----------
   Sans suivi : mailto + copier/coller.
*/
function getPdfLastError() {
  return safeJsonParse(safeStorageGet(LS_KEYS.pdfLastError), null);
}

function setPdfLastError(obj) {
  try {
    if (!obj) { safeStorageRemove(LS_KEYS.pdfLastError); return; }
    safeStorageSet(LS_KEYS.pdfLastError, JSON.stringify(obj));
  } catch {}
}

function setPdfSupportVisible(isVisible) {
  const el = $("pdfSupportBlock");
  if (!el) return;
  el.style.display = isVisible ? "block" : "none";
}

// v0.6.08 — mini message "Je te guide 👇" (affiché brièvement en cas d'erreur PDF)
let pdfGuideHintTimer = null;
function showPdfGuideHint() {
  const el = $("pdfGuideHint");
  if (!el) return;
  try { el.style.display = "block"; } catch {}
  try {
    el.classList.remove("is-show");
    void el.offsetWidth;
    el.classList.add("is-show");
  } catch {}
  try { if (pdfGuideHintTimer) clearTimeout(pdfGuideHintTimer); } catch {}
  pdfGuideHintTimer = setTimeout(() => {
    try { el.style.display = "none"; el.classList.remove("is-show"); } catch {}
  }, 3800);
}
function scrollToPdfSupportAndFlash() {
  const el = $("pdfSupportBlock");
  if (!el) return;

  const run = () => {
    try {
      if (el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" });
      else window.scrollTo(0, el.offsetTop || 0);
    } catch {
      try { el.scrollIntoView(true); } catch {}
    }

    try {
      el.classList.remove("flash");
      // force reflow to restart animation
      void el.offsetWidth;
      el.classList.add("flash");
      setTimeout(() => { try { el.classList.remove("flash"); } catch {} }, 1100);
    } catch {}
  };

  try {
    if (window.requestAnimationFrame) requestAnimationFrame(run);
    else setTimeout(run, 0);
  } catch { setTimeout(run, 0); }
}


function buildPdfProblemDiagnosticText() {
  const tz = (window.Intl && Intl.DateTimeFormat) ? (Intl.DateTimeFormat().resolvedOptions().timeZone || "") : "";
  const err = getPdfLastError();
  const theme = (() => { try { return getPdfTheme(); } catch { return ""; } })();
  const lines = [];
  lines.push(`${APP_NAME} v${APP_VERSION} — Aide PDF : diagnostic`);
  lines.push(`URL: ${location.href}`);
  lines.push(`Date locale: ${new Date().toString()}`);
  if (tz) lines.push(`Fuseau: ${tz}`);
  if (navigator.language) lines.push(`Langue: ${navigator.language}`);
  if (navigator.userAgent) lines.push(`Agent utilisateur: ${navigator.userAgent}`);
  if (theme) lines.push(`Style PDF: ${theme}`);
  lines.push("—");
  if (err && err.messageUser) lines.push(`Message (app): ${String(err.messageUser).replace(/\s+/g," ").trim()}`);
  else lines.push("Message (app): (aucune erreur PDF enregistrée)");
  if (err && err.messageTech) lines.push(`Détail technique: ${String(err.messageTech).replace(/\s+/g," ").trim()}`);
  return lines.join("\n");
}

// v0.6.38 — diagnostic ultra simple (email Aide PDF, sans données de santé)
function buildPdfSupportQuickDiagText() {
  const browser = (() => {
    try {
      const uad = navigator.userAgentData;
      if (uad && Array.isArray(uad.brands) && uad.brands.length) {
        const b = uad.brands.find(x => x && x.brand && !/Not A Brand/i.test(x.brand)) || uad.brands[0];
        if (b && b.brand) return String(b.brand + (b.version ? (" " + b.version) : "")).trim();
      }
    } catch {}
    const ua = String(navigator.userAgent || "");
    try {
      if (/Edg\//.test(ua)) return "Microsoft Edge";
      if (/OPR\//.test(ua) || /Opera/.test(ua)) return "Opera";
      if (/Firefox\//.test(ua)) return "Firefox";
      if (/Chrome\//.test(ua) && !/Edg\//.test(ua) && !/OPR\//.test(ua)) return "Chrome";
      if (/Safari\//.test(ua) && /Version\//.test(ua) && !/Chrome\//.test(ua)) return "Safari";
    } catch {}
    return ua || "(inconnu)";
  })();

  const os = (() => {
    try {
      const uad = navigator.userAgentData;
      if (uad && uad.platform) return String(uad.platform);
    } catch {}
    const ua = String(navigator.userAgent || "");
    try {
      if (/Windows NT/i.test(ua)) return "Windows";
      if (/Android/i.test(ua)) return "Android";
      if (/(iPhone|iPad|iPod)/i.test(ua)) return "iOS";
      if (/Mac OS X/i.test(ua)) return "macOS";
      if (/Linux/i.test(ua)) return "Linux";
    } catch {}
    return "(inconnu)";
  })();

  const screenInfo = (() => {
    try {
      const vp = `${window.innerWidth}×${window.innerHeight}`;
      const scr = (window.screen && screen.width && screen.height) ? `${screen.width}×${screen.height}` : "";
      const dpr = window.devicePixelRatio ? String(window.devicePixelRatio) : "";
      let s = `zone visible ${vp}`;
      if (scr) s += ` | écran ${scr}`;
      if (dpr) s += ` | densité de pixels ${dpr}`;
      return s;
    } catch {
      return "(inconnu)";
    }
  })();

  const lang = String(navigator.language || "");
  const tz = (window.Intl && Intl.DateTimeFormat) ? (Intl.DateTimeFormat().resolvedOptions().timeZone || "") : "";
  const localTime = (() => {
    try { return new Date().toLocaleString(); } catch { return new Date().toString(); }
  })();
  const url = String(location.href || "");

  const lines = [];
  lines.push(`- Navigateur : ${browser}`);
  lines.push(`- OS : ${os}`);
  lines.push(`- Écran : ${screenInfo}`);
  if (lang) lines.push(`- Langue : ${lang}`);
  lines.push(`- Heure locale : ${localTime}${tz ? (" (" + tz + ")") : ""}`);
  lines.push(`- URL : ${url}`);
  // v0.6.93 — infos support (sans données)
  try {
    const ok = isPersistentStorageAvailable();
    lines.push(`- Stockage local : ${ok ? "disponible" : "indisponible (mode privé ?)"}`);
  } catch {}
  try {
    lines.push(`- Modes test PDF : slow=${isDebugPdfSlowMode() ? "ON" : "OFF"}, fail=${isDebugPdfFailMode() ? "ON" : "OFF"}`);
  } catch {}
  try {
    const sw = navigator.serviceWorker;
    if (!sw) lines.push(`- Service worker : non`);
    else lines.push(`- Service worker : ${sw.controller ? "actif" : "disponible (non contrôlé)"}`);
  } catch {}

  return lines.join("\n");
}




function buildPdfTestUrl() {
  try {
    const u = new URL(location.href);
    // Preserve everything, just ensure debugPdfSlow=1
    u.searchParams.set("debugPdfSlow", "1");
    return u.toString();
  } catch {
    // Fallback
    const base = String(location.href || "");
    if (!base) return "?debugPdfSlow=1";
    if (base.includes("debugPdfSlow=")) return base;
    return base + (base.includes("?") ? "&" : "?") + "debugPdfSlow=1";
  }
}

function buildPdfFailUrl() {
  try {
    const u = new URL(location.href);
    // Preserve everything, just ensure debugPdfFail=1
    u.searchParams.set("debugPdfFail", "1");
    return u.toString();
  } catch {
    // Fallback
    const base = String(location.href || "");
    if (!base) return "?debugPdfFail=1";
    if (base.includes("debugPdfFail=")) return base;
    return base + (base.includes("?") ? "&" : "?") + "debugPdfFail=1";
  }
}

async function copyPdfFailUrl(btnEl) {
  const url = buildPdfFailUrl();
  const ok = await copyTextToClipboard(url);
  if (btnEl) {
    const baseLabel0 = btnEl.getAttribute("data-label0") || btnEl.textContent || "Copier";
    const label0 = (isAnyPdfTestModeOn() ? (baseLabel0 + " (test uniquement)") : baseLabel0);
    if (ok) {
      btnEl.textContent = "URL copiée ✅";
      setTimeout(() => { try { btnEl.textContent = label0; } catch {} }, 900);
    } else {
      btnEl.textContent = "Impossible 😕";
      setTimeout(() => { try { btnEl.textContent = label0; } catch {} }, 1200);
    }
  }
  if (!ok && !btnEl) {
    alert("Impossible de copier automatiquement. Copie l’URL manuellement :\n\n" + url);
  }
}

async function copyPdfTestUrl(btnEl) {
  const url = buildPdfTestUrl();
  const ok = await copyTextToClipboard(url);
  if (btnEl) {
    const baseLabel0 = btnEl.getAttribute("data-label0") || btnEl.textContent || "Copier";
    const label0 = (isAnyPdfTestModeOn() ? (baseLabel0 + " (test uniquement)") : baseLabel0);
    if (ok) {
      btnEl.textContent = "URL copiée ✅";
      setTimeout(() => { try { btnEl.textContent = label0; } catch {} }, 900);
    } else {
      btnEl.textContent = "Impossible 😕";
      setTimeout(() => { try { btnEl.textContent = label0; } catch {} }, 1200);
    }
  }
  if (!ok && !btnEl) {
    alert("Impossible de copier automatiquement. Copie l’URL manuellement dans la barre d’adresse.");
  }
}

function isAnyPdfTestModeOn() {
  try { return isDebugPdfSlowMode() || isDebugPdfFailMode(); } catch { return false; }
}

function refreshPdfDebugUi() {
  try {
    const badge = $("pdfDebugBadge");
    if (badge) badge.style.display = isDebugPdfSlowMode() ? "inline-flex" : "none";
  } catch {}
  try {
    const badge2 = $("pdfFailDebugBadge");
    if (badge2) badge2.style.display = isDebugPdfFailMode() ? "inline-flex" : "none";
  } catch {}
  try {
    const btn = $("btnClearPdfTestModesQuick");
    if (btn) {
      const on = isDebugPdfSlowMode() || isDebugPdfFailMode();
      btn.style.display = on ? "inline-flex" : "none";
    }
  } catch {}
}

  // v0.6.37 — si un mode test est actif, préciser “(test uniquement)” sur les boutons de copie d’URL
  try {
    const on = isAnyPdfTestModeOn();
    const b1 = $("btnCopyPdfTestUrlQuick");
    const b2 = $("btnCopyPdfFailUrlQuick");
    [b1, b2].forEach((b) => {
      if (!b) return;
      // Ne pas écraser un feedback temporaire ("URL copiée ✅" / "Impossible 😕")
      const t = String(b.textContent || "");
      if (t.includes("URL copiée") || t.includes("Impossible")) return;
      const base = b.getAttribute("data-label0") || t || "";
      const desired = on ? (base + " (test uniquement)") : base;
      if (t !== desired) b.textContent = desired;
    });
  } catch {}

async function clearPdfTestModes(btnEl) {
  let ok = false;
  try {
    const u = new URL(location.href);
    u.searchParams.delete("debugPdfSlow");
    u.searchParams.delete("debugPdfFail");
    // Nettoie aussi les variantes (debugPdfSlow=true etc.)
    u.searchParams.delete("debugPdfSlowMode");
    u.searchParams.delete("debugPdfFailMode");
    history.replaceState(null, "", u.toString());
    ok = true;
  } catch {
    // Fallback minimal
    try {
      const base = String(location.href || "");
      if (base) {
        const u2 = base.replace(/([?&])debugPdfSlow=(1|true)(&?)/g, "$1")
                       .replace(/([?&])debugPdfFail=(1|true)(&?)/g, "$1")
                       .replace(/[?&]$/, "");
        history.replaceState(null, "", u2);
        ok = true;
      }
    } catch {}
  }

  // Feedback UI
  if (btnEl) {
    const label0 = btnEl.getAttribute("data-label0") || btnEl.textContent || "Désactiver les modes test";
    if (ok) {
      btnEl.textContent = "Modes désactivés ✅";
      setTimeout(() => { try { btnEl.textContent = label0; } catch {} }, 900);
    } else {
      btnEl.textContent = "Impossible 😕";
      setTimeout(() => { try { btnEl.textContent = label0; } catch {} }, 1200);
    }
  }

  // Recalcule les badges / boutons
  try { refreshPdfDebugUi(); } catch {}
}

function openPdfDiagModal(autoSelect = false) {
  const modal = $("pdfDiagModal");
  const ta = $("pdfDiagText");
  if (!modal || !ta) return;
  ta.value = buildPdfProblemDiagnosticText();
  modal.style.display = "flex";
  if (autoSelect) {
    setTimeout(() => {
      try {
        ta.focus();
        ta.select();
        // iOS : certains navigateurs nécessitent setSelectionRange
        ta.setSelectionRange(0, ta.value.length);
      } catch {}
    }, 50);
  }
}

function closePdfDiagModal() {
  const modal = $("pdfDiagModal");
  if (!modal) return;
  modal.style.display = "none";
}

function selectAllPdfDiagText() {
  const ta = $("pdfDiagText");
  if (!ta) return;
  try {
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
  } catch {}
}

function openPdfSupportMsgModal(autoSelect = false) {
  const modal = $("pdfSupportMsgModal");
  const subjectEl = $("pdfSupportMsgSubject");
  const bodyEl = $("pdfSupportMsgBody");
  if (!modal || !subjectEl || !bodyEl) return;
  const p = buildPdfProblemEmailPayload();
  subjectEl.value = p.subject;
  bodyEl.value = p.bodyRaw;
  modal.style.display = "flex";
  if (autoSelect) {
    setTimeout(() => {
      try {
        bodyEl.focus();
        bodyEl.select();
        bodyEl.setSelectionRange(0, bodyEl.value.length);
      } catch {}
    }, 50);
  }
}

function closePdfSupportMsgModal() {
  const modal = $("pdfSupportMsgModal");
  if (!modal) return;
  modal.style.display = "none";
}

function selectPdfSupportMsgSubject() {
  const el = $("pdfSupportMsgSubject");
  if (!el) return;
  try {
    el.focus();
    el.select();
    el.setSelectionRange(0, el.value.length);
  } catch {}
}

function selectPdfSupportMsgBody() {
  const el = $("pdfSupportMsgBody");
  if (!el) return;
  try {
    el.focus();
    el.select();
    el.setSelectionRange(0, el.value.length);
  } catch {}
}

async function copyPdfSupportMsgSubject(btnEl = null) {
  const el = $("pdfSupportMsgSubject");
  if (!el) return false;
  const ok = await copyTextToClipboard(String(el.value || ""));
  if (btnEl) {
    const label0 = btnEl.getAttribute("data-label0") || btnEl.textContent || "Copier l’objet";
    btnEl.textContent = ok ? "Objet copié ✅" : "Sélection prête ✅";
    setTimeout(() => { try { btnEl.textContent = label0; } catch {} }, ok ? 900 : 1300);
  }
  if (ok) {
    showAppMessage("Objet copié ✅", false);
  } else {
    try { selectPdfSupportMsgSubject(); } catch {}
    showAppMessage("Sélection prête ✅", false);
  }
  return ok;
}

async function copyPdfSupportMsgBody(btnEl = null) {
  const el = $("pdfSupportMsgBody");
  if (!el) return false;
  const ok = await copyTextToClipboard(String(el.value || ""));
  if (btnEl) {
    const label0 = btnEl.getAttribute("data-label0") || btnEl.textContent || "Copier le corps";
    btnEl.textContent = ok ? "Corps copié ✅" : "Sélection prête ✅";
    setTimeout(() => { try { btnEl.textContent = label0; } catch {} }, ok ? 900 : 1300);
  }
  if (ok) {
    showAppMessage("Corps copié ✅", false);
  } else {
    try { selectPdfSupportMsgBody(); } catch {}
    showAppMessage("Sélection prête ✅", false);
  }
  return ok;
}

async function copyPdfSupportMsgAll(btnEl = null) {
  const subjEl = $("pdfSupportMsgSubject");
  const bodyEl = $("pdfSupportMsgBody");
  const subject = String(subjEl?.value || "").trim();
  const body = String(bodyEl?.value || "").trim();
  const combined = `Objet : ${subject}\nCorps :\n${body}`.trim();

  const ok = await copyTextToClipboard(combined);
  if (btnEl) {
    const label0 = btnEl.getAttribute("data-label0") || btnEl.textContent || "Copier tout";
    btnEl.textContent = ok ? "Tout copié ✅" : "Sélection prête ✅";
    setTimeout(() => { try { btnEl.textContent = label0; } catch {} }, ok ? 900 : 1300);
  }
  if (ok) {
    showAppMessage("Tout copié ✅", false);
  } else {
    // Fallback ultime : sélectionner le corps (l’utilisateur peut copier l’objet séparément)
    try { selectPdfSupportMsgBody(); } catch {}
    showAppMessage("Sélection prête ✅", false);
  }
  return ok;
}

let __pdfDiagHintTimer = null;
function flashPdfDiagCopiedHint() {
  const el = $("pdfDiagCopiedHint");
  if (!el) return;
  el.style.display = "block";
  try { if (__pdfDiagHintTimer) clearTimeout(__pdfDiagHintTimer); } catch {}
  __pdfDiagHintTimer = setTimeout(() => {
    try { el.style.display = "none"; } catch {}
  }, 1400);
}

// v0.6.39 — message local (feedback copie message support)
let __appMessageTimer = null;
function showAppMessage(message, isError = false) {
  const text = String(message || "").trim();
  if (!text) return;
  const el = $("appMessage");
  if (!el) {
    if (isError) alert(text);
    return;
  }
  el.textContent = text;
  el.classList.toggle("is-error", !!isError);
  el.classList.add("is-show");
  try { if (__appMessageTimer) clearTimeout(__appMessageTimer); } catch {}
  __appMessageTimer = setTimeout(() => {
    try {
      el.classList.remove("is-show");
      el.classList.remove("is-error");
    } catch {}
  }, 1800);
}

async function copyPdfProblemDiagnostic() {
  const text = buildPdfProblemDiagnosticText();
  const ok = await copyTextToClipboard(text);
  if (ok) {
    flashPdfDiagCopiedHint();
  } else {
    // Fallback : afficher le diagnostic (sélection/copie manuelle)
    try { openPdfDiagModal(true); } catch {}
  }
  return ok;
}

function downloadPdfProblemDiagnosticTxt() {
  const text = buildPdfProblemDiagnosticText();
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const stamp = makeExportStamp();
  downloadBlob(blob, `boussole_export_support_pdf_diagnostic_v${APP_VERSION}_${stamp}.txt`);
}

function downloadPdfProblemMessageTxt() {
  const text = buildPdfProblemMessageToCopy();
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const stamp = makeExportStamp();
  downloadBlob(blob, `boussole_export_support_pdf_message_v${APP_VERSION}_${stamp}.txt`);
}

function buildPdfProblemEmailPayload() {
  const subject = `[Boussole v${APP_VERSION}] Problème PDF`;
  const diag = buildPdfProblemDiagnosticText();
  const quick = buildPdfSupportQuickDiagText();
  const MAX = 2800;
  const diagShort = (diag.length > MAX) ? (diag.slice(0, MAX) + "\n… (tronqué)") : diag;

  const bodyRaw =
`Bonjour Rémy,

Je rencontre un problème avec l’export PDF :

Diagnostic ultra simple (auto, sans données de santé) :
${quick}

1) Ce que je faisais :
- J’ai cliqué sur Télécharger.

2) Ce qui se passe :
- ...

3) Ce que j’attendais :
- ...

—
Diagnostic complet (copié depuis l’onglet PDF, sans données de santé) :
${diagShort}

Merci !`;

  return { subject, bodyRaw };
}

function buildPdfProblemMessageToCopy() {
  const p = buildPdfProblemEmailPayload();
  return `Objet : ${p.subject}\n\nCorps :\n${p.bodyRaw}`;
}

async function copyPdfProblemMessage(btnEl = null) {
  const txt = buildPdfProblemMessageToCopy();
  const ok = await copyTextToClipboard(txt);

  if (btnEl) {
    const label0 = btnEl.getAttribute("data-label0") || btnEl.textContent || "Copier";
    btnEl.textContent = ok ? "Message copié ✅" : "Copie manuelle ✅";
    setTimeout(() => {
      try { btnEl.textContent = label0; } catch {}
    }, ok ? 900 : 1300);
  }

  if (ok) {
    showAppMessage("Message copié ✅", false);
  } else {
    try { openPdfSupportMsgModal(true); } catch {}
    showAppMessage("Copie manuelle prête ✅", false);
  }
  return ok;
}

function openPdfProblemEmail() {
  const p = buildPdfProblemEmailPayload();
  const subject = encodeURIComponent(p.subject);
  const body = encodeURIComponent(p.bodyRaw);
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  window.location.href = mailto;
}

async function sharePdfProblemDiagnostic() {
  const text = buildPdfProblemDiagnosticText();
  const title = `Aide PDF : diagnostic — ${APP_NAME} v${APP_VERSION}`;
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return true;
    } catch (e) {
      // Annulation utilisateur : silencieux
      if (e && e.name === "AbortError") return true;
      // sinon fallback
    }
  }
  try { await copyPdfProblemDiagnostic(); } catch {}
  return false;
}

function wireSharePdfDiagButton(btn) {
  if (!btn) return;
  if (navigator.share) {
    btn.addEventListener("click", async () => {
      try { await sharePdfProblemDiagnostic(); } catch {}
    });
  } else {
    // Web Share indisponible : on cache le bouton
    try { btn.style.display = "none"; } catch {}
  }
}

/* ---------- Boot ---------- */
function boot() {
  syncDisplayedVersion();
  try { syncReleaseNotesNewBadge(); } catch {}
  initSkipLink();
  registerTabs();
  migrateClarityToMemoryConcentration();
  migrateMoodToSerenity();

  // v0.6.31 — badges/bouton debug PDF (lent/erreur)
  try { refreshPdfDebugUi(); } catch {}

  // v0.5.72 — charge les fiches importées (si présentes)
  try { loadCustomFiches(); } catch {}
  try { updateCustomFichesCountUI(); } catch {}


  // v0.5.27 — Évolution : retour en haut lors du changement de période (7/14/30)
  syncEvolutionWindowUI();
  syncPdfWindowUI();
  syncPdfTwoPagesUI();
  const evoWin = $("evoWindow");
  if (evoWin) evoWin.addEventListener("click", (ev) => {
    const btn = ev.target && ev.target.closest ? ev.target.closest("button[data-days]") : null;
    if (!btn) return;
    const d = parseInt(btn.dataset.days || "14", 10);
    const cur = getEvolutionWindowDays();
    if (d === cur) return;
    setEvolutionWindowDays(d);
    syncEvolutionWindowUI();
    syncPdfWindowUI();
    renderEvolution();
    renderPdfPreview();
    scrollEvolutionToTop();
  })
  const pdfWin = $("pdfWindow");
  if (pdfWin) pdfWin.addEventListener("click", (ev) => {
    const btn = ev.target && ev.target.closest ? ev.target.closest("button[data-days]") : null;
    if (!btn) return;
    const d = parseInt(btn.dataset.days || "14", 10);
    const cur = getEvolutionWindowDays();
    if (d === cur) return;
    setEvolutionWindowDays(d);
    syncEvolutionWindowUI();
    syncPdfWindowUI();
    renderEvolution();
    renderPdfPreview();
  });

  syncSlider("energy", "energyVal");
  syncSlider("sleep", "sleepVal");
  syncSlider("comfort", "comfortVal");
  syncSlider("memory", "memoryVal");
  syncSlider("concentration", "concentrationVal");
  syncSlider("orthostatic", "orthostaticVal");
  syncSlider("mood", "moodVal");
  syncSlider("serenity", "serenityVal");
  applyExtraSection();

  const btnQuick = $("btnQuick");
  if (btnQuick) btnQuick.addEventListener("click", quickCheckin);

  $("btnSave").addEventListener("click", saveEntry);

  // v0.5.31 — micro-écran après saisie
  const btnSaved = $("btnSavedContinue");
  if (btnSaved) btnSaved.addEventListener("click", closeSavedModal);
  const savedModal = $("savedModal");
  if (savedModal) {
    document.addEventListener("keydown", (ev) => {
      try {
        if (ev && ev.key === "Escape" && savedModal.style.display === "flex") closeSavedModal();
      } catch {}
    });
  }
    // v0.5.32 — rappel optionnel (données locales)
  const btnRemSet = $("btnReminderSet");
  const btnRemSkip = $("btnReminderSkip");
  if (btnRemSet) btnRemSet.addEventListener("click", () => { try { enableReminderTomorrow(); } catch {} });
  if (btnRemSkip) btnRemSkip.addEventListener("click", () => { try { skipReminderPrompt(); } catch {} });

  const btnRemDo = $("btnReminderDo");
  const btnRemLater = $("btnReminderLater");
  if (btnRemDo) btnRemDo.addEventListener("click", () => { try { closeReminderDueModal(); setTab("today"); } catch {} });
  if (btnRemLater) btnRemLater.addEventListener("click", () => { try { closeReminderDueModal(); } catch {} });

  const reminderModal = $("reminderModal");
  if (reminderModal) {
    document.addEventListener("keydown", (ev) => {
      try {
        if (ev && ev.key === "Escape" && reminderModal.style.display === "flex") skipReminderPrompt();
      } catch {}
    });
  }
  const reminderDueModal = $("reminderDueModal");
  if (reminderDueModal) {
    document.addEventListener("keydown", (ev) => {
      try {
        if (ev && ev.key === "Escape" && reminderDueModal.style.display === "flex") closeReminderDueModal();
      } catch {}
    });
  }

  // v0.5.44 — libellés UI (moment de la journée / simplification multi-symptômes)
const fichesEntry = $("fichesEntry");
if (fichesEntry) {
  const open = () => { try { openFichesLibrary(); } catch {} };
  fichesEntry.addEventListener("click", open);
  fichesEntry.addEventListener("keydown", (ev) => {
    if (!ev) return;
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      open();
    }
  });
}

const btnFichesFavQuick = $("btnFichesFavQuick");
if (btnFichesFavQuick) {
  btnFichesFavQuick.addEventListener("click", (ev) => {
    try {
      if (ev) { ev.preventDefault(); ev.stopPropagation(); }
      setFichesFilterMode("fav");
      openFichesLibrary();
    } catch {}
  });
}
try { updateFichesEntryQuickUI(); } catch {}
const btnFichesClose = $("btnFichesClose");
if (btnFichesClose) btnFichesClose.addEventListener("click", () => { try { closeFichesLibrary(); } catch {} });

const btnFicheClose = $("btnFicheClose");
  if (btnFicheClose) btnFicheClose.addEventListener("click", () => { try { closeFicheModal(); } catch {} });

  const btnFicheBackAll = $("btnFicheBackAll");
  if (btnFicheBackAll) btnFicheBackAll.addEventListener("click", (ev) => {
    try { if (ev) ev.preventDefault(); } catch {}
    try { setFichesSearchQuery(""); } catch {}
    try { setFichesFilterMode("all"); } catch {}
    try { setFichesTag("all"); } catch {}
    try { closeFicheModal(); } catch {}
    try { openFichesLibrary(); } catch {}
  });

  const btnFichePrev = $("btnFichePrev");
  if (btnFichePrev) btnFichePrev.addEventListener("click", (ev) => {
    try { if (ev) ev.preventDefault(); } catch {}
    try { navigateFiche(-1); } catch {}
  });

  const btnFicheNext = $("btnFicheNext");
  if (btnFicheNext) btnFicheNext.addEventListener("click", (ev) => {
    try { if (ev) ev.preventDefault(); } catch {}
    try { navigateFiche(+1); } catch {}
  });
  const btnFicheCopy = $("btnFicheCopy");
  if (btnFicheCopy) btnFicheCopy.addEventListener("click", async () => {
    try {
      const t = __ficheCurrentCopyText ? String(__ficheCurrentCopyText) : "";
      if (!t) return;

      const label0 = "Copier";
      const ok = await copyTextToClipboard(t);
      if (ok) {
        btnFicheCopy.textContent = "Copié ✅";
        setTimeout(() => { try { btnFicheCopy.textContent = label0; } catch {} }, 900);
      } else {
        alert("Impossible de copier automatiquement. Sélectionne le texte et copie manuellement.");
      }
    } catch {}
  });

  const btnFicheFav = $("btnFicheFav");
  if (btnFicheFav) btnFicheFav.addEventListener("click", (ev) => {
    try { if (ev) ev.preventDefault(); } catch {}
    try {
      const id = __ficheCurrentId ? String(__ficheCurrentId) : "";
      if (!id || !FICHES[id]) return;
      toggleFicheFav(id);
      try { updateFicheFavUI(); } catch {}
      // Si la bibliothèque est ouverte derrière, rafraîchir l’ordre (⭐ en premier)
      try {
        const m = $("fichesLibraryModal");
        if (m && m.style.display === "flex") {
          try { saveFichesScrollPos(); } catch {}
          renderFichesGrid();
          try { restoreFichesScrollPos(false); } catch {}
        }
      } catch {}
    } catch {}
  });

  const btnFicheShare = $("btnFicheShare");
  if (btnFicheShare) btnFicheShare.addEventListener("click", (ev) => {
    try { if (ev) ev.preventDefault(); } catch {}
    try { shareCurrentFiche(); } catch {}
  });

  const btnFicheDownload = $("btnFicheDownload");
  if (btnFicheDownload) btnFicheDownload.addEventListener("click", (ev) => {
    try { if (ev) ev.preventDefault(); } catch {}
    try { downloadCurrentFichePng(); } catch {}
  });

  const btnFicheRead = $("btnFicheRead");
  if (btnFicheRead) btnFicheRead.addEventListener("click", (ev) => {
    try { if (ev) ev.preventDefault(); } catch {}
    try { toggleFicheReadingMode(); } catch {}
  });

  const ficheImg = $("ficheImg");
  if (ficheImg) ficheImg.addEventListener("click", (ev) => {
    try {
      if (!__ficheReadingMode) return;
      if (ev) ev.preventDefault();
      setFicheReadingMode(false);
    } catch {}
  });

  const btnFicheOpen = $("btnFicheOpen");
  if (btnFicheOpen) btnFicheOpen.addEventListener("click", () => { try { openFicheFullscreen(); } catch {} });

  const ficheModal = $("ficheModal");
  if (ficheModal) {
    ficheModal.addEventListener("click", (ev) => {
      try { if (ev.target === ficheModal) closeFicheModal(); } catch {}
    });
    const onFicheKeyDown = (ev) => {
      try {
        if (!ev || ficheModal.style.display !== "flex") return;

        const k = String(ev.key || "");
        if (k === "Escape") { closeFicheModal(); return; }

        const tag = (ev.target && ev.target.tagName) ? String(ev.target.tagName).toLowerCase() : "";
        if (tag === "input" || tag === "textarea") return;
        if (ev.altKey || ev.ctrlKey || ev.metaKey) return;

        const kc = Number(ev.keyCode || 0);
        const isLeft = (k === "ArrowLeft" || k === "Left" || kc === 37);
        const isRight = (k === "ArrowRight" || k === "Right" || kc === 39);

        if (isLeft) { ev.preventDefault(); navigateFiche(-1); }
        if (isRight) { ev.preventDefault(); navigateFiche(+1); }
      } catch {}
    };
    // Capture phase: évite qu’un composant intercepte les flèches avant nous (Safari/macOS notamment)
    document.addEventListener("keydown", onFicheKeyDown, true);

    // v0.5.68 — Swipe gauche/droite (mobile) pour Précédente/Suivante
    try {
      const state = { x: 0, y: 0, t: 0, active: false, handled: false };
      const SWIPE_MIN = 45;      // px
      const SWIPE_RATIO = 1.3;   // horizontal doit dominer le vertical

      const isEditableTarget = (el) => {
        try {
          const tag = (el && el.tagName) ? String(el.tagName).toLowerCase() : "";
          if (tag === "input" || tag === "textarea" || tag === "select") return true;
          if (el && el.isContentEditable) return true;
        } catch {}
        return false;
      };

      ficheModal.addEventListener("touchstart", (ev) => {
        try {
          if (!ev || ficheModal.style.display !== "flex") return;
          if (isEditableTarget(ev.target)) return;
          const t0 = ev.touches && ev.touches[0];
          if (!t0 || (ev.touches && ev.touches.length !== 1)) return;
          state.x = t0.clientX; state.y = t0.clientY; state.t = Date.now();
          state.active = true; state.handled = false;
        } catch {}
      }, { passive: true });

      ficheModal.addEventListener("touchmove", (ev) => {
        try {
          if (!state.active) return;
          const t1 = ev.touches && ev.touches[0];
          if (!t1) return;
          const dx = t1.clientX - state.x;
          const dy = t1.clientY - state.y;

          // Si le geste est surtout vertical → on laisse le scroll tranquille
          if (Math.abs(dy) > Math.abs(dx) * SWIPE_RATIO) return;

          // On marque comme "swipe potentiel" seulement si on a déjà un écart horizontal réel
          if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * SWIPE_RATIO) state.handled = true;
        } catch {}
      }, { passive: true });

      ficheModal.addEventListener("touchend", (ev) => {
        try {
          if (!state.active) return;
          state.active = false;

          if (!state.handled) return;
          const t2 = (ev.changedTouches && ev.changedTouches[0]) ? ev.changedTouches[0] : null;
          if (!t2) return;

          const dx = t2.clientX - state.x;
          const dy = t2.clientY - state.y;

          if (Math.abs(dx) < SWIPE_MIN) return;
          if (Math.abs(dx) < Math.abs(dy) * SWIPE_RATIO) return;

          // gauche = suivante ; droite = précédente
          if (dx < 0) navigateFiche(+1);
          else navigateFiche(-1);
        } catch {}
      }, { passive: true });
    } catch {}
  }

const fichesLibraryModal = $("fichesLibraryModal");
if (fichesLibraryModal) {
  fichesLibraryModal.addEventListener("click", (ev) => {
    try { if (ev.target === fichesLibraryModal) closeFichesLibrary(); } catch {}
  });
  document.addEventListener("keydown", (ev) => {
    try {
      if (ev && ev.key === "Escape" && fichesLibraryModal.style.display === "flex") closeFichesLibrary();
    } catch {}
  });
}


  $("btnUndo").addEventListener("click", undoLast);
  renderLastSaved();

  // Moment du saisie (Matin/Soir) : brouillon indépendant par moment
  __slotCurrent = getSelectedSlot();

  const cancelFormTimers = () => {
    if (__draftTimer) { try { clearTimeout(__draftTimer); } catch {} __draftTimer = null; }
    if (__autoTimer) { try { clearTimeout(__autoTimer); } catch {} __autoTimer = null; }
  };

  const switchSlot = (newSlot, fromSelect=false) => {
    const ns = (newSlot === "PM") ? "PM" : "AM";
    const prev = (__slotCurrent === "PM") ? "PM" : "AM";
    if (ns === prev) { try { updateSlotToggleUI(); } catch {} return; }

    // Sauvegarde du brouillon du slot précédent
    cancelFormTimers();
    try { flushDraft(prev); } catch {}

    __slotCurrent = ns;
    if (!fromSelect) setSelectedSlot(ns);
    try { updateSlotToggleUI(); } catch {}
    loadOrResetTodayForSelectedSlot();
  };

  const slotSel = $("slotSelect");
  if (slotSel) slotSel.addEventListener("change", () => {
    const ns = getSelectedSlot();
    switchSlot(ns, true);
  });

  const slotToggle = $("slotToggle");
  if (slotToggle) slotToggle.addEventListener("click", (ev) => {
    const btn = ev.target && ev.target.closest ? ev.target.closest("button[data-slot]") : null;
    if (!btn) return;
    const ns = (String(btn.dataset.slot || "AM") === "PM") ? "PM" : "AM";
    switchSlot(ns, false);
  });


  
  // v0.5.30 — Objectif de la consultation (1 phrase) pour le PDF
  const goalInput = $("consultGoal");
  if (goalInput) {
    try { goalInput.value = getConsultGoal(); } catch (e) {}
    updateConsultGoalCount();
    // Important UX : ne pas .trim() pendant la frappe.
    // Sinon l'espace final disparaît immédiatement et l'utilisateur obtient "motmot".
    const onGoalInput = () => {
      const maxLen = 140;
      const raw = String(goalInput.value ?? "");
      const limited = raw.slice(0, maxLen);
      if (goalInput.value !== limited) goalInput.value = limited;
      // Stockage "tel quel" pendant la frappe (données locales)
      try { safeStorageSet(LS_KEYS.consultGoal, limited); } catch {}
      updateConsultGoalCount();
      try { renderPdfPreview(); } catch {}
    };

    const onGoalCommit = () => {
      // Normalisation au moment où l'utilisateur "valide" (blur/change)
      const v = setConsultGoal(goalInput.value);
      if (goalInput.value !== v) goalInput.value = v;
      updateConsultGoalCount();
      try { renderPdfPreview(); } catch {}
    };

    goalInput.addEventListener("input", onGoalInput);
    goalInput.addEventListener("change", onGoalCommit);
    goalInput.addEventListener("blur", onGoalCommit);
  }

  $("btnPdf").addEventListener("click", () => {
    // v0.6.19 — si clic pendant cooldown : feedback sans relancer
    try {
      if (__pdfCooldownUntil && Date.now() < __pdfCooldownUntil) {
        showPdfCooldownClickHint();
        return;
      }
    } catch {}
    exportPdf();
  });
  // v0.6.12 — Annuler l'UI de génération PDF (sans suivi)
  const btnCancelPdf = $("btnCancelPdf");
  if (btnCancelPdf) btnCancelPdf.addEventListener("click", cancelPdfExportUIOnly);
  // v0.6.09 — Re-tenter l’export directement depuis le bloc Aide PDF
  const btnRetryPdfQuick = $("btnRetryPdfQuick");
  if (btnRetryPdfQuick) btnRetryPdfQuick.addEventListener("click", () => {
    // v0.6.19 — si clic pendant cooldown : feedback sans relancer
    try {
      if (__pdfCooldownUntil && Date.now() < __pdfCooldownUntil) {
        showPdfCooldownClickHint();
        return;
      }
    } catch {}
    try { exportPdf(); } catch {}
  });
  const btnPdfProblem = $("btnPdfProblem");
  if (btnPdfProblem) btnPdfProblem.addEventListener("click", openPdfProblemEmail);
  const btnCopyPdfSupportMsg = $("btnCopyPdfSupportMsg");
  if (btnCopyPdfSupportMsg) {
    try { btnCopyPdfSupportMsg.setAttribute("data-label0", btnCopyPdfSupportMsg.textContent || "Copier"); } catch {}
    btnCopyPdfSupportMsg.addEventListener("click", () => { copyPdfProblemMessage(btnCopyPdfSupportMsg); });
  }
  const btnCopyPdfDiag = $("btnCopyPdfDiag");
  if (btnCopyPdfDiag) btnCopyPdfDiag.addEventListener("click", () => { copyPdfProblemDiagnostic(); });
  const btnDownloadPdfDiag = $("btnDownloadPdfDiag");
  if (btnDownloadPdfDiag) btnDownloadPdfDiag.addEventListener("click", downloadPdfProblemDiagnosticTxt);
  const btnPdfProblemQuick = $("btnPdfProblemQuick");
  if (btnPdfProblemQuick) btnPdfProblemQuick.addEventListener("click", openPdfProblemEmail);
  const btnCopyPdfSupportMsgQuick = $("btnCopyPdfSupportMsgQuick");
  if (btnCopyPdfSupportMsgQuick) {
    try { btnCopyPdfSupportMsgQuick.setAttribute("data-label0", btnCopyPdfSupportMsgQuick.textContent || "Copier"); } catch {}
    btnCopyPdfSupportMsgQuick.addEventListener("click", () => { copyPdfProblemMessage(btnCopyPdfSupportMsgQuick); });
  }
  const btnCopyPdfDiagQuick = $("btnCopyPdfDiagQuick");
  if (btnCopyPdfDiagQuick) btnCopyPdfDiagQuick.addEventListener("click", () => { copyPdfProblemDiagnostic(); });
  const btnDownloadPdfDiagQuick = $("btnDownloadPdfDiagQuick");
  if (btnDownloadPdfDiagQuick) btnDownloadPdfDiagQuick.addEventListener("click", downloadPdfProblemDiagnosticTxt);
  const btnCopyPdfTestUrlQuick = $("btnCopyPdfTestUrlQuick");
  if (btnCopyPdfTestUrlQuick) {
    try { btnCopyPdfTestUrlQuick.setAttribute("data-label0", btnCopyPdfTestUrlQuick.textContent || "Copier"); } catch {}
    btnCopyPdfTestUrlQuick.addEventListener("click", () => { copyPdfTestUrl(btnCopyPdfTestUrlQuick); });

  const btnCopyPdfFailUrlQuick = $("btnCopyPdfFailUrlQuick");
  if (btnCopyPdfFailUrlQuick) {
    try { btnCopyPdfFailUrlQuick.setAttribute("data-label0", btnCopyPdfFailUrlQuick.textContent || "Copier"); } catch {}
    btnCopyPdfFailUrlQuick.addEventListener("click", () => { copyPdfFailUrl(btnCopyPdfFailUrlQuick); });
  }


  const btnClearPdfTestModesQuick = $("btnClearPdfTestModesQuick");
  if (btnClearPdfTestModesQuick) {
    try { btnClearPdfTestModesQuick.setAttribute("data-label0", btnClearPdfTestModesQuick.textContent || "Désactiver les modes test"); } catch {}
    btnClearPdfTestModesQuick.addEventListener("click", () => { clearPdfTestModes(btnClearPdfTestModesQuick); });
  }
  }

  // v0.6.04 — Fallback modal : afficher le diagnostic (sélection/copie manuelle)
  const btnShowPdfDiag = $("btnShowPdfDiag");
  if (btnShowPdfDiag) btnShowPdfDiag.addEventListener("click", () => openPdfDiagModal(false));
  const btnShowPdfDiagQuick = $("btnShowPdfDiagQuick");
  if (btnShowPdfDiagQuick) btnShowPdfDiagQuick.addEventListener("click", () => openPdfDiagModal(false));
  const btnClosePdfDiag = $("btnClosePdfDiag");
  if (btnClosePdfDiag) btnClosePdfDiag.addEventListener("click", closePdfDiagModal);
  const btnSelectPdfDiag = $("btnSelectPdfDiag");
  if (btnSelectPdfDiag) btnSelectPdfDiag.addEventListener("click", selectAllPdfDiagText);
  // v0.6.40 — Fallback manuel : copie du message support (objet + corps)
  const btnClosePdfSupportMsg = $("btnClosePdfSupportMsg");
  if (btnClosePdfSupportMsg) btnClosePdfSupportMsg.addEventListener("click", closePdfSupportMsgModal);
  const btnCopyPdfSupportAll = $("btnCopyPdfSupportAll");
  if (btnCopyPdfSupportAll) {
    try { btnCopyPdfSupportAll.setAttribute("data-label0", btnCopyPdfSupportAll.textContent || "Copier tout"); } catch {}
    btnCopyPdfSupportAll.addEventListener("click", () => { copyPdfSupportMsgAll(btnCopyPdfSupportAll); });
  }
  const btnCopyPdfSupportSubject = $("btnCopyPdfSupportSubject");
  if (btnCopyPdfSupportSubject) {
    try { btnCopyPdfSupportSubject.setAttribute("data-label0", btnCopyPdfSupportSubject.textContent || "Copier l’objet"); } catch {}
    btnCopyPdfSupportSubject.addEventListener("click", () => { copyPdfSupportMsgSubject(btnCopyPdfSupportSubject); });
  }
  const btnCopyPdfSupportBody = $("btnCopyPdfSupportBody");
  if (btnCopyPdfSupportBody) {
    try { btnCopyPdfSupportBody.setAttribute("data-label0", btnCopyPdfSupportBody.textContent || "Copier le corps"); } catch {}
    btnCopyPdfSupportBody.addEventListener("click", () => { copyPdfSupportMsgBody(btnCopyPdfSupportBody); });
  }
  const btnDownloadPdfSupportMsg = $("btnDownloadPdfSupportMsg");
  if (btnDownloadPdfSupportMsg) btnDownloadPdfSupportMsg.addEventListener("click", downloadPdfProblemMessageTxt);

  // v0.6.59 — Fallback manuel : copie du message “Signaler un problème” (objet + corps)
  const btnCloseBugMsg = $("btnCloseBugMsg");
  if (btnCloseBugMsg) btnCloseBugMsg.addEventListener("click", closeBugMsgModal);
  const btnCopyBugAll = $("btnCopyBugAll");
  if (btnCopyBugAll) {
    try { btnCopyBugAll.setAttribute("data-label0", btnCopyBugAll.textContent || "Copier tout"); } catch {}
    btnCopyBugAll.addEventListener("click", () => { copyBugMsgAll(btnCopyBugAll); });
  }
  const btnSelectBugSubject = $("btnSelectBugSubject");
  if (btnSelectBugSubject) {
    try { btnSelectBugSubject.setAttribute("data-label0", btnSelectBugSubject.textContent || "Copier l’objet"); } catch {}
    btnSelectBugSubject.addEventListener("click", () => { copyBugMsgSubject(btnSelectBugSubject); });
  }
  const btnSelectBugBody = $("btnSelectBugBody");
  if (btnSelectBugBody) {
    try { btnSelectBugBody.setAttribute("data-label0", btnSelectBugBody.textContent || "Copier le corps"); } catch {}
    btnSelectBugBody.addEventListener("click", () => { copyBugMsgBody(btnSelectBugBody); });
  }
  const btnDownloadBugMsg = $("btnDownloadBugMsg");
  if (btnDownloadBugMsg) btnDownloadBugMsg.addEventListener("click", downloadBugMessageTxt);
  // v0.6.05/0.6.06/0.6.07 — Partager le diagnostic (modal + onglet PDF + bloc support)
  wireSharePdfDiagButton($("btnSharePdfDiag"));
  wireSharePdfDiagButton($("btnSharePdfDiagInline"));
  wireSharePdfDiagButton($("btnSharePdfDiagQuick"));
  const pdfDiagModal = $("pdfDiagModal");
  if (pdfDiagModal) pdfDiagModal.addEventListener("click", (ev) => {
    if (ev.target === pdfDiagModal) closePdfDiagModal();
  });
  const pdfSupportMsgModal = $("pdfSupportMsgModal");
  if (pdfSupportMsgModal) pdfSupportMsgModal.addEventListener("click", (ev) => {
    if (ev.target === pdfSupportMsgModal) closePdfSupportMsgModal();
  });
  const bugMsgModal = $("bugMsgModal");
  if (bugMsgModal) bugMsgModal.addEventListener("click", (ev) => {
    if (ev.target === bugMsgModal) closeBugMsgModal();
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      const m = $("pdfDiagModal");
      if (m && m.style.display === "flex") closePdfDiagModal();
      const m2 = $("pdfSupportMsgModal");
      if (m2 && m2.style.display === "flex") closePdfSupportMsgModal();
      const m3 = $("bugMsgModal");
      if (m3 && m3.style.display === "flex") closeBugMsgModal();
    }
  });
  const btnForm = $("btnPdfForm");
  if (btnForm) btnForm.addEventListener("click", exportPdfForm);
  const btnPreview = $("btnPreview");
  if (btnPreview) btnPreview.addEventListener("click", () => renderPdfPreview(true));

  // v0.5.65 — PDF 2 pages (optionnel)
  const pdfTwo = $("pdfTwoPages");
  if (pdfTwo) pdfTwo.addEventListener("change", () => {
    try { setPdfTwoPagesEnabled(pdfTwo.checked); } catch {}
    try { renderPdfPreview(); } catch {}
  });

  // v0.5.88 — Style du PDF (Coloré / Noir & blanc)
  const pdfTheme = $("pdfTheme");
  if (pdfTheme) {
    syncPdfThemeUI();
    pdfTheme.addEventListener("click", (ev) => {
      const btn = ev && ev.target && ev.target.closest ? ev.target.closest("button.seg[data-theme]") : null;
      if (!btn) return;
      const t = String(btn.dataset.theme || "color");
      try { setPdfTheme(t); } catch {}
      try { syncPdfThemeUI(); } catch {}
      try { renderPdfPreview(); } catch {}
    });
  }


  // v0.5.93 — Mise en page du PDF (Classique / Comparatif)
  const pdfLayout = $("pdfLayout");
  if (pdfLayout) {
    try { window.syncPdfLayoutUI && window.syncPdfLayoutUI(); } catch (e) {}
    pdfLayout.addEventListener("click", (ev) => {
      const btn = ev && ev.target && ev.target.closest ? ev.target.closest("button.seg[data-layout]") : null;
      if (!btn) return;
      const t = String(btn.dataset.layout || "classic");
      try { setPdfLayout(t); } catch {}
      try { window.syncPdfLayoutUI && window.syncPdfLayoutUI(); } catch (e) {}
      try { renderPdfPreview(); } catch {}
    });
  }

  const diagToggle = $("diagIncludeData");
  diagToggle.checked = getDiagInclude();
  diagToggle.addEventListener("change", () => setDiagInclude(diagToggle.checked));

  
  $("btnExportStatus").addEventListener("click", exportStatusJson);
  $("btnExportStatus2").addEventListener("click", exportStatusJson);
$("btnExportDiag").addEventListener("click", exportDiagnostic);
  $("btnExportDiag2").addEventListener("click", exportDiagnostic);
  $("btnCopyDiag2").addEventListener("click", async () => {
    const ok = await copyDiagnosticToClipboard();
    alert(ok ? "Diagnostic copié." : "Impossible de copier automatiquement. Utilise “Télécharger” ou la copie manuelle.");
  });
  $("btnClearErrors").addEventListener("click", () => {
    clearErrors();
    // Si le modal est ouvert, le contenu doit refléter l'état actuel
    try {
      const modal = $("errorsModal");
      if (modal && modal.style.display === "flex") openErrorsModal();
    } catch {}
    alert("Erreurs locales effacées.");
  });

  // Journal d'erreurs local (Réglages)
  const btnViewErr = $("btnViewErrors");
  if (btnViewErr) btnViewErr.addEventListener("click", openErrorsModal);
  const btnCloseErr = $("btnCloseErrors");
  if (btnCloseErr) btnCloseErr.addEventListener("click", closeErrorsModal);
  const btnCopyErr = $("btnCopyErrors");
  if (btnCopyErr) btnCopyErr.addEventListener("click", async () => {
    const ok = await copyTextToClipboard(__errorsTextCache || formatErrorsText(loadErrors()));
    alert(ok ? "Copié." : "Impossible de copier automatiquement. Sélectionne le texte et copie manuellement.");
  });
  const errModal = $("errorsModal");
  if (errModal) errModal.addEventListener("click", (ev) => {
    if (ev.target === errModal) closeErrorsModal();
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      const m = $("errorsModal");
      if (m && m.style.display === "flex") closeErrorsModal();
    }
  });

  // Sync initial
  syncErrorsIndicator();

  const btnResetDiag = $("btnResetDiag");
  if (btnResetDiag) btnResetDiag.addEventListener("click", () => {
    const msg = "Réinitialiser uniquement le diagnostic ?\n\nCela remet à zéro :\n— les erreurs locales\n— l’option ‘Inclure les données’ (OFF)";
    if (!confirm(msg)) return;
    resetOnlyDiagnostic();
    syncDiagToggle();
    alert("Diagnostic réinitialisé.");
  });


  // Rythme de saisie (optionnel) : 2×/jour (Matin/Soir)
  const twiceDaily = $("set_twice_daily");
  if (twiceDaily) twiceDaily.addEventListener("change", () => {
    const dateKey = getTodayDateKey();

    // Avant de changer de mode, on sauvegarde le brouillon courant
    try {
      if (getTwiceDailyEnabled()) {
        flushDraft(getSelectedSlot());
      } else {
        flushDraft("DAY");
      }
    } catch {}

    setTwiceDailyEnabled(twiceDaily.checked);
    syncTwiceDailySettingsUI();

    // Migration douce des brouillons : DAY <-> AM
    try {
      if (twiceDaily.checked) {
        const dayDraft = getDraft(dateKey, "DAY");
        const amDraft = getDraft(dateKey, "AM");
        if (dayDraft && !amDraft) setDraft(dateKey, "AM", dayDraft);
        if (dayDraft) setDraft(dateKey, "DAY", null);
        __slotCurrent = getSelectedSlot();
        loadOrResetTodayForSelectedSlot();
      } else {
        // On repasse en mode 1×/jour : on garde le brouillon du moment dans DAY
        const slot = getSelectedSlot();
        const d = getDraft(dateKey, slot) || readDraftFromForm();
        setDraft(dateKey, "DAY", d);
      }
    } catch {}

    renderEvolution();
    renderLastSaved();
  });

  // Suivi multi-symptômes (optionnel)
  const mem = $("set_memory");
  const con = $("set_concentration");
  const o = $("set_orthostatic");
  const m = $("set_mood");
  const se = $("set_serenity");
  if (mem) mem.addEventListener("change", () => { setExtraEnabled("memory", mem.checked); applyExtraSection(); renderEvolution(); });
  if (con) con.addEventListener("change", () => { setExtraEnabled("concentration", con.checked); applyExtraSection(); renderEvolution(); });
  if (o) o.addEventListener("change", () => { setExtraEnabled("orthostatic", o.checked); applyExtraSection(); renderEvolution(); });
  if (m) m.addEventListener("change", () => { setExtraEnabled("mood", m.checked); applyExtraSection(); renderEvolution(); });
  if (se) se.addEventListener("change", () => { setExtraEnabled("serenity", se.checked); applyExtraSection(); renderEvolution(); });

  const preset = $("btnPresetCovid");
  const reset = $("btnPresetOff");
  if (preset) preset.addEventListener("click", () => {
    setExtraEnabled("memory", true);
    setExtraEnabled("concentration", true);
    setExtraEnabled("orthostatic", true);
    setExtraEnabled("mood", true);
    setExtraEnabled("serenity", true);
    syncExtraSettingsUI();
    renderEvolution();
  });
  if (reset) reset.addEventListener("click", () => {
    setExtraEnabled("memory", false);
    setExtraEnabled("concentration", false);
    setExtraEnabled("orthostatic", false);
    setExtraEnabled("mood", false);
    setExtraEnabled("serenity", false);
    syncExtraSettingsUI();
    renderEvolution();
  });

  // Import / restauration status.json
  const btnImport = $("btnImportStatus");
  const btnUndoImport = $("btnUndoImport");
  const file = $("fileImport");
  if (btnImport) btnImport.addEventListener("click", importStatusJson);
  if (btnUndoImport) btnUndoImport.addEventListener("click", () => {
    if (confirm("Annuler la dernière restauration ?")) undoImport();
  });
  if (file) file.addEventListener("change", () => {
    const f = file.files && file.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result || ""));
        if (!confirm("Restaurer ce status.json et remplacer les données locales ?")) return;
        importStatusJsonFromPayload(payload);
        alert("Restauration terminée.");
      } catch (e) {
        alert("Import impossible : " + (e && e.message ? e.message : "erreur"));
      } finally {
        file.value = "";
      }
    };
    reader.readAsText(f);
  });

  // v0.5.72 — Import ZIP de fiches (Réglages)
  // Accès : Réglages → Fiches → "Ouvrir"
  const btnOpenFichesImport = $("btnOpenFichesImport");
  const btnCloseFichesImport = $("btnCloseFichesImport");
  const fichesImportModal = $("fichesImportModal");
  if (btnOpenFichesImport && fichesImportModal) {
    btnOpenFichesImport.addEventListener("click", () => {
      try { updateCustomFichesCountUI(); } catch {}
      try {
        // reset hint
        const h = $("importFichesHint");
        if (h) { h.style.display = "none"; h.textContent = ""; }
      } catch {}
      fichesImportModal.style.display = "flex";
    });
  }
  if (btnCloseFichesImport && fichesImportModal) {
    btnCloseFichesImport.addEventListener("click", () => {
      try { fichesImportModal.style.display = "none"; } catch {}
    });
  }
  if (fichesImportModal) {
    fichesImportModal.addEventListener("click", (ev) => {
      try { if (ev.target === fichesImportModal) fichesImportModal.style.display = "none"; } catch {}
    });
    document.addEventListener("keydown", (ev) => {
      try {
        if (ev && ev.key === "Escape" && fichesImportModal.style.display === "flex") fichesImportModal.style.display = "none";
      } catch {}
    });
  }

  const btnImportFiches = $("btnImportFiches");
  const fileImportFiches = $("fileImportFiches");
  const replaceFiches = $("set_fiches_replace");
  const importFichesHint = $("importFichesHint");
  if (btnImportFiches && fileImportFiches) {
    btnImportFiches.addEventListener("click", () => {
      try {
        if (importFichesHint) importFichesHint.style.display = "none";
        fileImportFiches.click();
      } catch {}
    });
    fileImportFiches.addEventListener("change", async () => {
      const f = fileImportFiches.files && fileImportFiches.files[0];
      if (!f) return;
      try {
        const rep = !!(replaceFiches && replaceFiches.checked);
        // Pré‑validation : format / doublons / images manquantes
        let pre = null;
        try {
          pre = await analyzeFichesZip(f, rep);
        } catch (e) {
          throw new Error((e && e.message) ? e.message : "ZIP invalide");
        }

        const msgLines = [];
        msgLines.push(`ZIP : ${pre.total} fiche(s) détectée(s)`);
        msgLines.push(`— Ajout : ${pre.wouldAdd.length}`);
        msgLines.push(`— Remplacement : ${pre.wouldReplace.length}`);
        if (!rep) msgLines.push(`— Doublons ignorés : ${pre.wouldSkipExisting.length}`);
        msgLines.push(`— Sans image : ${pre.wouldSkipNoImage.length}`);
        msgLines.push(`— Format incomplet : ${pre.wouldSkipInvalid.length}`);
        msgLines.push("\nImporter maintenant ?");

        if (!confirm(msgLines.join("\n"))) {
          if (importFichesHint) {
            importFichesHint.style.display = "block";
            importFichesHint.textContent = "Import annulé.";
          }
          return;
        }

        if (importFichesHint) {
          importFichesHint.style.display = "block";
          importFichesHint.textContent = "Import en cours…";
        }
        const res = await importFichesZip(f, rep);
        const a = res && Array.isArray(res.added) ? res.added.length : 0;
        const s = res && Array.isArray(res.skipped) ? res.skipped.length : 0;
        if (importFichesHint) {
          importFichesHint.style.display = "block";
          // Détail léger (sans noyer l'utilisateur)
          const parts = [];
          parts.push(`Import terminé : ${a} ajoutée(s), ${s} ignorée(s).`);
          try {
            if (pre && pre.wouldReplace && pre.wouldReplace.length) parts.push(`Remplacées : ${pre.wouldReplace.length}`);
            if (pre && pre.wouldSkipNoImage && pre.wouldSkipNoImage.length) parts.push(`Sans image : ${pre.wouldSkipNoImage.length}`);
            if (pre && pre.wouldSkipInvalid && pre.wouldSkipInvalid.length) parts.push(`Format incomplet : ${pre.wouldSkipInvalid.length}`);
          } catch {}
          importFichesHint.textContent = parts.join(" • ");
        }
        try { updateCustomFichesCountUI(); } catch {}
      } catch (e) {
        if (importFichesHint) {
          importFichesHint.style.display = "block";
          importFichesHint.textContent = "Import impossible : " + (e && e.message ? e.message : "erreur");
        } else {
          alert("Import impossible : " + (e && e.message ? e.message : "erreur"));
        }
      } finally {
        try { fileImportFiches.value = ""; } catch {}
      }
    });
  }

  // v0.5.61 — Contacts santé (Réglages)
  // v0.6.73 — unifie la persistance : on synchronise toujours depuis l'UI (input/change/blur)
  // pour couvrir les cas d’auto-remplissage et éviter les champs « partiellement » sauvegardés.

  // v0.6.81 — Contacts : indicateur fiable + moins de probes (cache) + debounce
  let __contactsPersistOk = null;
  const getContactsPersistOk = () => {
    if (__contactsPersistOk === null) {
      try { __contactsPersistOk = !!isPersistentStorageAvailable(); } catch (e) { __contactsPersistOk = false; }
    }
    return __contactsPersistOk;
  };

  const markContactsSaving = () => {
    try {
      if (!getContactsPersistOk()) setContactsSaveIndicator("unavailable");
      else setContactsSaveIndicator("saving");
    } catch (e) {}
  };

  const scheduleContactsSync = () => {
    try { clearTimeout(window.__contactsSyncTO); } catch (e) {}
    window.__contactsSyncTO = setTimeout(() => {
      try { syncHealthContactsFromUI(); } catch (e) {}
      // syncHealthContactsFromUI met déjà l'indicateur en unavailable si la persistance échoue.
      try {
        if (!getContactsPersistOk()) setContactsSaveIndicator("unavailable");
        else setContactsSaveIndicator("saved");
      } catch (e) {}
    }, 140);
  };

  const bindContact = (id, kind, field) => {
    const el = $(id);
    if (!el) return;
    const onAny = () => {
      markContactsSaving();
      scheduleContactsSync();
    };
    try { el.addEventListener("input", onAny); } catch (e) {}
    try { el.addEventListener("change", onAny); } catch (e) {}
    try { el.addEventListener("blur", onAny); } catch (e) {}
  };


// v0.6.65 — Détection auto-remplissage navigateur (sans événement "input")
  const startHealthContactsAutofillWatcher = () => {
    try {
      const ids = ["doctorName","doctorPhone","doctorAddress","pharmacyName","pharmacyPhone","pharmacyAddress"];
      const els = ids.map(id => $(id)).filter(Boolean);
      if (!els.length) return;

      // v0.6.72 — centralise la détection + évite les sauvegardes trop fréquentes (autofill silencieux)
      // Source de vérité : valeur visible des champs.
      if (typeof window.__hcLast === "undefined") window.__hcLast = null;

      const snapshot = () => ids.map(id => {
        const el = $(id);
        return el ? String(el.value || "").trim() : "";
      }).join("\u241F"); // séparateur improbable

      // Petite temporisation + 2e passe (certains navigateurs appliquent l’autoremplissage en deux temps)
      const scheduleSync = () => {
        try { clearTimeout(window.__hcSyncTO); } catch (e) {}
        try { clearTimeout(window.__hcSyncTO2); } catch (e) {}
        window.__hcSyncTO = setTimeout(() => {
          try { markContactsSaving(); } catch (e) {}
          try { syncHealthContactsFromUI(); } catch (e) {}
        }, 90);
        window.__hcSyncTO2 = setTimeout(() => {
          try { markContactsSaving(); } catch (e) {}
          try { syncHealthContactsFromUI(); } catch (e) {}
        }, 520);
      };

      const check = () => {
        try {
          const snap = snapshot();
          if (snap === window.__hcLast) return;
          window.__hcLast = snap;
          scheduleSync();
        } catch (e) {}
      };

      // 1) au démarrage (Safari/Chrome peuvent remplir sans "input")
      setTimeout(check, 150);
      setTimeout(check, 650);
      setTimeout(check, 1650);

      // 2) écouteurs complémentaires (autofill "change"/"blur")
      els.forEach(el => {
        try { el.addEventListener("change", check); } catch (e) {}
        try { el.addEventListener("blur", check); } catch (e) {}
        try { el.addEventListener("focus", () => { setTimeout(check, 120); setTimeout(check, 420); }); } catch (e) {}
      });

      // 3) polling léger (sécurise les cas silencieux)
      try {
        if (window.__hcAutofillTimer) clearInterval(window.__hcAutofillTimer);
      } catch (e) {}
      window.__hcAutofillTimer = setInterval(() => {
        if (document && document.hidden) return;
        check();
      }, 900);

      // v0.6.74 — certains navigateurs valident l’autoremplissage via une sélection UI
      // sans déclencher d’événement sur l’input. On force une vérification après interaction globale.
      try {
        if (!window.__hcPointerHooked) {
          window.__hcPointerHooked = true;
          const onGlobal = () => {
            try { setTimeout(check, 60); } catch (e) {}
            try { setTimeout(check, 260); } catch (e) {}
          };
          try { document.addEventListener("pointerdown", onGlobal, true); } catch (e) {}
          try { document.addEventListener("touchstart", onGlobal, true); } catch (e) {}
          try { document.addEventListener("mousedown", onGlobal, true); } catch (e) {}
        }
      } catch (e) {}

      // 4) quand l’onglet change de visibilité
      try {
        if (!window.__hcVisibilityHooked) {
          window.__hcVisibilityHooked = true;
          document.addEventListener("visibilitychange", () => {
            try {
              if (document.hidden) {
                // Sauvegarde de sécurité avant mise en arrière-plan
                syncHealthContactsFromUI();
              } else {
                check();
              }
            } catch (e) {}
          });
        }
      } catch (e) {}

      
      // v0.6.67 — détection autofill WebKit (Safari/Chrome) via animationstart
      try {
        if (!window.__hcAnimHooked) {
          window.__hcAnimHooked = true;
          document.addEventListener("animationstart", (ev) => {
            try {
              if (ev && ev.animationName === "boussoleAutofill") {
                setTimeout(check, 0);
              }
            } catch (e) {}
          }, true);
        }
      } catch (e) {}

// v0.6.66 — sauvegarde de sécurité quand la page se ferme / bascule (Safari iOS)
      try {
        if (!window.__hcExitHooked) {
          window.__hcExitHooked = true;
          window.addEventListener("pagehide", () => { try { syncHealthContactsFromUI(); } catch (e) {} }, { capture: true });
          window.addEventListener("beforeunload", () => { try { syncHealthContactsFromUI(); } catch (e) {} }, { capture: true });
        }
      } catch (e) {}

      // v0.6.75 — quand l'app revient au premier plan (focus / pageshow), on re-check
      // (Safari iOS + bfcache + autofill silencieux après retour).
      try {
        if (!window.__hcFocusHooked) {
          window.__hcFocusHooked = true;
          window.addEventListener("focus", () => { try { check(); } catch (e) {} }, { capture: true });
          window.addEventListener("pageshow", () => { try { check(); } catch (e) {} }, { capture: true });
        }
      } catch (e) {}

    } catch (e) {}
  };

// v0.5.90 — Masque téléphone FR (évite les erreurs)
  const formatFrPhone = (raw) => normalizeFrPhone(raw);

  const bindPhoneContact = (id, kind, field) => {
    const el = $(id);
    if (!el) return;
    const apply = () => {
      const formatted = formatFrPhone(el.value);
      el.value = formatted;
      // v0.6.81 — même logique : l'UI reste source de vérité, et on debounce la persistance
      try { markContactsSaving(); } catch (e) {}
      try { scheduleContactsSync(); } catch (e) {}
    };
    el.addEventListener("input", apply);
    el.addEventListener("blur", apply);
    try { el.addEventListener("change", apply); } catch (e) {}
  };
  bindContact("doctorName", "doctor", "name");
  bindPhoneContact("doctorPhone", "doctor", "phone");
  bindContact("doctorAddress", "doctor", "address");
  bindContact("pharmacyName", "pharmacy", "name");
  bindPhoneContact("pharmacyPhone", "pharmacy", "phone");
  bindContact("pharmacyAddress", "pharmacy", "address");

  try { startHealthContactsAutofillWatcher(); } catch (e) {}


  // v0.6.80 — Persistance contacts : auto-save + indicateur discret (sans bouton "Enregistrer")
  const updateContactsSaveState = (state) => {
    try {
      // v0.6.81 — évite de reprober localStorage à chaque frappe : on s'aligne sur le cache getContactsPersistOk().
      if (typeof getContactsPersistOk === 'function' && !getContactsPersistOk()) { setContactsSaveIndicator("unavailable"); return; }
      setContactsSaveIndicator(state || "saved");
    } catch (e) {}
  };

  // État initial : si stockage indisponible, on l'affiche tout de suite. Sinon, on reste discret tant que rien n'a été saisi.
  try {
    const anyFilled = ["doctorName","doctorPhone","doctorAddress","pharmacyName","pharmacyPhone","pharmacyAddress"]
      .some(id => { const el = $(id); return el && String(el.value || "").trim().length > 0; });
    if (typeof getContactsPersistOk === 'function' && !getContactsPersistOk()) updateContactsSaveState("unavailable");
    else if (anyFilled) updateContactsSaveState("saved");
    else setContactsSaveIndicator("hidden");
  } catch (e) {}

  // Compat : si un ancien bouton existe encore (HTML cached), on le cache mais on garde le handler.
  const saveContactsFromUI = () => {
    try { syncHealthContactsFromUI(); } catch (e) {}
    updateContactsSaveState("saved");
  };
  const btnSaveContacts = $("btnSaveContacts");
  if (btnSaveContacts) {
    try { btnSaveContacts.style.display = "none"; } catch (e) {}
    try { btnSaveContacts.addEventListener("click", saveContactsFromUI); } catch (e) {}
  }
const btnLookupDoctor = $("btnLookupDoctor");
  if (btnLookupDoctor) btnLookupDoctor.addEventListener("click", () => openContactsModal("doctor"));
  const btnLookupPharmacy = $("btnLookupPharmacy");
  if (btnLookupPharmacy) btnLookupPharmacy.addEventListener("click", () => openContactsModal("pharmacy"));
  const btnCopyDoctor = $("btnCopyDoctor");
  if (btnCopyDoctor) btnCopyDoctor.addEventListener("click", async () => {
    try { await copyHealthContactBlock("doctor", btnCopyDoctor); } catch (e) { showAppMessage("Erreur copie.", true); }
  });
  const btnCopyPharmacy = $("btnCopyPharmacy");
  if (btnCopyPharmacy) btnCopyPharmacy.addEventListener("click", async () => {
    try { await copyHealthContactBlock("pharmacy", btnCopyPharmacy); } catch (e) { showAppMessage("Erreur copie.", true); }
  });

  const btnAsClose = $("btnAsClose");
  if (btnAsClose) btnAsClose.addEventListener("click", closeContactsModal);
  const contactsModal = $("contactsModal");
  if (contactsModal) contactsModal.addEventListener("click", (ev) => { if (ev.target === contactsModal) closeContactsModal(); });

  const btnAsDoc = $("btnOpenAsKey");
  if (btnAsDoc) btnAsDoc.addEventListener("click", () => { try { window.open(AS_DOC_URL, "_blank", "noopener"); } catch (e) {} });

  const asKey = $("asApiKey");
  if (asKey) asKey.addEventListener("input", () => setAsApiKey(asKey.value));

  const tabDoc = $("contactsTabDoctor");
  const tabPh = $("contactsTabPharmacy");
  if (tabDoc) tabDoc.addEventListener("click", () => { setAsMode("doctor"); setAsStatus("Prêt."); clearAsResults(); });
  if (tabPh) tabPh.addEventListener("click", () => { setAsMode("pharmacy"); setAsStatus("Prêt."); clearAsResults(); });

  const btnAsSearch = $("btnAsSearch");
  if (btnAsSearch) btnAsSearch.addEventListener("click", asSearch);

  const qName = $("asQueryName");
  const qCity = $("asQueryCity");
  const qPostal = $("asQueryPostal");
  const onEnter = (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      asSearch();
    }
  };
  if (qName) qName.addEventListener("keydown", onEnter);
  if (qCity) qCity.addEventListener("keydown", onEnter);
  if (qPostal) qPostal.addEventListener("keydown", onEnter);

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      const m = $("contactsModal");
      if (m && m.style.display === "flex") closeContactsModal();
    }
  });

  // Sync initial
  syncHealthContactsUI();

  syncExtraSettingsUI();
  syncTwiceDailySettingsUI();
  updateSlotToggleUI();
  loadOrResetTodayForSelectedSlot();
  syncImportUI();

  // v0.5.26 — Restaurer le dernier onglet (si des réglages existent déjà)
  try {
    if (hasAnySavedSettings()) {
      const last = safeStorageGet(LS_KEYS.uiLastTab);
      if (last && ["today","evolution","pdf","settings"].includes(last)) {
        const curBtn = document.querySelector(".tab.is-active");
        const cur = (curBtn && curBtn.dataset) ? curBtn.dataset.tab : "today";
        if (last !== cur) {
          setTab(last);
          if (last === "evolution") renderEvolution();
          if (last === "pdf") renderPdfPreview();
          if (last === "settings") { syncDiagToggle(); syncExtraSettingsUI(); syncHealthContactsUI(); syncImportUI(); syncErrorsIndicator(); }
        }
      }
    }
  } catch (e) {}

  // Réglages : relancer l’assistant de démarrage
  const btnRestartStarter = $("btnRestartStarter");
  if (btnRestartStarter) btnRestartStarter.addEventListener("click", () => {
    if (confirm("Relancer l’assistant de démarrage ? (Tes données restent intactes ; seuls les réglages peuvent changer.)")) {
      openStarterModal();
    }
  });

  // Réglages : réinitialiser uniquement les réglages (sans toucher aux entrées)
  const btnResetSettings = $("btnResetSettings");
  if (btnResetSettings) btnResetSettings.addEventListener("click", () => {
    const msg = "Réinitialiser uniquement les réglages ?\n\nTes entrées restent intactes. Cela remet à zéro :\n— les curseurs optionnels\n— le mode diagnostic (inclure données = OFF)\n\nEnsuite, l’assistant de démarrage se relance.";
    if (!confirm(msg)) return;
    resetOnlySettings();
    // Met à jour l'UI immédiatement
    syncDiagToggle();
    syncExtraSettingsUI();
    renderEvolution();
    // Relance l'assistant (comme au 1er lancement)
    openStarterModal();
  });

  // Assistant de démarrage (1er lancement)
  const stCovid = $("starterCovid");
  const stSimple = $("starterSimple");
  const stCustom = $("starterCustom");
  if (stCovid) stCovid.addEventListener("click", () => { applyPresetCovidLong(); closeStarterModal(); });
  if (stSimple) stSimple.addEventListener("click", () => { applyPresetSimple(); closeStarterModal(); });
  if (stCustom) stCustom.addEventListener("click", () => {
    applyPresetSimple(); // crée les réglages (extras OFF) puis ouvre Réglages
    closeStarterModal();
    setTab("settings");
    syncDiagToggle(); syncExtraSettingsUI(); syncImportUI(); syncErrorsIndicator();
  });

  // Lance l'assistant si aucun réglage n'existe encore
  maybeRunStarterWizard();

  $("btnBug").addEventListener("click", openBugEmail);
  $("btnBug2").addEventListener("click", openBugEmail);

  // v0.7.00 — Notes de version (changelog)
  const btnRN = $("btnReleaseNotes");
  if (btnRN) btnRN.addEventListener("click", openReleaseNotesModal);
  const btnRNCopy = $("btnCopyReleaseNotes");
  if (btnRNCopy) btnRNCopy.addEventListener("click", () => { copyReleaseNotesToClipboard(); });
  const btnRNAll = $("btnReleaseNotesAll");
  if (btnRNAll) btnRNAll.addEventListener("click", () => {
    try { closeReleaseNotesModal(); } catch {}
    openReleaseNotesAllModal();
  });
  const btnRNClose = $("btnCloseReleaseNotes");
  if (btnRNClose) btnRNClose.addEventListener("click", closeReleaseNotesModal);
  const rnModal = $("releaseNotesModal");
  if (rnModal) {
    rnModal.addEventListener("click", (ev) => { if (ev && ev.target === rnModal) closeReleaseNotesModal(); });
  }

  const btnRNAllCopy = $("btnCopyReleaseNotesAll");
  if (btnRNAllCopy) btnRNAllCopy.addEventListener("click", () => { copyReleaseNotesAllToClipboard(); });
  const btnRNAllClose = $("btnCloseReleaseNotesAll");
  if (btnRNAllClose) btnRNAllClose.addEventListener("click", closeReleaseNotesAllModal);
  const rnAllModal = $("releaseNotesAllModal");
  if (rnAllModal) rnAllModal.addEventListener("click", (ev) => { if (ev && ev.target === rnAllModal) closeReleaseNotesAllModal(); });

  // v0.7.11 — À propos / Aide
  const btnAbout = $("btnAbout");
  if (btnAbout) btnAbout.addEventListener("click", openAboutModal);
  const btnAboutCopy = $("btnCopyAbout");
  if (btnAboutCopy) btnAboutCopy.addEventListener("click", () => { copyAboutSupportToClipboard(); });
  const btnAboutClose = $("btnCloseAbout");
  if (btnAboutClose) btnAboutClose.addEventListener("click", closeAboutModal);
  const aboutModal = $("aboutModal");
  if (aboutModal) aboutModal.addEventListener("click", (ev) => { if (ev && ev.target === aboutModal) closeAboutModal(); });
  document.addEventListener("keydown", (ev) => {
    try {
      if (ev && ev.key === "Escape") {
        const m = $("releaseNotesModal");
        if (m && m.style.display === "flex") closeReleaseNotesModal();
        const ma = $("releaseNotesAllModal");
        if (ma && ma.style.display === "flex") closeReleaseNotesAllModal();
        const sh = $("sliderHelpModal");
        if (sh && sh.style.display === "flex") closeSliderHelpModal();
        const ab = $("aboutModal");
        if (ab && ab.style.display === "flex") closeAboutModal();
      }
    } catch {}
  });

  // v0.7.03 — Aide : comprendre un curseur (définition courte)
  try {
    document.querySelectorAll(".sliderHelpBtn").forEach((btn) => {
      btn.addEventListener("click", (ev) => {
        try { if (ev) { ev.preventDefault(); ev.stopPropagation(); } } catch {}
        const key = btn.getAttribute("data-help") || "";
        openSliderHelpModal(key);
      });
    });
  } catch {}

  const btnCloseSH = $("btnCloseSliderHelp");
  if (btnCloseSH) btnCloseSH.addEventListener("click", closeSliderHelpModal);
  const shModal = $("sliderHelpModal");
  if (shModal) {
    shModal.addEventListener("click", (ev) => { if (ev && ev.target === shModal) closeSliderHelpModal(); });
  }

  // v0.6.59 — Copier le message “Signaler un problème” (fallback manuel)
  const btnBugCopy = $("btnBugCopy");
  if (btnBugCopy) {
    try { btnBugCopy.setAttribute("data-label0", btnBugCopy.textContent || "Copier"); } catch {}
    btnBugCopy.addEventListener("click", () => { copyBugMessage(btnBugCopy); });
  }
  const btnBugCopy2 = $("btnBugCopy2");
  if (btnBugCopy2) {
    try { btnBugCopy2.setAttribute("data-label0", btnBugCopy2.textContent || "Copier"); } catch {}
    btnBugCopy2.addEventListener("click", () => { copyBugMessage(btnBugCopy2); });
  }

  // v0.5.32 — rappel : si déjà dû, l'afficher à l'ouverture + planifier (best-effort)
  try { showReminderDueIfNeeded(false); } catch {}
  try { scheduleReminderTimer(); } catch {}


  // v0.6.24 — si retour onglet pendant un export PDF : mini message "Reprise…" + forcer "Toujours en cours…" si retour après un long moment
  try {
    document.addEventListener("visibilitychange", () => {
      try {
        if (!__pdfGenerating) { __pdfWasHiddenDuringExport = false; __pdfHiddenAt = 0; return; }
        if (document.hidden) {
          __pdfWasHiddenDuringExport = true;
          __pdfHiddenAt = Date.now();
          return;
        }
        // retour à l’onglet
        if (__pdfWasHiddenDuringExport && __pdfJob && !__pdfJob.cancelled) {
          // v0.6.28 — si l’export est déjà terminé (succès/annulé/erreur), ne pas afficher “Reprise…”
          try {
            if (typeof __pdfLastOutcome !== "undefined" && __pdfLastOutcome && __pdfLastOutcome !== "idle") {
              __pdfWasHiddenDuringExport = false;
              __pdfHiddenAt = 0;
              return;
            }
          } catch {}
          const now = Date.now();
          const awayMs = (__pdfHiddenAt ? (now - __pdfHiddenAt) : 0);

          __pdfWasHiddenDuringExport = false;
          __pdfHiddenAt = 0;

                    // v0.6.27 — au retour onglet pendant export : amener l’utilisateur sur le bloc PDF (scroll doux)
          try { ensurePdfPanelVisibleAndScroll(); } catch {}

// v0.6.25 — au retour onglet : message 'Reprise…' + surligner l’étape en cours (~1 s)
          try { showPdfResumeHint(1000); } catch {}
          try { flashPdfProgress(1000); } catch {}

          // Si l'utilisateur revient après un "long moment" et que l'export tourne toujours :
          // on affiche immédiatement le 2e message rassurant ("Toujours en cours…") pour éviter l'effet freeze.
          if (awayMs >= 4000) {
            try {
              // Annule les timers et force l'état "très lent"
              if (__pdfSlowHintTimer) { clearTimeout(__pdfSlowHintTimer); __pdfSlowHintTimer = null; }
              if (__pdfVerySlowHintTimer) { clearTimeout(__pdfVerySlowHintTimer); __pdfVerySlowHintTimer = null; }
            } catch {}
            try { setPdfSlowHintVisible(false); } catch {}
            try { setPdfVerySlowHintVisible(true); } catch {}
          } else {
            // Sinon, on garde juste le petit feedback "Reprise…"
            // v0.6.25 — déjà géré plus haut (Reprise + flash étape)
          }
        }
      } catch {}
    });
  } catch {}

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  }
}

document.addEventListener("DOMContentLoaded", boot);