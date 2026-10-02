// Calibration sheet: page 1 = front, page 2 = back (with the offset from the config).
// Both sides have identical, symmetric geometry: against the light the crosses
// and rulers should line up. You read the offset off the rulers.

#import "/lib/config.typ": cfg, toml-cfg
#import "/lib/sheet.typ": *
#import "/lib/i18n.typ": L

#set document(title: "Duplex calibration")
#set page(width: W, height: H, margin: 0pt)
#set text(font: cfg.font.family, size: 8pt, lang: cfg.lang, fill: black)

#let ink = 0.2mm + black
#let cx = W / 2
#let cy = H / 2

#let cross(x, y, r: 4mm) = {
  place(line(start: (x - r, y), end: (x + r, y), stroke: ink))
  place(line(start: (x, y - r), end: (x, y + r), stroke: ink))
  place(dx: x - r / 2, dy: y - r / 2, circle(radius: r / 2, stroke: ink))
}

#let label-at(x, y, body, anchor: center + horizon) = place(
  top + left, dx: x - 40mm, dy: y - 5mm,
  box(width: 80mm, height: 10mm, align(anchor, body)),
)

// horizontal ruler through the centre: -L..L mm, a tick every 1 mm, a label every 10 mm
#let hruler(L: 60) = for i in range(-L, L + 1) {
  let long = calc.rem(i, 10) == 0
  let h = if long { 4mm } else if calc.rem(i, 5) == 0 { 2.5mm } else { 1.5mm }
  place(line(start: (cx + i * 1mm, cy - h), end: (cx + i * 1mm, cy), stroke: 0.12mm + black))
  if long and i != 0 {
    place(dx: cx + i * 1mm - 3mm, dy: cy - 7.5mm, box(width: 6mm, align(center, text(size: 5.5pt, str(i)))))
  }
}

#let vruler(L: 60) = for i in range(-L, L + 1) {
  let long = calc.rem(i, 10) == 0
  let w = if long { 4mm } else if calc.rem(i, 5) == 0 { 2.5mm } else { 1.5mm }
  place(line(start: (cx, cy + i * 1mm), end: (cx + w, cy + i * 1mm), stroke: 0.12mm + black))
  if long and i != 0 {
    place(dx: cx + 5mm, dy: cy + i * 1mm - 1.2mm, text(size: 5.5pt, str(i)))
  }
}

#let side(title, note) = {
  // printable area
  let u = cfg.printer.unprintable
  place(dx: u, dy: u, rect(width: W - 2 * u, height: H - 2 * u, stroke: (thickness: 0.15mm, paint: black, dash: "dashed")))
  // crosses symmetric about the sheet centre (within the spread)
  let a = pw - 12mm
  let b = calc.min(ph / 2, H / 2 - u) - 12mm
  for sx in (-1, 1) { for sy in (-1, 1) { cross(cx + sx * a, cy + sy * b) } }
  cross(cx, cy, r: 6mm)
  hruler()
  vruler()
  // insert edges
  for k in range(slots) {
    place(dx: x0, dy: slot-y(k), rect(width: 2 * pw, height: ph, stroke: (thickness: 0.12mm, paint: luma(160), dash: "dotted")))
  }
  // "up" arrow
  label-at(cx - pw / 2, cy - 30mm, text(size: 28pt)[↑])
  label-at(cx - pw / 2, cy - 20mm, text(size: 9pt, L.calibration.up))
  label-at(cx + pw / 2, cy - 25mm, text(size: 20pt, weight: "bold", title))
  label-at(cx + pw / 2, cy + 25mm, text(size: 7pt, note))
  label-at(cx - pw / 2, cy + 25mm, text(size: 7pt)[
    format #cfg.format: #toml-cfg.formats.at(cfg.format).width × #toml-cfg.formats.at(cfg.format).height mm \
    dx = #toml-cfg.duplex.dx mm, dy = #toml-cfg.duplex.dy mm, #L.calibration.rotate-back: #if cfg.duplex.rotate-back { L.calibration.yes } else { L.calibration.no }
    #if stacked [\ #L.calibration.stacked #back-shift.map(v => str(v.mm())).join(", ") mm, #L.calibration.rotated]
  ])
}

// --input side=front|back: only one side (for manual duplex, when the
// printer ignores page ranges); both by default.
#let only = sys.inputs.at("side", default: "both")
#assert(only in ("both", "front", "back"), message: "side: both|front|back")

#if only != "back" {
  side(L.calibration.front, L.calibration.front-note)
}
#if only == "both" { pagebreak() }
#if only != "front" {
  back-side(side(L.calibration.back, L.calibration.back-note))
}
