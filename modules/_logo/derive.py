# deduxit © Fabian Lukas Grubmüller 2026
# Licensed under the EUPL

# Every raster of the mark, drawn from its SVGs (src/logo/, the one source)
# with resvg: what the site serves under site/, and under github/ what only
# the author can upload to GitHub. The square icons are the dark square form,
# which reads on a light and on a dark background alike; the banners are the
# light word mark centred on the light square's field.
# Usage: python3 derive.py LOGO_DIR OUT
import pathlib
import re
import subprocess
import sys
import tempfile

src, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
square = (src / "square-dark.svg").read_text()
wordmark = (src / "wordmark-light.svg").read_text()

ROUNDED = ' rx="96"'
FIELD = re.compile(r'<rect width="512" height="512" rx="96" fill="(#[0-9a-f]{6})"/>')
if FIELD.search(square) is None:
    sys.exit("square-dark.svg: no rounded field of 512 by 512")
light_field = FIELD.search((src / "square-light.svg").read_text())
if light_field is None:
    sys.exit("square-light.svg: no rounded field of 512 by 512")
field = light_field[1]
view = re.search(r'viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"', wordmark)
if view is None:
    sys.exit("wordmark-light.svg: no viewBox to lay the banners out by")
mark_w, mark_h = float(view[3]), float(view[4])


def tile(rounded):
    """The square form on its field: with the rounded corners, or to the edge
    for a platform that cuts its own shape. Its ink lies inside the maskable
    icon's safe circle (a radius of 0.4 of the side), so it is never scaled."""
    return square if rounded else square.replace(ROUNDED, "", 1)


def banner(width, height, mark):
    """The word mark, `mark` pixels wide, centred on the field."""
    h = mark * mark_h / mark_w
    inner = wordmark.replace(
        "<svg ",
        f'<svg x="{(width - mark) / 2:.1f}" y="{(height - h) / 2:.1f}" width="{mark}" height="{h:.1f}" ',
        1,
    )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}">'
        f'<rect width="{width}" height="{height}" fill="{field}"/>{inner}</svg>\n'
    )


SITE = {
    "favicon-32.png": (tile(True), 32, 32),
    "apple-touch-icon.png": (tile(False), 180, 180),
    "icon-192.png": (tile(True), 192, 192),
    "icon-512.png": (tile(True), 512, 512),
    "icon-maskable-192.png": (tile(False), 192, 192),
    "icon-maskable-512.png": (tile(False), 512, 512),
    "og.png": (banner(1200, 630, 640), 1200, 630),
}
GITHUB = {
    "avatar.png": (tile(False), 512, 512),
    "social-preview.png": (banner(1280, 640, 640), 1280, 640),
}

with tempfile.TemporaryDirectory() as tmp:
    for part, files in [("site", SITE), ("github", GITHUB)]:
        (out / part).mkdir(parents=True)
        for name, (svg, width, height) in files.items():
            path = pathlib.Path(tmp) / f"{part}-{name}.svg"
            path.write_text(svg)
            subprocess.run(
                [
                    "resvg",
                    "--width",
                    str(width),
                    "--height",
                    str(height),
                    path,
                    out / part / name,
                ],
                check=True,
            )
            print(f"{part}/{name}: {width} by {height}")
