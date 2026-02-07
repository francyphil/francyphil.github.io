import os

# Cartella contenente i file (directory corrente del file)
folder_path = os.path.dirname(os.path.abspath(__file__))

# Prefisso da rimuovere
prefix_to_remove = "cropped_"

# Conta i file rinominati
count = 0

# Itera su tutti i file nella cartella
for filename in os.listdir(folder_path):
    if filename.startswith(prefix_to_remove):
        # Nuovo nome senza il prefisso
        new_name = filename[len(prefix_to_remove):]
        
        # Percorsi completi
        old_path = os.path.join(folder_path, filename)
        new_path = os.path.join(folder_path, new_name)
        
        # Rinomina il file
        os.rename(old_path, new_path)
        print(f"Rinominato: {filename} -> {new_name}")
        count += 1

print(f"\nTotale file rinominati: {count}")
