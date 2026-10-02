// Shopping list: departments or stores, checkboxes and a “qty” column.
#import "/lib/notebook.typ": *
#import "/templates/packing.typ": checklist-group

#let shopping-groups = L.shopping.groups

// split: "departments" (departments from shopping-groups) or "stores" (an empty name =
// a line to fill in by hand). Store names from the website come through sys.inputs.
#let shopping-pages(
  split: "departments",
  groups: ("produce", "bakery", "dairy", "meat", "pantry", "household"),
  stores: ("", "", "", ""),
  columns: 2,
  qty: true,
  pages-count: 1,
  row-height: 5.5mm,
) = {
  let labels = if split == "stores" {
    stores.map(name => if name.trim() == "" [#L.shopping.store #box(width: 1fr, rule())] else { name })
  } else {
    groups.map(g => shopping-groups.at(g))
  }
  if labels.len() == 0 { labels = (L.shopping.default,) }
  let per-page = calc.ceil(labels.len() / pages-count)
  let chunks = labels.chunks(calc.max(1, per-page))
  // pages without a group (more pages than departments/stores) get a general list
  chunks += ((L.shopping.default,),) * calc.max(0, pages-count - chunks.len())
  let field = if split == "stores" { L.shopping.date } else { L.shopping.store-date }
  pages(..chunks.map(chunk => {
    page-title[#L.common.shopping #h(1fr) #text(size: 0.8em)[#field #box(width: 25mm, rule())]]
    v(1.5mm)
    let rows = calc.ceil(chunk.len() / columns)
    block(height: 1fr, grid(
      columns: (1fr,) * columns,
      rows: (1fr,) * rows,
      column-gutter: 3mm,
      row-gutter: 3mm,
      ..chunk.map(l => checklist-group(l, row-height, qty: qty)),
    ))
  }))
}

// --- preview ---
#show: insert.with(title: "Preview: shopping")
#shopping-pages()
#pagebreak()
#shopping-pages(split: "stores", stores: ("TESTOWY", "", "", "", "", "", "", ""))
