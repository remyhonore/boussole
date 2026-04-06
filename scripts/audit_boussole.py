#!/usr/bin/env python3
"""Audit script for myBoussole PWA — checks live site at https://app.myboussole.fr"""

import sys
import requests
from bs4 import BeautifulSoup

BASE_URL = "https://app.myboussole.fr"
CHECKS = []
ANOMALIES = []


def check(name, passed, detail=None):
    status = "OK" if passed else "FAIL"
    msg = f"[{status}] {name}"
    if detail:
        msg += f" — {detail}"
    print(msg)
    CHECKS.append(passed)
    if not passed:
        ANOMALIES.append(f"{name}: {detail or 'échec'}")


def fetch(url, **kwargs):
    try:
        r = requests.get(url, timeout=15, **kwargs)
        r.raise_for_status()
        return r
    except Exception as e:
        return None


def main():
    print(f"\n=== Audit myBoussole — {BASE_URL} ===\n")

    # --- Fetch main page ---
    r = fetch(BASE_URL)
    check("Page principale accessible", r is not None,
          None if r else f"HTTP error ou timeout")
    if r is None:
        print("\nImpossible de charger la page principale. Abandon.")
        sys.exit(1)

    soup = BeautifulSoup(r.text, "html.parser")
    html = r.text

    # --- Titre ---
    title = soup.find("title")
    title_text = title.get_text(strip=True) if title else ""
    check("Titre contient 'myBoussole'", "myBoussole" in title_text,
          f"titre trouvé : '{title_text}'")

    # --- lang=fr ---
    html_tag = soup.find("html")
    lang = html_tag.get("lang", "") if html_tag else ""
    check("lang=fr sur <html>", lang.startswith("fr"),
          f"lang='{lang}'" if lang else "attribut lang absent")

    # --- Couleur #2d6a4f dans le HTML/CSS inline ---
    color_present = "#2d6a4f" in html.lower()
    check("Couleur primaire #2d6a4f présente", color_present,
          None if color_present else "couleur absente du HTML")

    # --- Navigation 4 onglets ---
    nav_labels = ["Accueil", "Ma journée", "Suivi", "Paramètres"]
    for label in nav_labels:
        found = label in html
        check(f"Onglet navigation '{label}'", found,
              None if found else "texte absent de la page")

    # --- manifest.json ---
    manifest_url = BASE_URL.rstrip("/") + "/manifest.json"
    rm = fetch(manifest_url)
    check("manifest.json accessible", rm is not None,
          None if rm else "404 ou timeout")
    if rm is not None:
        try:
            manifest = rm.json()
            check("manifest.json valide (JSON parseable)", True)
            check("manifest name présent", "name" in manifest,
                  f"name='{manifest.get('name', '')}'")
            check("manifest icons présent", bool(manifest.get("icons")),
                  None if manifest.get("icons") else "icons vide ou absent")
        except Exception:
            check("manifest.json valide (JSON parseable)", False, "JSON invalide")

    # --- Service Worker sw.js ---
    sw_url = BASE_URL.rstrip("/") + "/sw.js"
    rsw = fetch(sw_url)
    check("sw.js accessible", rsw is not None,
          None if rsw else "404 ou timeout")
    if rsw is not None:
        sw_content = rsw.text
        has_cache_name = "CACHE_NAME" in sw_content or "cacheName" in sw_content or "cache" in sw_content.lower()
        check("sw.js contient une définition de cache", has_cache_name,
              None if has_cache_name else "aucune référence à un cache trouvée")

    # --- Footer / SW version mention ---
    footer = soup.find("footer")
    footer_text = footer.get_text(strip=True) if footer else ""
    sw_mention = bool(footer) and ("v" in footer_text.lower() or "version" in footer_text.lower() or "sw" in footer_text.lower())
    check("Footer présent", bool(footer),
          None if footer else "balise <footer> absente")

    # --- Score ---
    total = len(CHECKS)
    passed = sum(CHECKS)
    score = round(passed / total * 100) if total else 0

    print(f"\n{'='*40}")
    print(f"Score : {score}/100 ({passed}/{total} vérifications réussies)")

    if ANOMALIES:
        print(f"\nAnomalies détectées ({len(ANOMALIES)}) :")
        for a in ANOMALIES:
            print(f"  • {a}")
    else:
        print("\nAucune anomalie détectée.")

    print()

    if score < 60:
        print("RÉSULTAT : ÉCHEC (score < 60)")
        sys.exit(1)
    else:
        print("RÉSULTAT : OK")
        sys.exit(0)


if __name__ == "__main__":
    main()
