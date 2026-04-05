/**
 * Tests unitaires — traitements.js
 * Couvre : parseTraitement, CRUD localStorage, exportPourPDF, allergies, moment multi
 */

const Traitements = require('../traitements.js');

beforeEach(() => {
  localStorage.clear();
});

// ===== parseTraitement =====

describe('parseTraitement — parsing saisie rapide', () => {

  test('Médicament simple avec dose et fréquence', () => {
    var r = Traitements.parseTraitement('Brintellix 20mg 1/j matin');
    expect(r).not.toBeNull();
    expect(r.nom).toContain('Brintellix');
    expect(r.dose).toBe(20);
    expect(r.unite).toBe('mg');
    expect(r.frequence).toBe('1x/j');
    expect(r.moment).toBe('matin');
    expect(r.categorie).toBe('medicament');
  });

  test('Complément détecté par mot-clé', () => {
    var r = Traitements.parseTraitement('Magnésium bisglycinate 300mg 2x/j');
    expect(r).not.toBeNull();
    expect(r.categorie).toBe('complement');
    expect(r.dose).toBe(300);
    expect(r.frequence).toBe('2x/j');
  });

  test('Dose avec virgule', () => {
    var r = Traitements.parseTraitement('Levothyrox 12,5µg');
    expect(r).not.toBeNull();
    expect(r.dose).toBe(12.5);
    expect(r.unite).toBe('µg');
  });

  test('Moment multi : matin et soir', () => {
    var r = Traitements.parseTraitement('Escitalopram 10mg matin et soir');
    expect(r).not.toBeNull();
    expect(r.moment).toBe('matin,soir');
  });

  test('Moment multi : matin/soir', () => {
    var r = Traitements.parseTraitement('Paracetamol 1000mg matin/soir');
    expect(r).not.toBeNull();
    expect(r.moment).toBe('matin,soir');
  });

  test('Sans dose retourne quand même le nom', () => {
    var r = Traitements.parseTraitement('Ibuprofène si besoin');
    expect(r).not.toBeNull();
    expect(r.nom).toContain('Ibuprofène');
    expect(r.frequence).toBe('si besoin');
  });

  test('Entrée vide retourne null', () => {
    expect(Traitements.parseTraitement('')).toBeNull();
    expect(Traitements.parseTraitement(null)).toBeNull();
  });
});

// ===== CRUD données =====

describe('Traitements — CRUD localStorage', () => {

  test('charger retourne tableau vide si rien stocké', () => {
    var l = Traitements.charger();
    expect(Array.isArray(l)).toBe(true);
    expect(l.length).toBe(0);
  });

  test('charger retourne les données stockées', () => {
    var data = [{ id: '1', nom: 'Test', categorie: 'medicament', statut: 'actif' }];
    localStorage.setItem('boussole_traitements', JSON.stringify(data));
    var l = Traitements.charger();
    expect(l.length).toBe(1);
    expect(l[0].nom).toBe('Test');
  });

  test('charger résiste au JSON invalide', () => {
    localStorage.setItem('boussole_traitements', '{invalid json');
    var l = Traitements.charger();
    expect(Array.isArray(l)).toBe(true);
    expect(l.length).toBe(0);
  });
});

// ===== exportPourPDF =====

describe('Traitements — exportPourPDF', () => {

  test('retourne null si aucun traitement', () => {
    expect(Traitements.exportPourPDF()).toBeNull();
  });

  test('classe correctement actifs/pauses/arrêtés', () => {
    var data = [
      { id: '1', nom: 'MedA', categorie: 'medicament', statut: 'actif', dose: 10, unite: 'mg', frequence: '1x/j', moment: 'matin' },
      { id: '2', nom: 'MedB', categorie: 'medicament', statut: 'pause', raison_statut: 'EI' },
      { id: '3', nom: 'MedC', categorie: 'medicament', statut: 'arrete', raison_statut: 'Inefficace' }
    ];
    localStorage.setItem('boussole_traitements', JSON.stringify(data));
    var result = Traitements.exportPourPDF();
    expect(result).not.toBeNull();
    expect(result.actifs.length).toBe(1);
    expect(result.pauses.length).toBe(1);
    expect(result.arretes.length).toBe(1);
    expect(result.actifs[0]).toContain('MedA');
    expect(result.actifs[0]).toContain('10');
    expect(result.actifs[0]).toContain('matin');
  });

  test('moment multi affiché avec +', () => {
    var data = [{ id: '1', nom: 'X', statut: 'actif', moment: 'matin,soir', frequence: '2x/j' }];
    localStorage.setItem('boussole_traitements', JSON.stringify(data));
    var result = Traitements.exportPourPDF();
    expect(result.actifs[0]).toContain('matin + soir');
  });
});

// ===== Allergies =====

describe('Traitements — allergies dans les données', () => {

  test('exportPourPDF.raw inclut les allergies', () => {
    var data = [
      { id: '1', nom: 'MedA', categorie: 'medicament', statut: 'actif' },
      { id: '2', nom: 'Pénicilline', categorie: 'allergie', statut: 'actif', notes: 'Urticaire' }
    ];
    localStorage.setItem('boussole_traitements', JSON.stringify(data));
    var result = Traitements.exportPourPDF();
    var allergies = result.raw.filter(function(t) { return t.categorie === 'allergie'; });
    expect(allergies.length).toBe(1);
    expect(allergies[0].nom).toBe('Pénicilline');
  });
});
