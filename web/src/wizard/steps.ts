// Wizard steps and how they're stored in the page address (#step=…, next to #c=… with the design).

// step names: Messages.steps
export const STEPS = [
  { id: 'start' },
  { id: 'printer' },
  { id: 'design' },
  { id: 'test' },
  { id: 'print' },
  { id: 'assembly' },
] as const;

export type StepId = (typeof STEPS)[number]['id'];

const PARAM = 'step';
const isStep = (s: string | null): s is StepId => STEPS.some((x) => x.id === s);

// No step in the address: a link with a design (#c=…) opens the design, an empty address the start.
export function stepFromHash(hash: string): StepId {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const step = params.get(PARAM);
  if (isStep(step)) return step;
  return params.has('c') ? 'design' : 'start';
}

// The address with a new step; other parameters (the design) are kept.
export function hashWithStep(hash: string, step: StepId): string {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  params.set(PARAM, step);
  return `#${params.toString()}`;
}

export function stepIndex(step: StepId): number {
  return STEPS.findIndex((s) => s.id === step);
}

export function neighbour(step: StepId, delta: -1 | 1): StepId | undefined {
  return STEPS[stepIndex(step) + delta]?.id;
}
