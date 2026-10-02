import { describe, expect, it } from 'vitest';
import { defaultConfig, type NotebookConfig, type Section } from './config';
import { DEFAULT_PRINTER } from './printer';
import {
  CONFIG_PATH,
  MAIN_PATH,
  numberPlacement,
  sectionBody,
  toInsertFiles,
  toMain,
  toToml,
  toTypst,
  typstString,
} from './typst';

const cfg = (patch: (c: NotebookConfig) => void = () => {}) => {
  const c = defaultConfig(2027);
  patch(c);
  return c;
};

const enable = (c: NotebookConfig, ...types: string[]) => {
  for (const s of c.sections) s.enabled = types.includes(s.type);
};

describe('toToml', () => {
  it('writes the format as "web" with dimensions', () => {
    const toml = toToml(cfg((c) => (c.format = { preset: 'custom', width: 120, height: 180 })));
    expect(toml).toContain('format = "web"');
    expect(toml).toMatch(/\[formats\.web\]\nwidth = 120\.0\nheight = 180\.0/);
  });

  it('writes integers as floats (TOML types its values)', () => {
    const toml = toToml(cfg());
    expect(toml).toContain('spacing = 5.0');
    expect(toml).toContain('dot_diameter = 0.6');
    expect(toml).toContain('year = 2027');
  });

  it('carries over the grid, font and numbering', () => {
    const toml = toToml(
      cfg((c) => {
        c.grid.kind = 'hex';
        c.grid.color = '#6b85a8';
        c.font.family = 'Courier Prime';
        c.numbering = { enabled: false, position: 'center', size: 7 };
      }),
    );
    expect(toml).toContain('type = "hex"');
    expect(toml).toContain('color = "#6b85a8"');
    expect(toml).toContain('family = "Courier Prime"');
    expect(toml).toContain('enabled = false');
    expect(toml).toContain('position = "center"');
  });

  it('writes the accent and page line colour; text stays black', () => {
    const toml = toToml(
      cfg((c) => {
        c.grid.accent = '#d2232a';
        c.ink.color = '#2a3b8f';
      }),
    );
    expect(toml).toContain('accent = "#d2232a"');
    expect(toml).toMatch(/\[ink\]\ntext = "#000000"\nline = "#2a3b8f"/);
  });

  it('unprintable area and duplex from the printer profile, no marks', () => {
    const toml = toToml(cfg(), {
      ...DEFAULT_PRINTER,
      unprintable: 4.5,
      dx: -1.5,
      rotateBack: true,
    });
    expect(toml).toContain('unprintable = 4.5');
    expect(toml).toMatch(
      /\[duplex\]\ndx = -1\.5\ndy = 0\.0\neven_reverse = true\nrotate_back = true/,
    );
    expect(toml).toMatch(/\[marks\]\nenabled = false/);
  });

  it('margins fitted to the printer, page number above the unprintable area', () => {
    const toml = toToml(
      cfg((c) => (c.margins = { top: 3, bottom: 4, inner: 8, outer: 3 })),
      { ...DEFAULT_PRINTER, unprintable: 5 },
    );
    expect(toml).toMatch(/\[margins\]\ntop = 7\.0\nbottom = 8\.5\ninner = 8\.0\nouter = 5\.0/);
    // box centre 3.5 mm: from 5 + 1.75 to 8.5 − 1.75
    expect(toml).toContain('from_edge_y = 6.75');
    expect(toml).toContain('from_edge_x = 5.0');
  });
});

