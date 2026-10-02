// An example planner: index, year, months, the first weeks, notes.
#import "/lib/notebook.typ": *
#import "/templates/dot-grid.typ": grid-pages
#import "/templates/index.typ": index-page
#import "/templates/year.typ": year-page
#import "/templates/month.typ": month-page
#import "/templates/week.typ": week-spread

#show: insert.with(title: "Planner " + str(cfg.year))

// title page without a number, with a graphic from assets/svg/
#no-number
#v(1fr)
#ornament("example-ornament", width: 40mm)
#align(center, text(size: 16pt)[#cfg.year])
#v(2fr)
#pagebreak()

#index-page()
#pagebreak()
#year-page()
#pagebreak()
#pages(..range(1, 13).map(m => month-page(month: m)))

#for monday in cal.iso-week-mondays(cfg.year).slice(0, 4) {
  week-spread(monday)
}

#pagebreak()
#grid-pages(n: 3)
