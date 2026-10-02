import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { defaultConfig } from '../notebook/config';
import { shareUrl } from '../notebook/share';
import { usePrinter } from '../state/printer';
import { useNotebook } from '../state/store';
import { fakeClient } from '../test/fakeWorker';
import { hashWithStep, stepFromHash } from './steps';

beforeEach(() => {
  useNotebook.getState().reset();
  usePrinter.getState().resetPrinter();
  history.replaceState(null, '', '/');
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(700);
  URL.createObjectURL = vi.fn(() => 'blob:x');
  URL.revokeObjectURL = vi.fn();
});

function renderApp() {
  const fake = fakeClient({ pages: 32 });
  render(<App client={fake.client} />);
  return fake;
}

const heading = (name: string | RegExp) => screen.findByRole('heading', { level: 2, name });

describe('steps in the address', () => {
  it('empty address: start; link with a design: design; a step in the address wins', () => {
    expect(stepFromHash('')).toBe('start');
    expect(stepFromHash('#c=abc')).toBe('design');
    expect(stepFromHash('#c=abc&step=print')).toBe('print');
    expect(stepFromHash('#step=nieznany')).toBe('start');
  });

  it('changing the step keeps the design in the address', () => {
    expect(hashWithStep('#c=abc', 'print')).toBe('#c=abc&step=print');
    expect(hashWithStep('#c=abc&step=start', 'design')).toBe('#c=abc&step=design');
  });
});

describe('wizard', () => {
  it('goes from start to assembly with the Next buttons', async () => {
    const user = userEvent.setup();
    renderApp();
    await heading('Wydrukuj własny notes');
    await user.click(screen.getByRole('button', { name: /Zaczynamy/ }));
    await heading('Drukarka i papier');
    expect(location.hash).toBe('#step=printer');
    await user.click(screen.getByRole('button', { name: /Dalej/ }));
    expect(await screen.findByRole('tab', { name: 'Format' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Dalej: próba/ }));
    await heading('Wydruk próbny');
    await user.click(screen.getByRole('button', { name: /Dalej/ }));
    await heading('Druk');
    await user.click(screen.getByRole('button', { name: /Dalej/ }));
    await heading('Składanie');
    expect(screen.queryByRole('button', { name: /Dalej/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Wstecz/ }));
    await heading('Druk');
  });

  it('the step bar opens any step and marks the current one', async () => {
    const user = userEvent.setup();
    renderApp();
    const nav = screen.getByRole('navigation', { name: 'Kroki kreatora' });
    await user.click(within(nav).getByRole('button', { name: /Składanie/ }));
    await heading('Składanie');
    expect(within(nav).getByRole('button', { name: /Składanie/ })).toHaveAttribute(
      'aria-current',
      'step',
    );
  });

  it('printer: duplex mode and margin are saved in the profile', async () => {
    const user = userEvent.setup();
    history.replaceState(null, '', '/#step=printer');
    renderApp();
    await heading('Drukarka i papier');
    await user.click(screen.getByRole('radio', { name: /Drukarka sama/ }));
    expect(usePrinter.getState().printer.duplex).toBe('auto');
    const field = screen.getByLabelText('Drukarka nie drukuje przy krawędzi');
    await user.clear(field);
    await user.type(field, '3{Enter}');
    expect(usePrinter.getState().printer.unprintable).toBe(3);
  });

  it('manual printing: two files, fronts and backs', async () => {
    const user = userEvent.setup();
    history.replaceState(null, '', '/#step=print');
    const fake = renderApp();
    await heading('Druk');
    await waitFor(() => expect(screen.getByTestId('print-sheets')).toHaveTextContent('8'));
    await user.click(await screen.findByRole('button', { name: /Przygotuj pliki do druku/ }));
    const files = await screen.findByTestId('print-files');
    const links = within(files).getAllByRole('link');
    expect(links.map((a) => a.getAttribute('download'))).toEqual([
      'notes-podrozny-110x210-1-przody.pdf',
      'notes-podrozny-110x210-2-tyly.pdf',
    ]);
    const req = fake.worker.received.find((m) => m.type === 'print');
    expect(req?.type === 'print' && req.modes).toEqual(['odd', 'even']);
    // print config: a real A4 sheet and marks
    expect(req?.type === 'print' && req.input.files['/config/notebook.toml']).toMatch(
      /sheet_width = 297\.0[\s\S]*\[marks\]\nenabled = true/,
    );
  });

  it('automatic printing: one file and flipping along the short edge', async () => {
    const user = userEvent.setup();
    usePrinter.getState().updatePrinter({ duplex: 'auto' });
    history.replaceState(null, '', '/#step=print');
    renderApp();
    await heading('Druk');
    expect(screen.getByText(/krótszej krawędzi/)).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /Przygotuj pliki do druku/ }));
    const files = await screen.findByTestId('print-files');
    expect(within(files).getAllByRole('link')).toHaveLength(1);
  });

  it('changing the design invalidates prepared files', async () => {
    const user = userEvent.setup();
    history.replaceState(null, '', '/#step=print');
    renderApp();
    await user.click(await screen.findByRole('button', { name: /Przygotuj pliki do druku/ }));
    await screen.findByTestId('print-files');
    act(() => useNotebook.getState().update((c) => void (c.title = 'Inny')));
    expect(screen.queryByTestId('print-files')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Przygotuj pliki do druku/ })).toBeInTheDocument();
  });

  it('a format larger than the sheet: a message with a way back to the design instead of files', async () => {
    useNotebook
      .getState()
      .update((c) => (c.format = { preset: 'custom', width: 160, height: 200 }));
    history.replaceState(null, '', '/#step=print');
    renderApp();
    expect(await screen.findByRole('alert')).toHaveTextContent(/nie zmieści się na kartce A4/);
    expect(screen.queryByRole('button', { name: /Przygotuj pliki/ })).not.toBeInTheDocument();
  });

  it('moving between steps doesn’t undo changes made after opening the link', async () => {
    const user = userEvent.setup();
    const cfg = defaultConfig(2027);
    cfg.title = 'Z linku';
    history.replaceState(null, '', new URL(shareUrl(cfg, 'http://localhost/')).hash);
    renderApp();
    expect(useNotebook.getState().config.title).toBe('Z linku');
    act(() => useNotebook.getState().update((c) => void (c.title = 'Poprawiony')));
    await user.click(screen.getByRole('button', { name: /Dalej: próba/ }));
    await heading('Wydruk próbny');
    act(() => {
      history.back();
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(useNotebook.getState().config.title).toBe('Poprawiony');
  });
});

