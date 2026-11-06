"""Independently reconcile the story payloads with the retained raw sources.

Read-only. Requires the optional retained Parquet and NTSB workbook, plus Polars.
Does not import chart/build helpers, fetch data, or rewrite prepared payloads.
"""
import hashlib
import json
from collections import Counter
from pathlib import Path
from statistics import quantiles
from xml.etree import ElementTree as ET
from zipfile import ZipFile

import polars as pl

ROOT = Path(__file__).resolve().parents[1]
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"


def load(name):
    return json.loads((ROOT / name).read_text())


def projection(payload):
    return [dict(zip(payload["columns"], row)) for row in payload["rows"]]


def workbook_cells(path, sheet_name):
    """Read actual XLSX cells directly; no prepared JSON or builder dependency."""
    with ZipFile(path) as archive:
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        sheet = next(s for s in workbook.find("m:sheets", NS) if s.attrib["name"] == sheet_name)
        rid = sheet.attrib[f"{{{REL}}}id"]
        relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        target = next(r.attrib["Target"] for r in relationships if r.attrib["Id"] == rid)
        filename = target.lstrip("/") if target.startswith("/") else f"xl/{target}"
        strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            strings = ["".join(s.itertext()) for s in ET.fromstring(archive.read("xl/sharedStrings.xml"))]
        cells = {}
        for cell in ET.fromstring(archive.read(filename)).findall(".//m:c", NS):
            value = cell.find("m:v", NS)
            if value is not None:
                cells[cell.attrib["r"]] = strings[int(value.text)] if cell.attrib.get("t") == "s" else value.text
        return cells


manifest = load("data/sources.json")
receipt = next(f for f in manifest["files"] if f["path"] == "data/raw/planecrashdata.parquet")
raw_path = ROOT / receipt["path"]
assert hashlib.sha256(raw_path.read_bytes()).hexdigest() == receipt["sha256"], "Raw source hash changed"
raw = pl.read_parquet(raw_path).to_dicts()
assert len(raw) == len({r["id"] for r in raw}), "Duplicate raw IDs"
for row in raw:
    row["year"] = int(row["timestamp"][:4])
by_id = {str(r["id"]): r for r in raw}

# Exact categories and independently specified source phase names.
airborne = {"Takeoff (climb)": "departure", "Flight": "in_flight", "Landing (descent or approach)": "arrival"}
operation_map = {
    "Scheduled Revenue Flight": "scheduled", "Private": "private",
    "Charter/Taxi (Non Scheduled Revenue Flight)": "charter", "Cargo": "cargo",
    "Executive/Corporate/Business": "business", "Training": "training", "Military": "military",
}
period = [r for r in raw if 1970 <= r["year"] <= 2024]
expected = [r for r in period if r["flight_phase"] in airborne]
comparison = load("public/data/comparison-records.json")
projected = projection(comparison)
assert {r["source_id"] for r in projected} == {str(r["id"]) for r in expected}, "Comparison cohort changed"
assert len(projected) == len({r["source_id"] for r in projected})
for row in projected:
    original = by_id[row["source_id"]]
    assert row["aircraft"] == original["aircraft"]
    assert row["fatalities"] == original["total_fatalities"]
    assert row["date"] == original["timestamp"][:10]
    assert row["year"] == original["year"]
    assert row["phase"] == airborne[original["flight_phase"]]
    assert row["operation"] == operation_map.get(original["flight_type"], "other")
    assert row["raw_operation"] == (original["flight_type"] or "")
    manufacture = original["yom"]
    age = original["year"] - manufacture if manufacture is not None and 1903 <= manufacture <= original["year"] else None
    assert row["age"] == age, f"Age differs: {row['source_id']}"
# Regression for the actual audit defect: model digits immediately after ATR.
atr = [r for r in projected if r["aircraft"].startswith(("ATR42", "ATR72"))]
assert len(atr) == 54 and all(r["manufacturer"] == "ATR" for r in atr)
assert all(r["manufacturer"] == "Hawker Siddeley" for r in projected if r["aircraft"].startswith("Hawker Siddeley "))
assert all(r["manufacturer"] == "Douglas" for r in projected if r["aircraft"].startswith("Douglas "))
assert all(r["total_fatalities"] is not None and r["total_fatalities"] >= 0 for r in period)

scheduled = [r for r in raw if r["flight_type"] == "Scheduled Revenue Flight" and 1950 <= r["year"] <= 2024]
decades = load("public/data/decade-trend.json")
for output in decades["rows"]:
    selected = [r for r in scheduled if output["start"] <= r["year"] <= output["end"]]
    assert output["count"] == len(selected)
    assert output["fatalCount"] == sum(r["total_fatalities"] > 0 for r in selected)
