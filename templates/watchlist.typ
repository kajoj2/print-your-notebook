// Films, series, games: title, year/season, watched, rating.
#import "/lib/notebook.typ": *
#import "/templates/reading.typ": rating
#import "/templates/todo.typ": checkbox

#let watch-kinds = L.watchlist.kinds

#let watch-page(kind: "movies", row-height: 7mm) = {
  let k = watch-kinds.at(kind)
  page-title(k.label)
  let stroke = cfg.ink.line-width + cfg.ink.line
  block(height: 1fr, width: 100%, layout(size => {
    let header = 5mm
    let n = calc.floor((size.height - header) / row-height)
    grid(
      columns: (1fr, 10mm, 5mm, 11mm),
      rows: (header,) + (row-height,) * n,
      stroke: (x, y) => (bottom: stroke, left: if x > 0 { stroke }),
      inset: (x: 0.6mm),
      align: (x, y) => if x == 0 { left + horizon } else { center + horizon },
      ..(L.common.title, k.second, "✓", L.common.rating).map(h => text(size: 0.7em, h)),
      ..range(n).map(_ => ([], [], checkbox(size: 2.2mm), rating())).flatten(),
    )
  }))
}

// --- preview ---
#show: insert.with(title: "Preview: films")
#watch-page()
