import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { defaultConfig } from './notebook/config';
import { shareUrl } from './notebook/share';
import { useNotebook } from './state/store';
import { COMPILE_DEBOUNCE_MS, pdfFileName } from './state/typst';
import { fakeClient } from './test/fakeWorker';

beforeEach(() => {
  useNotebook.getState().reset();
  // editor tests: the Design step (the wizard has its own tests in wizard/)
  history.replaceState(null, '', '/#step=design');
  // jsdom doesn't compute layout: the desk gets a fixed size so the notebook shows up
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(700);
});

function renderApp(opts?: Parameters<typeof fakeClient>[0]) {
  const fake = fakeClient(opts);
  render(<App client={fake.client} />);
  return fake;
}

describe('App', () => {
  it('compiles on start and shows the page count', async () => {
    renderApp({ pages: 12 });
    await waitFor(() => expect(screen.getByTestId('page-count')).toHaveTextContent('12 stron'));
  });

  it('shows the engine loading until the worker is ready', () => {
    renderApp({ autoReady: false });
    expect(screen.getByTestId('engine-loading')).toBeInTheDocument();
  });

  it('an engine error shows a message', async () => {
    const fake = renderApp({ autoReady: false });
    act(() => fake.worker.emit({ type: 'init-error', message: 'WebAssembly disabled' }));
    expect(await screen.findByText('WebAssembly disabled')).toBeInTheDocument();
  });

  it('settings changes send a new compilation after a delay', async () => {
    const fake = renderApp();
    await waitFor(() => expect(fake.worker.received.some((m) => m.type === 'compile')).toBe(true));
    const count = () => fake.worker.received.filter((m) => m.type === 'compile').length;
    const before = count();
    act(() => {
      for (const t of ['A', 'AB', 'ABC']) useNotebook.getState().update((c) => void (c.title = t));
    });
    await new Promise((r) => setTimeout(r, COMPILE_DEBOUNCE_MS * 3));
    // three quick changes = one compilation
    expect(count()).toBe(before + 1);
    const last = fake.worker.received.filter((m) => m.type === 'compile').at(-1);
    expect(last?.type === 'compile' && last.input.inputs.title).toBe('ABC');
  });

  it('a compile error shows a message, the preview stays', async () => {
    const fake = renderApp();
    await waitFor(() => expect(screen.getByTestId('page-count')).toHaveTextContent('8 stron'));
    fake.worker.postMessage = (msg) => {
      fake.worker.received.push(msg);
      if (msg.type === 'compile')
        setTimeout(() =>
          fake.worker.emit({ type: 'error', id: msg.id, message: 'unknown variable' }),
        );
    };
    act(() => useNotebook.getState().update((c) => void (c.title = 'X')));
    expect(
      await screen.findByText(/Tej wersji nie da się złożyć: unknown variable/),
    ).toBeInTheDocument();
    expect(screen.getByTestId('page-count')).toHaveTextContent('8 stron');
  });

  it('a link with a configuration takes precedence', async () => {
    const cfg = defaultConfig(2027);
    cfg.title = 'Z linku';
    location.hash = new URL(shareUrl(cfg, 'http://x/')).hash;
    renderApp();
    expect(screen.getByLabelText(/Na stronie tytułowej/)).toHaveValue('Z linku');
  });

  it('copy link: the address in the clipboard and the address bar', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    renderApp();
    await user.click(screen.getByRole('button', { name: /Kopiuj link/ }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('#c='));
    expect(location.hash).toMatch(/^#c=/);
    expect(await screen.findByText('Link skopiowany')).toBeInTheDocument();
  });

  it('download PDF saves a file named after the title', async () => {
    const user = userEvent.setup();
    const createUrl = vi.fn(() => 'blob:x');
    URL.createObjectURL = createUrl;
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderApp();
    const button = screen.getByRole('button', { name: /Pobierz PDF/ });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);
    await waitFor(() => expect(click).toHaveBeenCalled());
    const a = click.mock.contexts[0] as HTMLAnchorElement;
    expect(a.download).toBe('notes-podrozny-110x210.pdf');
  });

  it('start over restores the default settings', async () => {
    const user = userEvent.setup();
    useNotebook.getState().update((c) => void (c.title = 'Zmieniony'));
    renderApp();
    await user.click(screen.getByRole('button', { name: /Od nowa/ }));
    expect(useNotebook.getState().config.title).toBe(defaultConfig().title);
  });

  it('keyboard and buttons navigate between spreads', async () => {
    const user = userEvent.setup();
    renderApp({ pages: 8 });
    // with reduced motion the cover opens straight onto page 1
    await waitFor(() => expect(screen.getByTestId('spread-label')).toHaveTextContent('Strona 1'), {
      timeout: 2000,
    });
    await user.keyboard('{ArrowRight}');
    expect(screen.getByTestId('spread-label')).toHaveTextContent('Strony 2–3');
    await user.click(screen.getByRole('button', { name: 'Następna rozkładówka' }));
    expect(screen.getByTestId('spread-label')).toHaveTextContent('Strony 4–5');
    await user.keyboard('{End}');
    expect(screen.getByTestId('spread-label')).toHaveTextContent('Strona 8');
    await user.keyboard('{Home}');
    expect(screen.getByTestId('spread-label')).toHaveTextContent('Strona 1');
    await user.click(screen.getByRole('button', { name: 'Strony 6–7' }));
    expect(screen.getByTestId('spread-label')).toHaveTextContent('Strony 6–7');
    await user.click(screen.getByRole('button', { name: 'Strony na notatki' }));
    expect(screen.getByTestId('spread-label')).toHaveTextContent('Strony 2–3');
  });

  it('arrow keys in a text field don’t turn pages', async () => {
    const user = userEvent.setup();
    renderApp({ pages: 8 });
    await waitFor(() => expect(screen.getByTestId('spread-label')).toHaveTextContent('Strona 1'), {
      timeout: 2000,
    });
    await user.click(screen.getByLabelText(/Na stronie tytułowej/));
    await user.keyboard('{ArrowRight}');
    expect(screen.getByTestId('spread-label')).toHaveTextContent('Strona 1');
  });
});

describe('pdfFileName', () => {
  it('removes Polish and special characters', () => {
    const cfg = defaultConfig();
    cfg.title = 'Łódź: żółć / 2027!';
    expect(pdfFileName(cfg)).toBe('lodz-zolc-2027-110x210.pdf');
    cfg.title = '';
    expect(pdfFileName(cfg)).toBe('notes-110x210.pdf');
  });
});
