"""Build small, reviewed chart inputs from the locally downloaded source snapshot."""
import hashlib
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import polars as pl

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data/raw"
OUT = ROOT / "public/data"
OUT.mkdir(parents=True, exist_ok=True)
rows = pl.read_parquet(RAW / "planecrashdata.parquet").to_dicts()
for r in rows:
    r["year"] = int(r["timestamp"][:4]) if r["timestamp"] else None
    parts = [r[k] for k in ["crew_on_board", "passengers_on_board", "crew_fatalities", "passengers_fatalities"]]
    r["valid_occupancy"] = all(x is not None and x >= 0 for x in parts) and sum(parts[:2]) > 0 and parts[2] <= parts[0] and parts[3] <= parts[1]
    r["occupants"] = sum(parts[:2]) if r["valid_occupancy"] else None
    r["onboard_deaths"] = sum(parts[2:]) if r["valid_occupancy"] else None

cohorts = {"all": lambda r: True, "scheduled": lambda r: r["flight_type"] == "Scheduled Revenue Flight", "private": lambda r: r["flight_type"] == "Private"}
years = list(range(1970, 2026))
periods = [(1970, 1989), (1990, 2009), (2010, 2019), (2020, 2025)]
cause_names = ["Technical failure", "Human factor", "Weather", "Terrorism act, Hijacking, Sabotage", "Other causes", "Unknown"]
phase_names = ["Takeoff / climb", "En route", "Approach / landing", "Ground", "Unknown / other"]
phase_map = {
    "Takeoff (climb)": 0, "Take off": 0, "Initial climb": 0,
    "Flight": 1, "En route": 1,
    "Landing (descent or approach)": 2, "Landing": 2, "Approach": 2,
    "Taxiing": 3, "Taxi": 3, "Parking": 3, "Standing": 3, "Pushback / towing": 3,
}
patterns = {
    "Engine": r"\b(engine|engines|powerplant|powerplants)\b",
    "Systems": r"\b(hydraulic|electrical|avionics|instrument|instruments)\b",
    "Structure": r"\b(structural|structure|wing|wings|fuselage)\b",
    "Maintenance": r"\b(maintenance|inspection|repair|repairs)\b",
}

def grouped(rs):
    counts = Counter((r["year"], r["crash_cause"] or "Unknown") for r in rs)
    phase = Counter(phase_map.get(r["flight_phase"], 4) for r in rs)
    heat = []
    for label, pattern in patterns.items():
        for lo, hi in periods:
            base = [r for r in rs if lo <= r["year"] <= hi and r["crash_cause"] == "Technical failure"]
            matches = [r for r in base if re.search(pattern, r["circumstances"] or "", re.I)]
            heat.append({"term": label, "period": f"{lo}–{hi}", "n": len(matches), "denominator": len(base), "share": len(matches) / len(base) if base else None,
                         "examples": [{"id": r["id"], "date": r["timestamp"][:10], "aircraft": r["aircraft"], "text": (r["circumstances"] or "")[:420]} for r in matches[:2]]})
    return {
        "annual": [{"year": y, "count": sum(1 for r in rs if r["year"] == y)} for y in years],
        "causes": [{"year": y, **{c: counts[y, c] for c in cause_names}} for y in years],
        "phases": [{"phase": name, "count": phase[i], "share": phase[i] / len(rs) if rs else 0} for i, name in enumerate(phase_names)],
        "heatmap": heat,
        "n": len(rs),
    }

included = [r for r in rows if r["year"] in years]
data = {"cohorts": {k: grouped([r for r in included if fn(r)]) for k, fn in cohorts.items()}, "causeNames": cause_names}
types = ["Scheduled Revenue Flight", "Private", "Charter/Taxi (Non Scheduled Revenue Flight)", "Executive/Corporate/Business"]
data["flightTypes"] = []
for typ in types:
    rs = [r for r in included if r["flight_type"] == typ]
    valid = [r for r in rs if r["valid_occupancy"]]
    aboard = sum(r["occupants"] for r in valid)
    deaths = sum(r["onboard_deaths"] for r in valid)
    data["flightTypes"].append({"type": typ, "records": len(rs), "validRecords": len(valid), "excluded": len(rs) - len(valid), "occupants": aboard, "fatalities": deaths, "fraction": deaths / aboard if aboard else None})
wb = json.loads((RAW / "world-bank-departures.json").read_text())
data["departures"] = sorted([{"year": int(r["date"]), "value": r["value"]} for r in wb[1] if r["value"] is not None], key=lambda r: r["year"])
data["audit"] = {"sourceRecords": len(rows), "uniqueIds": len({r['id'] for r in rows}), "firstYear": min(r['year'] for r in rows if r['year']), "lastYear": max(r['year'] for r in rows if r['year']), "chartPeriod": "1970–2025", "includedRecords": len(included), "outsidePeriod": len(rows) - len(included), "invalidOccupancyInChartPeriod": sum(not r['valid_occupancy'] for r in included), "unknownCausesInChartPeriod": sum(not r['crash_cause'] for r in included), "worldBankLastUpdated": wb[0]['lastupdated']}
data["sources"] = {"crashes": "https://huggingface.co/datasets/MauroPello/planecrashdata", "departures": "https://data.worldbank.org/indicator/IS.AIR.DPRT"}
assert len(rows) == data['audit']['uniqueIds'], 'Duplicate source IDs need review'
for c in data['cohorts'].values():
    assert sum(r['count'] for r in c['annual']) == c['n']
    assert sum(r['count'] for r in c['phases']) == c['n']
    assert sum(sum(r[k] for k in cause_names) for r in c['causes']) == c['n']
for t in data['flightTypes']:
    assert t['fatalities'] <= t['occupants']
(OUT / "sketch-data.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))

urls = {
    'planecrashdata.parquet': 'https://huggingface.co/datasets/MauroPello/planecrashdata/resolve/b817a96f2b9152b735c9c6570d465102f5f76c88/data/train-00000-of-00001.parquet',
    'world-bank-departures.json': 'https://api.worldbank.org/v2/country/WLD/indicator/IS.AIR.DPRT?format=json&per_page=20000',
    'world-bank-indicator.json': 'https://api.worldbank.org/v2/indicator/IS.AIR.DPRT?format=json',
    'aircraft-production.zip': 'https://www.kaggle.com/api/v1/datasets/download/alvaroibrain/aircraft-production-data',
    'us-accidents.zip': 'https://www.kaggle.com/api/v1/datasets/download/sobhanmoosavi/us-accidents',
    'acars-world-reports.html': 'https://web.archive.org/web/20180425185655id_/http://www.acarsd.org/world_ACARS_reports.html',
    'acars-report-20060101.txt': 'https://web.archive.org/web/20180425185655id_/http://www.acarsd.org/world_ACARS_reports/ACARS_Report_20060101.txt',
}
manifest = {"retrieved": datetime.now(timezone.utc).isoformat(), "huggingFaceRevision": "b817a96f2b9152b735c9c6570d465102f5f76c88", "files": []}
for name, url in urls.items():
    p = RAW / name
    if not p.exists():
        manifest['files'].append({"path": f"data/raw/{name}", "url": url, "status": "not downloaded"})
        continue
    h = hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    manifest['files'].append({"path": f"data/raw/{name}", "url": url, "bytes": p.stat().st_size, "sha256": h.hexdigest()})
(ROOT / 'data/sources.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps(data['audit'], indent=2))
print('Flight type outcomes:', data['flightTypes'])