for output in decades["annual"]:
    selected = [r for r in scheduled if r["year"] == output["year"]]
    assert output["count"] == len(selected)
    assert output["fatalCount"] == sum(r["total_fatalities"] > 0 for r in selected)

flight = projection(load("public/data/flight-exploration.json"))
scheduled_period = [r for r in period if r["flight_type"] == "Scheduled Revenue Flight"]
assert {r["source_id"] for r in flight} == {str(r["id"]) for r in scheduled_period}
cause_map = {
    "Technical failure": "technical", "Human factor": "human", "Weather": "weather",
    "Other causes": "other", "Terrorism act, Hijacking, Sabotage": "intentional", "": "unknown",
}
phase_map = {**airborne, "Taxiing": "ground", "Parking": "ground", "": "unknown"}
for row in flight:
    original = by_id[row["source_id"]]
    assert row["date"] == original["timestamp"][:10]
    assert row["year"] == original["year"]
    assert row["aircraft"] == (original["aircraft"] or "")
    assert row["raw_phase"] == (original["flight_phase"] or "")
    assert row["raw_cause"] == (original["crash_cause"] or "")
    assert row["phase"] == phase_map[original["flight_phase"] or ""]
    assert row["cause"] == cause_map[original["crash_cause"] or ""]
known_scheduled = [r for r in scheduled_period if r["flight_phase"] in airborne]
assert {r["source_id"] for r in flight if r["phase"] in airborne.values()} == {
    r["source_id"] for r in projected if r["operation"] == "scheduled"
}

ntsb = load("public/data/scheduled-service.json")
workbook = ROOT / "data/reference/ntsb-aviation-statistics-2005-2024.xlsx"
assert hashlib.sha256(workbook.read_bytes()).hexdigest() == ntsb["meta"]["sourceWorkbookSha256"]
cells = workbook_cells(workbook, "Table 6")
for output in ntsb["rows"]:
    n = output["year"] - 2005 + 6
    assert output["year"] == int(cells[f"A{n}"])
    assert output["fatalAccidents"] == int(cells[f"D{n}"])
    assert output["departures"] == int(cells[f"I{n}"])
assert ntsb["summary"] == {k: sum(r[k] for r in ntsb["rows"]) for k in ("fatalAccidents", "departures")}

registration_keys = [(r["timestamp"], r["registration"]) for r in period]
component_keys = ("crew_fatalities", "passengers_fatalities", "other_fatalities")
component_mismatch = [r for r in period if r["total_fatalities"] != sum(r[k] or 0 for k in component_keys)]
fatal_class_mismatch = [r for r in component_mismatch if (r["total_fatalities"] > 0) != (sum(r[k] or 0 for k in component_keys) > 0)]
age_spread = []
for start, end in ((1970, 1989), (2005, 2024)):
    ages = [r["age"] for r in projected if r["age"] is not None and start <= r["year"] <= end]
    deciles = quantiles(ages, n=10, method="inclusive")
    age_spread.append({"years": [start, end], "records": len(ages), "p10": deciles[0], "p90": deciles[8]})
assert [(r["records"], r["p10"], r["p90"]) for r in age_spread] == [(5833, 2, 30), (2960, 7, 46)]
report = {
    "status": "PASS",
    "sourceRecords": len(raw),
    "periodRecords": len(period),
    "comparisonRecords": len(projected),
    "comparisonFatalRecords": sum(r["fatalities"] > 0 for r in projected),
    "excludedNonAirborneOrUnknownPhase": len(period) - len(projected),
    "unknownAge": sum(r["manufacture_year"] is None for r in projected),
    "invalidAge": sum(r["manufacture_year"] is not None and r["age"] is None for r in projected),
    "knownAgeModels": len({r["aircraft"] for r in projected if r["age"] is not None}),
    "allOperationsAgeSpread": age_spread,
    "operationCounts": dict(Counter(r["operation"] for r in projected)),
    "unclassifiedManufacturer": sum(r["manufacturer"] == "Unclassified name" for r in projected),
    "decadeCounts": [r["count"] for r in decades["rows"]],
    "decadeFatalCounts": [r["fatalCount"] for r in decades["rows"]],
    "scheduledPhaseCounts": dict(Counter(airborne[r["flight_phase"]] for r in known_scheduled)),
    "ntsbScheduled": ntsb["summary"],
    "duplicateTimestampRegistration": len(registration_keys) - len(set(registration_keys)),
    "componentFatalityMismatchIds": [r["id"] for r in component_mismatch],
    "fatalClassificationWouldChangeWithComponentSum": [r["id"] for r in fatal_class_mismatch],
    "sameEventDifferentAircraftExample": [
        {k: r[k] for k in ("id", "timestamp", "aircraft", "registration", "total_fatalities", "flight_phase")}
        for r in period if r["timestamp"].startswith("1977-03-27")
    ],
}
print(json.dumps(report, indent=2))
