// To-do list: checkboxes and lines.
#import "/lib/notebook.typ": *

#let checkbox(size: 2.6mm) = box(
  width: size,
  height: size,
  stroke: cfg.ink.line-width + cfg.ink.line,
  radius: 0.3mm,
)

#let todo-page(title: L.todo.title, row-height: 6mm) = {
  page-title(title)
  block(height: 1fr, width: 100%, layout(size => {
    let n = calc.floor(size.height / row-height)
    let stroke = cfg.ink.line-width + cfg.ink.line
    grid(
      columns: (5mm, 1fr),
      rows: (row-height,) * n,
      align: (center + horizon, horizon),
      stroke: (x, y) => (bottom: if x == 1 { stroke }),
      ..range(n).map(_ => (checkbox(), [])).flatten(),
    )
  }))
}

// --- preview ---
#show: insert.with(title: "Preview: to-do")
#todo-page()
