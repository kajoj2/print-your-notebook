import { beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePrinter } from '../../state/printer';
import { useNotebook } from '../../state/store';
import { renderWithEngine } from '../../test/render';
import { ControlPanel } from './ControlPanel';

const config = () => useNotebook.getState().config;
const section = (type: string) => config().sections.find((s) => s.type === type)!;

beforeEach(() => {
  useNotebook.getState().reset();
  usePrinter.getState().resetPrinter();
});

async function openTab(name: string) {
  const user = userEvent.setup();
  renderWithEngine(<ControlPanel />);
  await user.click(screen.getByRole('tab', { name }));
  // the previous tab finishes its exit animation first
  await screen.findByRole('tabpanel', { name });
  await waitFor(() => expect(screen.getAllByRole('tabpanel')).toHaveLength(1));
  return user;
}

describe('Format tab', () => {
  it('volume: quick choice, a custom multiple of 4, sheets of paper', async () => {
    const user = await openTab('Format');
    const volume = screen.getByRole('radiogroup', { name: 'Liczba stron' });
    await user.click(within(volume).getByRole('radio', { name: '24' }));
    expect(config().pages).toBe(24);
    expect(screen.getByTestId('volume-sheets')).toHaveTextContent(
      'Kartek w składce: 6Arkuszy A4: 6',
    );
    const own = screen.getByLabelText('Własna (wielokrotność 4)');
    await user.clear(own);
    await user.type(own, '30{Enter}');
    // rounded to a multiple of 4
    expect(config().pages).toBe(32);
    await user.clear(own);
    await user.type(own, '52{Enter}');
    expect(config().pages).toBe(52);
    expect(screen.getByRole('status')).toHaveTextContent(/Ponad 12 kartek/);
  });

  it('pocket volume: two signatures per A4 sheet', async () => {
    const user = await openTab('Format');
    await user.click(screen.getByRole('radio', { name: /Pocket/ }));
    expect(screen.getByTestId('volume-sheets')).toHaveTextContent(
      'Kartek w składce: 8Arkuszy A4: 4 (dwie składki na arkuszu)',
    );
  });

  it('the title goes into the configuration', async () => {
    const user = await openTab('Format');
    const input = screen.getByLabelText(/Na stronie tytułowej/);
    await user.clear(input);
    await user.type(input, 'Podróże 2027');
    expect(config().title).toBe('Podróże 2027');
  });

  it('choosing a preset changes the dimensions', async () => {
    const user = await openTab('Format');
    await user.click(screen.getByRole('radio', { name: /Passport/ }));
    expect(config().format).toEqual({ preset: 'passport', width: 89, height: 124 });
    expect(screen.getByText('89 × 124 mm')).toBeInTheDocument();
  });

  it('a custom format shows dimension fields and clamps them', async () => {
    const user = await openTab('Format');
    await user.click(screen.getByRole('radio', { name: /Własny/ }));
    const width = screen.getByLabelText('Szerokość');
    await user.clear(width);
    await user.type(width, '500{Enter}');
    expect(config().format.width).toBe(300);
    expect(width).toHaveValue('300');
  });

  it('number field: invalid text reverts to the previous value', async () => {
    const user = await openTab('Format');
    const year = screen.getByLabelText(/Kalendarz, tygodnie/);
    await user.clear(year);
    await user.type(year, 'abc');
    await user.tab();
    expect(year).toHaveValue(String(config().year));
  });

  it('arrow keys in a number field change the value by a step', async () => {
    const user = await openTab('Format');
    const year = screen.getByLabelText(/Kalendarz, tygodnie/);
    const before = config().year;
    await user.click(year);
    await user.keyboard('{ArrowUp}{ArrowUp}{ArrowDown}');
    expect(config().year).toBe(before + 1);
  });

  it('changing the year moves the default date of daily pages', async () => {
    const user = await openTab('Format');
    const year = screen.getByLabelText(/Kalendarz, tygodnie/);
    await user.clear(year);
    await user.type(year, '2031{Enter}');
    expect(section('daily')).toMatchObject({ startDate: '2031-01-01' });
  });

  it('the margin slider responds to the keyboard', async () => {
    const user = await openTab('Format');
    const slider = screen.getByRole('slider', { name: 'Górny' });
    slider.focus();
    await user.keyboard('{ArrowRight}');
    expect(config().margins.top).toBe(8.5);
  });

  it('a format wider than the sheet: a warning that it can’t be printed', async () => {
    await openTab('Format');
    expect(screen.queryByText(/nie zmieści się na kartce/)).not.toBeInTheDocument();
    act(() =>
      useNotebook
        .getState()
        .update((c) => (c.format = { preset: 'custom', width: 160, height: 200 })),
    );
    expect(await screen.findByText(/nie zmieści się na kartce A4/)).toBeInTheDocument();
  });

  it('printer’s unprintable area: a message about wider margins in the print', async () => {
    await openTab('Format');
    expect(screen.queryByText(/nie zadrukuje/)).not.toBeInTheDocument();
    act(() => usePrinter.getState().updatePrinter({ unprintable: 9 }));
    const note = screen.getByText(/nie zadrukuje 9 mm/).closest('[role="status"]')!;
    // regular is as tall as A4: top and bottom also fit the band of cut marks
    expect(note).toHaveTextContent('górny 11 mm zamiast 8 mm');
    expect(note).toHaveTextContent('dolny 12,5 mm zamiast 11 mm');
    expect(note).toHaveTextContent(/znaczniki cięcia/);
    expect(note).toHaveTextContent('zewnętrzny 9 mm zamiast 7 mm');
    // the design in the link stays unchanged
    expect(config().margins.top).toBe(8);
  });
});