describe('toInsertFiles (just from-web)', () => {
  it('a preset as a named CLI format, without [formats]', () => {
    const { toml } = toInsertFiles(
      cfg((c) => (c.format = { preset: 'pocket', width: 90, height: 140 })),
    );
    expect(toml).toContain('format = "pocket"');
    expect(toml).not.toContain('[formats');
  });

  it('a custom format with dimensions', () => {
    const { toml } = toInsertFiles(
      cfg((c) => (c.format = { preset: 'custom', width: 100, height: 150 })),
    );
    expect(toml).toMatch(
      /format = "custom"\n[\s\S]*\[formats\.custom\]\nwidth = 100\.0\nheight = 150\.0/,
    );
  });

  it('printer, duplex, marks and number position stay from config/notebook.toml', () => {
    const { toml } = toInsertFiles(cfg());
    for (const t of ['[printer]', '[duplex]', '[marks]', 'from_edge_x', 'from_edge_y']) {
      expect(toml).not.toContain(t);
    }
    expect(toml).toContain('dot_diameter = 0.6');
  });

  it('title as a literal in the insert file, the same layout as on the website', () => {
    const c = cfg((c) => (c.title = 'Mój "notes" $& co'));
    const { typ } = toInsertFiles(c);
    expect(typ).toContain('#show: insert.with(title: "Mój \\"notes\\" $& co")');
    expect(typ).toContain('#title-page(title: "Mój \\"notes\\" $& co"');
    expect(typ).not.toContain('sys.inputs');
    expect(typ.split('\n').slice(1)).toEqual(
      toMain(c)
        .replace(/sys\.inputs\.at\("title", default: "[^"]*"\)/g, () => typstString(c.title))
        .split('\n')
        .slice(1),
    );
  });
});

describe('toInsertFiles: stores', () => {
  it('store names as literals, without sys.inputs', () => {
    const c = cfg((c) => {
      enable(c, 'shopping');
      const s = c.sections.find((s) => s.type === 'shopping')!;
      if (s.type === 'shopping') {
        s.split = 'stores';
        s.stores = ['Lidl', '', 'A "B"'];
      }
    });
    const { typ } = toInsertFiles(c);
    expect(typ).toContain('stores: ("Lidl", "", "A \\"B\\"",)');
    expect(typ).not.toContain('sys.inputs');
  });
});

describe('typstString', () => {
  it('escapes quotes, backslashes and control characters', () => {
    expect(typstString('a"b\\c\nd\te')).toBe('"a\\"b\\\\c\\nd\\te"');
    expect(typstString('„zażółć”')).toBe('"„zażółć”"');
  });
});

describe('numberPlacement', () => {
  it('number centre halfway into the bottom margin', () => {
    expect(numberPlacement(cfg()).y).toBe(5.5);
  });

  it('the number doesn’t leave the margin when the margin is small', () => {
    const p = numberPlacement(cfg((c) => (c.margins.bottom = 3)));
    // 3.5 mm box: the centre no lower than 1.75 mm from the edge
    expect(p.y).toBeGreaterThanOrEqual(1.25);
    expect(p.y + 1.75).toBeLessThanOrEqual(3 + 1.75);
  });

  it('doesn’t enter the unprintable area', () => {
    const p = numberPlacement(
      cfg((c) => (c.margins = { ...c.margins, bottom: 11, outer: 5 })),
      5,
    );
    expect(p.y - 1.75).toBeGreaterThanOrEqual(5);
    expect(p.x).toBe(5);
  });

  it('x sticks to the outer margin', () => {
    expect(numberPlacement(cfg((c) => (c.margins.outer = 12))).x).toBe(11);
    expect(numberPlacement(cfg((c) => (c.margins.outer = 3))).x).toBe(2);
  });
});

describe('toMain', () => {
  it('only imports templates of enabled sections', () => {
    const main = toMain(cfg((c) => enable(c, 'index', 'notes')));
    expect(main).toContain('/templates/index.typ');
    expect(main).toContain('/templates/dot-grid.typ');
    expect(main).not.toContain('/templates/week.typ');
    expect(main).not.toContain('/templates/title.typ');
  });

  it('keeps the section order from the configuration', () => {
    const c = cfg((c) => enable(c, 'index', 'notes', 'todo'));
    c.sections.reverse();
    const main = toMain(c);
    expect(main.indexOf('grid-pages')).toBeLessThan(main.indexOf('todo-page()'));
    expect(main.indexOf('todo-page()')).toBeLessThan(main.indexOf('index-page()'));
  });

  it('every section has a first-page marker', () => {
    const main = toMain(cfg((c) => enable(c, 'title', 'notes')));
    expect(main).toContain('#metadata((type: "title", page: here().page())) <nb-section>');
    expect(main).toContain('#metadata((type: "notes", page: here().page())) <nb-section>');
  });

  it('the title doesn’t go into the source (sys.inputs)', () => {
    const c = cfg((c) => (c.title = '"] #panic("x")'));
    const { files, inputs } = toTypst(c);
    expect(files[MAIN_PATH]).not.toContain('panic');
    expect(files[CONFIG_PATH]).not.toContain('panic');
    expect(inputs.title).toBe('"] #panic("x")');
  });

  it('store names don’t go into the source (sys.inputs as JSON)', () => {
    const c = cfg((c) => {
      const s = c.sections.find((s) => s.type === 'shopping')!;
      if (s.type === 'shopping') s.stores = ['Lidl', '"] #panic("x")', ''];
    });
    const { files, inputs } = toTypst(c);
    expect(files[MAIN_PATH]).not.toContain('panic');
    expect(JSON.parse(inputs['shopping-stores']!)).toEqual(['Lidl', '"] #panic("x")', '']);
  });

  it('pads to the chosen volume', () => {
    expect(toMain(cfg((c) => (c.pages = 40)))).toContain('if last <= 40 { 40 - last }');
  });

  it('notes filling the rest get the computed page count', () => {
    // title 1 + index 2 -> 29 of 32
    expect(toMain(cfg())).toContain('#grid-pages(n: 29,');
  });

  it('notes with no room drop out of the layout', () => {
    const main = toMain(
      cfg((c) => {
        c.pages = 8;
        enable(c, 'title', 'index', 'months', 'notes');
      }),
    );
    expect(main).not.toContain('grid-pages');
    expect(main).not.toContain('type: "notes"');
  });
});

describe('sectionBody', () => {
  const c = cfg();
  const section = <T extends string>(type: T) => c.sections.find((s) => s.type === type)!;

  it('months roll over the end of the year', () => {
    const s = { ...section('months'), startMonth: 11, count: 3 } as never;
    expect(sectionBody(c, s)).toBe(
      '#pages(month-page(year: 2027, month: 11), month-page(year: 2027, month: 12), month-page(year: 2028, month: 1))',
    );
  });

  it('weeks don’t go past the number of ISO weeks in the year', () => {
    // 2027 has 52 ISO weeks
    const s = { ...section('weeks'), startWeek: 50, count: 10 } as never;
    expect(sectionBody(c, s)).toContain('.slice(49, 52)');
  });

  it('daily pages from the given date', () => {
    const s = { ...section('daily'), startDate: '2027-03-05', count: 3 } as never;
    expect(sectionBody(c, s)).toBe('#day-pages(cal.date(2027, 3, 5), 3)');
  });

  it('an invalid daily date falls back to 1 January', () => {
    const s = { ...section('daily'), startDate: 'wczoraj', count: 1 } as never;
    expect(sectionBody(c, s)).toBe('#day-pages(cal.date(2027, 1, 1), 1)');
  });

  it('notes with their own grid or the paper grid', () => {
    // notes fill the rest: title 1 + index 2 -> 29 of 32
    const base = section('notes');
    expect(sectionBody(c, { ...base, grid: 'auto' } as never)).toBe(
      '#grid-pages(n: 29, kind: auto)',
    );
    expect(sectionBody(c, { ...base, grid: 'staff' } as never)).toBe(
      '#grid-pages(n: 29, kind: "staff")',
    );
  });

  it('habit tracker with a column count', () => {
    const s = { ...section('habits'), startMonth: 2, count: 1, habits: 5 } as never;
    expect(sectionBody(c, s)).toBe('#pages(habit-page(year: 2027, month: 2, habits: 5))');
  });

  it('choice lists as Typst arrays (a single-item one with a comma)', () => {
    const c = cfg();
    const packing = c.sections.find((s) => s.type === 'packing')!;
    if (packing.type !== 'packing') throw new Error();
    packing.groups = ['health'];
    expect(sectionBody(c, packing)).toContain('groups: ("health",)');
    const shopping = c.sections.find((s) => s.type === 'shopping')!;
    if (shopping.type !== 'shopping') throw new Error();
    shopping.groups = ['drinks'];
    shopping.qty = false;
    expect(sectionBody(c, shopping)).toBe(
      '#shopping-pages(split: "departments", groups: ("drinks",), stores: json(bytes(sys.inputs.at("shopping-stores", default: "[]"))), columns: 2, qty: false, pages-count: 1)',
    );
    packing.groups = [];
    expect(sectionBody(c, packing)).toContain('groups: ()');
  });

  it.each([
    [
      { type: 'pixels', theme: 'sleep', legend: 3 },
      '#pixels-page(year: 2027, theme: "sleep", legend: 3)',
    ],
    [
      { type: 'one-line', startMonth: 11, count: 2, years: 4, perPage: 2 },
      '#one-line-pages(start-month: 11, months: 2, years: 4, per-page: 2)',
    ],
    [
      { type: 'birthdays', perPage: 4, dayColumn: false },
      '#birthday-pages(per-page: 4, day-column: false)',
    ],
    [
      { type: 'packing', pages: 2, groups: ['clothes', 'food'], columns: 2 },
      '#packing-pages(groups: ("clothes", "food",), columns: 2, pages-count: 2)',
    ],
    [
      { type: 'meals', count: 2, meals: 4, shopping: false },
      '#pages(..range(2).map(_ => meal-page(meals: 4, shopping: false)))',
    ],
    [
      { type: 'workout', pages: 3, kind: 'cardio' },
      '#pages(..range(3).map(_ => workout-page(kind: "cardio")))',
    ],
    [
      { type: 'contacts', pages: 1, fields: ['email'] },
      '#pages(..range(1).map(_ => contact-page(fields: ("email",))))',
    ],
    [
      { type: 'tasting', pages: 2, kind: 'tea', perPage: 2, wheel: false },
      '#pages(..range(2).map(_ => tasting-page(kind: "tea", per-page: 2, wheel: false)))',
    ],
    [
      { type: 'watchlist', pages: 1, kind: 'games' },
      '#pages(..range(1).map(_ => watch-page(kind: "games")))',
    ],
    [
      { type: 'project', pages: 1, steps: 9, grid: 'seyes' },
      '#pages(..range(1).map(_ => project-page(steps: 9, kind: "seyes")))',
    ],
    [
      { type: 'meeting', pages: 2, actions: 4, grid: 'auto' },
      '#pages(..range(2).map(_ => meeting-page(actions: 4, kind: auto)))',
    ],
  ] as const)('nowa sekcja %j', (patch, expected) => {
    const c = cfg();
    const s = { ...c.sections.find((x) => x.type === patch.type)!, ...patch } as Section;
    expect(sectionBody(c, s)).toBe(expected);
  });

  it('new sections import their templates', () => {
    const c = cfg((x) => enable(x, 'pixels', 'tasting', 'meeting'));
    const main = toMain(c);
    expect(main).toContain('#import "/templates/pixels.typ": pixels-page');
    expect(main).toContain('#import "/templates/tasting.typ": tasting-page');
    expect(main).toContain('#import "/templates/meeting.typ": meeting-page');
    expect(main).not.toContain('packing.typ');
  });
});
