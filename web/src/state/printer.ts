import { useMemo } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { NotebookConfig } from '../notebook/config';
import {
  DEFAULT_PRINTER,
  fitToPrinter,
  localPaper,
  normalizePrinter,
  type PrinterProfile,
} from '../notebook/printer';
import { useNotebook } from './store';

// The printer profile only lives in this browser: it doesn't go into the design link.
export interface PrinterState {
  printer: PrinterProfile;
  updatePrinter: (patch: Partial<PrinterProfile>) => void;
  resetPrinter: () => void;
}

export const PRINTER_STORAGE_KEY = 'notebook-printer-v1';

// Default profile with paper from the browser's region.
function localDefault(): PrinterProfile {
  const locales =
    typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language]);
  return { ...DEFAULT_PRINTER, paper: localPaper(locales) };
}

export const usePrinter = create<PrinterState>()(
  persist(
    (set) => ({
      printer: localDefault(),
      updatePrinter: (patch) =>
        set((s) => ({ printer: normalizePrinter({ ...s.printer, ...patch }) })),
      resetPrinter: () => set({ printer: localDefault() }),
    }),
    {
      name: PRINTER_STORAGE_KEY,
      version: 1,
      // localStorage can be unavailable (private mode, blocked site data)
      storage: createJSONStorage(() => {
        try {
          return window.localStorage;
        } catch {
          return undefined as unknown as Storage;
        }
      }),
      partialize: (s) => ({ printer: s.printer }),
      merge: (persisted, current) => {
        const p = persisted as { printer?: unknown } | undefined;
        return p?.printer ? { ...current, printer: normalizePrinter(p.printer) } : current;
      },
    },
  ),
);

// The design fitted to the printer and the list of corrected margins (for the panel message).
export function useFittedNotebook(): {
  config: NotebookConfig;
  printer: PrinterProfile;
  fixes: ReturnType<typeof fitToPrinter>['fixes'];
} {
  const config = useNotebook((s) => s.config);
  const printer = usePrinter((s) => s.printer);
  return useMemo(() => ({ ...fitToPrinter(config, printer), printer }), [config, printer]);
}
