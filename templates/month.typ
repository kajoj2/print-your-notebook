// Monthly calendar: a grid of weeks (from Mon or Sun) with the ISO week number.
// SKELETON – the look still needs work.
#import "/lib/notebook.typ": *

#let month-page(year: cfg.year, month: 1) = {
  page-title[#cal.capitalize(cal.month-name(month)) #year]
  let weeks = cal.month-weeks(year, month)
  let stroke = cfg.ink.line-width + cfg.ink.line
  block(height: 1fr, grid(
    columns: (4mm,) + (1fr,) * 7,
    rows: (auto,) + (1fr,) * weeks.len(),
    stroke: (x, y) => if x > 0 and y > 0 { stroke },
    inset: 0.8mm,
    [], ..cal.days-short.map(d => align(center, text(size: 0.8em, d))),
    ..weeks.map(w => {
      let first = w.find(d => d != none)
      (align(center, text(size: 0.7em, fill: cfg.ink.line, str(cal.week-number(first)))),)
      w.map(d => if d == none { [] } else { text(size: 0.8em, str(d.day())) })
    }).flatten(),
  ))
}

// --- preview ---
#show: insert.with(title: "Preview: month")
#month-page(month: 2)
