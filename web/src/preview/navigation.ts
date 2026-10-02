import { useCallback, useReducer } from 'react';
import { CLOSED } from './spreads';

// Page-turning state. One leaf turns at a time; clicks during
// a turn only remember the last target (queued), which the leaf turns to afterwards.

export interface Flip {
  from: number;
  to: number;
}

export interface NavState {
  spread: number;
  flip: Flip | null;
  queued: number | null;
}

export type NavAction =
  { type: 'go'; to: number; last: number; animate: boolean } | { type: 'flip-done' };

export const initialNav: NavState = { spread: CLOSED, flip: null, queued: null };

const clamp = (x: number, last: number) => Math.max(CLOSED, Math.min(last, x));

export function navReducer(state: NavState, action: NavAction): NavState {
  switch (action.type) {
    case 'go': {
      const to = clamp(action.to, action.last);
      if (state.flip)
        return to === state.flip.to ? { ...state, queued: null } : { ...state, queued: to };
      const from = clamp(state.spread, action.last);
      if (to === from) return from === state.spread ? state : { ...state, spread: from };
      if (!action.animate) return { spread: to, flip: null, queued: null };
      return { spread: from, flip: { from, to }, queued: null };
    }
    case 'flip-done': {
      if (!state.flip) return state;
      const spread = state.flip.to;
      const next = state.queued;
      return {
        spread,
        flip: next !== null && next !== spread ? { from: spread, to: next } : null,
        queued: null,
      };
    }
  }
}

// The spread navigation is heading to (label, highlighted thumbnail).
export function navTarget(s: NavState): number {
  return s.queued ?? s.flip?.to ?? s.spread;
}

export function useSpreadNavigation(last: number, animate: boolean) {
  const [state, dispatch] = useReducer(navReducer, initialNav);
  const go = useCallback(
    (to: number) => dispatch({ type: 'go', to, last, animate }),
    [last, animate],
  );
  const flipDone = useCallback(() => dispatch({ type: 'flip-done' }), []);
  // the notebook may have got shorter since the last navigation
  const spread = Math.min(state.spread, last);
  const target = Math.min(navTarget(state), last);
  return { spread, flip: state.flip, target, go, flipDone };
}
