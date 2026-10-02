// Shared A4 sheet geometry (imposition and calibration).
//
// Usually: landscape A4, one spread per sheet side.
// stacked: portrait A4, two spreads one above the other ("slots"), the sheet
// is cut in half. The fold then runs along the long side of A4 (along the grain).

#import "config.typ": cfg

#let stacked = cfg.stacked
#let W = if stacked { cfg.printer.sheet-height } else { cfg.printer.sheet-width }
#let H = if stacked { cfg.printer.sheet-width } else { cfg.printer.sheet-height }
#let slots = if stacked { 2 } else { 1 }
#let pw = cfg.width
#let ph = cfg.height
// top left corner of the spread in the top slot
#let x0 = (W - 2 * pw) / 2
#let y0 = (H - slots * ph) / 2
#let slot-y(k) = y0 + k * ph
// Band of vertical marks at the top/bottom edge of the sheet. In landscape these are the
// TOP/BOTTOM edges (really 4.5/3.0 mm), so the band may lie below unprintable. In portrait
// they're the measured RIGHT/LEFT edges (4.5/7.0 mm), so the band must start at u.
#let band-start = if stacked {
  calc.max(cfg.marks.band-start, cfg.printer.unprintable)
} else { cfg.marks.band-start }

#let _hline(x1, x2, y, stroke) = place(line(start: (x1, y), end: (x2, y), stroke: stroke))
#let _vline(x, y1, y2, stroke) = place(line(start: (x, y1), end: (x, y2), stroke: stroke))

// Cut marks (solid line) and fold marks (dashed).
// If there's no room above/below the insert (regular size, stacked), vertical marks
// go into a band at the sheet edge, inside the insert's margin (or above it).
#let marks() = {
  let m = cfg.marks
  let cut = m.width + m.color
  let fold = (thickness: m.width, paint: m.color, dash: (1mm, 0.7mm))
  let u = cfg.printer.unprintable
  let verticals = ((x0, cut), (x0 + pw, fold), (x0 + 2 * pw, cut))
  let bottom = slot-y(slots)

  // horizontal: in the side waste, at every slot boundary (stacked: also the cut in half)
  if y0 > u {
    for k in range(slots + 1) {
      let y = slot-y(k)
      _hline(x0 - m.gap - m.length, x0 - m.gap, y, cut)
      _hline(x0 + 2 * pw + m.gap, x0 + 2 * pw + m.gap + m.length, y, cut)
    }
  }

  // crosses where cut lines intersect, with arms reaching into the insert's margin:
  // marks in the waste disappear after the first cut (the sides take the horizontal ones,
  // the top/bottom strips take the vertical ones), but the arm further in stays
  if y0 > u {
    let a = m.band-length
    for k in range(slots + 1) {
      let y = slot-y(k)
      for x in (x0, x0 + 2 * pw) {
        _hline(x - a, x + a, y, cut)
        _vline(x, y - a, y + a, cut)
      }
      _vline(x0 + pw, y - a, y + a, fold)
    }
  }

  let outside = y0 - m.gap - m.length >= u
  for (x, s) in verticals {
    if outside {
      _vline(x, y0 - m.gap - m.length, y0 - m.gap, s)
      _vline(x, bottom + m.gap, bottom + m.gap + m.length, s)
    } else {
      _vline(x, band-start, band-start + m.band-length, s)
      _vline(x, H - band-start - m.band-length, H - band-start, s)
    }
  }
}

#let marks-outside = y0 - cfg.marks.gap - cfg.marks.length >= cfg.printer.unprintable

// Offset/rotation of the back of a sheet according to [duplex].
//
// [duplex] is measured for the landscape layout, but the printer gets a
// portrait page anyway: `prepare` rotates a landscape sheet by 90° (x → y, y → -x).
// A stacked sheet is already portrait and isn't rotated, so:
//   * the offset (dx, dy) in landscape = (dy, -dx) in portrait;
//   * when flipping the stack the sheet turns around its short side, while the insert
//     turns around its spine, which now lies along the long side —
//     the back has to be rotated by 180°, exactly as with rotate_back.
#let back-shift = if stacked { (cfg.duplex.dy, -cfg.duplex.dx) } else { (cfg.duplex.dx, cfg.duplex.dy) }
#let back-rotated = cfg.duplex.rotate-back != stacked

#let back-side(body) = {
  let b = box(width: W, height: H, body)
  if back-rotated { b = rotate(180deg, b) }
  place(top + left, dx: back-shift.at(0), dy: back-shift.at(1), b)
}

// Signature order for N pages (N divisible by 4), sheet i = 0..N/4-1.
#let sheet-pages(n, i) = (
  front: (n - 2 * i, 2 * i + 1),
  back: (2 * i + 2, n - 2 * i - 1),
)

// A4 sheets needed for N pages.
#let a4-count(n) = calc.ceil(calc.div-euclid(n, 4) / slots)

// Signature sheets on A4 sheet j (0..), from the top slot. After cutting the stack in half,
// the top halves are signature sheets 1..A and the bottom ones A+1..N/4 (A = a4-count):
// just put the stack of bottom halves under the stack of top halves.
#let a4-slots(n, j) = {
  let all = range(slots).map(k => j + k * a4-count(n))
  all.filter(i => i < calc.div-euclid(n, 4))
}

#{
  if not marks-outside {
    let m = cfg.marks
    // band depth measured from the insert edge (stacked: the insert starts at y0)
    let reach = band-start + m.band-length - y0
    assert(
      reach <= cfg.margin.top and reach <= cfg.margin.bottom,
      message: "Marks in the edge band overlap the content: increase the margins or decrease marks.band_*",
    )
  }
}
