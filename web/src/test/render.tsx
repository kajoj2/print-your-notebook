import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { MotionConfig } from 'motion/react';
import { DocProvider } from '../state/doc';
import { TypstProvider } from '../state/typst';
import { fakeClient, type FakeOptions } from './fakeWorker';

// A component with real state, but with a fake Typst worker.
export function renderWithEngine(ui: ReactNode, opts?: FakeOptions) {
  const fake = fakeClient(opts);
  const result = render(
    <MotionConfig reducedMotion="always">
      <TypstProvider client={fake.client}>
        <DocProvider>{ui}</DocProvider>
      </TypstProvider>
    </MotionConfig>,
  );
  return { ...result, ...fake };
}
