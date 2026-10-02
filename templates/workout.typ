// Workout log: a strength or endurance table.
#import "/lib/notebook.typ": *

#let workout-kinds = (
  strength: (..L.workout.kinds.strength, columns: (8mm, 1fr, 9mm, 9mm, 11mm)),
  cardio: (..L.workout.kinds.cardio, columns: (8mm, 1fr, 11mm, 11mm, 9mm)),
)

#let workout-page(kind: "strength", row-height: 6mm) = {
  let k = workout-kinds.at(kind)
  page-title(k.label)
  let stroke = cfg.ink.line-width + cfg.ink.line
  block(height: 1fr, width: 100%, layout(size => {
    let header = 5mm
    let n = calc.floor((size.height - header) / row-height)
    grid(
      columns: k.columns,
      rows: (header,) + (row-height,) * n,
      stroke: (x, y) => (bottom: stroke, left: if x > 0 { stroke }),
      inset: (x: 0.6mm),
      align: horizon,
      ..k.headers.map(h => text(size: 0.7em, h)),
      ..range(n * k.columns.len()).map(_ => []),
    )
  }))
}

// --- preview ---
#show: insert.with(title: "Preview: workout")
#workout-page()
#pagebreak()
#workout-page(kind: "cardio")
