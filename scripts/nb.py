#!/usr/bin/env python3
"""Insert pipeline: build / impose / print-odd / print-even / print-ready / calibration / color-test / prepare / preview / verify / watch.

Typst does all of the typesetting (imposition included). This script only:
  * runs typst with the same flags on macOS and Windows,
  * reads the PDF page count (pypdf) and passes it to impose.typ,
  * counts sheets, warns about a signature that's too thick, checks page sizes.

Config overrides: on the first line of an insert `// nb: format=passport pages=16`
or from the CLI: --set format=passport (the CLI wins). An inserts/<insert>.toml file next to the insert
(e.g. from `just from-web`) overrides config/notebook.toml key by key.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import shutil
import subprocess
import sys
import tomllib
from pathlib import Path

from pypdf import PdfReader, PdfWriter, Transformation
from pypdf.generic import DecodedStreamObject, NameObject, RectangleObject

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "build"
CONFIG = ROOT / "config" / "notebook.toml"
TYPST_FLAGS = ["--root", ".", "--font-path", "fonts", "--ignore-system-fonts"]
PT_PER_MM = 72 / 25.4
TOLERANCE_MM = 0.01
OUTPUTS = {"duplex": "impose", "odd": "print-odd", "even": "print-even"}
PRINT_DPI = 600


def fail(msg: str) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def typst(*args: str) -> str:
    exe = shutil.which("typst") or fail("'typst' not found in PATH")
    res = subprocess.run([exe, *args], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
    if res.stderr.strip():
        print(res.stderr.rstrip(), file=sys.stderr)
    if res.returncode != 0:
        fail(f"typst {args[0]} exited with code {res.returncode}")
    return res.stdout


def insert_path(name: str) -> Path:
    path = ROOT / "inserts" / f"{name}.typ"
    if not path.exists():
        available = ", ".join(p.stem for p in sorted((ROOT / "inserts").glob("*.typ")))
        fail(f"no insert '{name}'. Available: {available}")
    return path


def overrides(name: str, cli: list[str]) -> dict[str, str]:
    """Insert settings (inserts/<insert>.toml) + overrides from the header (`// nb: k=v ...`) + from the CLI."""
    result: dict[str, str] = {}
    if (own := insert_path(name).with_suffix(".toml")).exists():
        result["config"] = f"/{rel(own)}"
    first = insert_path(name).read_text(encoding="utf-8").splitlines()[:1]
    if first and (m := re.match(r"\s*//\s*nb:(.*)", first[0])):
        result.update(kv.split("=", 1) for kv in m.group(1).split() if "=" in kv)
    for kv in cli:
        if "=" not in kv:
            fail(f"--set expects key=value, got: {kv}")
        k, v = kv.split("=", 1)
        result[k] = v
    return result


def input_flags(ov: dict[str, str]) -> list[str]:
    return [a for k, v in ov.items() for a in ("--input", f"{k}={v}")]


def _merge(base: dict, over: dict) -> dict:
    """Like _merge in lib/config.typ: dictionaries merged recursively, everything else overridden."""
    out = dict(base)
    for k, v in over.items():
        out[k] = _merge(out[k], v) if isinstance(v, dict) and isinstance(out.get(k), dict) else v
    return out


def out_name(name: str, cli: list[str]) -> str:
    """CLI overrides go into the file name so that outputs don't get mixed up."""
    suffix = "".join(f"-{kv.split('=', 1)[1]}" for kv in cli)
    return f"{name}{suffix}"


def config(ov: dict[str, str]) -> dict:
    cfg = tomllib.loads(CONFIG.read_text(encoding="utf-8"))
    if "config" in ov:
        cfg = _merge(cfg, tomllib.loads((ROOT / ov["config"].lstrip("/")).read_text(encoding="utf-8")))
    cfg["_format"] = ov.get("format", cfg["insert"]["format"])
    cfg["_stacked"] = cfg["formats"][cfg["_format"]].get("stacked", False)
    return cfg


def sheet_size(cfg: dict) -> tuple[float, float]:
    """Sheet size in the impose PDF: stacked = portrait A4 (as in lib/sheet.typ)."""
    w, h = cfg["printer"]["sheet_width"], cfg["printer"]["sheet_height"]
    return (h, w) if cfg["_stacked"] else (w, h)


def rel(p: Path) -> str:
    return p.relative_to(ROOT).as_posix()


# --- commands ----------------------------------------------------------------

