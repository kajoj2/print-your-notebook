import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  FORMAT_PRESETS,
  defaultConfig,
  type FormatPreset,
  type NotebookConfig,
  type Section,
  type SectionOf,
  type SectionType,
} from '../notebook/config';
import { useLang } from '../i18n';
import { normalizeConfig } from '../notebook/normalize';

export interface NotebookState {
  config: NotebookConfig;
  // change any field: recipe gets a copy, the result goes through normalizeConfig
  update: (recipe: (draft: NotebookConfig) => void) => void;
  setPreset: (preset: FormatPreset) => void;
  updateSection: <T extends SectionType>(type: T, recipe: (s: SectionOf<T>) => void) => void;
  reorderSections: (order: SectionType[]) => void;
  // an enabled section goes to the end of the enabled ones (before notes, if they close the notebook)
  setSectionEnabled: (type: SectionType, enabled: boolean) => void;
  replace: (config: NotebookConfig) => void;
  reset: () => void;
}

export const STORAGE_KEY = 'notebook-config-v1';

export const useNotebook = create<NotebookState>()(
  persist(
    (set) => ({
      config: defaultConfig(undefined, useLang.getState().lang),

      update: (recipe) =>
        set((s) => {
          const draft = structuredClone(s.config);
          recipe(draft);
          return { config: normalizeConfig(draft) };
        }),

      setPreset: (preset) =>
        set((s) => {
          const size = preset === 'custom' ? s.config.format : FORMAT_PRESETS[preset];
          return {
            config: {
              ...s.config,
              format: { preset, width: size.width, height: size.height },
            },
          };
        }),

      updateSection: (type, recipe) =>
        set((s) => {
          const draft = structuredClone(s.config);
          const section = draft.sections.find((x): x is SectionOf<typeof type> => x.type === type);
          if (section) recipe(section);
          return { config: normalizeConfig(draft) };
        }),

      reorderSections: (order) =>
        set((s) => {
          const byType = new Map(s.config.sections.map((x) => [x.type, x]));
          const sections = order
            .map((t) => byType.get(t))
            .filter((x): x is Section => x !== undefined);
          // types missing from order stay at the end in their previous order
          for (const x of s.config.sections) if (!order.includes(x.type)) sections.push(x);
          return { config: { ...s.config, sections } };
        }),

      setSectionEnabled: (type, enabled) =>
        set((s) => {
          const rest = s.config.sections.filter((x) => x.type !== type);
          const section = s.config.sections.find((x) => x.type === type);
          if (!section || section.enabled === enabled) return s;
          const updated = { ...section, enabled };
          if (!enabled) {
            // disabling doesn't reorder: the section stays where it is
            const sections = s.config.sections.map((x) => (x.type === type ? updated : x));
            return { config: normalizeConfig({ ...s.config, sections }) };
          }
          const last = rest.filter((x) => x.enabled).at(-1);
          // notes that close the notebook stay at the end: a new section goes before them
          const at = !last ? 0 : rest.indexOf(last) + (last.type === 'notes' ? 0 : 1);
          const sections = [...rest.slice(0, at), updated, ...rest.slice(at)];
          return { config: normalizeConfig({ ...s.config, sections }) };
        }),

      replace: (config) => set({ config: normalizeConfig(config) }),

      reset: () => set({ config: defaultConfig(undefined, useLang.getState().lang) }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      // localStorage can be unavailable (private mode, blocked site data)
      storage: createJSONStorage(() => {
        try {
          return window.localStorage;
        } catch {
          return undefined as unknown as Storage;
        }
      }),
      partialize: (s) => ({ config: s.config }),
      merge: (persisted, current) => {
        const p = persisted as { config?: unknown } | undefined;
        return p?.config ? { ...current, config: normalizeConfig(p.config) } : current;
      },
    },
  ),
);
