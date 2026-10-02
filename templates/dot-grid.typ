// A grid page (dots/lines/squares/blank – from the config by default).
#import "/lib/notebook.typ": *

#let grid-page(kind: auto) = fill-grid(kind: kind)

#let grid-pages(n: cfg.pages, kind: auto) = pages(..range(n).map(_ => grid-page(kind: kind)))

// --- preview (only when compiling this file; importing skips it) ---
#show: insert.with(title: "Preview: grid")
#grid-pages(n: 2)
#pagebreak()
#grid-page(kind: "lines")
#pagebreak()
#grid-page(kind: "squares")
