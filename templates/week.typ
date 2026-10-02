// Weekly calendar on a spread: 4 days on the left page, 3 days + notes on the right
// (from Monday, or the Sunday before it).
// Always starts on a left (even) page. SKELETON.
#import "/lib/notebook.typ": *

#let _day-box(label, kind) = grid(
  rows: (auto, 1fr),
  row-gutter: 1mm,
  {
    label
    v(-0.6em)
    rule()
  },
  fill-grid(kind: kind, inset: 1mm),
)

#let _column(cells, kind) = grid(
  rows: (1fr,) * cells.len(),
  row-gutter: 2mm,
  ..cells.map(c => _day-box(c, kind)),
)

#let week-spread(monday, kind: "dots") = {
  let days = range(7).map(i => cal.add-days(cal.first-day(monday), i))
  let label(d) = [#cal.weekday-name(d) #h(1fr) #cal.format-date(d, year: false)]
  let last = days.last()
  to-left-page
  page-title[#L.week.week #cal.iso-week(monday) #h(1fr) #days.first().day() #cal.months-short.at(days.first().month() - 1) – #last.day() #cal.months-short.at(last.month() - 1)]
  block(height: 1fr, _column(days.slice(0, 4).map(label), kind))
  pagebreak()
  page-title[#h(1fr)#last.year()]
  block(height: 1fr, _column(days.slice(4).map(label) + (L.week.notes,), kind))
}

// --- preview ---
#show: insert.with(title: "Preview: week")
#week-spread(cal.iso-week-mondays(cfg.year).first())
