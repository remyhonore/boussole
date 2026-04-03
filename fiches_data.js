// Feature S — Mini-fiches contextuelles inline
// Local-first : 0 appel réseau, embarqué dans le SW cache

const FICHES_DATA = {
  "crash-post-effort": {
    id: "crash-post-effort",
    titre: "Pourquoi tu t'effondres après l'effort",
    intro: "Ce que tu vis a un nom : le malaise post-effort (MPE). Ce n'est pas de la faiblesse — c'est un mécanisme biologique documenté.",
    sections: [
      {
        titre: "Le mécanisme en 1 phrase",
        contenu: "Ton système énergétique mitochondrial ne récupère pas assez vite après un effort. Chaque dépense dépasse la capacité de recharge."
      },
      {
        titre: "Pourquoi ça empire 24-48h après",
        contenu: "Le délai est caractéristique du MPE. C'est différent de la fatigue normale qui s'améliore avec le repos immédiat."
      },
      {
        titre: "Ce que l'app mesure pour toi",
        contenu: "Le score SNA du lendemain d'un effort élevé est le signal clé. Un score bas le lendemain = tu as dépassé ton seuil."
      }
    ],
    lien_vitrine: "https://myboussole.fr/articles/pacing-eviter-le-crash/",
    lien_label: "Lire l'article complet"
  },

  "dysautonomie-score-bas": {
    id: "dysautonomie-score-bas",
    titre: "Un système nerveux autonome sous tension",
    intro: "Ton score SNA est bas depuis plusieurs jours. La dysautonomie est une dysrégulation réelle du système nerveux — pas dans ta tête.",
    sections: [
      {
        titre: "Ce que fait le SNA",
        contenu: "Il régule tout ce qui est automatique : rythme cardiaque, pression artérielle, digestion, température. Quand il dérègle, tout se dérègle en même temps."
      },
      {
        titre: "Pourquoi le matin est si difficile",
        contenu: "Le passage allongé vers debout demande un ajustement rapide. En dysautonomie, cet ajustement est lent ou insuffisant."
      },
      {
        titre: "Le premier levier concret",
        contenu: "Hydratation au réveil (500 ml eau + pincée de sel), position progressive (assis 2 min avant debout). Simple, documenté, immédiat."
      }
    ],
    lien_vitrine: "https://myboussole.fr/articles/dysautonomie-gestion-par-ou-commencer/",
    lien_label: "Lire l'article complet"
  },

  "reveil-nocturne": {
    id: "reveil-nocturne",
    titre: "Pourquoi tu te réveilles la nuit",
    intro: "Des réveils fréquents la nuit ne sont pas du simple stress. Dans les conditions chroniques, deux systèmes biologiques sont souvent impliqués.",
    sections: [
      {
        titre: "Le rôle de l'orexine et de l'histamine",
        contenu: "L'orexine maintient l'éveil. L'histamine cérébrale amplifie ce signal. En excès ou en dérèglement, ils fragmentent le sommeil en fin de nuit."
      },
      {
        titre: "Le signal à surveiller",
        contenu: "Réveil entre 3h et 5h avec difficulté à se rendormir = pattern orexinergique. Réveil avec sensation de chaleur ou prurit = piste histaminique."
      },
      {
        titre: "Ce qui peut aider",
        contenu: "Éviter les aliments riches en histamine le soir. Température de chambre fraîche. Repas léger 3h avant le coucher."
      }
    ],
    lien_vitrine: "https://myboussole.fr/articles/orexine-histamine-cerebrale-reveil-nuit-covid-long/",
    lien_label: "Lire l'article complet"
  },

  "brouillard-mental": {
    id: "brouillard-mental",
    titre: "Le brouillard mental a des causes biologiques",
    intro: "La difficulté à te concentrer n'est pas un manque de volonté. Dans les conditions chroniques, plusieurs mécanismes biologiques l'expliquent.",
    sections: [
      {
        titre: "Neuroinflammation et microglie",
        contenu: "Les cellules immunitaires du cerveau (microglie) peuvent rester activées après une infection. Elles perturbent la transmission des signaux nerveux."
      },
      {
        titre: "Hypoperfusion cérébrale",
        contenu: "En dysautonomie, le débit sanguin cérébral peut chuter en position debout. Moins de sang = moins d'oxygène = brouillard."
      },
      {
        titre: "Ce qui aggrave",
        contenu: "Effort cognitif intense, chaleur, position debout prolongée, mauvais sommeil. Chaque facteur se cumule."
      }
    ],
    lien_vitrine: "https://myboussole.fr/articles/brouillard-mental-covid-long-mecanismes/",
    lien_label: "Lire l'article complet"
  },

  "fatigue-matinale": {
    id: "fatigue-matinale",
    titre: "Fatigué(e) dès le réveil : ce que ça signifie",
    intro: "Se réveiller épuisé(e) après une nuit complète est un signal distinct. Ce n'est pas de la paresse — c'est une information biologique.",
    sections: [
      {
        titre: "Le sommeil non réparateur",
        contenu: "La qualité du sommeil profond (stades N3) peut être altérée sans que tu t'en aperçoives. L'architecture du sommeil est fragmentée même si la durée est correcte."
      },
      {
        titre: "Le cortisol du matin",
        contenu: "Normalement, le cortisol pic au réveil pour donner l'élan du matin. En fatigue chronique, ce pic est atténué ou décalé."
      },
      {
        titre: "Le signal à noter dans l'app",
        contenu: "Note ta qualité de sommeil ET ton énergie au réveil séparément. Si l'énergie est basse malgré un bon sommeil noté, c'est le pattern non réparateur."
      }
    ],
    lien_vitrine: "https://myboussole.fr/articles/reveil-deja-fatigue-sommeil-non-reparateur/",
    lien_label: "Lire l'article complet"
  }
};
