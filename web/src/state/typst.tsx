import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import compilerWasm from '@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url';
import rendererWasm from '@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm?url';
import type { NotebookConfig } from '../notebook/config';
import { DEFAULT_PRINTER, type PrinterProfile } from '../notebook/printer';
import {
  calibrationSides,
  orderTestConfig,
  printFileName,
  printModes,
  toCalibrationTypst,
  toPrintTypst,
  type CalibrationSide,
  type ImposeMode,
} from '../notebook/print';
import { toTypst } from '../notebook/typst';
import { SupersededError, TypstClient, type CompiledDoc } from '../typst/client';
import { FONT_URLS } from '../typst/fonts';
import { useT } from '../i18n';
import { CALIBRATION_SOURCE } from '../typst/sources';

export type EngineStatus =
  | { phase: 'loading'; loaded: number; total: number }
  | { phase: 'ready' }
  | { phase: 'error'; message: string };

interface TypstContextValue {
  client: TypstClient;
  status: EngineStatus;
}

const TypstContext = createContext<TypstContextValue | null>(null);

// A factory, not a single worker: the client swaps the worker for a fresh one before the
// WASM compiler runs out of memory (see client.ts).
function createWorkerClient(): TypstClient {
  return new TypstClient(
    () => new Worker(new URL('../typst/compiler.worker.ts', import.meta.url), { type: 'module' }),
  );
}

export function TypstProvider({
  children,
  client: injected,
}: {
  children: ReactNode;
  client?: TypstClient;
}) {
  const [client] = useState(() => injected ?? createWorkerClient());
  const [status, setStatus] = useState<EngineStatus>({ phase: 'loading', loaded: 0, total: 1 });

  useEffect(() => {
    let alive = true;
    client
      .init({ compilerWasm, rendererWasm, fonts: FONT_URLS }, (loaded, total) => {
        if (alive) setStatus({ phase: 'loading', loaded, total });
      })
      .then(
        () => alive && setStatus({ phase: 'ready' }),
        (e: Error) => alive && setStatus({ phase: 'error', message: e.message }),
      );
    return () => {
      alive = false;
    };
  }, [client]);

  const value = useMemo(() => ({ client, status }), [client, status]);
  return <TypstContext.Provider value={value}>{children}</TypstContext.Provider>;
}

export function useTypst(): TypstContextValue {
  const ctx = useContext(TypstContext);
  if (!ctx) throw new Error('useTypst poza TypstProvider');
  return ctx;
}

export interface CompileState {
  doc: CompiledDoc | undefined;
  compiling: boolean;
  error: string | undefined;
}

export const COMPILE_DEBOUNCE_MS = 120;

