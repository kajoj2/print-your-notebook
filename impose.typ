// Imposition: a PDF of single pages -> A4 sheets for the signature
// (landscape, or portrait with two spreads for a stacked format).
// Run by scripts/nb.py, which passes:
//   --input src=/build/<insert>.pdf   (path relative to the project root)
//   --input pages=<source page count>
//   --input mode=duplex|odd|even
// duplex: front1, back1, front2, back2 …   odd: fronts only   even: backs only

#import "/lib/config.typ": cfg
#import "/lib/sheet.typ": *

#let src = sys.inputs.at("src")
#let n-src = int(sys.inputs.at("pages"))
#let mode = sys.inputs.at("mode", default: "duplex")
#assert(mode in ("duplex", "odd", "even"), message: "mode: duplex|odd|even")

#let n = calc.ceil(n-src / 4) * 4
#let sheets = a4-count(n)

#set document(title: "Imposition " + mode)
#set page(width: W, height: H, margin: 0pt)

#let page-img(p) = if p <= n-src { image(src, page: p, width: pw, height: ph) }

// j = A4 sheet; it holds one (or two when stacked) signature sheets
#let side(j, which) = {
  let body = for (k, i) in a4-slots(n, j).enumerate() {
    let pair = sheet-pages(n, i).at(which)
    place(top + left, dx: x0, dy: slot-y(k), page-img(pair.at(0)))
    place(top + left, dx: x0 + pw, dy: slot-y(k), page-img(pair.at(1)))
  }
  for (k, i) in a4-slots(n, j).enumerate() {
    let pair = sheet-pages(n, i).at(which)
    [#metadata((a4: j + 1, slot: k, sheet: i + 1, side: which, left: pair.at(0), right: pair.at(1))) <imposed>]
  }
  if which == "back" {
    back-side(body)
  } else {
    body
    if cfg.marks.enabled { marks() }
  }
}

// check: source page size = format from the config
#context {
  let s = measure(image(src, page: 1))
  let ok(a, b) = calc.abs((a - b).to-absolute().mm()) < 0.01
  assert(
    ok(s.width, pw) and ok(s.height, ph),
    message: "Source pages differ in size from format '" + cfg.format + "' in the config (pass the same --set format=…)",
  )
}

#let order = if mode == "duplex" {
  range(sheets).map(i => ((i, "front"), (i, "back"))).join()
} else if mode == "odd" {
  range(sheets).map(i => (i, "front"))
} else {
  let o = range(sheets).map(i => (i, "back"))
  if cfg.duplex.even-reverse { o.rev() } else { o }
}

#order.map(((i, which)) => side(i, which)).join(pagebreak())
