"""Create the checked-in web images from local originals. Requires Pillow.

Usage: python3 scripts/optimize-images.py /path/to/originals
Original filenames match the asset names in content/portfolio.json plus .jpg.
Run the normal build afterward. Originals are never copied into the website.
"""
from pathlib import Path
import json
import sys
from PIL import Image, ImageOps

root = Path(__file__).resolve().parent.parent
source = Path(sys.argv[1])
target = root / 'public' / 'images'
target.mkdir(parents=True, exist_ok=True)
content = json.loads((root / 'content' / 'portfolio.json').read_text())
assets = {image['asset'] for project in content['projects'] for image in project['images']}
manifest = {}
for asset in sorted(assets):
    image = ImageOps.exif_transpose(Image.open(source / (asset + '.jpg'))).convert('RGB')
    original_width, original_height = image.size
    variants = {}
    for width in (640, 1600):
        copy = image.copy()
        desired_width = min(width, original_width)
        copy = copy.resize((desired_width, round(original_height * desired_width / original_width)), Image.Resampling.LANCZOS)
        filename = f'{asset}-{width}.webp'
        copy.save(target / filename, 'WEBP', quality=84, method=6)
        variants[str(width)] = {'src': 'images/' + filename, 'width': copy.width, 'height': copy.height}
    manifest[asset] = variants
(root / 'content' / 'assets.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(f'Prepared {len(manifest)} photographs in two sizes.')
