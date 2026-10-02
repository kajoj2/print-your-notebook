import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import type { PageStore } from './pageStore';
import { PageCanvas } from './PageCanvas';
import { useT } from '../i18n';
import { leftFace, rightFace, spreadLabel, type Face } from './spreads';

const THUMB_H = 64;

function Thumb({
  face,
  store,
  doc,
  width,
}: {
  face: Face;
  store: PageStore;
  doc: number | undefined;
  width: number;
}) {
  if (face.kind === 'page') {
    return (
      <div className="bg-white" style={{ width, height: THUMB_H }}>
        <PageCanvas store={store} doc={doc} page={face.index} label="" />
      </div>
    );
  }
  return <div className="leather" style={{ width, height: THUMB_H }} />;
}

// Draws thumbnails only when they're near the viewport (a notebook can have hundreds of pages).
function LazySpread({
  spread,
  pages,
  aspect,
  store,
  doc,
  active,
  onSelect,
}: {
  spread: number;
  pages: number;
  aspect: number;
  store: PageStore;
  doc: number | undefined;
  active: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && setVisible(true), {
      rootMargin: '0px 400px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (active)
      ref.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [active]);

  const w = Math.round(THUMB_H * aspect);
  const label = spreadLabel(spread, pages, useT().preview);
  return (
    <button
      ref={ref}
      type="button"
      onClick={onSelect}
      aria-label={label}
      aria-current={active ? 'true' : undefined}
      className="group relative shrink-0 rounded-sm p-1 outline-offset-0"
      data-testid={`thumb-${spread}`}
    >
      {active && (
        <motion.span
          layoutId="thumb-active"
          className="absolute inset-0 rounded-md bg-white/20 ring-2 ring-white/70"
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        />
      )}
      <span className="relative flex opacity-80 shadow-md transition-opacity group-hover:opacity-100">
        {visible ? (
          <>
            <Thumb face={leftFace(spread, pages)} store={store} doc={doc} width={w} />
            <Thumb face={rightFace(spread, pages)} store={store} doc={doc} width={w} />
          </>
        ) : (
          <span className="bg-white/10" style={{ width: 2 * w, height: THUMB_H }} />
        )}
      </span>
    </button>
  );
}

export function SpreadStrip({
  spreads,
  pages,
  aspect,
  store,
  doc,
  current,
  onSelect,
}: {
  spreads: number;
  pages: number;
  aspect: number;
  store: PageStore;
  doc: number | undefined;
  current: number;
  onSelect: (spread: number) => void;
}) {
  return (
    <nav
      aria-label={useT().preview.thumbs}
      className="flex gap-2 overflow-x-auto px-4 pb-3 pt-2 [scrollbar-width:thin]"
    >
      {Array.from({ length: spreads }, (_, s) => (
        <LazySpread
          key={s}
          spread={s}
          pages={pages}
          aspect={aspect}
          store={store}
          doc={doc}
          active={s === current}
          onSelect={() => onSelect(s)}
        />
      ))}
    </nav>
  );
}
