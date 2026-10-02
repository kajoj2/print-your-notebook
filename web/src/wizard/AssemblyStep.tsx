import { useT } from '../i18n';
import { sheetLayout } from '../notebook/printer';
import { useFittedNotebook } from '../state/printer';
import { StepPage, StepSection, Steps } from './Stepper';

// A folded signature seen from the spine: three holes and the stitching order.
function StitchDiagram() {
  const t = useT().assembly;
  return (
    <figure className="rounded-xl border border-rule bg-panel-raised p-4">
      <svg
        viewBox="0 0 320 120"
        role="img"
        aria-labelledby="stitch-title"
        className="h-auto w-full max-w-md text-ink"
      >
        <title id="stitch-title">{t.stitchAlt}</title>
        <rect x="10" y="45" width="300" height="30" rx="3" fill="none" stroke="currentColor" />
        <line x1="10" y1="60" x2="310" y2="60" stroke="currentColor" strokeDasharray="4 3" />
        {[40, 160, 280].map((x, i) => (
          <g key={x}>
            <circle cx={x} cy="60" r="4" fill="currentColor" />
            <text x={x} y="100" textAnchor="middle" fontSize="13" fill="currentColor">
              {['2', '1, 4', '3'][i]}
            </text>
          </g>
        ))}
        <path
          d="M160 52 C 120 20, 80 20, 40 52 M280 52 C 240 20, 200 20, 164 52"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2"
        />
        <path
          d="M40 68 C 120 110, 200 110, 280 68"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2"
          strokeDasharray="5 4"
        />
      </svg>
      <figcaption className="mt-2 text-sm text-ink-soft">{t.stitchCaption}</figcaption>
    </figure>
  );
}

export function AssemblyStep() {
  const t = useT().assembly;
  const { config, printer } = useFittedNotebook();
  const layout = sheetLayout(config, printer);
  // regular on A4: the top and bottom of the insert are the sheet edges, the marks are in a band next to them
  const trimSidesOnly = !layout.stacked && !layout.marksOutside;
  const items = (xs: string[]) => xs.map((x) => <li key={x}>{x}</li>);

  return (
    <StepPage title={t.title} lead={t.lead} next={null}>
      <StepSection title={t.cutTitle}>
        <Steps>
          {layout.stacked && items([t.cutHalf, t.stackHalves])}
          {items([trimSidesOnly ? t.trimSides : t.trimAll, t.cutHow])}
        </Steps>
      </StepSection>

      <StepSection title={t.foldTitle}>
        <Steps>{items(t.fold)}</Steps>
      </StepSection>

      <StepSection title={t.sewTitle}>
        <Steps>{items(t.sew)}</Steps>
        <StitchDiagram />
      </StepSection>

      <StepSection title={t.doneTitle}>
        <p>{t.done}</p>
      </StepSection>
    </StepPage>
  );
}