describe('test print', () => {
  it('manual duplex: front, back and order test separately', async () => {
    const user = userEvent.setup();
    history.replaceState(null, '', '/#step=test');
    const fake = renderApp();
    await heading('Wydruk próbny');
    await user.click(await screen.findByRole('button', { name: /Przygotuj wydruk próbny/ }));
    const files = await screen.findByTestId('test-files');
    expect(
      within(files)
        .getAllByRole('link')
        .map((a) => a.getAttribute('download')),
    ).toEqual([
      'proba-1-przod.pdf',
      'proba-2-tyl.pdf',
      'kolejnosc-1-przody.pdf',
      'kolejnosc-2-tyly.pdf',
    ]);
    const pdfs = fake.worker.received.filter((m) => m.type === 'pdf');
    expect(pdfs.map((m) => m.type === 'pdf' && m.input.inputs.side)).toEqual(['front', 'back']);
    const order = fake.worker.received.find((m) => m.type === 'print');
    expect(order?.type === 'print' && order.input.files['/config/notebook.toml']).toContain(
      'pages = 8',
    );
  });

  it('answers change the printer profile', async () => {
    const user = userEvent.setup();
    history.replaceState(null, '', '/#step=test');
    renderApp();
    await heading('Wydruk próbny');
    await user.click(screen.getByRole('button', { name: 'Nie, jest ucięta' }));
    expect(usePrinter.getState().printer.unprintable).toBe(6);
    // a second click on the same answer doesn't increase it further
    await user.click(screen.getByRole('button', { name: 'Nie, jest ucięta' }));
    expect(usePrinter.getState().printer.unprintable).toBe(6);
    await user.click(screen.getByRole('button', { name: 'Nie, jest odwrócona' }));
    expect(usePrinter.getState().printer.rotateBack).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Nie, tyły są zamienione' }));
    expect(usePrinter.getState().printer.evenReverse).toBe(false);
    const right = screen.getByLabelText('W prawo');
    await user.clear(right);
    await user.type(right, '2{Enter}');
    const down = screen.getByLabelText('W dół');
    await user.clear(down);
    await user.type(down, '-1,5{Enter}');
    await user.click(screen.getByRole('button', { name: 'Popraw przesunięcie tyłu' }));
    // regular (landscape sheet): dx += to the right, dy -= down
    expect(usePrinter.getState().printer).toMatchObject({ dx: 2, dy: 1.5 });
  });

  it('automatic duplex: no order test among the questions', async () => {
    usePrinter.getState().updatePrinter({ duplex: 'auto' });
    history.replaceState(null, '', '/#step=test');
    renderApp();
    await heading('Wydruk próbny');
    expect(screen.queryByText(/Test kolejności: kartka/)).not.toBeInTheDocument();
  });
});
