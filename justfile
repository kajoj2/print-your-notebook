# Traveler's Notebook inserts – pipeline (macOS / Windows).
# Usage: just <target> [insert] [extra options], e.g.:
#   just build example-planner
#   just impose example-dots --set format=passport
#   just preview example-planner --pages 14-17

set windows-shell := ["powershell.exe", "-NoLogo", "-NoProfile", "-Command"]

py := if os_family() == "windows" { ".venv/Scripts/python.exe" } else { ".venv/bin/python" }
sys_py := if os_family() == "windows" { "python" } else { "python3" }
nb := py + " scripts/nb.py"
insert := "example-dots"

# list targets
default:
    @just --list

# one-off: Python environment (pypdf) for impose/verify
setup:
    {{sys_py}} -m venv .venv
    {{py}} -m pip install --quiet --upgrade pip
    {{py}} -m pip install --quiet -r requirements.txt
    typst --version

# PDF of single pages (preview)
build name=insert *opts:
    {{nb}} build {{name}} {{opts}}

# landscape A4, 2 pages per sheet (pocket: portrait A4, 4 pages), signature order + marks
impose name=insert *opts:
    {{nb}} impose {{name}} {{opts}}

# sheet fronts (manual duplex, step 1)
print-odd name=insert *opts:
    {{nb}} print-odd {{name}} {{opts}}

# sheet backs (manual duplex, step 2; order per duplex.even_reverse)
print-even name=insert *opts:
    {{nb}} print-even {{name}} {{opts}}

# both files for manual duplex
print name=insert *opts: (print-odd name opts) (print-even name opts)

# duplex test sheet (offset, orientation)
calibration *opts:
    {{nb}} calibration {{opts}}

# rotate to 210x297 + 600 dpi raster: see the comment on `prepare` in nb.py
prepare file *opts:
    {{nb}} prepare {{file}} {{opts}}

# fronts and backs ready to send to the printer (manual duplex)
print-ready name=insert *opts:
    {{nb}} print-ready {{name}} {{opts}}

# a design from the website as an insert: just from-web '<link from "Copy link">' my-notes [--force]
from-web link name *opts:
    @node --experimental-strip-types --no-warnings --import ./web/scripts/ts-resolve.mjs web/scripts/from-web.ts "{{link}}" {{name}} {{opts}}
    {{nb}} build {{name}}

# calibration sheet ready to print, one page per file
calibration-ready *opts: (calibration opts)
    {{nb}} prepare build/calibration.pdf --page 1
    {{nb}} prepare build/calibration.pdf --page 2

# colour test sheet from config/palette.json (dots and lines in pattern weights)
color-test *opts:
    {{nb}} color-test {{opts}}

# colour test sheet ready to print (always a colour raster)
color-test-ready *opts: (color-test opts)
    {{nb}} prepare build/color-test.pdf

# order test for backs: 8 pages = 2 sheets with large page numbers
order-test:
    {{nb}} print-odd example-dots --set pages=8
    {{nb}} print-even example-dots --set pages=8

# PNGs of selected pages into build/preview (--pages 1-4, --imposed)
preview name=insert *opts:
    {{nb}} preview {{name}} {{opts}}

# live preview of a single file, e.g. just watch templates/week
watch file *opts:
    {{nb}} watch {{file}} {{opts}}

# everything for an insert + verifying sizes and order
all name=insert *opts: (impose name opts) (print-odd name opts) (print-even name opts) (calibration)
    {{nb}} verify {{name}} {{opts}}

# verify already built files
verify name=insert *opts:
    {{nb}} verify {{name}} {{opts}}

# remove build/
clean:
    {{py}} -c "import shutil; shutil.rmtree('build', ignore_errors=True)"
