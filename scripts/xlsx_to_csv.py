#!/usr/bin/env python3
"""Convert the integrated insomnia-DTx xlsx into the raw CSVs the build pipeline consumes.
Sheets are matched by their numeric prefix so renames of the human label don't break it.
  run: python3 scripts/xlsx_to_csv.py [path-to-xlsx]   (default: data/source/insomnia_DTx_integrated_dataset.xlsx)
"""
import csv, sys, os
import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "data/source/insomnia_DTx_integrated_dataset.xlsx")
OUT = os.path.join(ROOT, "data/raw")

# sheet numeric-prefix -> output csv filename
MAP = {
    "01": "patients.csv",
    "02": "psg.csv",
    "03": "resp.csv",
    "04": "diary.csv",
    "05": "isi_epro.csv",
    "06": "watch_daily.csv",
    "07": "watch_sample.csv",
    "08": "applog.csv",
    "09": "error_key.csv",
    "10": "anomaly_key.csv",
}

os.makedirs(OUT, exist_ok=True)
wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
written = []
for ws in wb.worksheets:
    prefix = ws.title.split("_", 1)[0]
    name = MAP.get(prefix)
    if not name:
        continue  # skip guide
    path = os.path.join(OUT, name)
    n = 0
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        for row in ws.iter_rows(values_only=True):
            if row is None or all(c is None for c in row):
                continue
            w.writerow(["" if c is None else c for c in row])
            n += 1
    written.append(f"{ws.title} -> {name} ({n-1} data rows)")

print("\n".join(written))
