// Book / film list: title, author, rating (5 circles to fill in), date.
#import "/lib/notebook.typ": *

#let rating(n: 5, size: 1.6mm) = box(stack(
  dir: ltr,
  spacing: 0.6mm,
  ..range(n).map(_ => circle(radius: size / 2, stroke: cfg.ink.line-width + cfg.ink.line)),
))

#let reading-page(title: L.reading.title, second: L.reading.author, row-height: 10mm) = {
  page-title(title)
  let stroke = cfg.ink.line-width + cfg.ink.line
  block(height: 1fr, width: 100%, layout(size => {
    let header = 5mm
    let n = calc.floor((size.height - header) / row-height)
    grid(
      columns: (1fr, 11mm),
      rows: (header,) + (row-height,) * n,
      stroke: (x, y) => (bottom: stroke, left: if x == 1 and y > 0 { stroke }),
      inset: (x: 0.8mm, y: 1mm),
      text(size: 0.8em)[#L.common.title · #second], text(size: 0.8em, L.common.rating),
      ..range(n).map(_ => (
        // room for two lines: title and author
        align(bottom, line(length: 100%, stroke: (thickness: cfg.ink.line-width, paint: cfg.ink.line, dash: "dotted"))),
        align(bottom + center, rating()),
      )).flatten(),
    )
  }))
}

// --- preview ---
#show: insert.with(title: "Preview: books")
#reading-page()
