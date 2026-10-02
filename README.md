# Traveler's Notebook inserts

A generator of inserts for the Traveler's Notebook, printed at home on A4
(the reference printer is a Samsung CLX-3300 with manual duplex). Typesetting is done by
[Typst](https://typst.app), graphics come from Affinity (SVG), and Python is only used
for orchestration and verification.

- Sizes: **regular** 110×210 mm, **passport** 89×124 mm, **pocket** 90×140 mm.
- Printing: A4 landscape, 2 pages per sheet, ordered for saddle stitching.
  The pocket size uses A4 portrait with 2 spreads one above the other (see below).
- Printed elements are thin and light grey so they don't get in the way when writing with a fountain pen.

## Installation

### macOS (Homebrew)

```sh
brew install typst just
code --install-extension myriad-dreamin.tinymist
just setup          # creates .venv with pypdf
```

### Windows

```powershell
winget install Typst.Typst Casey.Just Python.Python.3.13
code --install-extension myriad-dreamin.tinymist
just setup
```

Requirements: Typst ≥ 0.15, Python ≥ 3.11 (uses `tomllib`), just.

Typst always compiles with `--root . --font-path fonts --ignore-system-fonts`.
System fonts are disabled, so the output is identical on every computer.

## Commands

The default insert is `example-dots`. An insert's name is the file name in `inserts/` without `.typ`.

| command | what it does | output |
|---|---|---|
| `just build [insert]` | single pages in the insert's size | `build/<insert>.pdf` |
| `just impose [insert]` | A4 sheets for the signature (front, back, front…) with marks | `build/<insert>-impose.pdf` |
| `just print-odd [insert]` | sheet fronts only | `build/<insert>-print-odd.pdf` |
| `just print-even [insert]` | sheet backs only | `build/<insert>-print-even.pdf` |
| `just print [insert]` | both of the above | |
| `just print-ready [insert]` | fronts and backs **ready for the printer** | `build/<insert>-print-*-ready.pdf` |
| `just from-web '<link>' <name>` | a design from the website as an insert (see "Printing a notebook from the website") | `inserts/<name>.typ` + `.toml` |
| `just prepare <file>` | rotation + 600 dpi raster of a single PDF | `build/<file>-ready.pdf` |
| `just calibration` | duplex test sheet | `build/calibration.pdf` |
| `just calibration-ready` | calibration ready for the printer, one page per file | `build/calibration-ready-p{1,2}.pdf` |
| `just order-test` | 2 sheets (8 pages) to check the order of backs | |
| `just preview [insert] --pages 1-4` | PNGs of selected pages | `build/preview/<insert>/` |
| `just preview [insert] --imposed --pages 1-2` | PNGs of imposed sheets | `build/preview/<insert>-impose/` |
| `just watch templates/week` | `typst watch` of a single file | `build/watch/week.pdf` |
| `just all [insert]` | everything above + `verify` | |
| `just verify [insert]` | checks page sizes and signature order | |
| `just clean` | removes `build/` | |

**Overriding the config** without editing the file: `--set key=value`. Supported
keys are `format`, `pages`, `grid`, `year`. The overridden value goes into the output
file name, e.g.:

```sh
just all example-planner --set format=passport   # → build/example-planner-passport*.pdf
just build example-dots --set pages=16 --set grid=lines
```

An insert can also carry fixed overrides on the **first line** of the file:

```typst
// nb: format=passport pages=16
```

That line only applies when building through `just`. The Tinymist preview always uses the config values.

`impose` and `verify` print a sheet map. Numbers in parentheses are blank pages
the script adds to pad the insert to a multiple of 4:

```
Sheet │ front (L | R) │ back (L | R)   [(n) = blank]
    1 │  (28) | 1     │     2 | (27)
    2 │    26 | 3     │     4 | 25
```

If a signature has more than `duplex.max_sheets` (12) sheets, you get a warning.

## Live preview (VS Code + Tinymist)

Open the project folder in VS Code, then any file from `templates/` or `inserts/`,
and choose **Typst: Show Preview** (the icon in the top right corner).
`.vscode/settings.json` points Tinymist at the fonts in `fonts/` and the project root.

Every file in `templates/` ends with a "preview" section. It lets the template
compile on its own, and it's skipped when the template is imported.

## Configuration: `config/notebook.toml`

The fields are described in comments in the file. The most important sections:

- `[insert]`: size, default page count, language.
- `[margins]`: margins in mm (`inner` is on the spine side). Compilation
  **stops with an error** if a margin is smaller than the printer's unprintable
  area or if the page number would overlap the grid.
- `[grid]`: grid type (listed in a comment in the file), spacing, dot diameter, pattern and accent colour (palette in `config/palette.json`).
- `[insert] lang`: language of the text printed on pages, `pl` or `en` (`lib/i18n.typ`).
- `[calendar] week_start`: `monday` (default) or `sunday` in calendars.
- `[font]`: the font. Built into Typst: `Libertinus Serif` (default), `New Computer Modern`.
  `fonts/` contains typewriter fonts with Polish characters: `Courier Prime`,
  `Special Elite` (a "worn typewriter" look) and `Cutive Mono`. The OFL/Apache licences sit next to the font files.
- `[duplex]`: `dx`, `dy`, `even_reverse`, `rotate_back`, `max_sheets`.
- `[marks]`: cut marks (solid line) and fold marks (dashed line).

### Marks in the regular size

A regular insert is 210 mm tall, exactly the height of a landscape A4 sheet.
There's no room for marks above or below the insert. In this size, short
vertical ticks (cuts at the sides, the fold in the middle) are printed in a band
5.8–7.8 mm from the sheet edge, i.e. inside the insert's margin. You don't trim the top and bottom:
the edge of the sheet is the edge of the insert.

In sizes where you also cut the top and bottom (passport, pocket), marks
in the waste aren't enough: trimming the sides removes the marks for horizontal cuts,
and cutting off the top and bottom strips removes the vertical ones. So every intersection
of cut lines also gets a cross whose arms reach 2 mm into the insert's margin.
That way the cuts can be made in any order.

### Pocket size: two spreads on A4 (`stacked = true`)

A 180×140 mm spread sits on A4 **portrait**, two of them one above the other.
The fold runs along the long side of the A4 sheet, i.e. along the grain of typical
copy paper, and one A4 sheet yields two signature sheets.

```
┌──────── 210 ────────┐
│ ┌────────┬────────┐ │  top half = signature sheet j
│ │   L    ┆   R    │ │
│ ├────────┼────────┤ │  ← cut in half
│ │   L    ┆   R    │ │  bottom half = signature sheet A+j
│ └────────┴────────┘ │
└─────────────────────┘  297
```

With 32 pages that's 8 signature sheets on 4 sheets of A4. `impose` and `verify`
print the sheet map. After printing:

1. Cut the stack in half, trim the sides and cut off the strips at the top and bottom. The order
   doesn't matter: every intersection of cut lines has a cross whose arms
   reach 2 mm into the insert's margin, so they survive the cut in the other direction.
2. Put the stack of bottom halves **under** the stack of top halves. From the top, that's signature sheets 1, 2, 3…
3. Fold and stitch as usual.

The `[duplex]` offset is still given in the landscape layout. For a portrait sheet,
Typst converts it to `(dy, −dx)` and rotates the back by 180°, because the sheet
turns around its short side when you flip the stack, while the insert turns around its spine, which now lies along
the long side. Verified by printing on 2026-09-28 (the "UP" arrows match, the crosses
line up at `dx = 2`, `dy = 0`). Pocket calibration:
`just calibration-ready --set format=pocket`. Corrections read from this sheet
are entered differently than from a landscape one (see [Calibrating the offset](#calibrating-the-offset-dxdy)).

## Printing

### Printing a notebook from the website

You design on the website (`web/`) and print from the CLI, with the printer calibration from `config/notebook.toml`:

```sh
# 1. "Copy link" on the website, then (quote the link, it contains #):
just from-web 'http://localhost:5173/#c=…' my-notes
# 2. optional tweaks, preview: just preview my-notes --pages 1-6
# 3. fronts and backs ready for the printer:
just print-ready my-notes
```

`from-web` writes two files you can keep editing by hand:

- `inserts/my-notes.typ`: the notebook's sections in the order from the website (title page,
  index, calendars…) and the title. This is where you add, remove or reorder pages.
- `inserts/my-notes.toml`: size, margins, grid, font, colours and year.
  It overrides `config/notebook.toml` key by key. The printer, duplex, marks
  and page number position stay from the config: the website puts the number closer to the edge
  than the printer can print.

The usual overrides work too, e.g. `just print-ready my-notes --set grid=lines`
or `--gray`/`--color` for the raster. Running `from-web` again with the same name refuses
to overwrite; `--force` overwrites, and manual edits are lost. Margins smaller
than the unprintable area (7 mm) stop compilation with a message saying what to fix.
`from-web` only needs Node ≥ 22.6 (no `npm install`).

### Print settings (always)

**Print to the `drukarka_local` queue** (socket://drukarka.local, Generic PostScript).
The Mac also has an AirPrint queue `Samsung_CLX_3300_Series__…`, but the two queues
place the image on the sheet a few mm apart. `[duplex]` is measured for `drukarka_local`,
and a front and back from different queues end up misaligned in a way that can't be corrected.
If you send something to the wrong queue, cancel it (`cancel <id>`) before printing anything else:
that sheet lands on top of the output tray.

**Don't send files straight from `build/` to the printer — run `just prepare` first.**
The first prints went through the AirPrint queue and had three different defects, each breaking
the print in a different way. (A `cupsfilter` check on 2026-09-25 showed that this queue sends
URF raster rather than PDF, so the cause of the first defect isn't certain. Either way,
`prepare` removes all three, on `drukarka_local` too.)

| defect | symptom | what `prepare` does about it |
|---|---|---|
| loses Typst's CID font mapping | random glyphs instead of text, graphics skipped | rasterises the page to a 600 dpi image |
| fits 297×210 to A4 media on its own | rotates and scales, scale is no longer 100% | bakes in the rotation, outputs the page at exactly 210×297 |
| ignores `lp -o page-ranges` | prints the whole file instead of the chosen page | splits pages on the host |

```sh
just print-ready example-dots     # build/…-print-odd-ready.pdf and …-print-even-ready.pdf
just calibration-ready            # build/calibration-ready-p1.pdf and -p2.pdf
lp -d drukarka_local -o media=A4 -o ColorModel=Gray -o sides=one-sided build/<file>-ready.pdf
```

`prepare` prints the ready `lp` command, with `ColorModel=RGB` when the raster is in colour.

- **A4** paper. You don't handle the orientation by hand — `prepare` outputs portrait 210×297.
- **Don't set the scale in the print dialog.** The file is exactly the size of the sheet,
  so there's nothing to fit; `-o fit-to-page` would break it again.
- One-sided mode. The printer reports `sides-supported = one-sided`, i.e. it has no
  automatic duplex — hence two files and flipping the stack by hand.
- Colour: `prepare` rasterises in greyscale (`pdfimage8`) unless the insert has colours
  other than greys (`grid.color`, `grid.accent`, `ink.*`, `page_numbers.color`):
  then in RGB (`pdfimage24`). `printer.color = "gray" | "color"` in the config or
  `--gray` / `--color` for `prepare` forces the mode. In colour mode a laser may build
  grey elements from CMY toners, so it's worth comparing both modes.

### Colours

The pattern palette lives in `config/palette.json` and is shared by the website and the CLI.
A laser loses light, thin elements (light grey 0.35 mm dots came out as a blank
sheet), and lines in colours mixed from several toners can get coloured fringes
when the toners are misregistered. Before using a colour, print the test sheet:

```sh
just color-test-ready     # build/color-test-ready.pdf, always in colour
lp -d drukarka_local -o media=A4 -o ColorModel=RGB -o sides=one-sided build/color-test-ready.pdf
```

The sheet shows every palette colour as 0.4–0.8 mm dots and 0.08–0.3 mm lines.
Remove colours that don't pass from the palette.

Result on the CLX-3300 (`drukarka_local`, 2026-09-30): the whole palette prints
cleanly, without coloured fringes, and lines are solid from 0.08 mm up. 0.4 mm dots
are barely visible, so don't go below 0.5 mm (default 0.6).

### Manual duplex

1. `just print-ready example-planner` creates `…-print-odd-ready.pdf` and `…-print-even-ready.pdf`.
2. Print **`print-odd-ready`** (sheet fronts).
3. Take the printed stack, **don't shuffle or rotate it**, and put it back in the
   tray in the same orientation (full procedure and reasoning below).
4. Print **`print-even-ready`** (sheet backs).
5. Fold each sheet in half, nest the sheets inside each other, trim the sides along the
   marks and staple or stitch along the fold. For the pocket size, first
   cut the sheets in half (see [Pocket size](#pocket-size-two-spreads-on-a4-stacked--true)).

### Order test (once, at the start)

With `even_reverse = true` the `print-even` file has its sheets in reverse order.
That's what lasers that output sheets face down usually need.

**Verified 2026-09-22 on a Samsung CLX-3300: `even_reverse = true` is correct
for the procedure described below.** Repeat this test after changing the printer or
the way you flip the stack — there's no other way to confirm it.

#### Stack flipping procedure (the one in use)

> Take the stack out of the output tray. **Don't shuffle or rotate it.** Put it back
> in the tray in the same orientation it came out in: **on top of a few blank sheets**,
> straightened (a laser curls the paper) and with the **guides pushed up against it**.

Without these three things, sheet feeding on the second pass drifts by 2–3 mm
from print to print, i.e. more than the `[duplex]` correction itself. Calibration then
doesn't converge (verified 2026-09-28: successive corrections jumped back and forth
in opposite directions). With them, the misalignment dropped below 1 mm.

`duplex.dx` and `duplex.dy` were calculated for this procedure. If you flip the stack
differently, these corrections go the wrong way and the misalignment will be **twice
as large as without them** — then calibration has to start over from scratch.

#### Repeating the test

1. Run `just order-test`, then `just prepare` on both files (or straight away
   `just print-ready example-dots --set pages=8`).
2. Print the fronts, flip the stack according to the procedure above, print the backs.
3. Check the result:
   - the sheet with **8 | 1** on the front should have **2 | 7** on the back, and the sheet **6 | 3** should have **4 | 5**;
   - if backs landed on the wrong sheets, change `even_reverse`;
   - if a back is upside down, set `rotate_back = true` or flip the stack differently.

### Calibrating the offset (dx/dy)

1. `just calibration-ready` creates `build/calibration-ready-p1.pdf` and `-p2.pdf`.
2. Print **p1**, put the sheet back as in the order test, and print **p2**.
3. Check:
   - The dashed frame shows the assumed printable area (`printer.unprintable`).
     If it didn't print in full on the **front**, increase that value.
     On the back the frame is shifted by the `[duplex]` correction and may be cut off at
     one edge — that's not a printer fault.
   - The "UP" arrows on both sides should point to the same edge of the sheet.
     If not, set `rotate_back`.
   - Hold the sheet up to the light, front side towards you. The crosses and rulers on both sides should line up.
     Read off the front rulers how many mm the centre of the back cross is shifted (horizontally and vertically).
4. Correct `[duplex]` by the measured offset (relative to the current values, not from zero):

   | sheet | back cross **lower** by Y mm | back cross **to the right** by X mm |
   |---|---|---|
   | landscape (regular, passport) | `dy -= Y` | `dx += X` (the back is seen mirrored) |
   | portrait (pocket) | `dx -= Y` | `dy -= X` |

   A portrait sheet is different because `[duplex]` is stored in the landscape
   layout and Typst converts it to `(dy, −dx)`.
5. Print the calibration again. The current values are printed on the sheet.
   **If the error got bigger, flip the sign.** The direction depends on how you flip the stack,
   so confirm it with a print.

The current `dx = 2`, `dy = 0` were measured on `drukarka_local` on a portrait sheet (pocket).
The AirPrint queue gave `dx = 8`, `dy = 2`. A landscape sheet (regular, passport)
uses the same values but hasn't been checked on `drukarka_local` yet —
print `just calibration-ready` before the first such insert.

The offset applies to the whole back of a sheet (in the PDF that's pages 2, 4… of the
`impose` file and every page of `print-even`). The back of one sheet holds
one even and one odd page of the insert, e.g. 2 and 27.

## Layout

```
config/notebook.toml     all parameters
lib/
  config.typ             loading the config, units, geometry checks
  grids.typ              dots / lines / squares / blank / isometric / hexagons / music staff
  numbering.typ          numbers in the outer corners or centred, #no-number
  calendar.typ           month and weekday names, week start, ISO weeks, month grids
  i18n.typ               printed text in Polish and English
  graphics.typ           SVG import from assets/svg/
  sheet.typ              A4 sheet geometry, marks, signature order, back offset
  notebook.typ           entry point: insert(), pages(), to-left-page, rule()…
templates/               page types: dot-grid, index, year, month, week, title, future-log,
                         habits, todo, cornell, travel, reading, budget, daily…
inserts/                 actual inserts built from page types
impose.typ               imposition (embeds PDF pages as vectors)
calibration.typ          calibration sheet
scripts/nb.py            orchestration: build/impose/preview/verify/watch
assets/svg/  fonts/      graphics from Affinity, local fonts
build/                   output (not tracked by git)
web/                     web generator (see below)
```

Imposition runs in Typst itself: `image("build/x.pdf", page: n)` embeds an insert page
without rasterising it. Python (`scripts/nb.py` + pypdf) only reads the page count,
counts sheets, prints warnings and verifies the result. `verify` compares the
signature map with metadata written by Typst itself (`typst eval … query(<imposed>)`).

## Web generator (`web/`)

A "print your own notebook" wizard for anyone, in Polish and English: start, printer
and paper, design (size, page pattern, font, numbering, special pages, live preview
in a leather cover), test print, printing and assembly. Print files are
imposed for folding in the browser, without the CLI.

The website has no engine of its own: it compiles **the same** `lib/` and `templates/` through
[typst.ts](https://github.com/Myriad-Dreamin/typst.ts) (Typst 0.15 in WebAssembly)
in a web worker. A template change works in the CLI and on the website at once.

```sh
cd web
npm install
npm run dev          # http://localhost:5173
npm test             # unit tests + template compilation through WASM
npm run e2e          # Playwright: Chromium, Firefox, WebKit, phones
npm run build        # static site in web/dist/
```

Requirements: Node ≥ 22. Before the first `npm run e2e`: `npx playwright install`.

How it works:

- `web/src/notebook/typst.ts` turns the settings into `config/notebook.toml` (the same
  schema as the CLI) and a `main.typ` assembled from templates. The title goes through `sys.inputs`,
  so user text never ends up in Typst source.
- Every section starts with a `<nb-section>` marker carrying its first page, from which
  the website takes page ranges and section jumps.
- The worker compiles and draws pages on an `OffscreenCanvas`; the page keeps a bounded
  bitmap memory and only fetches the visible spreads.
- Settings are saved in the browser, and "Copy link" stores them in the address (`#c=…`).
  The wizard step sits next to it in `#step=…`; a link with just the design opens the Design step.
- The printer profile (paper, unprintable area, duplex, `dx`/`dy`) only lives
  in the browser (`web/src/notebook/printer.ts`), not in the link. `fitToPrinter` widens
  margins that are too narrow in the preview and PDF; the design itself stays unchanged.
- Printing: the worker builds a PDF of pages with a print config (real sheet, marks,
  pocket as `stacked`), and then `impose.typ` places those pages on sheets
  (`engine.print`). The test print is `calibration.typ` (`--input side=front|back`)
  and an order test on two sheets; the answers correct the printer profile.
- Languages: the UI is in `web/src/i18n/pl.ts` and `en.ts` (same keys, checked by the
  type system and a test), the language comes from the browser, with a switch in the header. The notebook's content has its own
  language in the design (`[insert] lang`); text printed on pages is in `lib/i18n.typ`.

A new template on the website: add a section type in `web/src/notebook/config.ts`, a name
and description in `web/src/i18n/pl.ts` and `en.ts` (`sections`), printed text in both
languages in `lib/i18n.typ`, and the call in `typst.ts` (`IMPORTS` and `sectionBody`). The tests in
`engine.typst.test.ts` compile it in every size on their own.

CI (`.github/workflows/ci.yml`) compiles the templates with Typst 0.15.1, runs `just all`
for the example inserts, lint, types, tests and E2E in every browser.
`deploy.yml` publishes the website to GitHub Pages. For now it only runs manually
(Actions → Deploy site → Run workflow) and needs Pages → Source: GitHub Actions enabled.

## Adding a new page type

1. Create `templates/my-page.typ`:

   ```typst
   #import "/lib/notebook.typ": *

   #let my-page(title: "Notes") = {
     page-title(title)
     block(height: 1fr, fill-grid(kind: "lines"))   // rest of the page
   }

   // --- preview ---
   #show: insert.with(title: "Preview: my page")
   #my-page()
   ```

2. Preview it live: Tinymist or `just watch templates/my-page`.
3. Use it in an insert `inserts/my-insert.typ`:

   ```typst
   #import "/lib/notebook.typ": *
   #import "/templates/my-page.typ": my-page
   #show: insert.with(title: "My insert")
   #pages(..range(8).map(_ => my-page()))
   ```

4. Build and check: `just all my-insert`, then `just preview my-insert --pages 1-4`.

Useful pieces of `lib/notebook.typ`:

- `pages(..)`: joins consecutive pages.
- `to-left-page`: the next content starts on a left page (for spreads).
- `#no-number`: hides the number on the current page.
- `rule()`, `page-title[]`, `fill-grid(kind:, inset:)`.
- `asset("name")`, `ornament("name")`, `page-background("name")`: graphics from `assets/svg/name.svg`.
- `cal.*`: calendar functions, e.g. `cal.month-weeks(y, m)`, `cal.iso-week(d)`, `cal.format-date(d)`.
- `L`: printed text in the insert's language, e.g. `L.todo.title`.

## Graphics from Affinity

Export to `assets/svg/` as SVG, with units in mm and no rasterisation.
Convert text to curves or use a font that's in `fonts/`. In Typst:

```typst
#ornament("header", width: 60mm)
#page(background: page-background("cover"))[]
```

Remember that a laser doesn't print at the edge of the sheet — on the CLX-3300 the measured margins were
TOP 4.5 · BOTTOM 3.0 · LEFT 7.0 · RIGHT 4.5 mm (`printer.unprintable` = 7.0).

## License

The code and the graphics in `assets/svg/` are released under the [MIT License](LICENSE).
The fonts in `fonts/` and `web/src/assets/fonts/` keep their own licences (SIL Open Font
License, Apache 2.0, GUST Font License), which sit next to the font files.
