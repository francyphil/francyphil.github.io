#!/usr/bin/env python3
"""
Scan the targhette JSON files (Regno, Libia, Trieste A) and report which
city+office combinations (Località + Denominazione ufficio) have no datario
at all – i.e. not a single record for that combination has a non-empty "Datario".

Usage:
  python3 check_missing_datari.py [--out FILE]
"""

import json
import argparse
from collections import defaultdict

# Each catalog to check: (label, json_path)
CATALOGS = [
    ("Regno",     "regno/targhetteRegno.json"),
    ("Libia",     "colonie/libia/targhetteLibia.json"),
    ("Trieste A", "triestea/targhetteTriesteA.json"),
]


def _city_office_key(rec):
    """Return (Località, Denominazione ufficio) as grouping key."""
    loc = (rec.get("Località") or "").strip()
    den = (rec.get("Denominazione ufficio") or "").strip()
    return (loc, den)


def check_catalog(label, json_path):
    """Return list of city+office combos with no datario in the given catalog."""
    try:
        with open(json_path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
    except FileNotFoundError:
        return []

    # Group records by (Località, Denominazione ufficio)
    groups = defaultdict(list)
    for rec in data:
        key = _city_office_key(rec)
        groups[key].append(rec)

    missing = []
    for (loc, den) in sorted(groups.keys()):
        recs = groups[(loc, den)]
        # A city+office combo "has no datario" if EVERY record has empty Datario
        has_datario = any(
            (rec.get("Datario") or "").strip() != ""
            for rec in recs
        )
        if not has_datario:
            desc = f"{loc} – {den}" if den else loc
            missing.append({
                "Località": loc,
                "Denominazione ufficio": den,
                "Descrizione": desc,
                "n_targhette": len(recs),
            })

    return missing


def main():
    p = argparse.ArgumentParser(
        description="Find city+office combinations without any datario")
    p.add_argument("--out", help="Optional output CSV file")
    args = p.parse_args()

    grand_total = 0
    all_missing = []

    for label, json_path in CATALOGS:
        missing = check_catalog(label, json_path)
        if missing:
            grand_total += len(missing)
            print(f"\n[{label}] {len(missing)} combinazioni città-ufficio senza datario:")
            for m in missing:
                print(f"  {m['Descrizione']:<45}  ({m['n_targhette']} targhette)")
                all_missing.append({**m, "Catalogo": label})
        else:
            print(f"\n[{label}] Tutte le combinazioni città-ufficio hanno almeno un datario.")

    if args.out and all_missing:
        import csv
        with open(args.out, "w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=[
                "Catalogo", "Località", "Denominazione ufficio", "Descrizione", "n_targhette"
            ])
            writer.writeheader()
            writer.writerows(all_missing)
        print(f"\nReport scritto in {args.out}")

    if grand_total:
        print(f"\nTotale combinazioni città-ufficio senza datario: {grand_total}")
    else:
        print("\nTutte le combinazioni città-ufficio hanno almeno un datario in tutti i cataloghi.")


if __name__ == "__main__":
    main()
