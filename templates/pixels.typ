// Year in pixels: days (rows) × months (columns), a square to colour in
// by mood / weather. Days that don't exist (e.g. 30 February) are crossed out.
#import "/lib/notebook.typ": *

#let pixel-themes = L.pixels.themes

#let pixels-page(year: cfg.year, theme: "mood", legend: 5) = {
  page-title[#pixel-themes.at(theme) #h(1fr) #year]
  let stroke = cfg.ink.line-width + cfg.ink.line
  let small(body) = text(size: 0.65em, body)
  block(height: 1fr, grid(
    columns: (4mm,) + (1fr,) * 12,
    rows: (4mm,) + (1fr,) * 31,
    align: center + horizon,
    stroke: (x, y) => if x > 0 and y > 0 { stroke },
    [],
    ..range(12).map(m => small(upper(cal.months-short.at(m).clusters().first()))),
    ..range(1, 32).map(d => (
      small(str(d)),
      ..range(1, 13).map(m => if d > cal.days-in-month(year, m) {
        line(start: (0%, 100%), end: (100%, 0%), stroke: stroke)
      }),
    )).flatten(),
  ))
  if legend > 0 {
    v(2mm)
    grid(
      columns: (1fr,) * calc.min(legend, 4),
      row-gutter: 1.5mm,
      column-gutter: 2mm,
      ..range(legend).map(_ => grid(
        columns: (3mm, 1fr),
        column-gutter: 1mm,
        align: bottom,
        box(width: 3mm, height: 3mm, stroke: stroke),
        rule(),
      )),
    )
  }
}

// --- preview ---
#show: insert.with(title: "Preview: year in pixels")
#pixels-page()
