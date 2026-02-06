#!/usr/bin/env python3
"""
Genera un file JSON con le destinazioni postali dal Regno d'Italia
basandosi sulle immagini in static/jpeg/destinazioni
"""

import os
import json
import re

# Database coordinate città principali
COORDINATE_DB = {
    # Asia
    'Bagdad': [33.3152, 44.3661],
    'Baghdad': [33.3152, 44.3661],
    'Tsingtau': [36.0671, 120.3826],
    'Hankow': [30.5928, 114.3055],
    'Shanghai': [31.2304, 121.4737],
    'Tiensin': [39.1422, 117.1767],
    'Allahabad': [25.4358, 81.8463],
    'Bombay': [19.0760, 72.8777],
    'Ceylon': [7.8731, 80.7718],
    'Madras': [13.0827, 80.2707],
    'Karachi': [24.8607, 67.0011],
    
    # Medio Oriente
    'Istanbul': [41.0082, 28.9784],
    'Costantinopoli': [41.0082, 28.9784],
    'Ankara': [39.9334, 32.8597],
    'Smirne': [38.4237, 27.1428],
    'Chio': [38.3677, 26.1360],
    'Tel_Aviv': [32.0853, 34.7818],
    'Haifa': [32.7940, 34.9896],
    'Palestina': [31.9522, 35.2332],
    
    # Europa
    'Sofia': [42.6977, 23.3219],
    'Atene': [37.9838, 23.7275],
    'Patrasso': [38.2466, 21.7346],
    'Salonicco': [40.6401, 22.9444],
    'Riga': [56.9496, 24.1052],
    'Oslo': [59.9139, 10.7522],
    'Kristania': [59.9139, 10.7522],
    'Porzan': [52.4064, 16.9252],
    'Montecarlo': [43.7384, 7.4246],
    'Monaco': [43.7384, 7.4246],
    'Lund': [55.7047, 13.1910],
    'Stoccolma': [59.3293, 18.0686],
    'Zagabria': [45.8150, 15.9819],
    'Fiume': [45.3271, 14.4422],
    'Barcellona': [41.3851, 2.1734],
    
    # Africa
    'Bengasi': [32.1191, 20.0869],
    'Alessandria': [31.2001, 29.9187],
    'Cairo': [30.0444, 31.2357],
    'Nairobi': [1.2921, 36.8219],
    'Dakar': [14.6937, -17.4441],
    'Elisabethville': [-11.6795, 27.5069],
    'CapeTown': [-33.9249, 18.4241],
    'Zinder': [13.8069, 8.9881],
    
    # Americhe
    'BuenosAires': [-34.6037, -58.3816],
    'Quito': [-0.1807, -78.4678],
    'Lima': [-12.0464, -77.0428],
    'Callao': [-12.0566, -77.1181],
    'Montevideo': [-34.9011, -56.1645],
    'NewYork': [40.7128, -74.0060],
    'New_York': [40.7128, -74.0060],
    'Chicago': [41.8781, -87.6298],
    'Easton': [40.6884, -75.2207],
    'Berkley': [37.8715, -122.2730],
    'Newtonville': [42.3370, -71.2092],
    'Ontario': [43.6532, -79.3832],
    'Winnipeg': [49.8951, -97.1384],
    
    # Oceania
    'Perth': [-31.9505, 115.8605],
    'Wellington': [-41.2865, 174.7762],
    
    # Europa (aggiunte)
    'LasPalmas': [28.1235, -15.4363],
    'La_Valletta': [35.8989, 14.5146],
    'Malta': [35.8989, 14.5146],
    'Cipro': [35.1264, 33.4299],
    'Vaticano': [41.9029, 12.4534],
    'SanMarino': [43.9424, 12.4578],
    'Liechtenstein': [47.1660, 9.5554],
}

# Tipo di destinazione in base alla regione
def get_tipo_destinazione(paese, citta):
    """Determina il tipo di destinazione"""
    estero_europa = ['Albania', 'Bulgaria', 'Grecia', 'Norvegia', 'Svezia', 'Polonia', 
                     'Principato_di_Monaco', 'Monaco', 'Liechtenstein', 'Ungheria', 
                     'Yugoslavia', 'Estonia', 'Lettonia', 'Finlandia', 'Spagna']
    
    coloniale = ['Libia', 'Egitto', 'Tunisia', 'Senegal', 'Kenya', 'Nigeria', 
                 'Congo_Belga', 'SudAfrica', 'Togoland']
    
    if paese in estero_europa or citta in ['Atene', 'Sofia', 'Oslo', 'Stoccolma']:
        return 'estero_europa'
    elif paese in coloniale:
        return 'coloniale'
    else:
        return 'estero_mondo'

def parse_filename(filename):
    """Estrae informazioni dal nome del file"""
    # Rimuovi estensione
    name = os.path.splitext(filename)[0]
    
    # Pattern: Paese_Città.ext o Paese.ext
    parts = name.split('_')
    
    if len(parts) >= 2:
        paese = parts[0]
        # Rimuovi numeri e altre info dalla città
        citta = re.sub(r'\s*\d+$', '', '_'.join(parts[1:]))
        citta = re.sub(r'\s+', '', citta)
    else:
        paese = parts[0]
        citta = None
    
    return paese, citta

def get_coordinate(paese, citta):
    """Cerca le coordinate nel database"""
    # Prova prima con la città
    if citta and citta in COORDINATE_DB:
        return COORDINATE_DB[citta]
    
    # Poi col paese
    if paese in COORDINATE_DB:
        return COORDINATE_DB[paese]
    
    return None

def main():
    base_path = 'static/jpeg/destinazioni'
    
    if not os.path.exists(base_path):
        print(f"Errore: directory {base_path} non trovata")
        return
    
    destinazioni = []
    files_without_coords = []
    
    # Leggi tutti i file
    files = [f for f in os.listdir(base_path) 
             if f.lower().endswith(('.jpeg', '.jpg', '.png')) and not f.startswith('.')]
    
    for filename in sorted(files):
        paese, citta = parse_filename(filename)
        coords = get_coordinate(paese, citta)
        
        if coords is None:
            files_without_coords.append(filename)
            continue
        
        # Crea nome leggibile
        if citta:
            nome_display = citta.replace('_', ' ')
            descrizione = f"{paese.replace('_', ' ')} - {citta.replace('_', ' ')}"
        else:
            nome_display = paese.replace('_', ' ')
            descrizione = paese.replace('_', ' ')
        
        tipo = get_tipo_destinazione(paese, citta)
        
        destinazione = {
            'nome': nome_display,
            'coords': coords,
            'tipo': tipo,
            'descrizione': descrizione,
            'immagine': f'/static/jpeg/destinazioni/{filename}',
            'paese': paese,
            'citta': citta
        }
        
        destinazioni.append(destinazione)
    
    # Salva JSON
    output_file = 'destinazioni_data.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(destinazioni, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Generato {output_file} con {len(destinazioni)} destinazioni")
    print(f"✓ File mappati: {len(destinazioni)}/{len(files)}")
    
    if files_without_coords:
        print(f"\n⚠ {len(files_without_coords)} file senza coordinate:")
        for f in files_without_coords[:10]:  # mostra primi 10
            print(f"  - {f}")
        if len(files_without_coords) > 10:
            print(f"  ... e altri {len(files_without_coords) - 10}")

if __name__ == '__main__':
    main()
