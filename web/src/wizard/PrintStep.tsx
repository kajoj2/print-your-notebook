import { Download, LoaderCircle, Printer } from 'lucide-react';
import { useT } from '../i18n';
import { FORMAT_PRESETS, MAX_STAPLED_SHEETS } from '../notebook/config';
import { PAPER_SIZES, sheetCount, sheetLayout } from '../notebook/printer';
import { useDoc } from '../state/doc';
import { useFittedNotebook } from '../state/printer';
import { usePrintFiles, type PrintFile } from '../state/typst';
import { StepPage, StepSection, Steps } from './Stepper';
import { useWizard } from './WizardContext';
import type { StepId } from './steps';

function FileLink({ file, label }: { file: PrintFile; label: string }) {
  return (
    <a
      href={file.url}
      download={file.name}
      className="inline-flex items-center gap-2 rounded-full border border-rule bg-panel-raised px-4 py-2 text-sm font-medium text-ink hover:border-accent"
    >
      <Download size={15} />
      {label}
      <span className="font-normal text-ink-soft">{file.name}</span>
    </a>
  );
}

export function PrintStep() {
  const messages = useT();
  const t = messages.print;
  const { go } = useWizard();
  const { config, printer, fixes } = useFittedNotebook();
  const doc = useDoc().doc;
  const files = usePrintFiles(config, printer);
  const layout = sheetLayout(config, printer);
  const paper = PAPER_SIZES[printer.paper];
  const pages = doc?.pages.length ?? config.pages;
  const sheets = sheetCount(pages, layout);
  const preset = config.format.preset;
  const formatName = preset === 'custom' ? t.customFormat : FORMAT_PRESETS[preset].label;
  const state = files.state;
  const ready = state.phase === 'ready' ? state.files : [];
  const link = (label: string, step: StepId) => (
    <button
      type="button"
      onClick={() => go(step)}
      className="text-accent underline-offset-2 hover:underline"
    >
      {label}
    </button>
  );

  return (
    <StepPage title={t.title} lead={t.lead}>
      <StepSection title={t.summary}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-[15px]">
          <dt className="text-ink-soft">{t.format}</dt>
          <dd>
            {formatName}, {config.format.width} × {config.format.height} mm
          </dd>
          <dt className="text-ink-soft">{t.pagesLabel}</dt>
          <dd data-testid="print-pages">{pages}</dd>
          <dt className="text-ink-soft">{t.sheets(paper.label)}</dt>
          <dd data-testid="print-sheets">
            {sheets}
            {layout.stacked && t.stackedNote}
          </dd>
          <dt className="text-ink-soft">{t.duplex}</dt>
          <dd>
            {printer.duplex === 'auto' ? t.duplexAuto : t.duplexManual} ({link(t.change, 'printer')}
            )
          </dd>
        </dl>
        {fixes.length > 0 && (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {t.widerMargins(messages.mm(printer.unprintable))}
          </p>
        )}
        {pages / 4 > MAX_STAPLED_SHEETS && (
          <p role="status" className="text-sm text-amber-700 dark:text-amber-400">
            {t.thick(MAX_STAPLED_SHEETS)}
          </p>
        )}
      </StepSection>

      {!layout.fits ? (
        <p role="alert" className="text-[15px] text-danger">
          {t.noFit(2 * config.format.width, config.format.height, paper.label)}{' '}
          {link(messages.steps.design, 'design')}.
        </p>
      ) : (
        <>
          <StepSection title={t.filesTitle}>
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
            {ready.length > 0 && (
              <div className="flex flex-col items-start gap-2" data-testid="print-files">
                {ready.map((f) => (
                  <FileLink key={f.kind} file={f} label={t.files[f.kind]} />
                ))}
              </div>
            )}
          </StepSection>

          <StepSection title={t.dialogTitle}>
            <ul className="list-disc space-y-1.5 pl-5 marker:text-ink-soft">
              {t.dialog(paper.label).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </StepSection>

          {printer.duplex === 'auto' ? (
            <StepSection title={t.autoTitle}>
              <Steps>
                {t.autoSteps(t.files.duplex, layout.stacked).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </Steps>
            </StepSection>
          ) : (
            <StepSection title={t.manualTitle}>
              <Steps>
                {t.manualSteps(t.files.odd, t.files.even).map((x) => (
                  <li key={x}>{x}</li>
                ))}
                <li>
                  {t.manualCheck} {link(messages.steps.test, 'test')}.
                </li>
              </Steps>
            </StepSection>
          )}
        </>
      )}
    </StepPage>
  );
}
