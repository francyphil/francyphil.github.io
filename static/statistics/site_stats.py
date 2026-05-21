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
            # Escludi varianti _square e _circle
            stem = file_path.stem.lower()
            if "_square" not in stem and "_circle" not in stem:
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
    datario_present = 0
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
            # ensure folder is a posix path string for prefix checks
            folder_prefix = Path(folder).as_posix()
            # Normal lookup by expected filename limited to this folder
            entries = image_index.get(filename_l, [])
            if folder_prefix == 'triestea':
                # First try exact trieste filename: prev_trieste_{uff}{extra}.jpeg
                fname_tri = f"prev_trieste_{uff}{extra_part}.jpeg".lower()
                entries_tri = image_index.get(fname_tri, [])
                if entries_tri:
                    found = any(p.startswith(f"{folder_prefix}/") for p in entries_tri)
                else:
                    # Fallback: look for any image basename that starts with prev_trieste_{uff}
                    prefix = f"prev_trieste_{uff}"
                    if extra and str(extra).strip() != "":
                        prefix = f"{prefix}_{str(extra).strip()}"
                    prefix = prefix.lower()
                    for k, paths in image_index.items():
                        if k.startswith(prefix):
                            if any(p.startswith(f"{folder_prefix}/") for p in paths):
                                found = True
                                break
            elif Path(folder_prefix).name == 'libia':
                # Libia: supporta nomi prev_libia_{uff} o prev_tripoli_{uff}, con fallback per prefisso
                fname_libia = f"prev_libia_{uff}{extra_part}.jpeg".lower()
                fname_trip = f"prev_tripoli_{uff}{extra_part}.jpeg".lower()
                entries_lib = image_index.get(fname_libia, [])
                entries_trip = image_index.get(fname_trip, [])
                if entries_lib:
                    found = any(p.startswith(f"{folder_prefix}/") for p in entries_lib)
                elif entries_trip:
                    found = any(p.startswith(f"{folder_prefix}/") for p in entries_trip)
                else:
                    # fallback: search any basename starting with prev_libia_{uff} or prev_tripoli_{uff}
                    prefixes = [f"prev_libia_{uff}", f"prev_tripoli_{uff}"]
                    if extra and str(extra).strip() != "":
                        prefixes = [p + f"_{str(extra).strip()}" for p in prefixes]
                    for k, paths in image_index.items():
                        for pref in prefixes:
                            if k.startswith(pref.lower()):
                                if any(p.startswith(f"{folder_prefix}/") for p in paths):
                                    found = True
                                    break
                        if found:
                            break
            else:
                if entries:
                    # ensure at least one entry resides under the target folder
                    found = any(p.startswith(f"{folder_prefix}/") for p in entries)
        else:
            # fallback: ricerca filesystem (più lenta)
            search_root = root_dir / folder
            found = any(search_root.rglob(filename))

        if found:
            images_present += 1
        # Controlla se l'annullo ha un datario (linkDatario non vuoto)
        link_datario = item.get("linkDatario", "")
        if link_datario and str(link_datario).strip() != "":
            datario_present += 1
    pct = round((images_present / total) * 100, 1) if total > 0 else 0.0
    datario_pct = round((datario_present / total) * 100, 1) if total > 0 else 0.0
    return {"total_catalogati": total, "images_present": images_present, "images_pct": pct, "datario_present": datario_present, "datario_pct": datario_pct}


