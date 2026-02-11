#!/usr/bin/env python3
"""
Script per contare le pagine HTML e le statistiche del catalogo del sito.
Aggiornato per calcolare, per sezione, numero catalogati, immagini presenti
e percentuale di completamento immagini.
"""

import json
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


def exists_anywhere(root_dir: Path, filename: str) -> bool:
    for p in root_dir.rglob(filename):
        if p.is_file():
            return True
    return False


def compute_section_stats(root_dir: Path, folder: str, json_filename: str):
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
        if exists_anywhere(root_dir, filename):
            images_present += 1
    pct = round((images_present / total) * 100, 1) if total > 0 else 0.0
    return {"total_catalogati": total, "images_present": images_present, "images_pct": pct}


def main():
    project_dir = Path(__file__).parent
    total_pages = count_html_pages(project_dir)
    total_images = count_images(project_dir)
    regno_stats = compute_section_stats(project_dir, "regno", "targhetteRegno.json")
    trieste_stats = compute_section_stats(project_dir, "triestea", "targhetteTriesteA.json")
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


if __name__ == "__main__":
    main()
