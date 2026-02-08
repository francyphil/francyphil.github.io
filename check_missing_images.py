#!/usr/bin/env python3
"""
Scan `regno/targhetteRegno.json` and report which cataloged "targhette" do not
have a corresponding image file in `regno/jpg` according to the rule:

  jpg/prev_<Targhetta Ufficio>[_<Extra>].jpeg

Usage:
  python3 check_missing_images.py [--json PATH] [--img-dir DIR] [--out FILE]

Options:
  --try-exts    also try .jpg and .png when the .jpeg file is missing
"""

import os
import json
import argparse
from collections import defaultdict


def build_filename(ufficio, extra, ext='.jpeg'):
    uff = str(ufficio).strip()
    ex = '' if extra is None else str(extra).strip()
    if ex:
        return f'prev_{uff}_{ex}{ext}'
    return f'prev_{uff}{ext}'


def main():
    p = argparse.ArgumentParser(description='Find cataloged targhette missing images')
    p.add_argument('--json', default='regno/targhetteRegno.json', help='Path to JSON file (default: regno/targhetteRegno.json)')
    p.add_argument('--img-dir', default='regno/jpg', help='Directory containing images (default: regno/jpg)')
    p.add_argument('--out', help='Optional output CSV/JSON file to write missing entries')
    p.add_argument('--try-exts', action='store_true', help='If set, try .jpg and .png when .jpeg missing')
    args = p.parse_args()

    if not os.path.exists(args.json):
        print(f'JSON file not found: {args.json}')
        return

    with open(args.json, 'r', encoding='utf-8') as fh:
        data = json.load(fh)

    # Map expected filename -> list of records that reference it
    expected = defaultdict(list)
    for rec in data:
        # Accept multiple possible keys for ufficio/extra
        uff = rec.get('Targhetta Ufficio') or rec.get('Ufficio') or rec.get('ufficio')
        extra = rec.get('Extra') if 'Extra' in rec else rec.get('extra') if 'extra' in rec else ''
        if uff is None:
            continue
        fname = build_filename(uff, extra, ext='.jpeg')
        expected[fname].append({'record': rec, 'ufficio': uff, 'extra': extra})

    img_dir = args.img_dir
    available = set(os.listdir(img_dir)) if os.path.isdir(img_dir) else set()

    # If directory doesn't exist, report and exit
    if not os.path.isdir(img_dir):
        print(f'Image directory not found: {img_dir}')
        return

    missing = {}
    for fname, recs in expected.items():
        if fname in available:
            continue
        found = None
        if args.try_exts:
            base = os.path.splitext(fname)[0]
            for ext in ('.jpeg', '.jpg', '.png'):
                cand = base + ext
                if cand in available:
                    found = cand
                    break
        if not found:
            missing[fname] = recs

    total_unique = len(expected)
    total_missing = len(missing)
    total_records = len(data)
    total_missing_records = sum(len(v) for v in missing.values())

    print('Scan summary:')
    print('  JSON records:        ', total_records)
    print('  Unique expected img: ', total_unique)
    print('  Missing filenames:   ', total_missing)
    print('  Records affected:    ', total_missing_records)

    if total_missing:
        print('\nMissing filenames (first 200 chars of sample record):')
        for fname, recs in sorted(missing.items()):
            sample = recs[0]['record']
            desc = sample.get('Descrizione') or sample.get('Targhetta Tipo') or ''
            print(f' - {fname}  ({len(recs)} record(s))  sample: {str(desc)[:200]}')

    if args.out:
        out = args.out
        if out.lower().endswith('.json'):
            with open(out, 'w', encoding='utf-8') as fh:
                json.dump({k: [r['record'] for r in v] for k, v in missing.items()}, fh, ensure_ascii=False, indent=2)
            print(f'Wrote missing records to {out}')
        else:
            # write simple CSV
            import csv
            with open(out, 'w', newline='', encoding='utf-8') as fh:
                writer = csv.writer(fh)
                writer.writerow(['filename', 'count', 'sample_descr'])
                for k, v in missing.items():
                    sample = v[0]['record']
                    writer.writerow([k, len(v), sample.get('Descrizione') or ''])
            print(f'Wrote missing records to {out}')


if __name__ == '__main__':
    main()
