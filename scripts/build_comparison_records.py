"""Build the comparison prototype's portable records from the retained snapshot."""
import argparse
import hashlib
import json
from collections import Counter
from datetime import datetime
from pathlib import Path
from statistics import quantiles
import polars as pl

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--check', action='store_true')
parser.add_argument('--age-audit', action='store_true', help='Print reproducible age-distribution summaries without changing source records')
args = parser.parse_args()
manifest = json.loads((ROOT / 'data/sources.json').read_text())
source = next(f for f in manifest['files'] if f['path'] == 'data/raw/planecrashdata.parquet')
raw_path = ROOT / source['path']
assert hashlib.sha256(raw_path.read_bytes()).hexdigest() == source['sha256'], 'Retained source changed'
phase_rules = json.loads((ROOT / 'data/flight-exploration-rules.json').read_text())['phase']
operation_map = {
    'Scheduled Revenue Flight':'scheduled', 'Private':'private',
    'Charter/Taxi (Non Scheduled Revenue Flight)':'charter', 'Cargo':'cargo',
    'Executive/Corporate/Business':'business', 'Training':'training', 'Military':'military',
}
operation_labels = {'scheduled':'Scheduled revenue', 'private':'Private', 'charter':'Charter / taxi',
                    'cargo':'Cargo', 'business':'Business', 'training':'Training', 'military':'Military',
                    'other':'Other / not recorded'}
# Literal leading aircraft-name labels, not corporate ownership or production joins.
prefixes = ['De Havilland Canada','De Havilland','McDonnell Douglas','British Aerospace',
 'PZL-Mielec','Britten-Norman','Cessna','Beechcraft','Piper','Douglas','Antonov','Boeing',
 'Rockwell','Lockheed','Learjet','Fokker','Pilatus','Mitsubishi','Embraer','Ilyushin','Grumman',
 'Swearingen','Tupolev','Convair','Let','BAe','Yakovlev','Curtiss','Canadair','Dornier','Avro',
 'Airbus','Casa','Fletcher','Dassault','Fairchild','Short','Partenavia','Vickers','Socata',
 'Gulfstream','IAI','Sud-Aviation','Nord','GAF','Consolidated','Harbin','ATR','Saab','Sukhoi']
prefixes.sort(key=len, reverse=True)
rows = []
excluded_phase = 0
for r in pl.read_parquet(raw_path).to_dicts():
    date = datetime.fromisoformat(r['timestamp'].replace('Z','+00:00')).date()
    if not 1970 <= date.year <= 2024:
        continue
    phase = phase_rules.get(r['flight_phase'] or '', 'unknown')
    if phase not in ['departure','in_flight','arrival']:
        excluded_phase += 1
        continue
    aircraft = r['aircraft'] or 'Aircraft not recorded'
    maker = next((p for p in prefixes if aircraft.casefold() == p.casefold() or aircraft.casefold().startswith(p.casefold()+' ')), 'Unclassified name')
    yom = r['yom']
    age = date.year-yom if yom is not None and 1903 <= yom <= date.year else None
    fatalities = r['total_fatalities']
    assert fatalities is not None and fatalities >= 0
    rows.append([str(r['id']),date.isoformat(),date.year,operation_map.get(r['flight_type'],'other'),
                 r['flight_type'] or '',aircraft,maker,yom,age,fatalities,phase])
rows.sort(key=lambda r:(r[1],r[0]))
assert len({r[0] for r in rows}) == len(rows)
assert sum(r[3]=='scheduled' for r in rows) == 2792
payload = {
 'schema_version':1,
 'source':{'dataset':'MauroPello/planecrashdata','revision':manifest['huggingFaceRevision'],
           'url':'https://huggingface.co/datasets/MauroPello/planecrashdata','sha256':source['sha256'],
           'license':'CC BY 4.0'},
 'scope':{'years':[1970,2024],'phases':['departure','in_flight','arrival'],
          'age':'Calendar year at crash minus recorded manufacture year; only 1903 <= manufacture year <= crash year is usable',
          'manufacturer':'Literal leading aircraft-name labels from an explicit prefix list; no ownership inference',
          'manufacturerPrefixes':prefixes,'operationLabels':operation_labels,
          'operationMap':operation_map},
 'columns':['source_id','date','year','operation','raw_operation','aircraft','manufacturer','manufacture_year','age','fatalities','phase'],
 'rows':rows,
 'audit':{'records':len(rows),'excludedPhaseRecords':excluded_phase,
          'operationCounts':dict(Counter(r[3] for r in rows)),
          'unknownOrInvalidAge':sum(r[8] is None for r in rows),
          'unclassifiedManufacturer':sum(r[6]=='Unclassified name' for r in rows)},
}
text = json.dumps(payload,ensure_ascii=False,separators=(',',':'))+'\n'
output = ROOT / 'public/data/comparison-records.json'
if args.check:
    assert output.read_text() == text, 'Committed comparison data differs from retained source'
else:
    output.write_text(text)
print(json.dumps(payload['audit'],indent=2))

if args.age_audit:
    summaries = []
    for operation in ['all', 'scheduled']:
        for start, end in [(1970, 1989), (2005, 2024)]:
            cohort = [r for r in rows if r[8] is not None and start <= r[2] <= end and (operation == 'all' or r[3] == operation)]
            ages = sorted(r[8] for r in cohort)
            deciles = quantiles(ages, n=10, method='inclusive')
            summaries.append({'operation': operation, 'years': [start, end], 'records': len(ages),
                'p10': deciles[0], 'p90': deciles[8], 'central80Width': deciles[8]-deciles[0],
                'fiveYearBins': dict(sorted(Counter(age//5*5 for age in ages).items()))})
    print(json.dumps({'ageDistributionAudit': summaries}, indent=2))
