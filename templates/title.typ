// Title page with the owner's details ("if found, please return"). No page number.
#import "/lib/notebook.typ": *

// A label and a line to write on, aligned to the bottom.
#let field(label, height: 7mm) = grid(
  columns: (auto, 1fr),
  column-gutter: 1.5mm,
  align: bottom,
  rows: height,
  text(size: 0.85em, label), rule(),
)

#let title-page(title: none, owner: true) = {
  no-number
  v(1fr)
  if title != none and title != "" {
    align(center, text(size: cfg.font.size * 2.4, title))
    v(3mm)
    align(center, rule(length: 40%))
  }
  v(2fr)
  if owner {
    field(L.title.owner)
    field(L.title.contact)
    field(L.title.from)
    field(L.title.to)
    v(4mm)
    align(center, text(size: 0.85em, L.title.found))
    field(L.title.reward)
  }
  v(1fr)
}

// --- preview ---
#show: insert.with(title: "Preview: title page")
#title-page(title: "Travel notebook")
