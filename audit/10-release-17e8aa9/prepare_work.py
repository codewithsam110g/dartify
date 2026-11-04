"""Reconstruct the audited source workspace without accessing Git metadata."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil

base = Path(__file__).resolve().parent
repository = base.parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--verify-only', action='store_true')
args = parser.parse_args()
manifest = json.loads((base / 'coverage.json').read_text())
sources = []
for item in manifest['files']:
    relative = Path(item['path'])
    if relative.is_absolute() or '..' in relative.parts:
        raise SystemExit(f'Unsafe manifest path: {relative}')
    source = repository / relative
    if not source.is_file() or hashlib.sha256(source.read_bytes()).hexdigest() != item['sha256']:
        raise SystemExit(f'Source differs from audited content: {relative}')
    target = base / 'work' / relative
    if not args.verify_only and target.exists():
        if not target.is_file() or hashlib.sha256(target.read_bytes()).hexdigest() != item['sha256']:
            raise SystemExit(f'Existing workspace differs; left untouched: {relative}')
    sources.append((source, target))
if not args.verify_only:
    for source, target in sources:
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists():
            shutil.copy2(source, target)
print(f'Verified {len(sources)} source files at {manifest["audited_head"]}.')
if args.verify_only:
    print('Verification only; no workspace files written.')
else:
    print('Source workspace ready. Install the frozen dependencies, then follow REPRODUCE.md.')
