import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { defaultConfig, type NotebookConfig } from '../notebook/config';
import { normalizeConfig } from '../notebook/normalize';
import { toToml } from '../notebook/typst';
import { useNotebook } from '../state/store';
import { fakeClient } from '../test/fakeWorker';
import { en } from './en';
import { browserLang, useLang } from './index';
import { pl } from './pl';

beforeEach(() => {
  useLang.setState({ lang: 'pl' });
  useNotebook.getState().reset();
  history.replaceState(null, '', '/');
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(700);
});

// keys of both dictionaries, recursively (functions and arrays as leaves)
function keys(o: object, prefix = ''): string[] {
  return Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe('dictionaries', () => {
  it('English has the same keys as Polish', () => {
    expect(keys(en).sort()).toEqual(keys(pl).sort());
  });

  it('page count in both languages', () => {
    expect([1, 2, 5, 22].map(pl.pages)).toEqual(['1 strona', '2 strony', '5 stron', '22 strony']);
    expect([1, 2].map(en.pages)).toEqual(['1 page', '2 pages']);
  });

  it('browser language: Polish only for pl', () => {
    const langs = (l: string[]) =>
      Object.defineProperty(navigator, 'languages', { value: l, configurable: true });
    langs(['en-GB', 'pl']);
    expect(browserLang()).toBe('pl');
    langs(['de-DE', 'en']);
    expect(browserLang()).toBe('en');
    langs(['pl-PL', 'pl']);
  });
});

describe('notebook language in the design', () => {
  it('a new design uses the website language', () => {
    expect(defaultConfig(2027, 'en')).toMatchObject({ lang: 'en', title: 'Travel notebook' });
    useLang.setState({ lang: 'en' });
    useNotebook.getState().reset();
    expect(useNotebook.getState().config.lang).toBe('en');
  });

  it('an old link without language and week start: Polish, from Monday', () => {
    const old: Partial<NotebookConfig> = defaultConfig(2027);
    delete old.lang;
    delete old.weekStart;
    expect(normalizeConfig(old)).toMatchObject({ lang: 'pl', weekStart: 'monday' });
    expect(normalizeConfig({ ...old, lang: 'de', weekStart: 'friday' })).toMatchObject({
      lang: 'pl',
      weekStart: 'monday',
    });
  });

  it('TOML: language and first day of the week', () => {
    const toml = toToml({ ...defaultConfig(2027), lang: 'en', weekStart: 'sunday' });
    expect(toml).toContain('lang = "en"');
    expect(toml).toMatch(/\[calendar\]\nyear = 2027\nweek_start = "sunday"/);
  });
});

describe('language switch', () => {
  function renderApp() {
    render(<App client={fakeClient().client} />);
  }

  it('changes the interface, and the default notebook switches with it', async () => {
    const user = userEvent.setup();
    renderApp();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Wydrukuj własny notes');
    const group = screen.getByRole('group', { name: 'Język' });
    await user.click(within(group).getByRole('button', { name: 'en' }));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Print your own notebook');
    expect(screen.getByRole('navigation', { name: 'Wizard steps' })).toBeInTheDocument();
    expect(useNotebook.getState().config).toMatchObject({ lang: 'en', title: 'Travel notebook' });
    expect(document.documentElement.lang).toBe('en');
  });

  it('a custom design keeps its own language', async () => {
    const user = userEvent.setup();
    useNotebook.getState().update((c) => void (c.title = 'Mój notes'));
    renderApp();
    await user.click(screen.getByRole('button', { name: 'en' }));
    expect(useNotebook.getState().config).toMatchObject({ lang: 'pl', title: 'Mój notes' });
  });

  it('design step in English: tabs, sections, notebook language', async () => {
    const user = userEvent.setup();
    useLang.setState({ lang: 'en' });
    history.replaceState(null, '', '/#step=design');
    renderApp();
    expect(screen.getByRole('tab', { name: 'Size' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Pages' }));
    expect(await screen.findByText('Habit tracker')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Size' }));
    await user.click(await screen.findByRole('radio', { name: 'Polski' }));
    expect(useNotebook.getState().config.lang).toBe('pl');
    await user.click(screen.getByRole('radio', { name: 'Sunday' }));
    expect(useNotebook.getState().config.weekStart).toBe('sunday');
  });
});
