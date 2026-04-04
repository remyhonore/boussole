/**
 * traitements.js — Feature T-Med : Médicaments & Compléments codifiés
 * Schéma : { id, categorie, nom, dci, dose, unite, frequence, moment,
 *            date_debut, statut, date_statut, raison_statut, ordonnance,
 *            prescripteur, objectif, paliers[], effets_indesirables,
 *            effet_global, notes }
 */
window.Traitements = (function () {
  var STORAGE_KEY = 'boussole_traitements';

  function charger() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch (e) { return []; }
  }
  function sauvegarder(l) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(l)); } catch (e) {}
  }
  function upsert(data) {
    var l = charger();
    if (data.id) {
      var idx = l.findIndex(function(t){return t.id===data.id;});
      if (idx>=0){l[idx]=data;}else{l.push(data);}
    } else { data.id=Date.now().toString(); l.push(data); }
    sauvegarder(l); return data.id;
  }
  function supprimer(id){sauvegarder(charger().filter(function(t){return t.id!==id;}));}

  function migrerEssais() {
    if (localStorage.getItem('boussole_essais_migrated_v2')) return;
    var essais=[];
    try{essais=JSON.parse(localStorage.getItem('boussole_essais')||'[]');}catch(e){}
    if (essais.length) {
      var ex=charger();
      essais.forEach(function(e){
        if(ex.some(function(t){return t._essai_id===e.id;}))return;
        ex.push({id:'ess_'+(e.id||Date.now()),_essai_id:e.id,
          categorie:e.type==='Médicament'?'medicament':'complement',
          nom:e.nom||'',dci:'',dose:null,unite:'',frequence:'',moment:'',
          date_debut:e.date_debut||'',statut:e.arret==='Oui'?'arrete':'actif',
          date_statut:e.date_debut||'',raison_statut:e.raison_arret||'',
          ordonnance:false,prescripteur:'',objectif:e.objectif||'',
          paliers:[],effets_indesirables:'',effet_global:e.effet||'',notes:''});
      });
      sauvegarder(ex);
    }
    localStorage.setItem('boussole_essais_migrated_v2','1');
  }

  function _labelStatut(s){return{actif:'En cours',pause:'Pause',arrete:'Arrêté'}[s]||s;}
  function _couleurStatut(s){return{actif:'#2d6a4f',pause:'#f59e0b',arrete:'#dc2626'}[s]||'#6b7280';}
  function _labelCategorie(c){return{medicament:'💊 Médicament',complement:'🌿 Complément',strategie:'⚡ Stratégie'}[c]||c;}
  function _dosageStr(t){
    var s='';
    if(t.dose)s+=t.dose;
    if(t.unite)s+=' '+t.unite;
    if(t.frequence)s+=' · '+t.frequence;
    if(t.moment)s+=' ('+t.moment+')';
    return s;
  }

  function _joursDepuis(d){if(!d)return null;var diff=Math.floor((Date.now()-new Date(d+'T12:00:00'))/86400000);return diff>=0?diff:null;}
  function _localDateStr(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function _formatDateFr(s){if(!s)return'';var p=s.split('-');return p[2]+'/'+p[1]+'/'+p[0];}
  function _getVal(id){var el=document.getElementById(id);return el?el.value.trim():'';}

  function renderListe() {
    var container=document.getElementById('traitements-list');
    if(!container)return;
    var liste=charger().slice().sort(function(a,b){
      var o={actif:0,pause:1,arrete:2};
      var d=(o[a.statut]||0)-(o[b.statut]||0);
      if(d!==0)return d;
      return(b.date_debut||'').localeCompare(a.date_debut||'');
    });
    if(!liste.length){
      container.innerHTML='<p style="color:#9ca3af;font-size:14px;font-style:italic;margin:8px 0 0;">Aucun traitement enregistré.</p>';return;
    }
    var html='';
    liste.forEach(function(t){
      var col=_couleurStatut(t.statut);
      var dosage=_dosageStr(t);
      var jours=_joursDepuis(t.date_debut);
      var duree=jours!==null?(jours===0?'Aujourd\'hui':jours+' j.'):'';
      html+='<div style="border-left:3px solid '+col+';border-radius:8px;padding:10px 12px;margin-bottom:10px;background:#fafafa;">';
      html+='<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:4px;">';
      html+='<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">';
      html+='<strong style="font-size:14px;color:#06172D;">'+t.nom+'</strong>';
      if(t.dci&&t.dci!==t.nom)html+='<span style="font-size:11px;color:#6b7280;font-style:italic;">('+t.dci+')</span>';
      html+='<span style="font-size:11px;padding:2px 8px;border-radius:12px;background:'+col+'20;color:'+col+';font-weight:600;">'+_labelStatut(t.statut)+'</span>';
      html+='</div><div style="display:flex;gap:6px;">';
      html+='<button onclick="Traitements.ouvrirModale(\''+t.id+'\')" style="background:none;border:1px solid #6E877D;color:#6E877D;border-radius:8px;padding:3px 10px;font-size:12px;cursor:pointer;">Modifier</button>';
      html+='<button onclick="Traitements.confirmerSuppression(\''+t.id+'\')" style="background:none;border:1px solid #dc2626;color:#dc2626;border-radius:6px;padding:3px 10px;font-size:12px;cursor:pointer;">Supprimer</button>';
      html+='</div></div>';
      if(dosage)html+='<div style="font-size:13px;color:#374151;margin-bottom:2px;">'+dosage+'</div>';
      if(t.objectif)html+='<div style="font-size:12px;color:#6b7280;margin-bottom:2px;">Objectif : '+t.objectif+'</div>';
      if(t.effets_indesirables)html+='<div style="font-size:12px;color:#dc2626;margin-bottom:2px;">⚠️ '+t.effets_indesirables+'</div>';
      html+='<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;font-size:11px;color:#9ca3af;">';
      html+='<span>'+_labelCategorie(t.categorie)+'</span>';
      if(t.date_debut)html+='<span>Depuis le '+_formatDateFr(t.date_debut)+(duree?' · '+duree:'')+'</span>';
      if(t.prescripteur)html+='<span>Prescrit par '+t.prescripteur+'</span>';
      if(t.ordonnance)html+='<span>📋 Ordonnance</span>';
      html+='</div>';
      if(t.paliers&&t.paliers.length>1){
        html+='<details style="margin-top:8px;"><summary style="font-size:11px;color:#6b7280;cursor:pointer;">Historique doses ('+t.paliers.length+' paliers)</summary>';
        html+='<div style="margin-top:6px;border-left:2px solid #e5e7eb;padding-left:10px;">';
        t.paliers.forEach(function(p,i){
          var act=i===t.paliers.length-1;
          html+='<div style="font-size:11px;color:'+(act?'#2d6a4f':'#9ca3af')+';padding:2px 0;">';
          html+=_formatDateFr(p.date_debut)+(p.date_fin?' → '+_formatDateFr(p.date_fin):' → auj.')+' : <strong>'+p.dose+' '+p.unite+'</strong>';
          if(act)html+=' <span style="color:#2d6a4f;font-weight:600;">(actuel)</span>';
          html+='</div>';
        });
        html+='</div></details>';
      }
      html+='</div>';
    });
    container.innerHTML=html;
  }

  function _renderPaliers(){
    var c=document.getElementById('trt-paliers-list');
    if(!c)return;
    var p=window._traitementPaliers||[];
    if(!p.length){c.innerHTML='<p style="font-size:12px;color:#9ca3af;margin:4px 0;">Aucun palier. Le dosage actuel sera créé automatiquement.</p>';return;}
    var h='';
    p.forEach(function(pal,i){
      var act=!pal.date_fin;
      h+='<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #f3f4f6;font-size:12px;">';
      h+='<span style="color:'+(act?'#2d6a4f':'#9ca3af')+';flex:1;">';
      h+=_formatDateFr(pal.date_debut)+(pal.date_fin?' → '+_formatDateFr(pal.date_fin):' → aujourd\'hui')+' : <strong>'+pal.dose+' '+pal.unite+'</strong>';
      if(act)h+=' <span style="color:#2d6a4f;font-weight:600;">(actuel)</span>';
      h+='</span><button onclick="Traitements._supprimerPalier('+i+')" style="background:none;border:none;color:#dc2626;font-size:14px;cursor:pointer;padding:0 4px;" title="Supprimer">×</button></div>';
    });
    c.innerHTML=h;
  }

  function _supprimerPalier(idx){
    if(!window._traitementPaliers)return;
    window._traitementPaliers.splice(idx,1);
    if(window._traitementPaliers.length>0)window._traitementPaliers[window._traitementPaliers.length-1].date_fin=null;
    _renderPaliers();
  }
  function ajouterPalier(){
    var dose=parseFloat(document.getElementById('trt-palier-dose').value);
    var unite=document.getElementById('trt-palier-unite').value||_getVal('trt-unite')||'mg';
    var dateDebut=document.getElementById('trt-palier-date').value;
    if(!dose||!dateDebut){alert('Renseigne la dose et la date du nouveau palier.');return;}
    var p=window._traitementPaliers||[];
    if(p.length>0)p[p.length-1].date_fin=dateDebut;
    p.push({dose:dose,unite:unite,date_debut:dateDebut,date_fin:null});
    window._traitementPaliers=p;
    document.getElementById('trt-palier-dose').value='';
    document.getElementById('trt-palier-date').value='';
    _renderPaliers();
  }
  function _toggleRaisonStatut(v){
    var w1=document.getElementById('trt-raison-statut-wrap');
    var w2=document.getElementById('trt-date-statut-wrap');
    if(w1)w1.style.display=v?'block':'none';
    if(w2)w2.style.display=v?'block':'none';
  }

  /**
   * Parser regex pour saisie rapide en ligne libre
   * Formats reconnus :
   *   "Brintellix 20mg 1/j matin"
   *   "Magnésium bisglycinate 300 mg 2x/j soir"
   *   "Nicotine 7mg transdermique"
   *   "Créatine 3g"
   */
  function parseTraitement(input) {
    if (!input || !input.trim()) return null;
    var s = input.trim();
    var result = { nom: '', dose: null, unite: 'mg', frequence: '', moment: '', categorie: 'medicament' };

    // Extraire dose + unité : "20mg", "300 mg", "3g", "7 µg", "5000 UI", "2 cp"
    var doseMatch = s.match(/(\d+(?:[.,]\d+)?)\s*(mg|µg|g|ml|ui|cp|gouttes|%)/i);
    if (doseMatch) {
      result.dose = parseFloat(doseMatch[1].replace(',', '.'));
      var u = doseMatch[2].toLowerCase();
      if (u === 'ui') u = 'UI';
      result.unite = u;
      s = s.replace(doseMatch[0], ' ').trim();
    }

    // Extraire fréquence : "1/j", "2x/j", "3x/jour", "1x/j", "si besoin", "hebdo"
    var freqMatch = s.match(/(\d+x?\/j(?:our)?|si\s+besoin|hebdo(?:madaire)?|sem)/i);
    if (freqMatch) {
      var f = freqMatch[1].toLowerCase();
      if (/^1x?\/j/.test(f)) result.frequence = '1x/j';
      else if (/^2x?\/j/.test(f)) result.frequence = '2x/j';
      else if (/^3x?\/j/.test(f)) result.frequence = '3x/j';
      else if (/si\s+besoin/.test(f)) result.frequence = 'si besoin';
      else if (/hebdo|sem/.test(f)) result.frequence = 'sem';
      else result.frequence = freqMatch[1];
      s = s.replace(freqMatch[0], ' ').trim();
    }

    // Extraire moment : matin, midi, soir, coucher, au coucher, le matin
    var momentMatch = s.match(/(?:le\s+|au\s+)?(matin|midi|soir|coucher)/i);
    if (momentMatch) {
      result.moment = momentMatch[1].toLowerCase();
      s = s.replace(momentMatch[0], ' ').trim();
    }

    // Extraire mots-clés complément
    var compKeywords = /\b(magnésium|magnesium|vitamine|zinc|fer|omega|oméga|créatine|creatine|choline|taurine|tyrosine|whey|probiotique|curcumine|ashwagandha|rhodiola|coq10|nad|nmn|bisglycinate|malate|citrate|glycinate|collagène|spiruline|chlorelle|psyllium|inuline|berbérine|berberine|melatonine|mélatonine)\b/i;
    if (compKeywords.test(input)) {
      result.categorie = 'complement';
    }

    // Le reste = nom (nettoyer espaces multiples)
    result.nom = s.replace(/\s{2,}/g, ' ').trim();

    // Si le nom est vide mais on avait une dose, reprendre l'input original comme nom
    if (!result.nom && result.dose !== null) {
      result.nom = input.trim().replace(/\s{2,}/g, ' ');
    }

    return result.nom ? result : null;
  }

  function appliquerParsing() {
    var input = document.getElementById('trt-saisie-rapide');
    if (!input || !input.value.trim()) return;
    var parsed = parseTraitement(input.value);
    if (!parsed) return;

    // Remplir les champs de la modale
    var setVal = function(id, val) { var el = document.getElementById(id); if (el && val) el.value = val; };
    setVal('trt-nom', parsed.nom);
    if (parsed.dose) setVal('trt-dose', parsed.dose);
    setVal('trt-unite', parsed.unite);
    if (parsed.frequence) setVal('trt-frequence', parsed.frequence);
    if (parsed.moment) setVal('trt-moment', parsed.moment);

    // Catégorie via chips
    document.querySelectorAll('#trt-chips-categorie .trt-chip').forEach(function(c) {
      c.classList.toggle('trt-chip--active', c.dataset.val === parsed.categorie);
    });

    // Feedback visuel
    input.value = '';
    input.placeholder = '✓ Champs pré-remplis — vérifie et ajuste si besoin';
    setTimeout(function() { input.placeholder = 'Ex : Brintellix 20mg 1/j matin'; }, 3000);

    // Focus sur le premier champ vide important
    if (!parsed.dose) { var d = document.getElementById('trt-dose'); if (d) d.focus(); }
    else if (!parsed.frequence) { var f = document.getElementById('trt-frequence'); if (f) f.focus(); }
    else { var n = document.getElementById('trt-nom'); if (n) n.focus(); }
  }

  function ouvrirModale(id) {
    var modal=document.getElementById('modal-traitement');
    if(!modal)return;
    var today=_localDateStr(new Date());
    var t=id?charger().find(function(x){return x.id===id;}):null;
    modal.dataset.editId=id||'';
    window._traitementPaliers=t?(t.paliers||[]):[];
    _renderPaliers();
    var champs={
      'trt-nom':t&&t.nom||'','trt-dci':t&&t.dci||'',
      'trt-dose':t&&t.dose||'','trt-unite':t&&t.unite||'mg',
      'trt-frequence':t&&t.frequence||'1x/j','trt-moment':t&&t.moment||'',
      'trt-date-debut':t&&t.date_debut||today,'trt-date-statut':t&&t.date_statut||today,
      'trt-raison-statut':t&&t.raison_statut||'','trt-prescripteur':t&&t.prescripteur||'',
      'trt-objectif':t&&t.objectif||'','trt-effets':t&&t.effets_indesirables||'',
      'trt-effet-global':t&&t.effet_global||'','trt-notes':t&&t.notes||''
    };
    Object.keys(champs).forEach(function(k){var el=document.getElementById(k);if(el)el.value=champs[k];});
    document.querySelectorAll('#trt-chips-categorie .trt-chip').forEach(function(c){
      c.classList.toggle('trt-chip--active',c.dataset.val===(t?t.categorie:'medicament'));
    });
    document.querySelectorAll('#trt-chips-statut .trt-chip').forEach(function(c){
      c.classList.toggle('trt-chip--active',c.dataset.val===(t?t.statut:'actif'));
    });
    var tog=document.getElementById('trt-ordonnance');
    if(tog)tog.checked=t?!!t.ordonnance:false;
    _toggleRaisonStatut((t?t.statut:'actif')!=='actif');
    var titre=document.getElementById('trt-modal-title');
    if(titre)titre.textContent=id?'Modifier le traitement':'Nouveau traitement';
    modal.style.display='flex';
    setTimeout(function(){var n=document.getElementById('trt-nom');if(n)n.focus();},100);
  }
  function fermerModale(){var m=document.getElementById('modal-traitement');if(m){m.style.display='none';m.dataset.editId='';}}

  function sauvegarderDepuisModale(){
    var nom=_getVal('trt-nom');
    if(!nom){document.getElementById('trt-nom').focus();return;}
    var modal=document.getElementById('modal-traitement');
    var editId=modal?modal.dataset.editId:'';
    var categorie=(document.querySelector('#trt-chips-categorie .trt-chip--active')||{}).dataset.val||'medicament';
    var statut=(document.querySelector('#trt-chips-statut .trt-chip--active')||{}).dataset.val||'actif';
    var dose=parseFloat(_getVal('trt-dose'))||null;
    var unite=_getVal('trt-unite');
    var dateDebut=_getVal('trt-date-debut');
    var ordonnance=document.getElementById('trt-ordonnance')?document.getElementById('trt-ordonnance').checked:false;
    var paliers=(window._traitementPaliers||[]).slice();
    if(!paliers.length&&dose&&dateDebut){paliers=[{dose:dose,unite:unite||'mg',date_debut:dateDebut,date_fin:null}];}
    else if(paliers.length>0&&dose){var d=paliers[paliers.length-1];if(!d.date_fin){d.dose=dose;d.unite=unite||d.unite;}}
    upsert({id:editId||null,categorie:categorie,nom:nom,dci:_getVal('trt-dci'),
      dose:dose,unite:unite,frequence:_getVal('trt-frequence'),moment:_getVal('trt-moment'),
      date_debut:dateDebut,statut:statut,date_statut:_getVal('trt-date-statut')||dateDebut,
      raison_statut:_getVal('trt-raison-statut'),ordonnance:ordonnance,
      prescripteur:_getVal('trt-prescripteur'),objectif:_getVal('trt-objectif'),
      paliers:paliers,effets_indesirables:_getVal('trt-effets'),
      effet_global:_getVal('trt-effet-global'),notes:_getVal('trt-notes')});
    fermerModale(); renderListe(); renderResumeParametres();
  }
  function confirmerSuppression(id){
    var t=charger().find(function(x){return x.id===id;});
    if(!t)return;
    if(!confirm('Supprimer "'+t.nom+'" ?\nCette action est irréversible.'))return;
    supprimer(id); renderListe(); renderResumeParametres();
  }

  function exportPourPDF(){
    var l=charger();
    if(!l.length)return null;
    function ln(t){
      var s=t.nom;
      if(t.dci&&t.dci!==t.nom)s+=' ('+t.dci+')';
      if(t.dose)s+=' '+t.dose+(t.unite?' '+t.unite:'');
      if(t.frequence)s+=' · '+t.frequence;
      if(t.moment)s+=' le '+t.moment;
      if(t.prescripteur)s+=' ['+t.prescripteur+']';
      if(t.date_debut)s+=' depuis '+_formatDateFr(t.date_debut);
      if(t.effets_indesirables)s+=' — EI : '+t.effets_indesirables;
      return s;
    }
    return{
      actifs:l.filter(function(t){return t.statut==='actif';}).map(ln),
      pauses:l.filter(function(t){return t.statut==='pause';}).map(function(t){return ln(t)+(t.raison_statut?' (pause : '+t.raison_statut+')':'');}),
      arretes:l.filter(function(t){return t.statut==='arrete';}).map(function(t){return ln(t)+(t.raison_statut?' (arrete : '+t.raison_statut+')':'');}),
      raw:l
    };
  }

  function blocHTML(){
    var data=exportPourPDF();
    if(!data)return'';
    var meds=data.raw.filter(function(t){return t.categorie==='medicament'&&t.statut==='actif';});
    var comps=data.raw.filter(function(t){return t.categorie!=='medicament'&&t.statut==='actif';});
    var pauses=data.raw.filter(function(t){return t.statut==='pause';});
    var cutoff90=_localDateStr(new Date(Date.now()-90*86400000));
    var arr90=data.raw.filter(function(t){return t.statut==='arrete'&&(t.date_statut||'')>=cutoff90;});
    function lh(t){
      var s='• '+t.nom;
      if(t.dci&&t.dci!==t.nom)s+=' ('+t.dci+')';
      if(t.dose)s+=' <strong>'+t.dose+(t.unite?' '+t.unite:'')+'</strong>';
      if(t.frequence)s+=' — '+t.frequence;
      if(t.moment)s+=' ('+t.moment+')';
      if(t.effets_indesirables)s+=' <span style="color:#dc2626">⚠️ '+t.effets_indesirables+'</span>';
      return'<div style="font-size:13px;color:#06172D;padding:2px 0;">'+s+'</div>';
    }
    var h='<div style="border-radius:10px;padding:14px;margin-bottom:12px;background:#f0f7f4;border:1.5px solid #2d6a4f;">';
    h+='<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin:0 0 10px;color:#2d6a4f;">Traitement actuel</p>';
    h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">';
    h+='<div><div style="font-size:11px;font-weight:600;color:#2d6a4f;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em;">💊 Médicaments</div>';
    h+=meds.length?meds.map(lh).join(''):'<div style="font-size:12px;color:#999;font-style:italic;">Non renseigné</div>';
    h+='</div><div><div style="font-size:11px;font-weight:600;color:#2d6a4f;margin-bottom:6px;text-transform:uppercase;letter-spacing:.05em;">🌿 Compléments</div>';
    h+=comps.length?comps.map(lh).join(''):'<div style="font-size:12px;color:#999;font-style:italic;">Non renseigné</div>';
    h+='</div></div>';
    if(pauses.length){
      h+='<div style="margin-top:8px;padding:6px 10px;background:#fffbeb;border-radius:6px;font-size:12px;color:#92400e;">⏸ En pause : ';
      h+=pauses.map(function(t){return t.nom+(t.raison_statut?' ('+t.raison_statut+')':'');}).join(', ')+'</div>';
    }
    if(arr90.length){
      h+='<div style="margin-top:6px;padding:6px 10px;background:#fef2f2;border-radius:6px;font-size:12px;color:#991b1b;">🛑 Arrêtés récemment : ';
      h+=arr90.map(function(t){return t.nom+(t.raison_statut?' ('+t.raison_statut+')':'')+' le '+_formatDateFr(t.date_statut);}).join(', ')+'</div>';
    }
    h+='</div>';
    return h;
  }

  function renderResumeParametres() {
    var container = document.getElementById('param-traitements-resume');
    if (!container) return;
    var liste = charger();
    var actifs = liste.filter(function(t) { return t.statut === 'actif'; });
    if (!actifs.length) {
      container.innerHTML = '<p style="font-size:13px;color:#9ca3af;font-style:italic;margin:0;">Aucun traitement enregistré.</p>';
      return;
    }
    var meds = actifs.filter(function(t) { return t.categorie === 'medicament'; });
    var comps = actifs.filter(function(t) { return t.categorie !== 'medicament'; });
    function ligne(t) {
      var s = '<span style="font-size:13px;color:#06172D;">' + t.nom;
      if (t.dose) s += ' <strong>' + t.dose + (t.unite ? ' ' + t.unite : '') + '</strong>';
      if (t.frequence) s += ' · ' + t.frequence;
      s += '</span>';
      return s;
    }
    var html = '';
    if (meds.length) {
      html += '<div style="margin-bottom:8px;"><div style="font-size:11px;font-weight:600;color:#2d6a4f;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">💊 Médicaments (' + meds.length + ')</div>';
      html += meds.map(function(t) { return '<div style="padding:2px 0;">' + ligne(t) + '</div>'; }).join('');
      html += '</div>';
    }
    if (comps.length) {
      html += '<div><div style="font-size:11px;font-weight:600;color:#2d6a4f;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">🌿 Compléments (' + comps.length + ')</div>';
      html += comps.map(function(t) { return '<div style="padding:2px 0;">' + ligne(t) + '</div>'; }).join('');
      html += '</div>';
    }
    container.innerHTML = html;
  }

  function init(){
    migrerEssais();
    renderListe();
    renderResumeParametres();
    document.querySelectorAll('#trt-chips-categorie .trt-chip').forEach(function(chip){
      chip.addEventListener('click',function(){
        document.querySelectorAll('#trt-chips-categorie .trt-chip').forEach(function(c){c.classList.remove('trt-chip--active');});
        chip.classList.add('trt-chip--active');
        var iS=chip.dataset.val==='strategie';
        var pw=document.getElementById('trt-prescripteur-wrap');
        var ow=document.getElementById('trt-ordonnance-wrap');
        if(pw)pw.style.display=iS?'none':'block';
        if(ow)ow.style.display=iS?'none':'flex';
      });
    });
    document.querySelectorAll('#trt-chips-statut .trt-chip').forEach(function(chip){
      chip.addEventListener('click',function(){
        document.querySelectorAll('#trt-chips-statut .trt-chip').forEach(function(c){c.classList.remove('trt-chip--active');});
        chip.classList.add('trt-chip--active');
        _toggleRaisonStatut(chip.dataset.val!=='actif');
        if(chip.dataset.val!=='actif'){var dsEl=document.getElementById('trt-date-statut');if(dsEl&&!dsEl.value)dsEl.value=_localDateStr(new Date());}
      });
    });
  }

  return{init:init,charger:charger,ouvrirModale:ouvrirModale,fermerModale:fermerModale,
    sauvegarderDepuisModale:sauvegarderDepuisModale,confirmerSuppression:confirmerSuppression,
    ajouterPalier:ajouterPalier,renderListe:renderListe,exportPourPDF:exportPourPDF,
    blocHTML:blocHTML,_supprimerPalier:_supprimerPalier,_renderPaliers:_renderPaliers,
    parseTraitement:parseTraitement,appliquerParsing:appliquerParsing,
    renderResumeParametres:renderResumeParametres};
})();
