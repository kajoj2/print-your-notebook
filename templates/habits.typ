// Habit tracker: days of the month in rows, habits in columns (headers to fill in).
#import "/lib/notebook.typ": *

#let habit-page(year: cfg.year, month: 1, habits: 7) = {
  page-title[#L.habits.title #h(1fr) #cal.month-name(month) #year]
  let n = cal.days-in-month(year, month)
  let stroke = cfg.ink.line-width + cfg.ink.line
  block(height: 1fr, grid(
    columns: (7mm,) + (1fr,) * habits,
    // a row for habit headers (vertical text doesn't fit, so it's empty and taller)
    rows: (12mm,) + (1fr,) * n,
    stroke: (x, y) => (
      bottom: stroke,
      left: if x > 0 { stroke },
    ),
    align: horizon,
    inset: (x: 0.6mm, y: 0pt),
    [],
    ..range(habits).map(_ => []),
    ..range(1, n + 1).map(d => {
      let wd = cal.date(year, month, d).weekday()
      (
        text(size: 0.7em, fill: if wd >= 6 { cfg.ink.text } else { cfg.ink.line })[#d #cal.weekdays-letter.at(wd - 1)],
        ..range(habits).map(_ => []),
      )
    }).flatten(),
  ))
}

// --- preview ---
#show: insert.with(title: "Preview: habits")
#habit-page(month: 2)
