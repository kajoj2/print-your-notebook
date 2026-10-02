// Monthly budget: an expense table and a summary.
#import "/lib/notebook.typ": *
#import "/templates/title.typ": field

#let budget-page(year: cfg.year, month: 1, row-height: 5.5mm) = {
  page-title[#L.budget.title #h(1fr) #cal.month-name(month) #year]
  let stroke = cfg.ink.line-width + cfg.ink.line
  block(height: 1fr, width: 100%, layout(size => {
    let header = 5mm
    let n = calc.floor((size.height - header) / row-height)
    grid(
      columns: (9mm, 1fr, 15mm),
      rows: (header,) + (row-height,) * n,
      stroke: (x, y) => (bottom: stroke, left: if x > 0 { stroke }),
      inset: (x: 0.8mm),
      align: horizon,
      ..(L.budget.day, L.budget.what, L.budget.amount).map(t => text(size: 0.8em, t)),
      ..range(n * 3).map(_ => []),
    )
  }))
  v(2mm)
  grid(
    columns: (1fr, 1fr, 1fr),
    column-gutter: 2mm,
    field(L.budget.income), field(L.budget.expenses), field(L.budget.balance),
  )
}

// --- preview ---
#show: insert.with(title: "Preview: budget")
#budget-page(month: 3)