def write_missing_images_report(root_dir: Path, out_csv: Path, image_index: dict = None):
    """Scrive un CSV con le immagini attese dai JSON ma mancanti sul file system."""
    rows = []
    # Per ogni sezione JSON
    for folder, json_file, section_name in [ ("regno", "targhetteRegno.json", "Regno"), ("triestea", "targhetteTriesteA.json", "Trieste A"), ("colonie/libia", "targhetteLibia.json", "Libia") ]:
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
            found = False
            # usa l'indice se disponibile per evitare ripetute rglob()
            if image_index is not None:
                folder_prefix = Path(folder).as_posix()
                if folder_prefix == 'triestea':
                    # nomi del tipo prev_trieste_{uff}[_{extra}].jpeg
                    candidate_prefixes = [f"prev_trieste_{uff}"]
                elif Path(folder_prefix).name == 'libia':
                    # nomi del tipo prev_tripoli_{uff} o prev_libia_{uff}
                    candidate_prefixes = [f"prev_tripoli_{uff}", f"prev_libia_{uff}"]
                else:
                    candidate_prefixes = [f"prev_{uff}"]
                for prefix in candidate_prefixes:
                    fname_candidate = f"{prefix}{extra_part}.jpeg".lower()
                    entries = image_index.get(fname_candidate, [])
                    if entries and any(p.startswith(f"{folder_prefix}/") for p in entries):
                        found = True
                        break
                    # fallback per prefisso solo per sezioni con naming diverso (Trieste, Libia)
                    if folder_prefix in ('triestea',) or Path(folder_prefix).name == 'libia':
                        search_prefix = (prefix + (f"_{str(extra).strip()}" if extra and str(extra).strip() else "")).lower()
                        for k, paths in image_index.items():
                            if k.startswith(search_prefix) and any(p.startswith(f"{folder_prefix}/") for p in paths):
                                found = True
                                break
                    if found:
                        break
            else:
                search_root = root_dir / folder
                # prova i possibili prefissi di nome file
                if folder == 'triestea':
                    candidate_names = [f"prev_trieste_{uff}{extra_part}.jpeg"]
                elif folder == 'colonie/libia':
                    candidate_names = [f"prev_tripoli_{uff}{extra_part}.jpeg", f"prev_libia_{uff}{extra_part}.jpeg"]
                else:
                    candidate_names = [f"prev_{uff}{extra_part}.jpeg"]
                found = any(any(search_root.rglob(name)) for name in candidate_names)
            if not found:
                rows.append({
                    'section': section_name,
                    'Anno': item.get('Anno',''),
                    'Targhetta Ufficio': uff,
                    'extra': extra,
                    'Descrizione': item.get('Descrizione',''),
                    'Località': item.get('Località',''),
                    'Denominazione ufficio': item.get('Denominazione ufficio','')
                })

    # Scrivi CSV
    if rows:
        with open(out_csv, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = ['section','Anno','Targhetta Ufficio','extra','Descrizione','Località','Denominazione ufficio']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            for r in rows:
                writer.writerow(r)
    else:
        # crea file vuoto con header
        with open(out_csv, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = ['section','Anno','Targhetta Ufficio','extra','Descrizione','Località','Denominazione ufficio']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()


def write_unreferenced_regno_images(root_dir: Path, out_csv: Path, image_index: dict = None):
    """Scrive un CSV con immagini presenti nel progetto che non sono referenziate da nessun JSON di targhette."""
    # Sezioni con il prefisso del nome file usato da compute_section_stats
    # prefixes: lista di prefissi di nome da aggiungere alle varianti attese
    sections = [
        {'json': root_dir / 'regno' / 'targhetteRegno.json',              'prefixes': ['prev']},
        {'json': root_dir / 'triestea' / 'targhetteTriesteA.json',        'prefixes': ['prev_trieste']},
        {'json': root_dir / 'colonie' / 'libia' / 'targhetteLibia.json',  'prefixes': ['prev_tripoli', 'prev_libia']},
    ]
    expected = set()
    for sec in sections:
        p = sec['json']
        if not p.exists():
            continue
        try:
            with open(p, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception:
            data = []
        for item in data:
            uff = item.get('Targhetta Ufficio')
            extra = item.get('extra', '')
            if uff is None:
                continue
            extra_part = f"_{str(extra).strip()}" if extra and str(extra).strip() != "" else ""
            for prefix in sec['prefixes']:
                filename = f"{prefix}_{uff}{extra_part}.jpeg"
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
    project_dir = Path(__file__).parent.parent.parent
    total_pages = count_html_pages(project_dir)
    total_images = count_images(project_dir)
    # costruisci un indice delle immagini una sola volta
    image_index = build_image_index(project_dir)

    regno_stats = compute_section_stats(project_dir, "regno", "targhetteRegno.json", image_index=image_index)
    trieste_stats = compute_section_stats(project_dir, "triestea", "targhetteTriesteA.json", image_index=image_index)
    libia_stats = compute_section_stats(project_dir, Path("colonie") / "libia", "targhetteLibia.json", image_index=image_index) if True else compute_section_stats(project_dir, "colonie/libia", "targhetteLibia.json", image_index=image_index)
    stats = {
        "total_pages": total_pages,
        "total_images": total_images,
        "sections": {
            "Regno": regno_stats,
            "Trieste A": trieste_stats,
            "Libia": libia_stats,
        },
    }
    # Retrocompatibilità: totale targhette = somma delle sezioni
    total_targhette = 0
    for s in stats["sections"].values():
        total_targhette += s.get("total_catalogati", 0)

    # Conta località uniche leggendo i JSON delle sezioni (se esistono)
    localita_set = set()
    for folder, json_file in [("regno", "targhetteRegno.json"), ("triestea", "targhetteTriesteA.json"), ("colonie/libia", "targhetteLibia.json")]:
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

    # Conta datari univoci come terne (Località, Denominazione ufficio, Datario) distinte,
    # considerando tutti i JSON catalogo. Il campo Datario deve essere non vuoto.
    # Si usa "Denominazione ufficio" (nome) e non "Targhetta Ufficio" (ID numerico)
    # perché lo stesso ufficio fisico può avere ID diversi nei vari file.
    # Lo stesso datario fisico comparso in più file viene contato una sola volta.
    ALL_CATALOG_JSONS = [
        ("regno",         "targhetteRegno.json"),
        ("regno",         "OndeRegno.json"),
        ("regno",         "BarreRegno.json"),
        ("regno",         "SoloDatarioRegno.json"),
        ("regno",         "SingoloCerchio.json"),
        ("regno",         "doppioCerchio.json"),
        ("regno",         "RRPosteRegno.json"),
        ("triestea",      "targhetteTriesteA.json"),
        ("colonie/libia", "targhetteLibia.json"),
        ("colonie/libia", "ondeLibia.json"),
    ]
    datari_set = set()
    for folder, json_file in ALL_CATALOG_JSONS:
        p = project_dir / folder / json_file
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    data = json.load(f)
                for item in data:
                    dat = (item.get("Datario") or "").strip()
                    if not dat:
                        continue
                    loc = (item.get("Località") or "").strip()
                    den = (item.get("Denominazione ufficio") or "").strip()
                    datari_set.add((loc, den, dat))
            except Exception:
                pass
    stats["total_datari"] = len(datari_set)

    # Conta onde classificate
    total_onde = 0
    for onde_folder, onde_file in [("regno", "OndeRegno.json"), ("colonie/libia", "ondeLibia.json")]:
        onde_json = project_dir / onde_folder / onde_file
        if onde_json.exists():
            try:
                with open(onde_json, "r", encoding="utf-8") as f:
                    total_onde += len(json.load(f))
            except Exception:
                pass
    stats["total_onde"] = total_onde

    # Conta barre classificate
    barre_json = project_dir / "regno" / "BarreRegno.json"
    total_barre = 0
    if barre_json.exists():
        try:
            with open(barre_json, "r", encoding="utf-8") as f:
                total_barre = len(json.load(f))
        except Exception:
            pass
    stats["total_barre"] = total_barre

    # Conta targhette del Regno presenti nel catalogo Ornaghi 1992
    # Non si filtra per Periodo perché il campo "Ornaghi 1992" indica già
    # la presenza nel catalogo indipendentemente dal periodo (es. RSI, Luogotenenza, ecc.)
    regno_json_path = project_dir / "regno" / "targhetteRegno.json"
    ornaghi_count = 0
    if regno_json_path.exists():
        try:
            with open(regno_json_path, "r", encoding="utf-8") as f:
                regno_data = json.load(f)
            ornaghi_count = sum(1 for item in regno_data if item.get("Ornaghi 1992") not in (None, "", 0))
        except Exception:
            pass
    regno_catalogati = stats["sections"]["Regno"].get("total_catalogati", 0)
    stats["sections"]["Regno"]["targhette_in_ornaghi_1992"] = ornaghi_count
    stats["sections"]["Regno"]["targhette_nuove_vs_ornaghi_1992"] = regno_catalogati - ornaghi_count

    output_file = Path(__file__).parent / "site_stats.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)
    print("✓ Conteggio completato!")
    print(f"✓ Pagine totali: {stats['total_pages']}")
    print(f"✓ Immagini totali: {stats['total_images']}")
    print("✓ Sezioni:")
    for name, s in stats["sections"].items():
        print(f"  - {name}: catalogati={s['total_catalogati']}, immagini={s['images_present']}, {s['images_pct']}%, datari={s['datario_present']}, {s['datario_pct']}%")
    print(f"✓ Datari univoci totali: {stats['total_datari']}")
    print(f"✓ Onde classificate: {stats['total_onde']}")
    print(f"✓ Barre classificate: {stats['total_barre']}")
    print(f"✓ Targhette in Ornaghi 1992: {stats['sections']['Regno']['targhette_in_ornaghi_1992']}")
    print(f"✓ Targhette nuove vs Ornaghi 1992: {stats['sections']['Regno']['targhette_nuove_vs_ornaghi_1992']}")
    # Genera report CSV per immagini mancanti e non referenziate (Regno)
    missing_csv = project_dir / 'missing_images.csv'
    unref_csv = project_dir / 'unreferenced_regno_images.csv'
    write_missing_images_report(project_dir, missing_csv, image_index=image_index)
    write_unreferenced_regno_images(project_dir, unref_csv, image_index=image_index)
    print(f"✓ Report creati: {missing_csv.name}, {unref_csv.name}")


if __name__ == "__main__":
    main()
