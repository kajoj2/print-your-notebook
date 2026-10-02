// One line a day: the same day across several years (no year, includes 29 February).
// Several days per page, each with lines for consecutive years.
#import "/lib/notebook.typ": *

// days of a leap year from start-month for `months` months (not wrapping past December)
#let _days(start-month, months) = {
  let out = ()
  for i in range(months) {
    let m = calc.rem(start-month - 1 + i, 12) + 1
    for d in range(1, cal.days-in-month(2024, m) + 1) { out.push((m, d)) }
  }
  out
}

#let _day-block(m, d, years) = {
  text(size: 0.9em)[#d #cal.month-gen(m)]
  v(0.5mm)
  block(height: 1fr, grid(
    columns: (7mm, 1fr),
    rows: (1fr,) * years,
    column-gutter: 1mm,
    align: (left + bottom, bottom),
    ..range(years).map(_ => (text(size: 0.7em, fill: cfg.ink.line)[20\_\_], rule())).flatten(),
  ))
}

#let one-line-pages(start-month: 1, months: 1, years: 5, per-page: 3) = pages(
  .._days(start-month, months).chunks(per-page).map(chunk => grid(
    rows: (1fr,) * per-page,
    row-gutter: 3mm,
    ..chunk.map(((m, d)) => _day-block(m, d, years)),
  )),
)

// --- preview ---
#show: insert.with(title: "Preview: one line a day")
#one-line-pages(months: 1, per-page: 3)
