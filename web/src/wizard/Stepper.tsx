import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useT } from '../i18n';
import { STEPS, neighbour, stepIndex, type StepId } from './steps';
import { useWizard } from './WizardContext';

// Step bar in the header: every step can be opened straight away.
export function Stepper() {
  const t = useT();
  const { step, go } = useWizard();
  const current = stepIndex(step);
  return (
    <nav aria-label={t.nav.label} className="min-w-0 overflow-x-auto">
      <ol className="flex items-center gap-1">
        {STEPS.map((s, i) => {
          const active = s.id === step;
          const done = i < current;
          return (
            <li key={s.id} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden className="h-px w-3 bg-rule max-sm:w-1.5" />}
              <button
                type="button"
                onClick={() => go(s.id)}
                aria-current={active ? 'step' : undefined}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-sm transition-colors ${
                  active ? 'bg-accent text-white' : 'text-ink-soft hover:bg-rule/60 hover:text-ink'
                }`}
              >
                <span
                  aria-hidden
                  className={`grid size-5 place-items-center rounded-full text-xs tabular-nums ${
                    active ? 'bg-white/20' : done ? 'bg-accent-soft text-accent' : 'bg-rule/70'
                  }`}
                >
                  {done ? <Check size={12} /> : i + 1}
                </span>
                <span className={active ? '' : 'max-md:sr-only'}>{t.steps[s.id]}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// A step page (other than the design): content in a column and Back/Next buttons.
export function StepPage({
  title,
  lead,
  children,
  next,
  nextLabel,
}: {
  title: string;
  lead?: ReactNode;
  children: ReactNode;
  // undefined: the next step in the list; null: no Next button
  next?: StepId | null;
  nextLabel?: string;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <article className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6">
        <h2 className="font-type text-[28px] leading-tight text-ink">{title}</h2>
        {lead && <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{lead}</p>}
        <div className="mt-8 space-y-8">{children}</div>
        <StepNav next={next} nextLabel={nextLabel} />
      </article>
    </div>
  );
}

export function StepNav({
  next,
  nextLabel,
  className = 'mt-12',
}: {
  next?: StepId | null;
  nextLabel?: string;
  className?: string;
}) {
  const t = useT().nav;
  const { step, go } = useWizard();
  const prev = neighbour(step, -1);
  const target = next === undefined ? neighbour(step, 1) : next;
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      {prev ? (
        <button
          type="button"
          onClick={() => go(prev)}
          className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm text-ink-soft hover:text-ink"
        >
          <ArrowLeft size={15} />
          {t.back}
        </button>
      ) : (
        <span />
      )}
      {target && (
        <button
          type="button"
          onClick={() => go(target)}
          className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
        >
          {nextLabel ?? t.next}
          <ArrowRight size={15} />
        </button>
      )}
    </div>
  );
}

// A step section with a heading.
export function StepSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-[17px] font-semibold text-ink">{title}</h3>
      <div className="space-y-3 text-[15px] leading-relaxed text-ink">{children}</div>
    </section>
  );
}

// A numbered list of actions.
export function Steps({ children }: { children: ReactNode }) {
  return <ol className="list-decimal space-y-2 pl-5 marker:text-ink-soft">{children}</ol>;
}
