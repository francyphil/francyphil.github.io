#!/bin/bash

echo "========================================"
echo "Esecuzione script di rilascio"
echo "========================================"

echo ""
echo "Eseguendo site_stats.py..."
python3 site_stats.py

if [ $? -ne 0 ]; then
    echo "ERRORE: site_stats.py fallito con codice $?"
    exit $?
fi

echo ""
echo "Eseguendo generate_destinazioni.py..."
python3 generate_destinazioni.py

if [ $? -ne 0 ]; then
    echo "ERRORE: generate_destinazioni.py fallito con codice $?"
    exit $?
fi

echo ""
echo "========================================"
echo "Tutti gli script completati con successo!"
echo "========================================"