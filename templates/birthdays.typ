// Perpetual birthday calendar: months without weekdays, so it fits any year.
#import "/lib/notebook.typ": *

#let _month-block(m, row-height, day-column) = {
  text(size: 0.95em, cal.capitalize(cal.month-name(m)))
  let stroke = cfg.ink.line-width + cfg.ink.line
  block(height: 1fr, width: 100%, layout(size => {
    let n = calc.max(1, calc.floor(size.height / row-height))
    grid(
      columns: if day-column { (6mm, 1fr) } else { (1fr,) },
      rows: (row-height,) * n,
      stroke: (x, y) => (bottom: stroke, left: if x == 1 { stroke }),
      ..range(n * if day-column { 2 } else { 1 }).map(_ => []),
    )
  }))
}

#let birthday-pages(per-page: 3, day-column: true, row-height: 5.5mm) = pages(
  ..range(1, 13).chunks(per-page).map(chunk => {
    page-title(L.birthdays.title)
    block(height: 1fr, grid(
      rows: (1fr,) * per-page,
      row-gutter: 3mm,
      ..chunk.map(m => _month-block(m, row-height, day-column)),
    ))
  }),
)

// --- preview ---
#show: insert.with(title: "Preview: birthdays")
#birthday-pages()
