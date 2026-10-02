// Yearly calendar: 12 mini months. SKELETON – the look still needs work.
#import "/lib/notebook.typ": *

#let mini-month(y, m, size: 4.5pt) = {
  set text(size: size)
  set par(leading: 0.3em)
  block(breakable: false, {
    align(center, text(size: size * 1.3, cal.month-name(m)))
    grid(
      columns: (1fr,) * 7,
      row-gutter: 0.9mm,
      align: center,
      ..cal.days-letter.map(d => text(fill: cfg.ink.line, d)),
      ..cal.month-weeks(y, m).flatten().map(d => if d == none { [] } else { str(d.day()) }),
    )
  })
}

#let year-page(year: cfg.year, columns: 3) = {
  page-title[#year]
  block(height: 1fr, grid(
    columns: (1fr,) * columns,
    rows: (1fr,) * calc.ceil(12 / columns),
    column-gutter: 2.5mm,
    ..range(1, 13).map(m => mini-month(year, m)),
  ))
}

// --- preview ---
#show: insert.with(title: "Preview: year")
#year-page()
