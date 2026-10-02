import { useEffect, useRef, type CSSProperties } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useT } from '../i18n';
import type { SectionType } from '../notebook/config';
import { useDoc } from '../state/doc';
import { useNotebook } from '../state/store';
import { useTypst } from '../state/typst';
import { Book } from './Book';
import { fitSpread, pixelPerPtFor } from './fit';
import { useSpreadNavigation } from './navigation';
import { SpreadStrip } from './SpreadStrip';
import { CLOSED, lastSpread, spreadLabel, spreadOf } from './spreads';
import { useElementSize } from './useElementSize';
import { usePageStore } from './usePages';

function LoadingEngine({ loaded, total }: { loaded: number; total: number }) {
  const t = useT().preview;
  const mb = (n: number) => (n / 1_000_000).toFixed(0);
  const pct = Math.min(1, loaded / total);
  return (
    <motion.div
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 text-white/85"
      role="status"
      data-testid="engine-loading"
    >
      <p className="font-type text-lg">{t.loading}</p>
      <div className="h-[2px] w-56 overflow-hidden rounded-full bg-white/15">
        <motion.div
          className="h-full origin-left bg-white/80"
          animate={{ scaleX: pct }}
          transition={{ ease: 'easeOut' }}
        />
      </div>
      <p className="text-sm tabular-nums text-white/60">{t.loadingBytes(mb(loaded), mb(total))}</p>
    </motion.div>
  );
}

function isTyping(el: Element | null): boolean {
  return (
    !!el &&
    (el.tagName === 'INPUT' ||
      el.tagName === 'SELECT' ||
      el.tagName === 'TEXTAREA' ||
      (el as HTMLElement).isContentEditable)
  );
}

export function Desk() {
  const messages = useT();
  const t = messages.preview;
  const { status } = useTypst();
  const { doc, compiling, error } = useDoc();
  const format = useNotebook((s) => s.config.format);
  const volume = useNotebook((s) => s.config.pages);
  const title = useNotebook((s) => s.config.title);
  const coverColor = useNotebook((s) => s.config.coverColor);
  const [areaRef, area] = useElementSize<HTMLDivElement>();

  const pages = doc?.pages.length ?? 0;
  const last = lastSpread(pages);
  const reduce = useReducedMotion();
  const { spread, flip, target, go, flipDone } = useSpreadNavigation(last, !reduce);
  const opened = useRef(false);

  const { pageWidth, pageHeight } = fitSpread(area, format);
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  const store = usePageStore(pixelPerPtFor(pageWidth, format.width, dpr), 16);
  const thumbStore = usePageStore(
    pixelPerPtFor((64 * format.width) / format.height, format.width, dpr),
    400,
  );

  // first opening of the cover, once the first document is ready
  useEffect(() => {
    if (!doc || opened.current) return;
    opened.current = true;
    const t = setTimeout(() => go(0), 450);
    return () => clearTimeout(t);
  }, [doc, go]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(document.activeElement) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (
        document.activeElement?.closest(
          '[role="slider"],[role="tablist"],[role="radiogroup"],[role="group"]',
        )
      )
        return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') go(target + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(target - 1);
      else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(last);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, target, last]);

  const jumpTo = (type: SectionType) => {
    const mark = doc?.sections.find((s) => s.type === type);
    if (mark) go(spreadOf(mark.page - 1));
  };

  const ready = status.phase === 'ready' && doc && pageWidth > 0;

  return (
    <div
      className="desk-felt relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      // leather colour for the notebook and the cover thumbnails
      style={{ '--leather': coverColor } as CSSProperties}
      data-testid="desk"
    >
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 px-5 pt-4 text-sm text-white/75">
        <span className="tabular-nums" data-testid="page-count">
          {doc ? messages.pages(pages) : '…'} · {format.width} × {format.height} mm
        </span>
        {doc?.contentPages !== undefined && doc.contentPages > volume && (
          <span
            role="status"
            data-testid="over-volume"
            className="rounded-full bg-amber-400/90 px-2.5 py-0.5 text-xs font-medium text-black"
          >
            {t.over(messages.pages(doc.contentPages - volume), volume)}
          </span>
        )}
        <AnimatePresence>
          {compiling && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-white/55"
              data-testid="compiling"
            >
              {t.compiling}
            </motion.span>
          )}
        </AnimatePresence>
        {doc && doc.sections.length > 1 && (
          <div className="ml-auto flex flex-wrap gap-1.5" aria-label={t.jump} role="group">
            {doc.sections.map((s) => (
              <button
                key={s.type}
                type="button"
                onClick={() => jumpTo(s.type as SectionType)}
                className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/80 transition-colors hover:bg-white/20 hover:text-white"
              >
                {messages.sections[s.type as SectionType]?.label ?? s.type}
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={areaRef} className="relative flex min-h-0 flex-1 items-center justify-center">
        <AnimatePresence>
          {status.phase === 'loading' && (
            <LoadingEngine loaded={status.loaded} total={status.total} />
          )}
        </AnimatePresence>
        {status.phase === 'error' && (
          <div role="alert" className="max-w-sm px-6 text-center text-white/85">
            <p className="font-type text-lg">{t.engineError}</p>
            <p className="mt-2 text-sm text-white/60">{status.message}</p>
            <button
              type="button"
              onClick={() => location.reload()}
              className="mt-4 rounded-full bg-white/15 px-4 py-1.5 text-sm hover:bg-white/25"
            >
              {t.reload}
            </button>
          </div>
        )}
        {ready && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <Book
              spread={spread}
              flip={flip}
              pages={pages}
              pageWidth={pageWidth}
              pageHeight={pageHeight}
              store={store}
              doc={doc.id}
              title={title}
              coverColor={coverColor}
              onFlipDone={flipDone}
            />
          </motion.div>
        )}
        {ready && (
          <>
            <button
              type="button"
              aria-label={t.prev}
              disabled={target <= CLOSED}
              onClick={() => go(target - 1)}
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/25 p-2 text-white/85 backdrop-blur transition hover:bg-black/40 disabled:opacity-0"
            >
              <ChevronLeft />
            </button>
            <button
              type="button"
              aria-label={t.next}
              disabled={target >= last}
              onClick={() => go(target + 1)}
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/25 p-2 text-white/85 backdrop-blur transition hover:bg-black/40 disabled:opacity-0"
            >
              <ChevronRight />
            </button>
          </>
        )}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              role="alert"
              className="absolute bottom-3 left-1/2 z-20 max-w-[90%] -translate-x-1/2 rounded-lg bg-danger px-4 py-2 text-sm text-white shadow-lg"
            >
              {t.compileError(error)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {ready && (
        <div className="shrink-0">
          <p
            className="text-center text-sm tabular-nums text-white/70"
            aria-live="polite"
            data-testid="spread-label"
          >
            {spreadLabel(target, pages, t)}
          </p>
          <SpreadStrip
            spreads={last + 1}
            pages={pages}
            aspect={format.width / format.height}
            store={thumbStore}
            doc={doc.id}
            current={target}
            onSelect={go}
          />
        </div>
      )}
    </div>
  );
}
