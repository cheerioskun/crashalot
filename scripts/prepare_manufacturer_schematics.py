"""Render reviewed manufacturer PDF figures into the Polaroid asset catalogue.

Requires Pillow and pdftoppm. The source PDFs are cached outside the asset folder;
only the reviewed figure images are shipped. No source PDF is altered.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import urllib.request

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCES = [
    dict(model='Airbus A300-600', name='a300600', credit='Drawing · Airbus',
         url='https://www.airbus.com/sites/g/files/jlcbta136/files/2021-11/Airbus-Commercial-Aircraft-AC-A300-600-Dec-2009.pdf',
         figures=[(21, (.13, .15, .88, .835))]),
    dict(model='Airbus A350-900', name='a350', credit='Drawing · Airbus',
         url='https://mediaassets.airbus.com/pm_38_787_787482-4sir0n2x4f.pdf?fileName=a350-aircraft-characteristics-airport-and-maintenance-planning.pdf',
         figures=[(49, (.10, .13, .94, .78)), (48, (.10, .13, .94, .77))]),
    dict(model='Boeing 737 MAX 8', name='737max', credit='Drawing · Boeing',
         url='https://www.boeing.com/content/dam/boeing/v2/airports/acaps/737MAX_RevK.pdf',
         figures=[(26, (.14, .15, .87, .89))]),
]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--pdf-dir', type=Path, default=ROOT / 'tmp/pdfs/manufacturer-schematics')
    args = parser.parse_args()
    args.pdf_dir.mkdir(parents=True, exist_ok=True)
    renderer = shutil.which('pdftoppm')
    if not renderer:
        raise RuntimeError('pdftoppm is required; use the bundled workspace runtime or install Poppler.')
    manifest_path = ROOT / 'src/data/aircraft-schematics.json'
    catalogue = json.loads(manifest_path.read_text())
    for source in SOURCES:
        pdf = args.pdf_dir / f"{source['name']}.pdf"
        if not pdf.exists():
            urllib.request.urlretrieve(source['url'], pdf)
        images = []
        for page, bounds in source['figures']:
            prefix = args.pdf_dir / f"{source['name']}-figure-{page}"
            subprocess.run([renderer, '-f', str(page), '-l', str(page), '-scale-to', '2000', '-singlefile', '-png', str(pdf), str(prefix)], check=True)
            image = Image.open(prefix.with_suffix('.png')).convert('RGB')
            box = tuple(round(value * (image.width if index % 2 == 0 else image.height)) for index, value in enumerate(bounds))
            images.append(image.crop(box))
        canvas = Image.new('RGB', (1400, 1000), 'white')
        column_width = 1400 // len(images)
        for index, image in enumerate(images):
            fitted = ImageOps.contain(image, (column_width - 40, 960))
            canvas.paste(fitted, (index * column_width + (column_width - fitted.width) // 2, (1000 - fitted.height) // 2))
        asset = f"assets/aircraft-schematics/manufacturer-{source['name']}.png"
        output = ROOT / 'public' / asset
        canvas.save(output, optimize=True)
        entry = dict(model=source['model'], subject=source['model'], sourceType='manufacturer-pdf',
                     sourceUrl=source['url'] + f"#page={source['figures'][0][0]}",
                     sourceDocumentUrl=source['url'], sourcePages=[page for page, _ in source['figures']],
                     crops=[list(bounds) for _, bounds in source['figures']],
                     sourceSha256=hashlib.sha256(pdf.read_bytes()).hexdigest(),
                     status='manufacturer-drawing', asset=asset,
                     sha256=hashlib.sha256(output.read_bytes()).hexdigest(),
                     credit=source['credit'], rights='Manufacturer drawing; original copyright retained. Figure crops assembled without changing aircraft geometry.',
                     cohort='boeing-airbus-extension', retrievedAt='2026-11-06')
        catalogue['models'] = [model for model in catalogue['models'] if model['model'] != entry['model']]
        catalogue['models'].append(entry)
        print(f"Rendered {entry['model']} from PDF pages {entry['sourcePages']}")
    catalogue['provider'] = 'The-Blueprints.com; Airbus; Boeing'
    manifest_path.write_text(json.dumps(catalogue, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
