// A simple dotted insert: page count from config/notebook.toml.
// Config overrides for an insert go on the FIRST line of the file, e.g.:
//   // nb: format=passport pages=16
#import "/lib/notebook.typ": *
#import "/templates/dot-grid.typ": grid-pages

#show: insert.with(title: "Dots")

#grid-pages()