describe('Paper tab', () => {
  it('choosing a pattern', async () => {
    const user = await openTab('Papier');
    await user.click(screen.getByRole('radio', { name: 'Heksagony' }));
    expect(config().grid.kind).toBe('hex');
    expect(screen.getByText('Bok heksagonu')).toBeInTheDocument();
  });

  it('dots have a diameter, lines a weight', async () => {
    const user = await openTab('Papier');
    expect(screen.getByRole('slider', { name: 'Średnica kropki' })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Linie' }));
    expect(screen.getByRole('slider', { name: 'Grubość linii' })).toBeInTheDocument();
  });

  it('a blank page hides the grid settings', async () => {
    const user = await openTab('Papier');
    await user.click(screen.getByRole('radio', { name: 'Czysta' }));
    await waitFor(() =>
      expect(screen.queryByRole('slider', { name: 'Odstęp' })).not.toBeInTheDocument(),
    );
  });

  it('pattern, accent and page line colour', async () => {
    const user = await openTab('Papier');
    await user.click(
      within(screen.getByRole('radiogroup', { name: 'Wzór' })).getByRole('radio', {
        name: 'Fiolet',
      }),
    );
    await user.click(
      within(screen.getByRole('radiogroup', { name: 'Akcent' })).getByRole('radio', {
        name: 'Czerwony',
      }),
    );
    await user.click(
      within(screen.getByRole('radiogroup', { name: 'Linie na stronach sekcji' })).getByRole(
        'radio',
        {
          name: 'Granat',
        },
      ),
    );
    expect(config().grid).toMatchObject({ color: '#6a4c9c', accent: '#d2232a' });
    expect(config().ink.color).toBe('#2a3b8f');
  });

  it('a colour theme sets three roles at once', async () => {
    const user = await openTab('Papier');
    const seyes = screen.getByRole('button', { name: /Szkolny Seyès/ });
    expect(seyes).toHaveAttribute('aria-pressed', 'false');
    await user.click(seyes);
    expect(config().grid).toMatchObject({ color: '#6a4c9c', accent: '#d2232a' });
    expect(config().ink.color).toBe('#000000');
    expect(seyes).toHaveAttribute('aria-pressed', 'true');
  });

  it('a custom colour and a warning when it’s too light for a laser', async () => {
    await openTab('Papier');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Wzór: własny kolor'), {
      target: { value: '#c8c8c8' },
    });
    expect(config().grid.color).toBe('#c8c8c8');
    expect(screen.getByRole('status')).toHaveTextContent(/Za jasny na laser/);
  });
});

