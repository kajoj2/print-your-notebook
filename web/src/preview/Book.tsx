import { useEffect, useRef, type CSSProperties } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import type { PageStore } from './pageStore';
import { PageCanvas } from './PageCanvas';
import type { Flip } from './navigation';
import { CLOSED, leftFace, rightFace, type Face } from './spreads';

export const FLIP_SECONDS = 0.75;

function CoverFront({ title }: { title: string }) {
  return (
    <div
      className="leather relative h-full w-full overflow-hidden rounded-r-[10px] rounded-l-[3px]"
      data-testid="cover-front"
    >
      <div className="stitch absolute inset-[5%] rounded-[6px]" />
      {title && (
        <div
          className="absolute inset-x-[12%] top-[16%] text-center font-type text-[clamp(12px,2.2vw,22px)] leading-tight text-black/35"
          style={{ textShadow: '0 1px 0 rgb(255 255 255 / 0.18)' }}
        >
          {title}
        </div>
      )}
      {/* the elastic band that closes the notebook */}
      <div className="absolute inset-y-0 left-[58%] w-[5px] bg-[#1a1a1a] shadow-[1px_0_2px_rgb(0_0_0/0.5)]" />
    </div>
  );
}

function CoverInside({ side }: { side: 'left' | 'right' }) {
  return (
    <div
      className={`leather h-full w-full brightness-90 ${side === 'left' ? 'rounded-l-[10px]' : 'rounded-r-[10px]'}`}
      data-testid="cover-inside"
    />
  );
}

function FaceView({
  face,
  side,
  store,
  doc,
  title,
}: {
  face: Face;
  side: 'left' | 'right';
  store: PageStore;
  doc: number | undefined;
  title: string;
}) {
  switch (face.kind) {
    case 'none':
      return null;
    case 'cover-front':
      return <CoverFront title={title} />;
    case 'cover-inside':
      return <CoverInside side={side} />;
    case 'page':
      return (
        <div className="relative h-full w-full overflow-hidden bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.06)]">
          <PageCanvas
            store={store}
            doc={doc}
            page={face.index}
            label={`Strona ${face.index + 1}`}
          />
          {/* fold shadow at the spine */}
          <div
            className="pointer-events-none absolute inset-y-0 w-[14%]"
            style={{
              [side === 'left' ? 'right' : 'left']: 0,
              background: `linear-gradient(to ${side === 'left' ? 'left' : 'right'}, rgb(0 0 0 / 0.13), transparent)`,
            }}
          />
        </div>
      );
  }
}

export interface BookProps {
  spread: number;
  flip: Flip | null;
  pages: number;
  pageWidth: number;
  pageHeight: number;
  store: PageStore;
  doc: number | undefined;
  title: string;
  coverColor: string;
  onFlipDone: () => void;
}

// A spread in a leather cover. When `flip` is set, a leaf
// (front = current page, back = target page) turns around the spine,
// and the target pages already lie underneath it.
export function Book({
  spread,
  flip,
  pages,
  pageWidth: w,
  pageHeight: h,
  store,
  doc,
  title,
  coverColor,
  onFlipDone,
}: BookProps) {
  const rotation = useMotionValue(0);
  const shade = useTransform(rotation, (r) => 0.28 * Math.sin((Math.abs(r) / 180) * Math.PI));
  const done = useRef(onFlipDone);
  useEffect(() => {
    done.current = onFlipDone;
  });

  // leaf turn: the animation is the external system, state changes only in onComplete
  useEffect(() => {
    if (!flip) return;
    rotation.set(0);
    const controls = animate(rotation, flip.to > flip.from ? -180 : 180, {
      duration: FLIP_SECONDS,
      ease: [0.645, 0.045, 0.355, 1],
      onComplete: () => done.current(),
    });
    return () => controls.stop();
  }, [flip, rotation]);
  const forward = flip ? flip.to > flip.from : true;
  const baseLeft = flip ? leftFace(forward ? flip.from : flip.to, pages) : leftFace(spread, pages);
  const baseRight = flip
    ? rightFace(forward ? flip.to : flip.from, pages)
    : rightFace(spread, pages);
  const leafFront = flip && (forward ? rightFace(flip.from, pages) : leftFace(flip.from, pages));
  const leafBack = flip && (forward ? leftFace(flip.to, pages) : rightFace(flip.to, pages));

  // a closed notebook lies in the middle of the desk: it shifts along as the cover opens
  const closedTarget = (flip ? flip.to : spread) === CLOSED;
  const opening = flip && (flip.from === CLOSED || flip.to === CLOSED);
  const offsetX = closedTarget ? -w / 2 : 0;

  const face = (f: Face, side: 'left' | 'right') => (
    <FaceView face={f} side={side} store={store} doc={doc} title={title} />
  );

  const edge = Math.max(4, w * 0.035);

  return (
    <motion.div
      className="relative"
      style={{ width: 2 * w, height: h, '--leather': coverColor } as CSSProperties}
      animate={{ x: offsetX }}
      transition={{ duration: opening ? FLIP_SECONDS : 0.5, ease: [0.645, 0.045, 0.355, 1] }}
      data-testid="book"
      data-spread={spread}
    >
      {/* cover under the insert, sticking out a few mm all round */}
      {spread !== CLOSED || flip ? (
        <div
          className="leather absolute rounded-[10px] shadow-[0_18px_40px_rgb(0_0_0/0.45)]"
          style={{ inset: -edge }}
        />
      ) : null}

      <div className="absolute inset-y-0 left-0" style={{ width: w }}>
        {face(baseLeft, 'left')}
      </div>
      <div className="absolute inset-y-0 right-0" style={{ width: w }}>
        {face(baseRight, 'right')}
      </div>

      {/* the elastic band holding the insert in the spine */}
      {(spread !== CLOSED || flip) && (
        <div
          className="pointer-events-none absolute left-1/2 w-[3px] -translate-x-1/2 bg-[#1b1b1b] shadow-[0_0_2px_rgb(0_0_0/0.6)]"
          style={{ top: -edge, bottom: -edge, zIndex: 5 }}
        />
      )}

      {flip && leafFront && leafBack && (
        <div className="absolute inset-0" style={{ perspective: 4 * w, zIndex: 10 }}>
          <motion.div
            className="preserve-3d absolute inset-y-0"
            style={{
              width: w,
              left: forward ? w : 0,
              transformOrigin: forward ? 'left center' : 'right center',
              rotateY: rotation,
            }}
            data-testid="leaf"
          >
            <div className="backface-hidden absolute inset-0">
              {face(leafFront, forward ? 'right' : 'left')}
              <motion.div
                className="pointer-events-none absolute inset-0 bg-black"
                style={{ opacity: shade }}
              />
            </div>
            <div
              className="backface-hidden absolute inset-0"
              style={{ transform: 'rotateY(180deg)' }}
            >
              {face(leafBack, forward ? 'left' : 'right')}
              <motion.div
                className="pointer-events-none absolute inset-0 bg-black"
                style={{ opacity: shade }}
              />
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
