import { useState } from 'react';
import { Download, LoaderCircle, Printer } from 'lucide-react';
import { NumberField } from '../components/ui';
import { useT } from '../i18n';
import { correctOffset } from '../notebook/print';
import { PRINTER_LIMITS, sheetLayout } from '../notebook/printer';
import { useFittedNotebook, usePrinter } from '../state/printer';
import { useTestFiles, type PreparedFile, type TestFileKind } from '../state/typst';
import { StepPage, StepSection, Steps } from './Stepper';

function FileLinks({ files }: { files: PreparedFile<TestFileKind>[] }) {
  const labels = useT().test.files;
  return (
    <div className="flex flex-col items-start gap-2" data-testid="test-files">
      {files.map((f) => (
        <a
          key={f.kind}
          href={f.url}
          download={f.name}
          className="inline-flex items-center gap-2 rounded-full border border-rule bg-panel-raised px-4 py-2 text-sm font-medium text-ink hover:border-accent"
        >
          <Download size={15} />
          {labels[f.kind]}
        </a>
      ))}
    </div>
  );
}

// A yes/no question with an answer that changes something right away (or nothing).
function Question({
  question,
  yes,
  no,
  onNo,
  done,
}: {
  question: string;
  yes: string;
  no: string;
  onNo: () => void;
  done?: string;
}) {
  const [answer, setAnswer] = useState<'yes' | 'no'>();
  const button =
    'rounded-full border px-3.5 py-1.5 text-sm transition-colors aria-pressed:border-accent aria-pressed:bg-accent-soft';
  return (
    <div className="rounded-xl border border-rule bg-panel-raised p-4">
      <p className="text-[15px] text-ink">{question}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={answer === 'yes'}
          onClick={() => setAnswer('yes')}
          className={`${button} border-rule`}
        >
          {yes}
        </button>
        <button
          type="button"
          aria-pressed={answer === 'no'}
          onClick={() => {
            if (answer !== 'no') onNo();
            setAnswer('no');
          }}
          className={`${button} border-rule`}
        >
          {no}
        </button>
      </div>
      {answer === 'no' && done && (
        <p role="status" className="mt-2 text-sm text-accent">
          {done}
        </p>
      )}
    </div>
  );
}

function OffsetForm({ stacked }: { stacked: boolean }) {
  const t = useT().test;
  const printer = usePrinter((s) => s.printer);
  const update = usePrinter((s) => s.updatePrinter);
  const [right, setRight] = useState(0);
  const [down, setDown] = useState(0);
  const [applied, setApplied] = useState<{ dx: number; dy: number }>();
  const limit = PRINTER_LIMITS.offset;
  return (
    <div className="rounded-xl border border-rule bg-panel-raised p-4">
      <p className="text-[15px] text-ink">{t.offsetQ}</p>
      <div className="mt-3 grid max-w-sm grid-cols-2 gap-3">
        <NumberField
          label={t.right}
          unit="mm"
          value={right}
          min={limit.min}
          max={limit.max}
          step={0.5}
          onChange={setRight}
        />
        <NumberField
          label={t.down}
          unit="mm"
          value={down}
          min={limit.min}
          max={limit.max}
          step={0.5}
          onChange={setDown}
        />
      </div>
      <button
        type="button"
        disabled={right === 0 && down === 0}
        onClick={() => {
          const next = correctOffset(printer, stacked, { right, down });
          update(next);
          setApplied(next);
          setRight(0);
          setDown(0);
        }}
        className="mt-3 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
      >
        {t.applyOffset}
      </button>
      {applied && (
        <p role="status" className="mt-2 text-sm text-ink-soft">
          {t.offsetDone(applied.dx, applied.dy)}
        </p>
      )}
    </div>
  );
}

export function TestStep() {
  const t = useT().test;
  const { config, printer } = useFittedNotebook();
  const update = usePrinter((s) => s.updatePrinter);
  const files = useTestFiles(config, printer);
  const layout = sheetLayout(config, printer);
  const state = files.state;
  const manual = printer.duplex === 'manual';

  return (
    <StepPage title={t.title} lead={t.lead}>
      {!layout.fits ? (
        <p role="alert" className="text-[15px] text-danger">
          {t.noFit}
        </p>
      ) : (
        <StepSection title={t.printTitle}>
          {state.phase !== 'ready' && (
            <button
              type="button"
              onClick={files.prepare}
              disabled={files.disabled}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
            >
              {state.phase === 'busy' ? (
                <LoaderCircle size={15} className="animate-spin" />
              ) : (
                <Printer size={15} />
              )}
              {state.phase === 'busy' ? t.busy : t.prepare}
            </button>
          )}
          {state.phase === 'error' && (
            <p role="alert" className="text-sm text-danger">
              {t.error(state.message)}
            </p>
          )}
          {state.phase === 'ready' && <FileLinks files={state.files} />}
          {manual ? (
            <Steps>
              {t.manualSteps(t.files.front, t.files.back).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </Steps>
          ) : (
            <p>{t.autoText(layout.stacked)}</p>
          )}
        </StepSection>
      )}

      <StepSection title={t.checkTitle}>
        <Question
          question={t.scaleQ}
          yes={t.scaleYes}
          no={t.scaleNo}
          onNo={() => {}}
          done={t.scaleDone}
        />
        <Question
          question={t.frameQ}
          yes={t.yes}
          no={t.frameNo}
          onNo={() =>
            update({
              unprintable: Math.min(PRINTER_LIMITS.unprintable.max, printer.unprintable + 1),
            })
          }
          done={t.frameDone}
        />
        <Question
          question={t.arrowQ}
          yes={t.yes}
          no={t.arrowNo}
          onNo={() => update({ rotateBack: !printer.rotateBack })}
          done={t.arrowDone}
        />
        <OffsetForm stacked={layout.stacked} />
        {manual && (
          <Question
            question={t.orderQ}
            yes={t.yes}
            no={t.orderNo}
            onNo={() => update({ evenReverse: !printer.evenReverse })}
            done={t.orderDone}
          />
        )}
      </StepSection>
    </StepPage>
  );
}
