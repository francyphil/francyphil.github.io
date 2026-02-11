#!/usr/bin/env python3
"""
Script per contare le pagine HTML e le statistiche del catalogo del sito.
Aggiornato per calcolare, per sezione, numero catalogati, immagini presenti
e percentuale di completamento immagini.
"""

import json
import csv
from pathlib import Path


def count_html_pages(root_dir):
    html_files = []
    for file_path in Path(root_dir).rglob("*.html"):
        rel_path = file_path.relative_to(root_dir)
        html_files.append(str(rel_path))
    excluded = {"navbar.html", "footer.html"}
    filtered_files = [f for f in html_files if Path(f).name not in excluded]
    total_count = len(filtered_files)
    has_citta = any("cittaDettaglio.html" in f for f in filtered_files)
    has_ufficio = any("ufficioDettaglio.html" in f for f in filtered_files)
    if has_citta and has_ufficio:
        total_count -= 1
    return total_count


def count_images(root_dir):
    image_extensions = {".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".bmp", ".tiff", ".tif"}
    image_count = 0
    for file_path in Path(root_dir).rglob("*"):
        if file_path.suffix.lower() in image_extensions:
            image_count += 1
    return image_count


def build_image_index(root_dir: Path):
    """Scansiona il filesystem una sola volta e costruisce un indice delle immagini.
    Ritorna un dict: basename -> list of relative paths (as Posix strings).
    """
    image_extensions = {".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".bmp", ".tiff", ".tif"}
    index = {}
    for p in root_dir.rglob("prev_*"):
        if p.suffix.lower() in image_extensions and p.is_file():
            name = p.name.lower()
            rel = str(p.relative_to(root_dir))
            index.setdefault(name, []).append(rel)
    return index


def exists_anywhere(root_dir: Path, filename: str) -> bool:
    for p in root_dir.rglob(filename):
        if p.is_file():
            return True
    return False


def compute_section_stats(root_dir: Path, folder: str, json_filename: str, image_index: dict = None):
    json_path = root_dir / folder / json_filename
    if not json_path.exists():
        return {"total_catalogati": 0, "images_present": 0, "images_pct": 0.0}
    with open(json_path, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except Exception:
            data = []
    total = len(data)
    images_present = 0
    for item in data:
        uff = item.get("Targhetta Ufficio")
        extra = item.get("extra", "")
        if uff is None:
            continue
        extra_part = f"_{str(extra).strip()}" if extra and str(extra).strip() != "" else ""
        filename = f"prev_{uff}{extra_part}.jpeg"
        filename_l = filename.lower()
        # usa l'indice se disponibile per evitare ripetute rglob()
        found = False
        if image_index is not None:
            # Normal lookup by expected filename
            entries = image_index.get(filename_l, [])
            if folder == 'triestea':
                # First try exact trieste filename: prev_trieste_{uff}{extra}.jpeg
                fname_tri = f"prev_trieste_{uff}{extra_part}.jpeg".lower()
                entries_tri = image_index.get(fname_tri, [])
                if entries_tri:
                    found = any(p.startswith(f"{folder}/") for p in entries_tri)
                else:
                    # Fallback: look for any image basename that starts with prev_trieste_{uff}
                    prefix = f"prev_trieste_{uff}"
                    if extra and str(extra).strip() != "":
                        prefix = f"{prefix}_{str(extra).strip()}"
                    prefix = prefix.lower()
                    for k, paths in image_index.items():
                        if k.startswith(prefix):
                            if any(p.startswith(f"{folder}/") for p in paths):
                                found = True
                                break
            else:
                found = bool(entries)
        else:
            # fallback: ricerca filesystem (più lenta)
            search_root = root_dir / folder if folder == 'triestea' else root_dir
            found = any(search_root.rglob(filename))

        if found:
            images_present += 1
    pct = round((images_present / total) * 100, 1) if total > 0 else 0.0
    return {"total_catalogati": total, "images_present": images_present, "images_pct": pct}


def write_missing_images_report(root_dir: Path, out_csv: Path, image_index: dict = None):
    """Scrive un CSV con le immagini attese dai JSON ma mancanti sul file system."""
    rows = []
    # Per ogni sezione JSON
    for folder, json_file, section_name in [ ("regno", "targhetteRegno.json", "Regno"), ("triestea", "targhetteTriesteA.json", "Trieste A") ]:
        p = root_dir / folder / json_file
        if not p.exists():
            continue
        try:
            with open(p, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception:
            data = []

        for item in data:
            uff = item.get("Targhetta Ufficio")
            extra = item.get("extra", "")
            if uff is None:
                continue
            extra_part = f"_{str(extra).strip()}" if extra and str(extra).strip() != "" else ""
            filename = f"prev_{uff}{extra_part}.jpeg"
            filename_l = filename.lower()
            # usa l'indice se disponibile per evitare ripetute rglob()
            if image_index is not None:
                # Try exact expected filename first
                entries = image_index.get(filename_l, [])
                if folder == 'triestea':
                    # supporta nomi del tipo prev_trieste_{uff}[_{extra}].jpeg
                    fname_tri = f"prev_trieste_{uff}{extra_part}.jpeg".lower()
                    entries_tri = image_index.get(fname_tri, [])
                    if entries_tri:
                        found = any(p.startswith(f"{folder}/") for p in entries_tri)
                    else:
                        # fallback: match per prefisso (prev_trieste_{uff}...)
                        prefix = f"prev_trieste_{uff}"
                        if extra and str(extra).strip() != "":
                            prefix = f"{prefix}_{str(extra).strip()}"
                        prefix = prefix.lower()
                        for k, paths in image_index.items():
                            if k.startswith(prefix):
                                if any(p.startswith(f"{folder}/") for p in paths):
                                    found = True
                                    break
                else:
                    found = bool(entries)
            else:
                search_root = root_dir / folder if folder == 'triestea' else root_dir
                found = any(search_root.rglob(filename))
            if not found:
                rows.append({
                    'section': section_name,
                    'expected_filename': filename,
                    'Targhetta Ufficio': uff,
                    'extra': extra,
                    'Descrizione': item.get('Descrizione',''),
                    'Località': item.get('Località','')
                })

    # Scrivi CSV
    if rows:
        with open(out_csv, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = ['section','expected_filename','Targhetta Ufficio','extra','Descrizione','Località']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            for r in rows:
                writer.writerow(r)
    else:
        # crea file vuoto con header
        with open(out_csv, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = ['section','expected_filename','Targhetta Ufficio','extra','Descrizione','Località']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()


def write_unreferenced_regno_images(root_dir: Path, out_csv: Path, image_index: dict = None):
    """Scrive un CSV con immagini presenti nel progetto che non sono referenziate da targhetteRegno.json."""
    # raccogli nomi attesi da regno
    expected = set()
    p = root_dir / 'regno' / 'targhetteRegno.json'
    if p.exists():
        try:
            with open(p, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception:
            data = []
        for item in data:
            uff = item.get('Targhetta Ufficio')
            extra = item.get('extra','')
            if uff is None:
                continue
            extra_part = f"_{str(extra).strip()}" if extra and str(extra).strip() != "" else ""
            filename = f"prev_{uff}{extra_part}.jpeg"
            expected.add(filename.lower())

    # trova file immagine prev_*.jpeg: preferisci l'indice se presente
    found_images = []
    if image_index is not None:
        for basename, paths in image_index.items():
            for rel in paths:
                found_images.append(rel)
    else:
        for p in root_dir.rglob('prev_*.jpeg'):
            found_images.append(str(p.relative_to(root_dir)))
    # Filtra quelli non in expected (usa basename case-insensitive)
    unreferenced = [fp for fp in found_images if Path(fp).name.lower() not in expected]

    # Scrivi CSV
    with open(out_csv, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['image_path','basename']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        for fp in sorted(unreferenced):
            writer.writerow({'image_path': fp, 'basename': Path(fp).name})


def main():
    project_dir = Path(__file__).parent
    total_pages = count_html_pages(project_dir)
    total_images = count_images(project_dir)
    # costruisci un indice delle immagini una sola volta
    image_index = build_image_index(project_dir)

    regno_stats = compute_section_stats(project_dir, "regno", "targhetteRegno.json", image_index=image_index)
    trieste_stats = compute_section_stats(project_dir, "triestea", "targhetteTriesteA.json", image_index=image_index)
    stats = {
        "total_pages": total_pages,
        "total_images": total_images,
        "sections": {
            "Regno": regno_stats,
            "Trieste A": trieste_stats,
        },
    }
    # Retrocompatibilità: totale targhette = somma delle sezioni
    total_targhette = 0
    for s in stats["sections"].values():
        total_targhette += s.get("total_catalogati", 0)

    # Conta località uniche leggendo i JSON delle sezioni (se esistono)
    localita_set = set()
    for folder, json_file in [("regno", "targhetteRegno.json"), ("triestea", "targhetteTriesteA.json")]:
        p = project_dir / folder / json_file
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    data = json.load(f)
                for item in data:
                    loc = item.get("Località")
                    if loc:
                        localita_set.add(loc)
            except Exception:
                pass

    stats["total_targhette"] = total_targhette
    stats["total_localita"] = len(localita_set)
    output_file = project_dir / "site_stats.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)
    print("✓ Conteggio completato!")
    print(f"✓ Pagine totali: {stats['total_pages']}")
    print(f"✓ Immagini totali: {stats['total_images']}")
    print("✓ Sezioni:")
    for name, s in stats["sections"].items():
        print(f"  - {name}: catalogati={s['total_catalogati']}, immagini={s['images_present']}, {s['images_pct']}%")
    # Genera report CSV per immagini mancanti e non referenziate (Regno)
    missing_csv = project_dir / 'missing_images.csv'
    unref_csv = project_dir / 'unreferenced_regno_images.csv'
    write_missing_images_report(project_dir, missing_csv, image_index=image_index)
    write_unreferenced_regno_images(project_dir, unref_csv, image_index=image_index)
    print(f"✓ Report creati: {missing_csv.name}, {unref_csv.name}")


if __name__ == "__main__":
    main()
