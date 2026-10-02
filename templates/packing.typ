// Packing list: groups with checkboxes.
#import "/lib/notebook.typ": *
#import "/templates/todo.typ": checkbox

#let packing-groups = L.packing.groups

// A group with checkboxes and lines; qty: a narrow “qty” column (shopping list).
#let checklist-group(label, row-height, qty: false) = {
  let qty-width = 9mm
  // heading right above the rows, not half a row higher (the default paragraph spacing)
  block(below: 0.8mm, if qty {
    grid(columns: (1fr, qty-width), align: bottom, text(size: 0.9em, label), align(center, text(size: 0.7em, L.common.qty)))
  } else {
    text(size: 0.9em, label)
  })
  let stroke = cfg.ink.line-width + cfg.ink.line
  let cols = if qty { (4.5mm, 1fr, 1.5mm, qty-width) } else { (4.5mm, 1fr) }
  block(height: 1fr, width: 100%, layout(size => {
    let n = calc.max(1, calc.floor(size.height / row-height))
    grid(
      columns: cols,
      rows: (row-height,) * n,
      align: (center + horizon, horizon),
      stroke: (x, y) => (bottom: if x == 1 or x == 3 { stroke }),
      ..range(n).map(_ => (checkbox(size: 2.4mm), [], ..if qty { ([], []) })).flatten(),
    )
  }))
}

#let packing-pages(groups: ("clothes", "documents", "electronics", "toiletries"), columns: 1, pages-count: 1, row-height: 5.5mm) = {
  let labels = groups.map(g => packing-groups.at(g))
  if labels.len() == 0 { labels = (L.packing.default,) }
  let per-page = calc.ceil(labels.len() / pages-count)
  let chunks = labels.chunks(calc.max(1, per-page))
  // pages without a group (more pages than groups) get a general list
  chunks += ((L.packing.default,),) * calc.max(0, pages-count - chunks.len())
  pages(..chunks.map(chunk => {
    page-title[#L.packing.title #h(1fr) #text(size: 0.8em)[#L.packing.trip #box(width: 25mm, rule())]]
    v(1.5mm)
    let rows = calc.ceil(chunk.len() / columns)
    block(height: 1fr, grid(
      columns: (1fr,) * columns,
      rows: (1fr,) * rows,
      column-gutter: 3mm,
      row-gutter: 3mm,
      ..chunk.map(l => checklist-group(l, row-height)),
    ))
  }))
}

// --- preview ---
#show: insert.with(title: "Preview: packing")
#packing-pages()
