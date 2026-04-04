/**
 * import_mes.js — Import Synthèse Médicale Mon Espace Santé
 * Parse le PDF CDA structuré exporté depuis monespacesante.fr
 * 100% local — aucune donnée transmise
 */
window.ImportMES = (function() {
  'use strict';

  // Parse le texte brut extrait du PDF
  function parseSynthese(text) {
    var result = { patient: {}, antecedents: [], antecedentsChir: [], traitements: [], raw: text };

    // --- Patient ---
    var prenomMatch = text.match(/Pr[ée]nom\s+([A-ZÀ-Ü\s]+?)(?:\n|Nom)/i);
    if (prenomMatch) result.patient.prenom = _titleCase(prenomMatch[1].trim());

    var nomMatch = text.match(/Nom de famille\s+([A-ZÀ-Ü]+)/i);
    if (nomMatch) result.patient.nom = nomMatch[1].trim();

    var ddnMatch = text.match(/Date de naissance\s+(\d{1,2})\s+(Janvier|F[ée]vrier|Mars|Avril|Mai|Juin|Juillet|Ao[uû]t|Septembre|Octobre|Novembre|D[ée]cembre)\s+(\d{4})/i);
    if (ddnMatch) {
      var moisMap = {janvier:'01',fevrier:'02',février:'02',mars:'03',avril:'04',mai:'05',juin:'06',
        juillet:'07',aout:'08',août:'08',septembre:'09',octobre:'10',novembre:'11',decembre:'12',décembre:'12'};
      var m = moisMap[ddnMatch[2].toLowerCase()] || '01';
      result.patient.ddn = ddnMatch[3] + '-' + m + '-' + ddnMatch[1].padStart(2, '0');
    }

    var sexeMatch = text.match(/Sexe\s+(Masculin|F[ée]minin)/i);
    if (sexeMatch) result.patient.sexe = sexeMatch[1].toLowerCase().startsWith('f') ? 'femme' : 'homme';

    // --- Antécédents médicaux ---
    var amSection = text.match(/Ant[ée]c[ée]dents m[ée]dicaux\s*\n([\s\S]*?)(?=Ant[ée]c[ée]dents chirurgicaux|Facteurs de risque|Points de vigilance|$)/i);
    if (amSection) {
      var amLines = amSection[1].match(/#\s+(.+?)(?=\n#|\n\n|$)/g) || [];
      amLines.forEach(function(line) {
        var clean = line.replace(/^#\s+/, '').trim();
        var dfccMatch = clean.match(/\(DFCC\s*:\s*(\d+)\)/);
        var nom = clean.replace(/\(DFCC\s*:\s*\d+\)/, '').replace(/•/g, '—').trim();
        result.antecedents.push({ nom: nom, dfcc: dfccMatch ? dfccMatch[1] : null, type: 'medical' });
      });
    }

    // --- Antécédents chirurgicaux ---
    var acSection = text.match(/Ant[ée]c[ée]dents chirurgicaux\s*\n([\s\S]*?)(?=Facteurs de risque|Points de vigilance|Traitements|$)/i);
    if (acSection) {
      var acLines = acSection[1].match(/#\s+(.+?)(?=\n#|\n\n|$)/g) || [];
      acLines.forEach(function(line) {
        var clean = line.replace(/^#\s+/, '').trim();
        var dfccMatch = clean.match(/\(DFCC\s*:\s*(\d+)\)/);
        var nom = clean.replace(/\(DFCC\s*:\s*\d+\)/, '').replace(/•/g, '—').trim();
        result.antecedentsChir.push({ nom: nom, dfcc: dfccMatch ? dfccMatch[1] : null, type: 'chirurgical' });
      });
    }

    // --- Traitements ---
    var trtSection = text.match(/Traitements\s*\n([\s\S]*?)(?=\n\n\n|$)/i);
    if (trtSection) {
      var trtLines = trtSection[1].match(/#\s+(.+?)(?=\n#|\n\n|$)/g) || [];
      trtLines.forEach(function(line) {
        var clean = line.replace(/^#\s+/, '').trim();
        // Format: NOM DOSEMG FORME QTE • posologie • dates
        var parts = clean.split(/\s*•\s*/);
        var nomBrut = (parts[0] || '').trim();
        var posologie = (parts[1] || '').trim();
        var dates = (parts[2] || '').trim();

        // Extraire nom + dose du bloc nom
        var doseMatch = nomBrut.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(MG|µG|G|ML|UI)\b/i);
        var nom = doseMatch ? doseMatch[1].trim() : nomBrut.split(/\s+CPR|\s+GEL|\s+SOL|\s+AMP/i)[0].trim();
        var dose = doseMatch ? parseFloat(doseMatch[2].replace(',','.')) : null;
        var unite = doseMatch ? doseMatch[3].toLowerCase() : '';

        // Extraire dates
        var dateMatch = dates.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        var dateDebut = dateMatch ? dateMatch[3]+'-'+dateMatch[2]+'-'+dateMatch[1] : '';

        // Extraire moment (matin/soir/coucher)
        var moment = '';
        if (/matin/i.test(posologie)) moment = 'matin';
        else if (/soir|coucher/i.test(posologie)) moment = 'soir';
        else if (/midi/i.test(posologie)) moment = 'midi';

        // Extraire fréquence
        var frequence = '';
        if (/1 fois par jour|1\/j/i.test(posologie+' '+nomBrut)) frequence = '1x/j';
        else if (/2 fois/i.test(posologie)) frequence = '2x/j';
        else if (/si\s/i.test(posologie)) frequence = 'si_besoin';

        result.traitements.push({
          nom: nom, dose: dose, unite: unite, frequence: frequence,
          moment: moment, posologie: posologie, date_debut: dateDebut,
          categorie: 'medicament'
        });
      });
    }

    return result;
  }

  // Importer les données parsées dans Boussole
  function importerDonnees(parsed, options) {
    var imported = { patient: false, traitements: 0, antecedents: 0 };

    // Patient → Paramètres
    if (options.patient && parsed.patient) {
      var p = parsed.patient;
      if (p.prenom) { var el = document.getElementById('param-prenom'); if (el) { el.value = p.prenom; } }
      if (p.nom) { var el2 = document.getElementById('param-nom'); if (el2) { el2.value = p.nom; } }
      if (p.ddn) {
        var parts = p.ddn.split('-');
        var el3 = document.getElementById('param-ddn');
        if (el3) el3.value = parts[2]+'/'+parts[1]+'/'+parts[0];
      }
      if (p.sexe) localStorage.setItem('boussole_genre', p.sexe);
      imported.patient = true;
    }

    // Traitements → T-MED (anti-doublon par nom)
    if (options.traitements && parsed.traitements.length && window.Traitements) {
      var existants = window.Traitements.charger();
      parsed.traitements.forEach(function(t) {
        var doublon = existants.some(function(ex) {
          return ex.nom && t.nom && ex.nom.toLowerCase() === t.nom.toLowerCase();
        });
        if (doublon) return;
        window.Traitements.charger(); // refresh
        var id = Date.now().toString() + Math.random().toString(36).substr(2, 4);
        var entry = {
          id: id, categorie: t.categorie, nom: t.nom, dci: '',
          dose: t.dose, unite: t.unite, frequence: t.frequence, moment: t.moment,
          date_debut: t.date_debut, statut: 'actif', date_statut: '',
          raison_statut: '', ordonnance: true, prescripteur: '',
          objectif: '', paliers: [], effets_indesirables: '',
          effet_global: '', notes: 'Import Mon Espace Sante — ' + t.posologie,
          _source: 'mes_import'
        };
        var liste = window.Traitements.charger();
        liste.push(entry);
        localStorage.setItem('boussole_traitements', JSON.stringify(liste));
        imported.traitements++;
      });
    }

    // Antécédents → localStorage
    if (options.antecedents) {
      var all = parsed.antecedents.concat(parsed.antecedentsChir);
      if (all.length) {
        localStorage.setItem('boussole_antecedents', JSON.stringify(all));
        imported.antecedents = all.length;
      }
    }

    return imported;
  }

  // Extraire le texte du PDF via pdf.js (chargé en CDN)
  function extraireTextePDF(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function() {
        var typedArray = new Uint8Array(reader.result);
        if (typeof pdfjsLib === 'undefined') {
          reject(new Error('pdf.js non charge'));
          return;
        }
        pdfjsLib.getDocument(typedArray).promise.then(function(pdf) {
          var pages = [];
          var total = pdf.numPages;
          function getPage(i) {
            if (i > total) { resolve(pages.join('\n')); return; }
            pdf.getPage(i).then(function(page) {
              page.getTextContent().then(function(content) {
                pages.push(content.items.map(function(item){return item.str;}).join(' '));
                getPage(i + 1);
              });
            });
          }
          getPage(1);
        }).catch(reject);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  function _titleCase(s) {
    return s.toLowerCase().replace(/(?:^|\s)\S/g, function(a){return a.toUpperCase();});
  }

  // --- UI : Modale d'import ---
  function ouvrirModale() {
    var overlay = document.getElementById('import-mes-overlay');
    if (overlay) { overlay.classList.add('active'); return; }
    // Créer la modale dynamiquement
    overlay = document.createElement('div');
    overlay.id = 'import-mes-overlay';
    overlay.className = 'modal-profil-overlay active';
    overlay.innerHTML =
      '<div class="modal-profil" style="max-width:500px;">' +
        '<h3 style="font-size:16px;font-weight:700;color:#06172D;margin:0 0 6px;">Importer depuis Mon Espace Sante</h3>' +
        '<p style="font-size:13px;color:rgba(6,23,45,.55);margin:0 0 16px;line-height:1.4;">Telecharge ta Synthese medicale en PDF depuis <a href="https://www.monespacesante.fr" target="_blank" style="color:#2d6a4f;">monespacesante.fr</a>, puis selectionne le fichier ci-dessous.</p>' +
        '<div style="border:2px dashed rgba(45,106,79,.3);border-radius:12px;padding:20px;text-align:center;margin-bottom:16px;cursor:pointer;" id="import-mes-dropzone">' +
          '<p style="margin:0 0 8px;font-size:24px;" aria-hidden="true">📄</p>' +
          '<p style="margin:0;font-size:14px;color:#06172D;font-weight:600;">Selectionner le PDF</p>' +
          '<p style="margin:4px 0 0;font-size:12px;color:rgba(6,23,45,.45);">Synthese medicale Mon Espace Sante</p>' +
          '<input type="file" accept=".pdf" id="import-mes-file" style="display:none;">' +
        '</div>' +
        '<div id="import-mes-preview" style="display:none;"></div>' +
        '<div id="import-mes-actions" style="display:none;margin-top:12px;display:flex;gap:10px;">' +
          '<button id="btn-import-mes-cancel" style="flex:1;padding:12px;background:none;border:1.5px solid rgba(6,23,45,.2);border-radius:12px;font-size:14px;cursor:pointer;font-family:inherit;">Annuler</button>' +
          '<button id="btn-import-mes-confirm" style="flex:1;padding:12px;background:#2d6a4f;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">Importer</button>' +
        '</div>' +
        '<p style="font-size:11px;color:rgba(6,23,45,.35);margin:12px 0 0;text-align:center;">🔒 Le fichier est lu uniquement sur ton appareil. Rien n\'est transmis.</p>' +
      '</div>';
    document.body.appendChild(overlay);
    _bindEvents();
  }

  var _parsedData = null;

  function _bindEvents() {
    var dropzone = document.getElementById('import-mes-dropzone');
    var fileInput = document.getElementById('import-mes-file');
    dropzone.addEventListener('click', function() { fileInput.click(); });
    fileInput.addEventListener('change', function(e) {
      if (e.target.files.length) _handleFile(e.target.files[0]);
    });
    document.getElementById('btn-import-mes-cancel').addEventListener('click', fermerModale);
    document.getElementById('btn-import-mes-confirm').addEventListener('click', _confirmerImport);
  }

  function _handleFile(file) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Selectionne un fichier PDF.'); return;
    }
    var preview = document.getElementById('import-mes-preview');
    preview.innerHTML = '<p style="text-align:center;color:rgba(6,23,45,.55);font-size:13px;">Lecture en cours...</p>';
    preview.style.display = 'block';

    extraireTextePDF(file).then(function(text) {
      _parsedData = parseSynthese(text);
      _renderPreview(_parsedData);
    }).catch(function(err) {
      preview.innerHTML = '<p style="color:#dc2626;font-size:13px;">Erreur de lecture : ' + err.message + '</p>';
    });
  }

  function _renderPreview(data) {
    var preview = document.getElementById('import-mes-preview');
    var h = '<div style="background:rgba(45,106,79,.05);border-radius:12px;padding:14px;margin-bottom:8px;">';
    h += '<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#2d6a4f;margin:0 0 8px;">Donnees detectees</p>';

    // Patient
    if (data.patient.prenom || data.patient.nom) {
      h += '<p style="margin:0 0 4px;font-size:13px;"><label><input type="checkbox" id="chk-import-patient" checked style="margin-right:6px;">Patient : <strong>' +
        (data.patient.prenom||'') + ' ' + (data.patient.nom||'') + '</strong>' +
        (data.patient.ddn ? ' — ne(e) le ' + data.patient.ddn : '') + '</label></p>';
    }

    // Traitements
    if (data.traitements.length) {
      h += '<div style="margin-top:8px;"><label><input type="checkbox" id="chk-import-traitements" checked style="margin-right:6px;">Traitements (' + data.traitements.length + ')</label>';
      data.traitements.forEach(function(t) {
        h += '<p style="margin:2px 0 0 22px;font-size:12px;color:rgba(6,23,45,.65);">💊 ' + t.nom + (t.dose ? ' '+t.dose+t.unite : '') + (t.posologie ? ' — '+t.posologie : '') + '</p>';
      });
      h += '</div>';
    }

    // Antécédents
    var allAtcd = data.antecedents.concat(data.antecedentsChir);
    if (allAtcd.length) {
      h += '<div style="margin-top:8px;"><label><input type="checkbox" id="chk-import-antecedents" checked style="margin-right:6px;">Antecedents (' + allAtcd.length + ')</label>';
      allAtcd.forEach(function(a) {
        h += '<p style="margin:2px 0 0 22px;font-size:12px;color:rgba(6,23,45,.65);">📋 ' + a.nom + '</p>';
      });
      h += '</div>';
    }

    if (!data.patient.prenom && !data.traitements.length && !allAtcd.length) {
      h += '<p style="color:#dc2626;font-size:13px;">Aucune donnee reconnue dans ce PDF. Verifie que c\'est bien une Synthese medicale Mon Espace Sante.</p>';
    }

    h += '</div>';
    preview.innerHTML = h;
    document.getElementById('import-mes-actions').style.display = 'flex';
  }

  function _confirmerImport() {
    if (!_parsedData) return;
    var options = {
      patient: document.getElementById('chk-import-patient') ? document.getElementById('chk-import-patient').checked : false,
      traitements: document.getElementById('chk-import-traitements') ? document.getElementById('chk-import-traitements').checked : false,
      antecedents: document.getElementById('chk-import-antecedents') ? document.getElementById('chk-import-antecedents').checked : false
    };
    var result = importerDonnees(_parsedData, options);
    var msg = 'Import termine !\n';
    if (result.patient) msg += '- Informations patient mises a jour\n';
    if (result.traitements) msg += '- ' + result.traitements + ' traitement(s) importe(s)\n';
    if (result.antecedents) msg += '- ' + result.antecedents + ' antecedent(s) enregistre(s)\n';
    if (!result.patient && !result.traitements && !result.antecedents) msg = 'Aucune donnee importee (deja existantes ou non selectionnees).';
    alert(msg);
    fermerModale();
    // Rafraîchir les listes si visibles
    if (window.Traitements && typeof window.Traitements.renderListe === 'function') window.Traitements.renderListe();
    if (window.Traitements && typeof window.Traitements.renderResumeParametres === 'function') window.Traitements.renderResumeParametres();
  }

  function fermerModale() {
    var overlay = document.getElementById('import-mes-overlay');
    if (overlay) overlay.classList.remove('active');
    _parsedData = null;
  }

  // --- Public API ---
  return { ouvrirModale: ouvrirModale, fermerModale: fermerModale, parseSynthese: parseSynthese, extraireTextePDF: extraireTextePDF };
})();
