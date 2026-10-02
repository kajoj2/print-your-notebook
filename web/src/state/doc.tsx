import { createContext, useContext, type ReactNode } from 'react';
import { usePrinter } from './printer';
import { useNotebook } from './store';
import { useCompiledNotebook, type CompileState } from './typst';

// One compiled document for the whole website: the panel shows page ranges from it,
// the preview draws its pages.
const DocContext = createContext<CompileState | null>(null);

export function DocProvider({ children }: { children: ReactNode }) {
  const config = useNotebook((s) => s.config);
  const printer = usePrinter((s) => s.printer);
  const state = useCompiledNotebook(config, printer);
  return <DocContext.Provider value={state}>{children}</DocContext.Provider>;
}

export function useDoc(): CompileState {
  const ctx = useContext(DocContext);
  if (!ctx) throw new Error('useDoc poza DocProvider');
  return ctx;
}
