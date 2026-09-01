#!/usr/bin/env bash
# Imports the shop's still photography into public/products.
#
#   ./scripts/import-product-images.sh ~/Desktop/rangkaarii-shots
#
# Files are taken in filename order (Screenshot ... 8.03.47 PM, 8.03.56 PM, …
# sort correctly) and written out as 01.webp … 17.webp, which is what the
# homepage sections reference.
set -euo pipefail

src=${1:?usage: import-product-images.sh <folder of images>}
dest="$(cd "$(dirname "$0")/.." && pwd)/public/products"
mkdir -p "$dest"

i=0
while IFS= read -r file; do
  i=$((i + 1))
  printf -v out '%s/%02d.webp' "$dest" "$i"
  cwebp -quiet -q 82 -resize 1200 0 "$file" -o "$out"
  echo "$(basename "$file") -> $(basename "$out")"
done < <(find "$src" -maxdepth 1 -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.heic' -o -iname '*.webp' \) | sort)

echo "imported $i image(s) into public/products"
