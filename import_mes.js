/**
 * import_mes.js — Import Synthèse Médicale Mon Espace Santé
 * Parse le PDF CDA structuré exporté depuis monespacesante.fr
 * 100% local — aucune donnée transmise
 */
window.ImportMES = (function() {
  'use strict';

  // Parse le texte brut extrait du PDF
  function parseSynthese(text) {
    var result = {
      patient: {}, medecin: {}, antecedents: [], antecedentsChir: [],
      facteursRisque: '', pointsVigilance: '', traitements: [], raw: text
    };

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

    // --- Médecin traitant ---
    var medMatch = text.match(/Participant\(s\)\s+([A-ZÀ-Ü\s]+?)(?:\n|M[ée]decin)/i);
    if (medMatch) result.medecin.nom = medMatch[1].trim();
    var medDebutMatch = text.match(/M[ée]decin traitant[\s\S]*?D[ée]but\s+(\d{1,2})\s+(Janvier|F[ée]vrier|Mars|Avril|Mai|Juin|Juillet|Ao[uû]t|Septembre|Octobre|Novembre|D[ée]cembre)\s+(\d{4})/i);
    if (medDebutMatch) {
      var moisMap2 = {janvier:'01',fevrier:'02',février:'02',mars:'03',avril:'04',mai:'05',juin:'06',
        juillet:'07',aout:'08',août:'08',septembre:'09',octobre:'10',novembre:'11',decembre:'12',décembre:'12'};
      result.medecin.depuis = medDebutMatch[3] + '-' + (moisMap2[medDebutMatch[2].toLowerCase()]||'01') + '-' + medDebutMatch[1].padStart(2,'0');
    }
    var orgMatch = text.match(/Organisation\s+(CABINET[^\n]+|CENTRE[^\n]+|MAISON[^\n]+)/i);
    if (orgMatch) result.medecin.organisation = orgMatch[1].trim();
    var auteurMatch = text.match(/Auteur\s+M\s+([A-ZÀ-Ü\s]+?)(?:\n|\d)/i);
    if (auteurMatch && !result.medecin.nom) result.medecin.nom = auteurMatch[1].trim();

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

    // --- Facteurs de risque ---
    var frSection = text.match(/Facteurs de risque\s*\n([\s\S]*?)(?=Points de vigilance|Traitements au long cours|$)/i);
    if (frSection) result.facteursRisque = frSection[1].trim();

    // --- Points de vigilance ---
    var pvSection = text.match(/Points de vigilance\s*\n([\s\S]*?)(?=Traitements au long cours|Traitements\s*\n|$)/i);
    if (pvSection) result.pointsVigilance = pvSection[1].trim();

    // --- Traitements ---
    var trtSection = text.match(/Traitements\s*\n([\s\S]*?)(?=\n\n\n|$)/i);
    if (trtSection) {
      var trtLines = trtSection[1].match(/#\s+(.+?)(?=\n#|\n\n|$)/g) || [];
      trtLines.forEach(function(line) {
        var clean = line.replace(/^#\s+/, '').trim();
        var parts = clean.split(/\s*•\s*/);
        var nomBrut = (parts[0] || '').trim();
        var posologie = (parts[1] || '').trim();
        var dates = (parts[2] || '').trim();

        // Nom + dose
        var doseMatch = nomBrut.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(MG|µG|G|ML|UI)\b/i);
        var nom = doseMatch ? doseMatch[1].trim() : nomBrut.split(/\s+CPR|\s+GEL|\s+SOL|\s+AMP/i)[0].trim();
        var dose = doseMatch ? parseFloat(doseMatch[2].replace(',','.')) : null;
        var unite = doseMatch ? doseMatch[3].toLowerCase() : '';

        // Dates début + fin
        var allDates = dates.match(/(\d{2})\/(\d{2})\/(\d{4})/g) || [];
        var dateDebut = '', dateFin = '';
        if (allDates.length >= 1) {
          var d1 = allDates[0].split('/');
          dateDebut = d1[2]+'-'+d1[1]+'-'+d1[0];
        }
        if (allDates.length >= 2) {
          var d2 = allDates[1].split('/');
          dateFin = d2[2]+'-'+d2[1]+'-'+d2[0];
        }

        // Auto-statut : arrêté si date_fin < aujourd'hui
        var today = new Date().toISOString().split('T')[0];
        var statut = 'actif';
        if (dateFin && dateFin < today) statut = 'arrete';

        // Moment
        var moment = '';
        if (/matin/i.test(posologie)) moment = 'matin';
        else if (/soir|coucher/i.test(posologie)) moment = 'soir';
        else if (/midi/i.test(posologie)) moment = 'midi';

        // Fréquence
        var frequence = '';
        if (/1 fois par jour|1\/j/i.test(posologie+' '+nomBrut)) frequence = '1x/j';
        else if (/2 fois/i.test(posologie)) frequence = '2x/j';
        else if (/si\s/i.test(posologie)) frequence = 'si_besoin';

        result.traitements.push({
          nom: nom, dose: dose, unite: unite, frequence: frequence,
          moment: moment, posologie: posologie, date_debut: dateDebut,
          date_fin: dateFin, statut: statut, categorie: 'medicament'
        });
      });
    }

    return result;
  }

  // Importer les données parsées dans Boussole
  function importerDonnees(parsed, options) {
    var imported = { patient: false, medecin: false, traitements: 0, antecedents: 0 };

    // Patient → Paramètres
    if (options.patient && parsed.patient) {
      var p = parsed.patient;
      if (p.prenom) { var el = document.getElementById('param-prenom'); if (el) el.value = p.prenom; }
      if (p.nom) { var el2 = document.getElementById('param-nom'); if (el2) el2.value = p.nom; }
      if (p.ddn) {
        var pts = p.ddn.split('-');
        var el3 = document.getElementById('param-ddn');
        if (el3) el3.value = pts[2]+'/'+pts[1]+'/'+pts[0];
      }
      if (p.sexe) localStorage.setItem('boussole_genre', p.sexe);
      imported.patient = true;
    }

    // Médecin traitant → localStorage
    if (options.medecin && parsed.medecin && parsed.medecin.nom) {
      localStorage.setItem('boussole_medecin_traitant', JSON.stringify(parsed.medecin));
      imported.medecin = true;
    }

    // Traitements → T-MED (anti-doublon par nom)
    if (options.traitements && parsed.traitements.length && window.Traitements) {
      var existants = window.Traitements.charger();
      parsed.traitements.forEach(function(t) {
        var doublon = existants.some(function(ex) {
          return ex.nom && t.nom && ex.nom.toLowerCase() === t.nom.toLowerCase();
        });
        if (doublon) return;
        var prescr = parsed.medecin && parsed.medecin.nom ? parsed.medecin.nom : '';
        var id = Date.now().toString() + Math.random().toString(36).substr(2, 4);
        var entry = {
          id: id, categorie: t.categorie, nom: t.nom, dci: '',
          dose: t.dose, unite: t.unite, frequence: t.frequence, moment: t.moment,
          date_debut: t.date_debut, statut: t.statut,
          date_statut: t.statut === 'arrete' ? t.date_fin : '',
          raison_statut: t.statut === 'arrete' ? 'Fin de prescription' : '',
          ordonnance: true, prescripteur: prescr,
          objectif: '', paliers: [], effets_indesirables: '',
          effet_global: '', notes: 'Import Mon Espace Sante — ' + t.posologie +
            (t.date_fin ? ' — Fin : ' + t.date_fin : ''),
          _source: 'mes_import'
        };
        var liste = window.Traitements.charger();
        liste.push(entry);
        localStorage.setItem('boussole_traitements', JSON.stringify(liste));
        imported.traitements++;
      });
    }

    // Antécédents + facteurs de risque + points de vigilance → localStorage
    if (options.antecedents) {
      var dossier = {
        antecedents: parsed.antecedents,
        antecedentsChir: parsed.antecedentsChir,
        facteursRisque: parsed.facteursRisque || '',
        pointsVigilance: parsed.pointsVigilance || '',
        dateImport: new Date().toISOString().split('T')[0]
      };
      localStorage.setItem('boussole_dossier_medical', JSON.stringify(dossier));
      imported.antecedents = parsed.antecedents.length + parsed.antecedentsChir.length;
    }

    // Rafraîchir l'affichage dossier médical si visible
    renderDossierMedical();

    return imported;
  }

  // Extraire le texte du PDF via pdf.js
  function extraireTextePDF(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function() {
        var typedArray = new Uint8Array(reader.result);
        if (typeof pdfjsLib === 'undefined') { reject(new Error('pdf.js non charge')); return; }
        pdfjsLib.getDocument(typedArray).promise.then(function(pdf) {
          var pages = []; var total = pdf.numPages;
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

  // --- Affichage dossier médical dans Paramètres ---
  function renderDossierMedical() {
    var container = document.getElementById('dossier-medical-content');
    if (!container) return;

    var dossier = null;
    try { dossier = JSON.parse(localStorage.getItem('boussole_dossier_medical')); } catch(e) {}
    var medecin = null;
    try { medecin = JSON.parse(localStorage.getItem('boussole_medecin_traitant')); } catch(e) {}

    if (!dossier && !medecin) {
      container.innerHTML = '<p style="font-size:13px;color:rgba(6,23,45,.45);margin:0;">Aucune donnee importee. Utilise le bouton ci-dessus pour importer ta Synthese medicale.</p>';
      return;
    }

    var h = '';

    // Médecin traitant
    if (medecin && medecin.nom) {
      h += '<div style="margin-bottom:12px;padding:10px 12px;background:rgba(45,106,79,.06);border-radius:8px;">';
      h += '<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#2d6a4f;margin:0 0 4px;">Medecin traitant</p>';
      h += '<p style="margin:0;font-size:14px;font-weight:600;color:#06172D;">Dr ' + medecin.nom + '</p>';
      if (medecin.organisation) h += '<p style="margin:2px 0 0;font-size:12px;color:rgba(6,23,45,.55);">' + medecin.organisation + '</p>';
      if (medecin.depuis) h += '<p style="margin:2px 0 0;font-size:12px;color:rgba(6,23,45,.45);">Depuis le ' + medecin.depuis + '</p>';
      h += '</div>';
    }

    if (dossier) {
      // Antécédents médicaux
      if (dossier.antecedents && dossier.antecedents.length) {
        h += '<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#06172D;margin:0 0 6px;">Antecedents medicaux</p>';
        dossier.antecedents.forEach(function(a) {
          h += '<p style="margin:0 0 3px;font-size:13px;color:rgba(6,23,45,.72);padding-left:8px;border-left:3px solid #2d6a4f;">'+a.nom+'</p>';
        });
        h += '<div style="height:10px;"></div>';
      }

      // Antécédents chirurgicaux
      if (dossier.antecedentsChir && dossier.antecedentsChir.length) {
        h += '<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#06172D;margin:0 0 6px;">Antecedents chirurgicaux</p>';
        dossier.antecedentsChir.forEach(function(a) {
          h += '<p style="margin:0 0 3px;font-size:13px;color:rgba(6,23,45,.72);padding-left:8px;border-left:3px solid #6b7280;">'+a.nom+'</p>';
        });
        h += '<div style="height:10px;"></div>';
      }

      // Facteurs de risque
      if (dossier.facteursRisque && dossier.facteursRisque !== 'pas d\'information connue') {
        h += '<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#06172D;margin:0 0 4px;">Facteurs de risque</p>';
        h += '<p style="font-size:13px;color:rgba(6,23,45,.72);margin:0 0 10px;">'+dossier.facteursRisque+'</p>';
      }

      // Points de vigilance
      if (dossier.pointsVigilance && dossier.pointsVigilance.length > 2) {
        h += '<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#dc2626;margin:0 0 4px;">Points de vigilance</p>';
        h += '<p style="font-size:13px;color:rgba(6,23,45,.72);margin:0 0 10px;">'+dossier.pointsVigilance+'</p>';
      }

      if (dossier.dateImport) {
        h += '<p style="font-size:11px;color:rgba(6,23,45,.3);margin:8px 0 0;">Importe le ' + dossier.dateImport + '</p>';
      }
    }

    container.innerHTML = h;
  }

  // --- UI : Modale d'import ---
  function ouvrirModale() {
    var overlay = document.getElementById('import-mes-overlay');
    if (overlay) { overlay.classList.add('active'); return; }
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
        '<div id="import-mes-actions" style="display:none;gap:10px;">' +
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
    var dz = document.getElementById('import-mes-dropzone');
    var fi = document.getElementById('import-mes-file');
    dz.addEventListener('click', function() { fi.click(); });
    fi.addEventListener('change', function(e) { if(e.target.files.length) _handleFile(e.target.files[0]); });
    document.getElementById('btn-import-mes-cancel').addEventListener('click', fermerModale);
    document.getElementById('btn-import-mes-confirm').addEventListener('click', _confirmerImport);
  }

  function _handleFile(file) {
    if (!file.name.toLowerCase().endsWith('.pdf')) { alert('Selectionne un fichier PDF.'); return; }
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

    // Médecin
    if (data.medecin && data.medecin.nom) {
      h += '<p style="margin:4px 0;font-size:13px;"><label><input type="checkbox" id="chk-import-medecin" checked style="margin-right:6px;">Medecin traitant : <strong>Dr ' + data.medecin.nom + '</strong>' +
        (data.medecin.organisation ? ' — ' + data.medecin.organisation : '') + '</label></p>';
    }

    // Traitements
    if (data.traitements.length) {
      h += '<div style="margin-top:8px;"><label><input type="checkbox" id="chk-import-traitements" checked style="margin-right:6px;">Traitements (' + data.traitements.length + ')</label>';
      data.traitements.forEach(function(t) {
        var badge = t.statut === 'arrete' ? ' <span style="color:#dc2626;font-size:11px;">(termine)</span>' : '';
        h += '<p style="margin:2px 0 0 22px;font-size:12px;color:rgba(6,23,45,.65);">💊 ' + t.nom + (t.dose ? ' '+t.dose+t.unite : '') + badge + (t.posologie ? ' — '+t.posologie : '') + '</p>';
      });
      h += '</div>';
    }

    // Antécédents
    var allAtcd = data.antecedents.concat(data.antecedentsChir);
    if (allAtcd.length) {
      h += '<div style="margin-top:8px;"><label><input type="checkbox" id="chk-import-antecedents" checked style="margin-right:6px;">Dossier medical (' + allAtcd.length + ' antecedent(s)' +
        (data.facteursRisque ? ' + facteurs de risque' : '') +
        (data.pointsVigilance ? ' + points de vigilance' : '') + ')</label>';
      allAtcd.forEach(function(a) {
        h += '<p style="margin:2px 0 0 22px;font-size:12px;color:rgba(6,23,45,.65);">📋 ' + a.nom + '</p>';
      });
      h += '</div>';
    }

    if (!data.patient.prenom && !data.traitements.length && !allAtcd.length) {
      h += '<p style="color:#dc2626;font-size:13px;">Aucune donnee reconnue. Verifie que c\'est bien une Synthese medicale Mon Espace Sante.</p>';
    }

    h += '</div>';
    preview.innerHTML = h;
    document.getElementById('import-mes-actions').style.display = 'flex';
  }

  function _confirmerImport() {
    if (!_parsedData) return;
    var chk = function(id) { var el = document.getElementById(id); return el ? el.checked : false; };
    var options = {
      patient: chk('chk-import-patient'),
      medecin: chk('chk-import-medecin'),
      traitements: chk('chk-import-traitements'),
      antecedents: chk('chk-import-antecedents')
    };
    var r = importerDonnees(_parsedData, options);
    var msg = 'Import termine !\n';
    if (r.patient) msg += '- Informations patient mises a jour\n';
    if (r.medecin) msg += '- Medecin traitant enregistre\n';
    if (r.traitements) msg += '- ' + r.traitements + ' traitement(s) importe(s)\n';
    if (r.antecedents) msg += '- ' + r.antecedents + ' antecedent(s) + dossier medical enregistre(s)\n';
    if (!r.patient && !r.medecin && !r.traitements && !r.antecedents) msg = 'Aucune donnee importee.';
    alert(msg);
    fermerModale();
    if (window.Traitements) {
      if (typeof window.Traitements.renderListe === 'function') window.Traitements.renderListe();
      if (typeof window.Traitements.renderResumeParametres === 'function') window.Traitements.renderResumeParametres();
    }
  }

  function fermerModale() {
    var ov = document.getElementById('import-mes-overlay');
    if (ov) ov.classList.remove('active');
    _parsedData = null;
  }

  return { ouvrirModale: ouvrirModale, fermerModale: fermerModale, parseSynthese: parseSynthese,
    extraireTextePDF: extraireTextePDF, renderDossierMedical: renderDossierMedical };
})();
