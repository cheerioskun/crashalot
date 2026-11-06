"""Prepare illustrative land geometry and outlined Pinyon Script lettering.

Optional authoring step: uv run --with fonttools python scripts/prepare_conclusion_art.py
All runtime assets are committed; no font or geography request happens in the browser.
"""
import hashlib
import json
from pathlib import Path
from urllib.request import urlopen
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.boundsPen import BoundsPen
from io import BytesIO

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'src/assets/conclusion'
OUT.mkdir(parents=True,exist_ok=True)
URLS={
 'land':'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson',
 'font':'https://raw.githubusercontent.com/google/fonts/main/ofl/pinyonscript/PinyonScript-Regular.ttf',
 'license':'https://raw.githubusercontent.com/google/fonts/main/ofl/pinyonscript/OFL.txt',
}
inputs={key:urlopen(url).read() for key,url in URLS.items()}
def rounded(value):
    if isinstance(value,list):return [rounded(v) for v in value]
    return round(value,3) if isinstance(value,float) else value
land=json.loads(inputs['land'])
land={'type':'FeatureCollection','features':[{'type':'Feature','properties':{},'geometry':{'type':f['geometry']['type'],'coordinates':rounded(f['geometry']['coordinates'])}} for f in land['features']]}
(OUT/'land.json').write_text(json.dumps(land,separators=(',',':'))+'\n')
font=TTFont(BytesIO(inputs['font']));glyphs=font.getGlyphSet();cmap=font.getBestCmap()
letters=[];cursor=0
for char in 'Fin':
    glyph=glyphs[cmap[ord(char)]];pen=SVGPathPen(glyphs);glyph.draw(pen)
    rec=RecordingPen();glyph.draw(rec);contours=[];current=RecordingPen()
    for command,args in rec.value:
        getattr(current,command)(*args)
        if command in ('closePath','endPath'):
            bounds=BoundsPen(glyphs);current.replay(bounds)
            svg=SVGPathPen(glyphs);current.replay(svg)
            contours.append({'path':svg.getCommands(),'bounds':bounds.bounds});current=RecordingPen()
    # Pinyon's detached i-dot is the small contour above its cursive stem.
    dot=max(contours,key=lambda c:c['bounds'][1]) if char=='i' else None
    letters.append({'letter':char,'x':cursor,'path':pen.getCommands(),
        'body':' '.join(c['path'] for c in contours if c is not dot),
        'dot':dot['path'] if dot else None,'contours':[c['bounds'] for c in contours]})
    cursor+=font['hmtx'].metrics[cmap[ord(char)]][0]
(OUT/'fin.json').write_text(json.dumps({'font':'Pinyon Script','letters':letters},separators=(',',':'))+'\n')
(OUT/'PinyonScript-OFL.txt').write_bytes(inputs['license'])
(OUT/'sources.json').write_text(json.dumps({'purpose':'Illustrative geography and calligraphic outlines; no analytical flight dataset.',
 'sources':{key:{'url':URLS[key],'sha256':hashlib.sha256(value).hexdigest()}for key,value in inputs.items()}},indent=2)+'\n')
print(json.dumps([{'letter':l['letter'],'x':l['x'],'contours':l['contours']}for l in letters],indent=2))
