// Future log: 6 months per spread, 3 per page.
#import "/lib/notebook.typ": *

#let _month-box(year, month) = grid(
  rows: (auto, 1fr),
  row-gutter: 1mm,
  {
    [#cal.capitalize(cal.month-name(month)) #h(1fr) #text(fill: cfg.ink.line, str(year))]
    v(-0.6em)
    rule()
  },
  fill-grid(kind: "lines", inset: 0pt),
)

// Starts on a left page. start: first month (1–12); later months roll over into the next year.
#let future-log-spread(year: cfg.year, start: 1) = {
  let months = range(6).map(i => {
    let m0 = start - 1 + i
    (year + calc.div-euclid(m0, 12), calc.rem(m0, 12) + 1)
  })
  to-left-page
  for (half, first) in ((months.slice(0, 3), true), (months.slice(3), false)) {
    if not first { pagebreak() }
    page-title(if first { L.future-log.title } else [#h(1fr)])
    block(height: 1fr, grid(
      rows: (1fr,) * 3,
      row-gutter: 3mm,
      ..half.map(((y, m)) => _month-box(y, m)),
    ))
  }
}

// --- preview ---
#show: insert.with(title: "Preview: future log")
#future-log-spread(start: 10)