def cmd_build(a) -> Path:
    ov = overrides(a.insert, a.set)
    BUILD.mkdir(exist_ok=True)
    out = BUILD / f"{out_name(a.insert, a.set)}.pdf"
    typst("compile", *TYPST_FLAGS, *input_flags(ov), rel(insert_path(a.insert)), rel(out))
    print(f"✓ {rel(out)}  ({len(PdfReader(out).pages)} pages)")
    return out


def sheet_map(n_src: int) -> list[dict]:
    n = math.ceil(n_src / 4) * 4
    return [
        {"sheet": i + 1, "front": (n - 2 * i, 2 * i + 1), "back": (2 * i + 2, n - 2 * i - 1)}
        for i in range(n // 4)
    ]


def a4_map(n_src: int, stacked: bool) -> list[list[dict]]:
    """Signature sheets on consecutive A4 sheets (like a4-slots in lib/sheet.typ).
    stacked: top halves are sheets 1..A, bottom ones A+1..; the last bottom one may be empty."""
    rows = sheet_map(n_src)
    if not stacked:
        return [[r] for r in rows]
    a4 = math.ceil(len(rows) / 2)
    return [[rows[j]] + ([rows[j + a4]] if j + a4 < len(rows) else []) for j in range(a4)]


def impose(a, mode: str) -> Path:
    src = cmd_build(a)
    ov = overrides(a.insert, a.set)
    n_src = len(PdfReader(src).pages)
    out = BUILD / f"{out_name(a.insert, a.set)}-{OUTPUTS[mode]}.pdf"
    flags = [*TYPST_FLAGS, *input_flags(ov), "--input", f"src=/{rel(src)}",
             "--input", f"pages={n_src}", "--input", f"mode={mode}"]
    typst("compile", *flags, "impose.typ", rel(out))

    cfg = config(ov)
    sheets = len(sheet_map(n_src))
    a4 = len(a4_map(n_src, cfg["_stacked"]))
    pad = sheets * 4 - n_src
    print(f"✓ {rel(out)}  ({a4} A4 sheets" + (f" = {sheets} signature sheets" if a4 != sheets else "")
          + f", mode {mode}" + (f", padded with {pad} blank pages at the end" if pad else "") + ")")
    if sheets > cfg["duplex"]["max_sheets"]:
        print(f"⚠ WARNING: the signature has {sheets} sheets (> {cfg['duplex']['max_sheets']}). "
              "Consider splitting it into several booklets.", file=sys.stderr)
    if mode == "duplex":
        print_map(n_src, cfg)
    return out


def print_map(n_src: int, cfg: dict) -> None:
    rows = sheet_map(n_src)
    blank = lambda p: f"{p}" if p <= n_src else f"({p})"
    print("\nSheet │ front (L | R) │ back (L | R)   [(n) = blank]")
    for r in rows:
        f, b = r["front"], r["back"]
        print(f"  {r['sheet']:>3} │ {blank(f[0]):>5} | {blank(f[1]):<5} │ {blank(b[0]):>5} | {blank(b[1]):<5}")
    a4 = a4_map(n_src, cfg["_stacked"])
    if cfg["_stacked"]:
        print("\nA4 (portrait, cut in half) │ top │ bottom")
        for j, slot in enumerate(a4):
            low = f"sheet {slot[1]['sheet']}" if len(slot) > 1 else "(empty)"
            print(f"  {j + 1:>4} │ sheet {slot[0]['sheet']} │ {low}")
        print("After cutting: the stack of top halves, with the stack of bottom halves under it = sheets 1, 2, 3… in order.")
    order = list(range(1, len(a4) + 1))
    print(f"print-odd:  A4 {order}")
    if cfg["duplex"]["even_reverse"]:
        order.reverse()
    print(f"print-even: A4 {order}  (even_reverse={cfg['duplex']['even_reverse']})")


def cmd_calibration(a) -> None:
    BUILD.mkdir(exist_ok=True)
    out = BUILD / "calibration.pdf"
    typst("compile", *TYPST_FLAGS, *input_flags(dict(kv.split("=", 1) for kv in a.set)), "calibration.typ", rel(out))
    print(f"✓ {rel(out)}")


def cmd_color_test(a) -> None:
    BUILD.mkdir(exist_ok=True)
    out = BUILD / "color-test.pdf"
    typst("compile", *TYPST_FLAGS, *input_flags(dict(kv.split("=", 1) for kv in a.set)), "color-test.typ", rel(out))
    print(f"✓ {rel(out)}")


def _is_gray(hex_color: str) -> bool:
    h = hex_color.lstrip("#").lower()
    return len(h) == 6 and h[0:2] == h[2:4] == h[4:6]


def uses_color(cfg: dict) -> bool:
    """Whether any insert colour isn't a grey (then the raster has to be in colour)."""
    grid = cfg["grid"]
    colors = [grid["color"], grid.get("accent", grid["color"]),
              cfg["ink"]["text"], cfg["ink"]["line"], cfg["page_numbers"]["color"]]
    return not all(_is_gray(c) for c in colors)


def raster_color(cfg: dict, cli: str | None) -> bool:
    """Colour raster: --color/--gray from the CLI, then printer.color, "auto" = based on the insert's colours."""
    mode = cli or cfg["printer"].get("color", "auto")
    if mode not in ("auto", "gray", "color"):
        fail(f"printer.color must be auto | gray | color, got {mode!r}")
    return uses_color(cfg) if mode == "auto" else mode == "color"


def cmd_preview(a) -> None:
    ov = overrides(a.insert, a.set)
    name = out_name(a.insert, a.set)
    if a.imposed:
        impose(a, "duplex")
        src = BUILD / f"{name}.pdf"
        extra = [*input_flags(ov), "--input", f"src=/{rel(src)}",
                 "--input", f"pages={len(PdfReader(src).pages)}", "--input", "mode=duplex"]
        target, stem = "impose.typ", f"{name}-impose"
    else:
        extra, target, stem = input_flags(ov), rel(insert_path(a.insert)), name
    outdir = BUILD / "preview" / stem
    shutil.rmtree(outdir, ignore_errors=True)
    outdir.mkdir(parents=True)
    pattern = rel(outdir / "{0p}.png")
    typst("compile", *TYPST_FLAGS, *extra, "--format", "png", "--ppi", str(a.ppi),
          "--pages", a.pages, target, pattern)
    print(f"✓ {len(list(outdir.glob('*.png')))} PNGs in {rel(outdir)}/")


def pdf_sizes_mm(path: Path) -> list[tuple[float, float]]:
    return [(float(p.mediabox.width) / PT_PER_MM, float(p.mediabox.height) / PT_PER_MM)
            for p in PdfReader(path).pages]


def check_sizes(path: Path, w: float, h: float, expected_pages: int | None = None) -> bool:
    if not path.exists():
        print(f"✗ missing {rel(path)} – run build/impose first")
        return False
    sizes = pdf_sizes_mm(path)
    bad = [(i + 1, s) for i, s in enumerate(sizes)
           if abs(s[0] - w) > TOLERANCE_MM or abs(s[1] - h) > TOLERANCE_MM]
    ok = not bad and (expected_pages is None or len(sizes) == expected_pages)
    mark = "✓" if ok else "✗"
    print(f"{mark} {rel(path)}: {len(sizes)} pages, expected {w:g}×{h:g} mm"
          + (f", {expected_pages} pages" if expected_pages is not None else ""))
    for i, (sw, sh) in bad[:5]:
        print(f"    page {i}: {sw:.3f}×{sh:.3f} mm")
    return ok


def cmd_verify(a) -> None:
    ov = overrides(a.insert, a.set)
    cfg = config(ov)
    fmt = cfg["formats"][cfg["_format"]]
    sheet_w, sheet_h = sheet_size(cfg)
    name = out_name(a.insert, a.set)
    src = BUILD / f"{name}.pdf"
    ok = check_sizes(src, fmt["width"], fmt["height"])
    if not ok:
        sys.exit(1)
    n_src = len(PdfReader(src).pages)
    expected = sheet_map(n_src)
    sheets = len(expected)
    a4 = a4_map(n_src, cfg["_stacked"])
    ok &= check_sizes(BUILD / f"{name}-impose.pdf", sheet_w, sheet_h, 2 * len(a4))
    ok &= check_sizes(BUILD / f"{name}-print-odd.pdf", sheet_w, sheet_h, len(a4))
    ok &= check_sizes(BUILD / f"{name}-print-even.pdf", sheet_w, sheet_h, len(a4))
    # `just all` builds the calibration without --set, i.e. always in the default format
    cal_w, cal_h = sheet_size(config({}))
    ok &= check_sizes(BUILD / "calibration.pdf", cal_w, cal_h, 2)

    # order: what Typst actually laid out (<imposed> metadata) vs. the expected one
    def a4_side(slot: list[dict], s: str) -> list[tuple]:
        return [(j, r["sheet"], s, *r[s]) for j, r in enumerate(slot)]

    for mode in ("duplex", "odd", "even"):
        flags = [*TYPST_FLAGS, *input_flags(ov), "--input", f"src=/{rel(src)}",
                 "--input", f"pages={n_src}", "--input", f"mode={mode}"]
        got = json.loads(typst("eval", *flags, "--in", "impose.typ",
                               "query(<imposed>).map(m => m.value)"))
        if mode == "duplex":
            want = [t for slot in a4 for s in ("front", "back") for t in a4_side(slot, s)]
        elif mode == "odd":
            want = [t for slot in a4 for t in a4_side(slot, "front")]
        else:
            order = list(reversed(a4)) if cfg["duplex"]["even_reverse"] else a4
            want = [t for slot in order for t in a4_side(slot, "back")]
        have = [(g["slot"], g["sheet"], g["side"], g["left"], g["right"]) for g in got]
        same = have == want
        ok &= same
        print(f"{'✓' if same else '✗'} order {mode}: {len(have)} sheet sides match the signature map")

    # every source page appears exactly once
    pages = sorted(p for r in expected for s in ("front", "back") for p in r[s])
    once = pages == list(range(1, sheets * 4 + 1))
    ok &= once
    print(f"{'✓' if once else '✗'} every page 1–{sheets * 4} used exactly once")
    print_map(n_src, cfg)
    if sheets > cfg["duplex"]["max_sheets"]:
        print(f"⚠ the signature has {sheets} sheets (> {cfg['duplex']['max_sheets']})")
    print("\nVERIFICATION OK" if ok else "\nVERIFICATION FAILED")
    sys.exit(0 if ok else 1)


# --- preparing for print -----------------------------------------------------
# A driverless (AirPrint) queue passes the PDF through untouched, and the
# Samsung CLX-3300 interpreter has three defects, each breaking the print differently:
#   * it loses the mapping of Typst's embedded CID fonts and prints random glyphs,
#   * it fits a 297×210 page to A4 media on its own, rotating and scaling it,
#     so the scale is no longer 100% and calibration becomes meaningless,
#   * it ignores `lp -o page-ranges`, so the whole file goes to the printer.
# So we cut out the page here, bake the rotation into the content and rasterise everything.

def _to_portrait(page):
    """A 90° rotation baked into the content. Returns (page, target mediabox)."""
    w, h = float(page.mediabox.width), float(page.mediabox.height)
    if w > h:
        page.add_transformation(Transformation().rotate(90).translate(h, 0))
        box = RectangleObject((0, 0, h, w))
    else:
        box = RectangleObject((0, 0, w, h))
    page.mediabox = page.cropbox = page.trimbox = box
    page.pop("/Rotate", None)
    return page, box


def _rasterize(src: Path, dst: Path, box: RectangleObject, color: bool = False) -> None:
    """Pages -> 600 dpi images in a PDF with exactly the geometry of `box`.
    color: 24-bit RGB instead of 8-bit grey (pdfimage8 turns colours into grey)."""
    gs = shutil.which("gs") or fail("'gs' (ghostscript) not found in PATH")
    tmp = dst.with_suffix(".raster.pdf")
    device = "pdfimage24" if color else "pdfimage8"
    subprocess.run([gs, "-q", "-dNOPAUSE", "-dBATCH", f"-sDEVICE={device}",
                    f"-r{PRINT_DPI}", "-o", str(tmp), str(src)], check=True)
    w, h = float(box.width), float(box.height)
    out = PdfWriter()
    out.append(str(tmp))
    for page in out.pages:
        # gs rounds the page to the pixel grid; restore the sheet size
        names = list(page.get("/Resources", {}).get("/XObject", {}))
        if not names:
            fail("rasterisation produced no image — check the ghostscript version")
        cs = DecodedStreamObject()
        cs.set_data(f"q {w:.6f} 0 0 {h:.6f} 0 0 cm\n/{names[0]} Do Q".encode())
        page[NameObject("/Contents")] = out._add_object(cs)
        page.mediabox = page.cropbox = page.trimbox = RectangleObject((0, 0, w, h))
    with open(dst, "wb") as f:
        out.write(f)
    tmp.unlink()


def prepare_file(src: Path, cfg: dict, color_mode: str | None, page: int | None = None) -> Path:
    pages = PdfReader(src).pages
    picked = [page - 1] if page else range(len(pages))
    if page and not 1 <= page <= len(pages):
        fail(f"{rel(src)} has {len(pages)} pages, there is no page {page}")

    BUILD.mkdir(exist_ok=True)
    rotated, box = PdfWriter(), None
    for i in picked:
        p, box = _to_portrait(pages[i])
        rotated.add_page(p)
    tmp = BUILD / f"{src.stem}.rotated.pdf"
    with open(tmp, "wb") as f:
        rotated.write(f)

    suffix = f"-p{page}" if page else ""
    out = BUILD / f"{src.stem}-ready{suffix}.pdf"
    # the colour test sheet is always in colour, regardless of the insert's colours
    color = raster_color(cfg, "color" if src.stem == "color-test" else color_mode)
    _rasterize(tmp, out, box, color)
    tmp.unlink()

    got = PdfReader(out).pages[0]
    print(f"✓ {rel(out)}  ({len(PdfReader(out).pages)} pages, "
          f"{float(got.mediabox.width) / PT_PER_MM:.2f}×{float(got.mediabox.height) / PT_PER_MM:.2f} mm, no fonts, "
          f"{'colour' if color else 'grey'})")
    model = "RGB" if color else "Gray"
    print(f"  print: lp -d <queue> -o media=A4 -o ColorModel={model} -o sides=one-sided {rel(out)}")
    return out


def cmd_prepare(a) -> None:
    src = Path(a.file)
    if not src.is_absolute():
        src = ROOT / src if (ROOT / src).exists() else BUILD / src.name
    if not src.exists():
        fail(f"no such file {a.file}")
    ov = overrides(a.insert, a.set) if a.insert else dict(kv.split("=", 1) for kv in a.set)
    prepare_file(src, config(ov), a.color, a.page)


def cmd_print_ready(a) -> None:
    """The insert's fronts and backs, rotated and rasterised: ready to send to the printer."""
    odd, even = impose(a, "odd"), impose(a, "even")
    cfg = config(overrides(a.insert, a.set))
    print()
    prepare_file(odd, cfg, a.color)
    prepare_file(even, cfg, a.color)
    print("\nNext: print the fronts, flip the stack (README: \"Stack flipping procedure\"), print the backs.")


def cmd_watch(a) -> None:
    target = Path(a.file)
    if not target.suffix:
        target = target.with_suffix(".typ")
    if not (ROOT / target).exists():
        fail(f"no such file {target}")
    BUILD.mkdir(exist_ok=True)
    out = BUILD / "watch" / f"{target.stem}.pdf"
    out.parent.mkdir(exist_ok=True)
    exe = shutil.which("typst") or fail("'typst' not found in PATH")
    ov = dict(kv.split("=", 1) for kv in a.set)
    if (own := ROOT / target.with_suffix(".toml")).exists():
        ov = {"config": f"/{rel(own)}", **ov}
    flags = input_flags(ov)
    print(f"watching {target.as_posix()} → {rel(out)} (Ctrl+C to stop)")
    try:
        subprocess.run([exe, "watch", *TYPST_FLAGS, *flags, target.as_posix(), rel(out)], cwd=ROOT)
    except KeyboardInterrupt:
        pass


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    def add(name, fn, insert=True):
        sp = sub.add_parser(name)
        if insert:
            sp.add_argument("insert", help="file name in inserts/ without .typ")
        sp.add_argument("--set", action="append", default=[], metavar="KEY=VALUE",
                        help="config override (format, pages, grid, year)")
        sp.set_defaults(fn=fn)
        return sp

    add("build", cmd_build)
    add("impose", lambda a: impose(a, "duplex"))
    add("print-odd", lambda a: impose(a, "odd"))
    add("print-even", lambda a: impose(a, "even"))
    add("calibration", cmd_calibration, insert=False)
    add("color-test", cmd_color_test, insert=False)
    pv = add("preview", cmd_preview)
    pv.add_argument("--pages", default="1-4", help="e.g. 1-4 or 2,5,8- (default 1-4)")
    pv.add_argument("--ppi", type=int, default=150)
    pv.add_argument("--imposed", action="store_true", help="preview sheets after imposition")
    add("verify", cmd_verify)
    pr = add("prepare", cmd_prepare, insert=False)
    pr.add_argument("file", help="PDF to print, e.g. build/example-dots-print-odd.pdf")
    pr.add_argument("--page", type=int, help="only this one page (1-indexed)")
    pr.add_argument("--insert", help="colours from this insert's settings (inserts/<insert>.toml)")
    rd = add("print-ready", cmd_print_ready)
    for sp in (pr, rd):
        cm = sp.add_mutually_exclusive_group()
        cm.add_argument("--color", dest="color", action="store_const", const="color",
                        help="colour raster (default per printer.color)")
        cm.add_argument("--gray", dest="color", action="store_const", const="gray", help="greyscale raster")
    w = add("watch", cmd_watch, insert=False)
    w.add_argument("file", help="e.g. templates/week or inserts/example-dots")

    a = p.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
