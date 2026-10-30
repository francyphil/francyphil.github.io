#!/usr/bin/env python3
"""Generate the Regno Ornaghi-by-type index used by the catalog runtime."""

import json
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / "regno" / "targhetteRegno.json"
INDEX_OUTPUT_FILE = ROOT / "regno" / "ornaghi_tipo_index.json"
CATALOG_OUTPUT_FILE = ROOT / "regno" / "ornaghi_tipo_catalog.json"


def js_string(value):
    if value is None:
        return "null"
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, list):
        return ",".join("" if item is None else js_string(item) for item in value)
    if isinstance(value, dict):
        return "[object Object]"
    return str(value)


def js_truthy(value):
    return value is not None and value is not False and value != 0 and value != ""


def is_array_index(value):
    if not value.isdigit() or (len(value) > 1 and value.startswith("0")):
        return False
    return int(value) < 4294967295


def main():
    with DATA_FILE.open(encoding="utf-8") as source:
        records = json.load(source)

    groups = defaultdict(lambda: {"indices": [], "imageIndices": []})
    for index, record in enumerate(records):
        tipo = js_string(record.get("Targhetta Tipo"))
        office = js_string(record.get("Targhetta Ufficio"))
        extra = record.get("extra")
        suffix = f"_{js_string(extra).strip()}" if js_truthy(extra) else ""
        image_path = f"jpg/prev_{office}{suffix}.jpeg"
        group = groups[tipo]
        group["indices"].append(index)
        if (ROOT / "regno" / image_path).is_file():
            group["imageIndices"].append(index)

    numeric_types = sorted((key for key in groups if is_array_index(key)), key=int)
    other_types = [key for key in groups if not is_array_index(key)]
    ordered_types = numeric_types + other_types
    selected_records = []
    for tipo in ordered_types:
        group = groups[tipo]
        selected_index = next(
            (index for index in group["imageIndices"]),
            group["indices"][0],
        )
        selected_records.append(records[selected_index])

    payload = {
        "sourceRecordCount": len(records),
        "groups": [
            {
                "type": tipo,
                "indices": groups[tipo]["indices"],
                "imageIndices": groups[tipo]["imageIndices"],
            }
            for tipo in ordered_types
        ],
    }
    with INDEX_OUTPUT_FILE.open("w", encoding="utf-8") as output:
        json.dump(payload, output, ensure_ascii=False, indent=2)
        output.write("\n")

    with CATALOG_OUTPUT_FILE.open("w", encoding="utf-8") as output:
        json.dump(selected_records, output, ensure_ascii=False, indent=2)
        output.write("\n")

    print(
        f"Catalogo Ornaghi Tipo generato: {len(selected_records)} record da "
        f"{len(records)} originali; indice con {len(ordered_types)} tipi."
    )


if __name__ == "__main__":
    main()