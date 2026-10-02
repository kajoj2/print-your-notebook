// Cornell notes: topic, a cue/question column, notes, a summary at the bottom.
#import "/lib/notebook.typ": *

#let cornell-page(cue-width: 30%, summary-height: 22%, kind: "lines") = {
  let stroke = cfg.ink.line-width + cfg.ink.line
  grid(
    columns: (1fr, 1fr),
    column-gutter: 2mm,
    align: bottom,
    [#L.common.topic #box(width: 1fr, rule())],
    [#L.common.date #box(width: 1fr, rule())],
  )
  v(2mm)
  block(height: 1fr, grid(
    columns: (cue-width, 1fr),
    rows: (1fr, summary-height),
    stroke: (x, y) => (
      top: if y == 1 { stroke },
      left: if x == 1 and y == 0 { stroke },
    ),
    inset: (x, y) => if y == 1 { (top: 1.5mm) } else if x == 0 { (right: 1.5mm) } else { (left: 1.5mm) },
    grid.cell(fill-grid(kind: kind)),
    grid.cell(fill-grid(kind: kind)),
    grid.cell(colspan: 2, {
      text(size: 0.85em, L.cornell.summary)
      block(height: 1fr, fill-grid(kind: kind))
    }),
  ))
}

// --- preview ---
#show: insert.with(title: "Preview: Cornell")
#cornell-page()
