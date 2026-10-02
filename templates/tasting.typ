// Tasting notes: coffee, wine, tea, beer. Fields depend on the kind,
// a flavour chart (a radar to mark intensity) and a rating.
#import "/lib/notebook.typ": *
#import "/templates/title.typ": field
#import "/templates/reading.typ": rating

#let tasting-kinds = L.tasting.kinds

// Radar: axes every 360°/n, 4 intensity rings, labels outside.
#let _wheel(axes, size) = {
  let r = size / 2 - 3mm
  let c = size / 2
  let n = axes.len()
  let stroke = cfg.ink.line-width + cfg.ink.line
  let thin = (thickness: cfg.ink.line-width * 0.6, paint: cfg.ink.line, dash: "dotted")
  let pt(i, rr) = {
    let a = -90deg + i * 360deg / n
    (c + rr * calc.cos(a), c + rr * calc.sin(a))
  }
  box(width: size, height: size, {
    for k in range(1, 5) {
      place(polygon(stroke: if k == 4 { stroke } else { thin }, ..range(n).map(i => pt(i, r * k / 4))))
    }
    for i in range(n) {
      place(line(start: (c, c), end: pt(i, r), stroke: thin))
      let (x, y) = pt(i, r + 2mm)
      place(dx: x - 8mm, dy: y - 1.2mm, box(width: 16mm, height: 2.4mm, align(center + horizon, text(size: 0.55em, axes.at(i)))))
    }
  })
}

#let _entry(k, wheel) = {
  for f in k.fields { field(f, height: 6mm) }
  v(2mm)
  let notes = {
    grid(columns: (auto, 1fr), column-gutter: 2mm, align: horizon, text(size: 0.85em, L.common.rating), rating(size: 2.2mm))
    v(1mm)
    text(size: 0.85em, L.common.notes)
    block(height: 1fr, fill-grid(kind: "lines"))
  }
  // a chart smaller than 28 mm is unreadable: then notes only
  block(height: 1fr, width: 100%, layout(size => {
    let s = calc.min(size.width * 0.55, size.height, 45mm)
    if wheel and s >= 28mm {
      grid(columns: (s, 1fr), column-gutter: 2mm, rows: size.height, align(top, _wheel(k.axes, s)), notes)
    } else { notes }
  }))
}

#let tasting-page(kind: "coffee", per-page: 1, wheel: true) = {
  let k = tasting-kinds.at(kind)
  page-title(k.label)
  block(height: 1fr, grid(
    rows: (1fr,) * per-page,
    row-gutter: 4mm,
    ..range(per-page).map(_ => _entry(k, wheel)),
  ))
}

// --- preview ---
#show: insert.with(title: "Preview: tasting")
#tasting-page()
#pagebreak()
#tasting-page(kind: "wine", per-page: 2)
