// Printer test page (landscape A4, one page):
//  * a scale at every edge: tick and number = distance from the edge in mm.
//    The first visible tick = the printer's real margin (printer.unprintable).
//  * grey samples of dots and lines, to pick grid.color / ink.* for a fountain pen.

#import "/lib/config.typ": cfg
#import "/lib/sheet.typ": W, H

#set document(title: "Printer test")
#set page(width: W, height: H, margin: 0pt)
#set text(font: cfg.font.family, size: 7pt, lang: "en", fill: black)

#let marks-mm = range(1, 13).map(i => i * 0.5 + 1.5) // 2.0 … 7.5 mm
#let tick = 0.15mm + black

// scale at an edge; `edge`: top | bottom | left | right
#let edge-scale(edge, at) = for (k, d) in marks-mm.enumerate() {
  let d = d * 1mm
  let len = 6mm
  let lbl = text(size: 5pt, str(marks-mm.at(k)))
  let step = 7mm
  if edge == top {
    let x = at + k * step
    place(line(start: (x, d), end: (x + len, d), stroke: tick))
    place(dx: x + len + 0.3mm, dy: d - 0.9mm, lbl)
  } else if edge == bottom {
    let x = at + k * step
    place(line(start: (x, H - d), end: (x + len, H - d), stroke: tick))
    place(dx: x + len + 0.3mm, dy: H - d - 0.9mm, lbl)
  } else if edge == left {
    let y = at + k * step
    place(line(start: (d, y), end: (d, y + len), stroke: tick))
    place(dx: d + 0.5mm, dy: y + len - 1.5mm, lbl)
  } else {
    let y = at + k * step
    place(line(start: (W - d, y), end: (W - d, y + len), stroke: tick))
    place(dx: W - d - 3mm, dy: y + len - 1.5mm, lbl)
  }
}

#for e in (top, bottom) { edge-scale(e, 30mm); edge-scale(e, W - 30mm - 12 * 7mm) }
#for e in (left, right) { edge-scale(e, 20mm); edge-scale(e, H - 20mm - 12 * 7mm) }

// edge names
#place(center + top, dy: 12mm, text(size: 9pt)[TOP ↑ (the “top” edge)])
#place(center + bottom, dy: -12mm, text(size: 9pt)[BOTTOM])
#place(left + horizon, dx: 12mm, rotate(-90deg, reflow: true, text(size: 9pt)[LEFT]))
#place(right + horizon, dx: -12mm, rotate(90deg, reflow: true, text(size: 9pt)[RIGHT]))

// samples: columns = grey, rows = dot diameter; lines at the bottom
#let grays = ("#666666", "#808080", "#999999", "#aaaaaa", "#b4b4b4", "#c0c0c0", "#cccccc", "#d9d9d9")
#let diameters = (0.25, 0.3, 0.35, 0.45, 0.6)
#let swatch-dots(c, d) = box(width: 22mm, height: 12mm, {
  for i in range(5) { for j in range(3) {
    place(dx: 1mm + i * 5mm - d / 2 * 1mm, dy: 1mm + j * 5mm - d / 2 * 1mm, circle(radius: d / 2 * 1mm, fill: rgb(c), stroke: none))
  }}
})
#let swatch-lines(c, w) = box(width: 22mm, height: 6mm, {
  for j in range(3) { place(line(start: (1mm, 1mm + j * 2mm), end: (21mm, 1mm + j * 2mm), stroke: w * 1mm + rgb(c))) }
})

#place(center + horizon, dy: 5mm, block(width: 230mm, {
  align(center, text(size: 9pt)[Printer test · first visible tick at each edge = printer margin (mm)])
  v(2mm)
  grid(
    columns: (18mm,) + (24mm,) * grays.len(),
    row-gutter: 1mm,
    align: left + horizon,
    [], ..grays.map(g => text(size: 6pt, g)),
    ..diameters.map(d => ([dot #d mm], ..grays.map(g => swatch-dots(g, d)))).flatten(),
    ..(0.1, 0.15, 0.2).map(w => ([line #w mm], ..grays.map(g => swatch-lines(g, w)))).flatten(),
  )
  v(2mm)
  align(center, text(size: 7pt)[
    current config: dots #cfg.grid.color.to-hex(), #(cfg.grid.dot-diameter / 1mm) mm · lines #cfg.ink.line.to-hex(), #(cfg.ink.line-width / 1mm) mm
  ])
}))
