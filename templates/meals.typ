// A weekly meal plan and a shopping list.
#import "/lib/notebook.typ": *
#import "/templates/todo.typ": checkbox

#let meal-labels = L.meals.labels

#let _shopping(row-height) = {
  text(size: 0.9em, L.common.shopping)
  let stroke = cfg.ink.line-width + cfg.ink.line
  block(height: 1fr, width: 100%, layout(size => {
    let n = calc.max(1, calc.floor(size.height / row-height))
    grid(
      columns: (4.5mm, 1fr, 4.5mm, 1fr),
      rows: (row-height,) * n,
      align: (center + horizon, horizon),
      stroke: (x, y) => (bottom: if calc.odd(x) { stroke }),
      ..range(2 * n).map(_ => (checkbox(size: 2.4mm), [])).flatten(),
    )
  }))
}

#let meal-page(meals: 3, shopping: true, row-height: 5.5mm) = {
  page-title[#L.meals.title #h(1fr) #text(size: 0.8em)[#L.meals.week #box(width: 18mm, rule())]]
  let stroke = cfg.ink.line-width + cfg.ink.line
  let labels = meal-labels.slice(0, meals)
  block(height: if shopping { 55% } else { 1fr }, grid(
    columns: (6mm,) + (1fr,) * meals,
    rows: (5mm,) + (1fr,) * 7,
    stroke: (x, y) => (bottom: stroke, left: if x > 0 { stroke }),
    inset: (x: 0.8mm),
    align: horizon,
    [],
    ..labels.map(l => text(size: 0.7em, l)),
    ..range(7).map(d => (text(size: 0.75em, cal.days-short.at(d)), ..range(meals).map(_ => []))).flatten(),
  ))
  if shopping {
    v(3mm)
    _shopping(row-height)
  }
}

// --- preview ---
#show: insert.with(title: "Preview: meals")
#meal-page()
