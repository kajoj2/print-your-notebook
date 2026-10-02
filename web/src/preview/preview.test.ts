import { describe, expect, it } from 'vitest';
import { fitSpread, pixelPerPtFor } from './fit';
import { initialNav, navReducer, navTarget, type NavState } from './navigation';
import { CLOSED, lastSpread, leftFace, rightFace, spreadLabel, spreadOf } from './spreads';
import { quantizeScale } from './usePages';

describe('spreads', () => {
  it('spread 0: inside of the cover and page 1', () => {
    expect(leftFace(0, 10)).toEqual({ kind: 'cover-inside' });
    expect(rightFace(0, 10)).toEqual({ kind: 'page', index: 0 });
  });
  it('spread k: pages 2k and 2k+1', () => {
    expect(leftFace(1, 10)).toEqual({ kind: 'page', index: 1 });
    expect(rightFace(1, 10)).toEqual({ kind: 'page', index: 2 });
  });
  it('an even page count ends with the inside of the cover on the right', () => {
    expect(lastSpread(10)).toBe(5);
    expect(leftFace(5, 10)).toEqual({ kind: 'page', index: 9 });
    expect(rightFace(5, 10)).toEqual({ kind: 'cover-inside' });
  });
  it('closed notebook', () => {
    expect(leftFace(CLOSED, 10)).toEqual({ kind: 'none' });
    expect(rightFace(CLOSED, 10)).toEqual({ kind: 'cover-front' });
  });
  it('spreadOf inverts the mapping', () => {
    for (let i = 0; i < 20; i++) {
      const s = spreadOf(i);
      const faces = [leftFace(s, 20), rightFace(s, 20)];
      expect(faces).toContainEqual({ kind: 'page', index: i });
    }
  });
  it('labels', () => {
    expect(spreadLabel(CLOSED, 10)).toBe('Okładka');
    expect(spreadLabel(0, 10)).toBe('Strona 1');
    expect(spreadLabel(1, 10)).toBe('Strony 2–3');
    expect(spreadLabel(5, 10)).toBe('Strona 10');
  });
});

describe('navReducer', () => {
  const go = (s: NavState, to: number, animate = true, last = 5) =>
    navReducer(s, { type: 'go', to, last, animate });
  const done = (s: NavState) => navReducer(s, { type: 'flip-done' });

  it('animated transition: the turn first, then the new spread', () => {
    const s1 = go(initialNav, 0);
    expect(s1.flip).toEqual({ from: CLOSED, to: 0 });
    expect(s1.spread).toBe(CLOSED);
    const s2 = done(s1);
    expect(s2).toEqual({ spread: 0, flip: null, queued: null });
  });

  it('without animation the transition is immediate', () => {
    expect(go(initialNav, 3, false)).toEqual({ spread: 3, flip: null, queued: null });
  });

  it('clicks during a turn: the last target wins', () => {
    let s = go(initialNav, 0);
    s = go(s, 1);
    s = go(s, 4);
    expect(s.queued).toBe(4);
    expect(navTarget(s)).toBe(4);
    s = done(s);
    expect(s.flip).toEqual({ from: 0, to: 4 });
    s = done(s);
    expect(s).toEqual({ spread: 4, flip: null, queued: null });
  });

  it('going back to the current turn’s target clears the queue', () => {
    let s = go(initialNav, 0);
    s = go(s, 3);
    s = go(s, 0);
    expect(s.queued).toBeNull();
  });

  it('the target is clamped to the range', () => {
    expect(go(initialNav, 99, false).spread).toBe(5);
    expect(go({ ...initialNav, spread: 2 }, -10, false).spread).toBe(CLOSED);
  });

  it('the same spread does nothing', () => {
    const s = { ...initialNav, spread: 2 };
    expect(go(s, 2)).toBe(s);
  });

  it('flip-done without a turn does nothing', () => {
    expect(done(initialNav)).toBe(initialNav);
  });

  it('the notebook got shorter: start from the last existing spread', () => {
    const s = go({ ...initialNav, spread: 9 }, 1, true, 3);
    expect(s.flip).toEqual({ from: 3, to: 1 });
  });
});

describe('fit', () => {
  it('the spread fits in the area and keeps its proportions', () => {
    const { pageWidth, pageHeight } = fitSpread(
      { width: 1000, height: 600 },
      { width: 110, height: 210 },
      0,
    );
    expect(pageHeight).toBe(600);
    expect(pageWidth).toBe(Math.floor((600 * 110) / 210));
    expect(2 * pageWidth).toBeLessThanOrEqual(1000);
  });
  it('a narrow area limits the width', () => {
    const { pageWidth } = fitSpread({ width: 300, height: 1000 }, { width: 148, height: 210 }, 0);
    expect(pageWidth).toBe(150);
  });
  it('zero area', () => {
    expect(fitSpread({ width: 0, height: 0 }, { width: 110, height: 210 })).toEqual({
      pageWidth: 0,
      pageHeight: 0,
    });
  });
  it('pixelPerPt', () => {
    // 110 mm = 311.8 pt; 312 px at dpr 2 => ~2 px/pt
    expect(pixelPerPtFor(312, 110, 2)).toBeCloseTo(2.001, 2);
    expect(pixelPerPtFor(100, 0, 1)).toBe(1);
  });
  it('quantizeScale', () => {
    expect(quantizeScale(2.13)).toBe(2.25);
    expect(quantizeScale(2.1)).toBe(2);
    expect(quantizeScale(0.01)).toBe(0.25);
  });
});
