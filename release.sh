#!/bin/bash

echo "========================================"
echo "Esecuzione script di rilascio"
echo "========================================"

echo ""
echo "Eseguendo Check immagini mancanti check_missing_images.py..."
# Run checker and write CSV; capture exit code immediately
python3 check_missing_images.py --try-exts --out missing_images.csv
rc=$?
if [ $rc -ne 0 ]; then
    echo "ERRORE: check_missing_images.py fallito con codice $rc"
    exit $rc
fi

echo ""
echo "Eseguendo static/statistics/site_stats.py..."
python3 static/statistics/site_stats.py

if [ $? -ne 0 ]; then
    echo "ERRORE: static/statistics/site_stats.py fallito con codice $?"
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