// Meeting notes: header, notes, action items (what, who, by when).
#import "/lib/notebook.typ": *
#import "/templates/title.typ": field
#import "/templates/todo.typ": checkbox

#let meeting-page(actions: 5, kind: auto, row-height: 6mm) = {
  grid(columns: (1fr, 25mm), column-gutter: 3mm, field(L.common.topic), field(L.common.date))
  field(L.meeting.participants)
  v(3mm)
  block(height: 1fr, fill-grid(kind: kind))
  v(2mm)
  let stroke = cfg.ink.line-width + cfg.ink.line
  grid(
    columns: (4.5mm, 1fr, 13mm, 13mm),
    rows: (5mm,) + (row-height,) * actions,
    align: (x, y) => if x == 0 { center + horizon } else { horizon },
    inset: (x: 0.6mm),
    stroke: (x, y) => (bottom: if x > 0 { stroke }, left: if x > 1 { stroke }),
    [], text(size: 0.7em, L.meeting.task), text(size: 0.7em, L.meeting.who), text(size: 0.7em, L.meeting.due),
    ..range(actions).map(_ => (checkbox(size: 2.4mm), [], [], [])).flatten(),
  )
}

// --- preview ---
#show: insert.with(title: "Preview: meeting")
#meeting-page()