describe('Pages tab', () => {
  it('enabling a section shows its settings', async () => {
    const user = await openTab('Strony');
    const row = screen.getByTestId('section-weeks');
    expect(within(row).queryByLabelText('Ile tygodni')).not.toBeInTheDocument();
    await user.click(within(row).getByRole('switch', { name: 'Tygodnie' }));
    expect(section('weeks').enabled).toBe(true);
    const count = within(row).getByLabelText('Ile tygodni');
    await user.clear(count);
    await user.type(count, '6{Enter}');
    expect(section('weeks')).toMatchObject({ count: 6 });
  });

  it('disabling a section', async () => {
    const user = await openTab('Strony');
    await user.click(within(screen.getByTestId('section-index')).getByRole('switch'));
    expect(section('index').enabled).toBe(false);
  });

  it('the handle moves a section with arrow keys', async () => {
    const user = await openTab('Strony');
    // the order list only has enabled sections: title, index, notes
    const enabledOrder = () =>
      config()
        .sections.filter((s) => s.enabled)
        .map((s) => s.type);
    const handle = screen.getByRole('button', { name: /Przestaw: Indeks/ });
    handle.focus();
    await user.keyboard('{ArrowUp}');
    expect(enabledOrder()).toEqual(['index', 'title', 'notes']);
    await user.keyboard('{ArrowUp}');
    // first position: it can't go any higher
    expect(enabledOrder()).toEqual(['index', 'title', 'notes']);
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(enabledOrder()).toEqual(['title', 'notes', 'index']);
    // disabled sections stay where they are
    expect(config().sections[2]!.type).toBe('year');
  });

  it('sections grouped into categories', async () => {
    await openTab('Strony');
    const trackers = screen.getByRole('heading', { name: 'Trackery' }).closest('section')!;
    expect(within(trackers).getByTestId('section-pixels')).toBeInTheDocument();
    expect(within(trackers).getByText('0 z 5')).toBeInTheDocument();
  });

  describe('settings of new sections', () => {
    async function enabled(type: string) {
      const user = await openTab('Strony');
      const row = () => screen.getByTestId(`section-${type}`);
      await user.click(within(row()).getByRole('switch'));
      expect(section(type).enabled).toBe(true);
      const num = async (label: string, value: string) => {
        const input = within(row()).getByLabelText(label);
        await user.clear(input);
        await user.type(input, `${value}{Enter}`);
      };
      return { user, row, num };
    }

    it('year in pixels', async () => {
      const { user, row, num } = await enabled('pixels');
      await user.selectOptions(within(row()).getByLabelText('Co śledzisz'), 'sleep');
      await num('Kolorów w legendzie', '0');
      expect(section('pixels')).toMatchObject({ theme: 'sleep', legend: 0 });
    });

    it('one line a day', async () => {
      const { user, row, num } = await enabled('one-line');
      await user.selectOptions(within(row()).getByLabelText('Od miesiąca'), '6');
      await num('Ile miesięcy', '3');
      await num('Ile lat', '4');
      await num('Dni na stronie', '9');
      expect(section('one-line')).toMatchObject({ startMonth: 6, count: 3, years: 4, perPage: 6 });
    });

    it('birthday calendar', async () => {
      const { user, row } = await enabled('birthdays');
      await user.click(within(row()).getByRole('radio', { name: '6' }));
      await user.click(within(row()).getByRole('switch', { name: /Kolumna na dzień/ }));
      expect(section('birthdays')).toMatchObject({ perPage: 6, dayColumn: false });
      // 12 months, 6 per page
      expect(within(row()).getByText('~2 strony')).toBeInTheDocument();
    });

    it('packing list', async () => {
      const { user, row, num } = await enabled('packing');
      await user.click(within(row()).getByRole('button', { name: 'Apteczka' }));
      await user.click(within(row()).getByRole('button', { name: 'Ubrania' }));
      await user.click(within(row()).getByRole('radio', { name: '2' }));
      await num('Liczba stron', '2');
      expect(section('packing')).toMatchObject({
        groups: ['documents', 'electronics', 'toiletries', 'health'],
        columns: 2,
        pages: 2,
      });
    });

    it('shopping list', async () => {
      const { user, row, num } = await enabled('shopping');
      await user.click(within(row()).getByRole('button', { name: 'Napoje' }));
      await user.click(within(row()).getByRole('button', { name: 'Pieczywo' }));
      await user.click(within(row()).getByRole('radio', { name: '1' }));
      await user.click(within(row()).getByRole('switch', { name: /Ilość/ }));
      await num('Liczba stron', '2');
      expect(section('shopping')).toMatchObject({
        groups: ['produce', 'dairy', 'meat', 'pantry', 'drinks', 'household'],
        columns: 1,
        qty: false,
        pages: 2,
      });
    });

    it('shopping list: split into stores with names', async () => {
      const { user, row, num } = await enabled('shopping');
      await user.click(within(row()).getByRole('radio', { name: 'Sklepy' }));
      expect(within(row()).queryByRole('button', { name: 'Nabiał' })).not.toBeInTheDocument();
      await num('Ile sklepów', '2');
      await user.type(within(row()).getByRole('textbox', { name: 'Sklep 1' }), 'Lidl');
      expect(section('shopping')).toMatchObject({ split: 'stores', stores: ['Lidl', ''] });
    });

    it('meal plan', async () => {
      const { user, row, num } = await enabled('meals');
      await num('Ile tygodni', '4');
      await num('Posiłków dziennie', '4');
      await user.click(within(row()).getByRole('switch', { name: /Lista zakupów/ }));
      expect(section('meals')).toMatchObject({ count: 4, meals: 4, shopping: false });
    });

    it('workout log', async () => {
      const { user, row } = await enabled('workout');
      await user.click(within(row()).getByRole('radio', { name: 'Wytrzymałościowy' }));
      expect(section('workout')).toMatchObject({ kind: 'cardio' });
    });

    it('contacts', async () => {
      const { user, row } = await enabled('contacts');
      await user.click(within(row()).getByRole('button', { name: 'Adres' }));
      await user.click(within(row()).getByRole('button', { name: 'Urodziny' }));
      expect(section('contacts')).toMatchObject({ fields: ['phone', 'email', 'birthday'] });
    });

    it('tasting notes', async () => {
      const { user, row } = await enabled('tasting');
      await user.click(within(row()).getByRole('radio', { name: 'Wino' }));
      await user.click(within(row()).getByRole('radio', { name: '2' }));
      await user.click(within(row()).getByRole('switch', { name: /Wykres smaków/ }));
      expect(section('tasting')).toMatchObject({ kind: 'wine', perPage: 2, wheel: false });
    });

    it('movies and series', async () => {
      const { user, row } = await enabled('watchlist');
      await user.selectOptions(within(row()).getByLabelText('Co oglądasz'), 'podcasts');
      expect(section('watchlist')).toMatchObject({ kind: 'podcasts' });
    });

    it('project', async () => {
      const { user, row, num } = await enabled('project');
      await num('Liczba kroków', '20');
      await user.selectOptions(within(row()).getByLabelText('Wzór notatek'), 'graph');
      expect(section('project')).toMatchObject({ steps: 15, grid: 'graph' });
    });

    it('meeting notes', async () => {
      const { user, row, num } = await enabled('meeting');
      await num('Wierszy na zadania', '3');
      await user.selectOptions(within(row()).getByLabelText('Wzór notatek'), 'seyes');
      expect(section('meeting')).toMatchObject({ actions: 3, grid: 'seyes' });
    });

    it('an enabled section appears in the order list before the notes', async () => {
      await enabled('meals');
      const order = screen
        .getAllByRole('button', { name: /^Przestaw:/ })
        .map((b) => b.getAttribute('aria-label')!.replace(/^Przestaw: | \(.*$/g, ''));
      expect(order).toEqual(['Strona tytułowa', 'Indeks', 'Plan posiłków', 'Strony na notatki']);
    });
  });

  it('page ranges from the compilation', async () => {
    await openTab('Strony');
    // fake worker: title from 1, notes from 2, 8 pages
    await waitFor(() =>
      expect(within(screen.getByTestId('section-notes')).getByText('s. 2–8')).toBeInTheDocument(),
    );
    expect(within(screen.getByTestId('section-title')).getByText('s. 1')).toBeInTheDocument();
  });

  it('every section’s settings can be changed', async () => {
    const user = await openTab('Strony');
    const enable = async (type: string, label: string) =>
      user.click(
        within(screen.getByTestId(`section-${type}`)).getByRole('switch', { name: label }),
      );

    await enable('habits', 'Tracker nawyków');
    const habits = screen.getByTestId('section-habits');
    await user.selectOptions(within(habits).getByLabelText('Od miesiąca'), '3');
    const cols = within(habits).getByLabelText('Kolumn na nawyki');
    await user.clear(cols);
    await user.type(cols, '9{Enter}');
    expect(section('habits')).toMatchObject({ startMonth: 3, habits: 9 });

    await enable('daily', 'Strony dzienne');
    const date = within(screen.getByTestId('section-daily')).getByLabelText('Od dnia');
    // jsdom doesn't support typing into a date field: change the value as if from the calendar
    fireEvent.change(date, { target: { value: '2027-05-10' } });
    expect(section('daily')).toMatchObject({ startDate: '2027-05-10' });

    await user.selectOptions(
      within(screen.getByTestId('section-notes')).getByLabelText('Wzór'),
      'staff',
    );
    expect(section('notes')).toMatchObject({ grid: 'staff' });

    await user.click(
      within(screen.getByTestId('section-title')).getByRole('switch', { name: /Dane właściciela/ }),
    );
    expect(section('title')).toMatchObject({ owner: false });
  });

  it('volume: fill state and the “Increase” button', async () => {
    useNotebook.getState().update((c) => {
      c.pages = 8;
      const months = c.sections.find((s) => s.type === 'months')!;
      if (months.type === 'months') months.count = 1;
    });
    const user = await openTab('Strony');
    // title 1 + index 2 = 3 of 8, notes fill 5
    expect(screen.getByTestId('volume-usage')).toHaveTextContent('8 / 8');
    expect(screen.getByText(/Notatki wypełniają resztę: 5 stron/)).toBeInTheDocument();
    await user.click(within(screen.getByTestId('section-months')).getByRole('switch'));
    await user.click(within(screen.getByTestId('section-future-log')).getByRole('switch'));
    // 3 + future log 2 (from page 4, even) + month 1 = 6; notes 2 -> 8
    expect(screen.getByTestId('volume-usage')).toHaveTextContent('8 / 8');
    const months = screen.getByTestId('section-months');
    const count = within(months).getByLabelText('Ile miesięcy');
    await user.clear(count);
    await user.type(count, '6{Enter}');
    // 3 + 2 + 6 = 11 > 8
    expect(screen.getByRole('alert')).toHaveTextContent(/Za dużo o 3 strony/);
    await user.click(screen.getByRole('button', { name: 'Zwiększ do 12 stron' }));
    expect(config().pages).toBe(12);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('notes: a fixed page count instead of filling', async () => {
    const user = await openTab('Strony');
    const notes = screen.getByTestId('section-notes');
    expect(within(notes).queryByLabelText('Liczba stron')).not.toBeInTheDocument();
    await user.click(within(notes).getByRole('switch', { name: /Wypełnij resztę/ }));
    expect(section('notes')).toMatchObject({ fill: false });
    expect(within(notes).getByLabelText('Liczba stron')).toBeInTheDocument();
    expect(
      screen.getByText(/Zostaje 1 strona: na końcu dojdą strony z siatką/),
    ).toBeInTheDocument();
  });
});

describe('Style tab', () => {
  it('font, numbering, cover', async () => {
    const user = await openTab('Wygląd');
    await user.click(screen.getByRole('radio', { name: /Courier Prime/ }));
    expect(config().font.family).toBe('Courier Prime');

    await user.click(screen.getByRole('radio', { name: 'Środek' }));
    expect(config().numbering.position).toBe('center');

    await user.click(screen.getByRole('switch', { name: /Numeruj strony/ }));
    expect(config().numbering.enabled).toBe(false);
    await waitFor(() => expect(screen.queryByText('Położenie')).not.toBeInTheDocument());

    await user.click(screen.getByRole('radio', { name: 'Granat' }));
    expect(config().coverColor).toBe('#2a3b57');
  });
});
