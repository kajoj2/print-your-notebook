// Travel journal: date, place, weather, route, a box for a stamp/ticket, notes.
#import "/lib/notebook.typ": *
#import "/templates/title.typ": field

#let _stamp-box(size) = box(
  width: size,
  height: size,
  stroke: (thickness: cfg.ink.line-width, paint: cfg.ink.line, dash: (1mm, 0.7mm)),
  radius: 1mm,
  align(center + horizon, text(size: 0.7em, fill: cfg.ink.line, L.travel.stamp)),
)

#let travel-page(kind: auto) = {
  page-title(L.travel.title)
  grid(
    columns: (1fr, 24mm),
    column-gutter: 3mm,
    {
      field(L.common.date)
      field(L.travel.place)
      field(L.travel.weather)
      field(L.travel.route)
    },
    align(bottom, _stamp-box(24mm)),
  )
  v(3mm)
  block(height: 1fr, fill-grid(kind: kind))
}

// --- preview ---
#show: insert.with(title: "Preview: travel")
#travel-page()
