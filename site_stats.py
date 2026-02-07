#!/usr/bin/env python3
"""
Script per contare le pagine HTML e le statistiche del catalogo del sito.
Esegui questo script ogni volta che aggiungi o rimuovi pagine HTML o targhette.

Regole di conteggio:
- Esclude navbar.html e footer.html (componenti)
- Conta cittaDettaglio.html e ufficioDettaglio.html come 1 pagina sola
- Conta targhette e località dal file targhetteRegno.json
"""

import os
import json
from pathlib import Path

def count_html_pages(root_dir):
    """Conta tutti i file .html nel progetto seguendo le regole specificate"""
    html_files = []
    
    # Trova tutti i file .html ricorsivamente
    for file_path in Path(root_dir).rglob("*.html"):
        # Converti a stringa relativa per debug
        rel_path = file_path.relative_to(root_dir)
        html_files.append(str(rel_path))
    
    # Escludi navbar.html e footer.html
    excluded = {'navbar.html', 'footer.html'}
    filtered_files = [f for f in html_files if Path(f).name not in excluded]
    
    # Conta totale
    total_count = len(filtered_files)
    
    # Se entrambi cittaDettaglio e ufficioDettaglio esistono, contali come 1
    has_citta = any('cittaDettaglio.html' in f for f in filtered_files)
    has_ufficio = any('ufficioDettaglio.html' in f for f in filtered_files)
    
    if has_citta and has_ufficio:
        total_count -= 1  # Sottraiamo 1 perché li contiamo insieme
    
    return total_count

def count_catalog_stats(root_dir):
    """Conta targhette e località dal file JSON del catalogo"""
    json_path = root_dir / 'regno' / 'targhetteRegno.json'
    
    if not json_path.exists():
        return {'total_targhette': 0, 'total_localita': 0}
    
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Conta targhette
    total_targhette = len(data)
    
    # Conta località uniche
    localita_set = set()
    for item in data:
        if item.get('Località'):
            localita_set.add(item['Località'])
    
    return {
        'total_targhette': total_targhette,
        'total_localita': len(localita_set)
    }

def count_images(root_dir):
    """Conta tutti i file immagine nel progetto"""
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.tiff', '.tif'}
    image_count = 0
    
    # Trova tutti i file con estensioni immagine ricorsivamente
    for file_path in Path(root_dir).rglob("*"):
        if file_path.suffix.lower() in image_extensions:
            image_count += 1
    
    return image_count

def main():
    # Directory del progetto (dove si trova questo script)
    project_dir = Path(__file__).parent
    
    # Conta le pagine
    total_pages = count_html_pages(project_dir)
    
    # Conta statistiche catalogo
    catalog_stats = count_catalog_stats(project_dir)
    
    # Conta le immagini
    total_images = count_images(project_dir)
    
    # Crea il dizionario con tutte le statistiche
    stats = {
        'total_pages': total_pages,
        'total_targhette': catalog_stats['total_targhette'],
        'total_localita': catalog_stats['total_localita'],
        'total_images': total_images
    }
    
    # Salva in site_stats.json
    output_file = project_dir / 'site_stats.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Conteggio completato!")
    print(f"✓ Pagine totali: {stats['total_pages']}")
    print(f"✓ Targhette catalogate: {stats['total_targhette']}")
    print(f"✓ Località uniche: {stats['total_localita']}")
    print(f"✓ Immagini totali: {stats['total_images']}")
    print(f"✓ Risultato salvato in: {output_file.name}")

if __name__ == '__main__':
    main()
