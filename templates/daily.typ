// Daily page: date, three priorities, the rest for notes.
#import "/lib/notebook.typ": *
#import "/templates/todo.typ": checkbox

#let day-page(day, kind: auto) = {
  page-title[#cal.capitalize(cal.weekday-name(day)) #h(1fr) #cal.format-date(day)]
  text(size: 0.85em, L.daily.top)
  v(-0.4em)
  for _ in range(3) {
    grid(
      columns: (5mm, 1fr),
      rows: 6mm,
      align: (center + horizon, bottom),
      checkbox(), rule(),
    )
  }
  v(3mm)
  block(height: 1fr, fill-grid(kind: kind))
}

// Consecutive days from start (datetime), each on its own page.
#let day-pages(start, n) = pages(..range(n).map(i => day-page(cal.add-days(start, i))))

// --- preview ---
#show: insert.with(title: "Preview: day")
#day-pages(cal.date(cfg.year, 1, 1), 2)
