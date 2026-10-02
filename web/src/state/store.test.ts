import { beforeEach, describe, expect, it } from 'vitest';
import { defaultConfig } from '../notebook/config';
import { STORAGE_KEY, useNotebook } from './store';

const get = () => useNotebook.getState();

beforeEach(() => {
  get().reset();
});

describe('useNotebook', () => {
  it('update normalises the result', () => {
    get().update((c) => {
      c.grid.spacing = 999;
      c.title = 'Nowy';
    });
    expect(get().config.grid.spacing).toBe(15);
    expect(get().config.title).toBe('Nowy');
  });

  it('update doesn’t mutate the previous state', () => {
    const before = get().config;
    get().update((c) => void (c.margins.top = 20));
    expect(before.margins.top).toBe(8);
    expect(get().config.margins.top).toBe(20);
  });

  it('setPreset sets the preset’s dimensions, custom keeps the current ones', () => {
    get().setPreset('pocket');
    expect(get().config.format).toEqual({ preset: 'pocket', width: 90, height: 140 });
    get().setPreset('custom');
    expect(get().config.format).toEqual({ preset: 'custom', width: 90, height: 140 });
  });

  it('updateSection only changes the given section', () => {
    get().updateSection('weeks', (s) => {
      s.enabled = true;
      s.count = 10;
    });
    const weeks = get().config.sections.find((s) => s.type === 'weeks');
    expect(weeks).toMatchObject({ enabled: true, count: 10 });
    const def = defaultConfig().sections.find((s) => s.type === 'index');
    expect(get().config.sections.find((s) => s.type === 'index')).toEqual(def);
  });

  it('reorderSections sets the order, omitted ones stay at the end', () => {
    get().reorderSections(['notes', 'title']);
    const types = get().config.sections.map((s) => s.type);
    expect(types.slice(0, 2)).toEqual(['notes', 'title']);
    expect(types).toHaveLength(defaultConfig().sections.length);
    expect(types[2]).toBe('index');
  });

  describe('setSectionEnabled', () => {
    const enabledOrder = () =>
      get()
        .config.sections.filter((s) => s.enabled)
        .map((s) => s.type);

    it('an enabled section goes after the last enabled one, before notes at the end', () => {
      get().setSectionEnabled('project', true);
      get().setSectionEnabled('months', true);
      expect(enabledOrder()).toEqual(['title', 'index', 'project', 'months', 'notes']);
    });

    it('without notes at the end it appends to the very end', () => {
      get().setSectionEnabled('notes', false);
      get().setSectionEnabled('project', true);
      get().setSectionEnabled('months', true);
      expect(enabledOrder()).toEqual(['title', 'index', 'project', 'months']);
    });

    it('disabling doesn’t reorder, enabling again moves it to the end', () => {
      const types = () => get().config.sections.map((s) => s.type);
      get().setSectionEnabled('project', true);
      get().setSectionEnabled('months', true);
      const before = types();
      get().setSectionEnabled('project', false);
      expect(types()).toEqual(before);
      get().setSectionEnabled('project', true);
      expect(enabledOrder()).toEqual(['title', 'index', 'months', 'project', 'notes']);
    });

    it('empty notebook: the first enabled section goes to the start', () => {
      for (const s of get().config.sections) get().setSectionEnabled(s.type, false);
      get().setSectionEnabled('todo', true);
      expect(get().config.sections[0]).toMatchObject({ type: 'todo', enabled: true });
    });
  });

  it('replace normalises the input', () => {
    get().replace({ ...defaultConfig(), grid: { ...defaultConfig().grid, kind: 'x' as never } });
    expect(get().config.grid.kind).toBe('dots');
  });

  it('saves the configuration in localStorage', () => {
    get().update((c) => void (c.title = 'Zapisany'));
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(raw.state.config.title).toBe('Zapisany');
  });

  it('reading from localStorage goes through normalisation', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: { config: { title: 'Z pamięci', grid: { spacing: -5 } } },
        version: 1,
      }),
    );
    await useNotebook.persist.rehydrate();
    expect(get().config.title).toBe('Z pamięci');
    expect(get().config.grid.spacing).toBe(2);
  });
});
