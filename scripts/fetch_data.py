"""Restore source downloads recorded in data/sources.json; raw files stay out of Git."""
import hashlib
import json
import shutil
import urllib.request
from pathlib import Path

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'data/sources.json').read_text())
for entry in manifest['files']:
    path = root / entry['path']
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        print('Downloading', path.name, flush=True)
        temporary = path.with_suffix(path.suffix + '.partial')
        with urllib.request.urlopen(entry['url'], timeout=120) as response, temporary.open('wb') as output:
            shutil.copyfileobj(response, output)
        temporary.replace(path)
    digest = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            digest.update(chunk)
    if entry.get('sha256') and digest.hexdigest() != entry['sha256']:
        raise SystemExit(f'{path.name} differs from the recorded snapshot. Review before rebuilding.')
    print('Verified', path.name)