// Compiles the configuration after every change (with a short delay). The last valid
// document stays visible while a new version compiles or has an error.
export function useCompiledNotebook(
  config: NotebookConfig,
  printer: PrinterProfile = DEFAULT_PRINTER,
): CompileState {
  const { client, status } = useTypst();
  const [state, setState] = useState<CompileState>({
    doc: undefined,
    compiling: false,
    error: undefined,
  });
  const latest = useRef(0);

  useEffect(() => {
    if (status.phase !== 'ready') return;
    const ticket = ++latest.current;
    const timer = setTimeout(() => {
      setState((s) => ({ ...s, compiling: true }));
      client.compile(toTypst(config, printer)).then(
        (doc) => {
          if (ticket === latest.current) setState({ doc, compiling: false, error: undefined });
        },
        (e: Error) => {
          if (e instanceof SupersededError || ticket !== latest.current) return;
          setState((s) => ({ ...s, compiling: false, error: e.message }));
        },
      );
    }, COMPILE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [client, config, printer, status.phase]);

  return state;
}

export function pdfFileName(cfg: NotebookConfig): string {
  const slug = cfg.title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug || 'notes'}-${cfg.format.width}x${cfg.format.height}.pdf`;
}

export function useDownloadPdf(config: NotebookConfig, printer: PrinterProfile = DEFAULT_PRINTER) {
  const { client, status } = useTypst();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const download = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const bytes = await client.pdf(toTypst(config, printer));
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = pdfFileName(config);
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return { download, busy, error, disabled: status.phase !== 'ready' || busy };
}

export interface PreparedFile<K extends string = string> {
  // file kind (e.g. imposition mode), the website picks the description from it
  kind: K;
  name: string;
  url: string;
}

export type PreparedState<K extends string = string> =
  | { phase: 'idle' }
  | { phase: 'busy' }
  | { phase: 'ready'; files: PreparedFile<K>[] }
  | { phase: 'error'; message: string };

export type PrintFile = PreparedFile<ImposeMode>;

const pdfUrl = (bytes: Uint8Array) =>
  URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));

// PDF files to download, prepared on demand. A change of input (design, printer)
// invalidates prepared files; old blob URLs are released.
function usePreparedFiles<K extends string>(
  input: readonly unknown[],
  run: (client: TypstClient) => Promise<{ kind: K; name: string; bytes: Uint8Array }[]>,
) {
  const { client, status } = useTypst();
  // state together with the input it came from: a different input = nothing prepared yet
  const [held, setHeld] = useState<{ input: readonly unknown[]; state: PreparedState<K> }>({
    input,
    state: { phase: 'idle' },
  });
  const ticket = useRef(0);
  const current = held.input.length === input.length && held.input.every((x, i) => x === input[i]);
  const state: PreparedState<K> = current ? held.state : { phase: 'idle' };

  useEffect(() => {
    const s = held.state;
    if (s.phase !== 'ready') return;
    return () => s.files.forEach((f) => URL.revokeObjectURL(f.url));
  }, [held]);

  const prepare = async () => {
    const t = ++ticket.current;
    const set = (state: PreparedState<K>) => {
      if (t === ticket.current) setHeld({ input, state });
    };
    set({ phase: 'busy' });
    try {
      const out = await run(client);
      if (t !== ticket.current) return;
      set({
        phase: 'ready',
        files: out.map((f) => ({ kind: f.kind, name: f.name, url: pdfUrl(f.bytes) })),
      });
    } catch (e) {
      set({ phase: 'error', message: (e as Error).message });
    }
  };

  return { state, prepare, disabled: status.phase !== 'ready' || state.phase === 'busy' };
}

// Sheets to print (fronts and backs, or a single double-sided file).
// Compatibility mode: a PDF of images rotated to portrait (only loaded then).
async function finish(bytes: Uint8Array, config: NotebookConfig, printer: PrinterProfile) {
  if (!printer.raster) return bytes;
  const { rasterize, usesColor } = await import('../print/raster');
  return rasterize(bytes, { gray: !usesColor(config) });
}

export function usePrintFiles(config: NotebookConfig, printer: PrinterProfile) {
  const suffix = useT().print.fileSuffix;
  return usePreparedFiles([config, printer, suffix], async (client) => {
    const modes = printModes(printer);
    const out = await client.print(toPrintTypst(config, printer), modes);
    const base = pdfFileName(config);
    const files = [];
    for (const mode of modes)
      files.push({
        kind: mode,
        name: printFileName(base, suffix, mode),
        bytes: await finish(out.files[mode]!, config, printer),
      });
    return files;
  });
}

export type TestFileKind = CalibrationSide | `order-${ImposeMode}`;

// Test print: the calibration sheet and the order test for backs (two sheets).
export function useTestFiles(config: NotebookConfig, printer: PrinterProfile) {
  const t = useT();
  return usePreparedFiles<TestFileKind>([config, printer, t], async (client) => {
    const files: { kind: TestFileKind; name: string; bytes: Uint8Array }[] = [];
    for (const side of calibrationSides(printer))
      files.push({
        kind: side,
        name: t.test.fileNames[side],
        bytes: await finish(
          await client.pdf(toCalibrationTypst(config, printer, CALIBRATION_SOURCE, side)),
          config,
          printer,
        ),
      });
    const modes = printModes(printer);
    const order = await client.print(toPrintTypst(orderTestConfig(config), printer), modes);
    for (const mode of modes)
      files.push({
        kind: `order-${mode}`,
        name: printFileName(t.test.fileNames.order, t.print.fileSuffix, mode),
        bytes: await finish(order.files[mode]!, config, printer),
      });
    return files;
  });
}
