"""Create the checked-in web images from local originals. Requires Pillow.

Usage: python3 scripts/optimize-images.py /path/to/originals [--available-only]
Original filenames match the asset names in content/portfolio.json plus .jpg.
Run the normal build afterward. Originals are never copied into the website.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
import argparse
import json
from PIL import Image, ImageCms, ImageOps

root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source', type=Path)
parser.add_argument('--available-only', action='store_true', help='Process downloaded originals while the rest are still transferring.')
parser.add_argument('--force', action='store_true', help='Regenerate existing image variants.')
args = parser.parse_args()
source = args.source
target = root / 'public' / 'images'
target.mkdir(parents=True, exist_ok=True)
content = json.loads((root / 'content' / 'portfolio.json').read_text())
assets = {image['asset'] for project in content['projects'] for image in project['images']}
writing_assets = {writing['asset'] for writing in content['writings'] if writing.get('asset')}
required_widths = {asset: (320, 640, 1600) if asset in writing_assets else (640, 1600) for asset in assets}
manifest_path = root / 'content' / 'assets.json'
previous = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
manifest = {asset: {str(width): data[str(width)] for width in required_widths[asset] if str(width) in data} for asset, data in previous.items() if asset in assets}
pending = []
jobs = []
for asset in sorted(assets):
    original = source / (asset + '.jpg')
    entries = manifest.get(asset, {})
    widths = []
    for width in required_widths[asset]:
        entry = entries.get(str(width))
        variant = root / 'public' / entry['src'] if entry else None
        if args.force or variant is None or not variant.is_file() or (original.is_file() and original.stat().st_mtime > variant.stat().st_mtime):
            widths.append(width)
    if not widths:
        continue
    if not original.is_file():
        pending.append(asset)
        continue
    jobs.append((asset, widths))
if pending and not args.available_only:
    raise SystemExit('Missing originals: ' + ', '.join(pending))

def optimize(job):
    asset, widths = job
    with Image.open(source / (asset + '.jpg')) as original:
        image = ImageOps.exif_transpose(original)
        profile = image.info.get('icc_profile')
        if profile:
            # Untagged WebP is read as sRGB, so convert before dropping metadata.
            image = ImageCms.profileToProfile(
                image, BytesIO(profile), ImageCms.createProfile('sRGB'), outputMode='RGB'
            )
        else:
            image = image.convert('RGB')
    original_width, original_height = image.size
    variants = {}
    for width in widths:
        desired_width = min(width, original_width)
        copy = image.resize((desired_width, round(original_height * desired_width / original_width)), Image.Resampling.LANCZOS)
        filename = f'{asset}-{width}.webp'
        copy.save(target / filename, 'WEBP', quality=84, method=6)
        variants[str(width)] = {'src': 'images/' + filename, 'width': copy.width, 'height': copy.height}
    return asset, variants

with ThreadPoolExecutor(max_workers=3) as executor:
    for asset, variants in executor.map(optimize, jobs):
        manifest.setdefault(asset, {}).update(variants)
temporary = manifest_path.with_suffix('.json.tmp')
temporary.write_text(json.dumps(dict(sorted(manifest.items())), indent=2) + '\n')
temporary.replace(manifest_path)
print(f'Prepared {sum(len(widths) for _, widths in jobs)} image variants; {len(manifest)}/{len(assets)} photographs available, including writing thumbnails.' + (f' Waiting for {len(pending)} originals.' if pending else ''))
