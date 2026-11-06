"""Prepare illustrative Natural Earth land geometry; no numeric story data.

Optional authoring step: python3 scripts/prepare_conclusion_art.py
The runtime asset is committed; the browser makes no map or font requests.
"""
import hashlib
import json
from pathlib import Path
from urllib.request import urlopen

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'src/assets/conclusion'
URL='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson'
source=urlopen(URL).read()
def rounded(value):
    if isinstance(value,list):return [rounded(v) for v in value]
    return round(value,3) if isinstance(value,float) else value
land=json.loads(source)
land={'type':'FeatureCollection','features':[{'type':'Feature','properties':{},'geometry':{'type':f['geometry']['type'],'coordinates':rounded(f['geometry']['coordinates'])}} for f in land['features']]}
OUT.mkdir(parents=True,exist_ok=True)
(OUT/'land.json').write_text(json.dumps(land,separators=(',',':'))+'\n')
(OUT/'sources.json').write_text(json.dumps({'purpose':'Illustrative geography; no analytical flight dataset.',
 'sources':{'land':{'url':URL,'sha256':hashlib.sha256(source).hexdigest()}}},indent=2)+'\n')
