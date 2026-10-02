// Project / goal: name, goal, deadline, steps to tick off and room for notes.
#import "/lib/notebook.typ": *
#import "/templates/title.typ": field
#import "/templates/todo.typ": checkbox

#let project-page(steps: 6, kind: auto, row-height: 6mm) = {
  page-title(L.project.title)
  field(L.common.name)
  field(L.project.goal)
  grid(columns: (1fr, 1fr), column-gutter: 3mm, field(L.project.start), field(L.project.due))
  v(3mm)
  text(size: 0.9em, L.project.steps)
  let stroke = cfg.ink.line-width + cfg.ink.line
  // on a small page the step rows get tighter so there's room left for notes
  layout(size => {
    let rh = calc.min(row-height, size.height * 0.4 / steps)
    grid(
      columns: (4.5mm, 1fr),
      rows: (rh,) * steps,
      align: (center + horizon, horizon),
      stroke: (x, y) => (bottom: if x > 0 { stroke }),
      ..range(steps).map(_ => (checkbox(size: calc.min(2.4mm, rh * 0.7)), [])).flatten(),
    )
  })
  v(3mm)
  text(size: 0.9em, L.common.notes)
  v(1mm)
  block(height: 1fr, fill-grid(kind: kind))
}

// --- preview ---
#show: insert.with(title: "Preview: project")
#project-page()
