// Contacts: entries with a name and the chosen fields.
#import "/lib/notebook.typ": *
#import "/templates/title.typ": field

#let contact-fields = (
  phone: L.contacts.fields.phone,
  email: L.contacts.fields.email,
  address: L.contacts.fields.address,
  birthday: L.contacts.fields.birthday,
)

#let contact-page(fields: ("phone", "email", "address"), row-height: 5.5mm) = {
  page-title(L.contacts.title)
  let labels = (L.contacts.name,) + fields.map(f => contact-fields.at(f))
  // the address takes two lines
  let lines = labels.len() + if "address" in fields { 1 } else { 0 }
  let entry = lines * row-height + 3mm
  block(height: 1fr, width: 100%, layout(size => {
    let n = calc.max(1, calc.floor(size.height / entry))
    for _ in range(n) {
      let rows = labels.map(l => if l == contact-fields.address { (l, []) } else { (l,) }).flatten()
      block(below: 3mm, breakable: false, stack(..rows.map(l => field(l, height: row-height))))
    }
  }))
}

// --- preview ---
#show: insert.with(title: "Preview: contacts")
#contact-page()
