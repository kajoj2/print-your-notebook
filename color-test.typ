// Colour test sheet (landscape A4, one page): every colour from config/palette.json
// as dots and lines in the weights used in patterns. The print shows which
// colours and weights a laser reproduces cleanly, and which vanish in the raster or get
// coloured fringes (toner misregistration).
// Printing: just color-test-ready (colour raster), then lp with ColorModel=RGB.

#import "/lib/config.typ": cfg
#import "/lib/sheet.typ": W, H

#let palette = json("/config/palette.json")

#set document(title: "Colour test")
#set page(width: W, height: H, margin: cfg.printer.unprintable + 3mm)
#set text(font: cfg.font.family, size: 7pt, lang: "en", fill: black)

#let diameters = (0.4, 0.5, 0.6, 0.8)
#let widths = (0.08, 0.12, 0.2, 0.3)

// a patch of dots of a given diameter, 5 mm apart
#let dot-patch(c, d) = box(width: 22mm, height: 9mm, {
  for i in range(5) {
    for j in range(2) {
      place(dx: 2mm + i * 5mm - d * 0.5mm, dy: 2mm + j * 5mm - d * 0.5mm, circle(radius: d * 0.5mm, fill: c))
    }
  }
})

// a patch of horizontal lines of a given weight, every 2 mm (like the fine Seyès lines)
#let line-patch(c, w) = box(width: 22mm, height: 9mm, {
  for j in range(4) {
    place(dy: 1.5mm + j * 2mm, line(length: 22mm, stroke: w * 1mm + c))
  }
})

#let header(body) = text(size: 6pt, fill: luma(90), body)

#grid(
  columns: (26mm, 12mm) + (1fr,) * (diameters.len() + widths.len()),
  column-gutter: 2mm,
  row-gutter: 1.2mm,
  align: horizon,
  [*Colour test*], [], ..diameters.map(d => header[dot \ #d mm]), ..widths.map(w => header[line \ #w mm]),
  ..palette.colors.map(p => {
    let c = rgb(p.color)
    (
      [#p.label \ #text(size: 5.5pt, fill: luma(90), p.color)],
      box(width: 9mm, height: 9mm, fill: c),
      ..diameters.map(d => dot-patch(c, d)),
      ..widths.map(w => line-patch(c, w)),
    )
  }).flatten(),
)

#place(bottom + left, header[
  Check: are the 0.4–0.6 mm dots visible, are the 0.08–0.12 mm lines solid, are lines in
  mixed colours free of coloured fringes. Remove colours that don't pass from config/palette.json.
])
