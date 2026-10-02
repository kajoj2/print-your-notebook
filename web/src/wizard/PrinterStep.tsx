import { NumberField, Segmented, SwitchField } from '../components/ui';
import { useT } from '../i18n';
import { PAPER_SIZES, PRINTER_LIMITS, type DuplexMode, type PaperSize } from '../notebook/printer';
import { usePrinter } from '../state/printer';
import { ChoiceCards } from './ChoiceCards';
import { StepPage, StepSection } from './Stepper';

export function PrinterStep() {
  const printer = usePrinter((s) => s.printer);
  const update = usePrinter((s) => s.updatePrinter);
  const reset = usePrinter((s) => s.resetPrinter);
  const t = useT().printer;

  return (
    <StepPage title={t.title} lead={t.lead}>
      <StepSection title={t.paper}>
        <div className="max-w-xs">
          <Segmented<PaperSize>
            label={t.paperSize}
            value={printer.paper}
            options={Object.entries(PAPER_SIZES).map(([value, p]) => ({
              value: value as PaperSize,
              label: p.label,
            }))}
            onChange={(paper) => update({ paper })}
          />
        </div>
      </StepSection>

      <StepSection title={t.duplex}>
        <ChoiceCards<DuplexMode>
          label={t.duplex}
          value={printer.duplex}
          onChange={(duplex) => update({ duplex })}
          options={[
            {
              value: 'auto',
              title: t.autoTitle,
              description: t.autoText,
            },
            {
              value: 'manual',
              title: t.manualTitle,
              description: t.manualText,
            },
          ]}
        />
        <p className="text-sm text-ink-soft">{t.duplexHelp}</p>
      </StepSection>

      <StepSection title={t.margin}>
        <p>{t.marginText}</p>
        <NumberField
          className="w-56"
          label={t.unprintable}
          unit="mm"
          value={printer.unprintable}
          min={PRINTER_LIMITS.unprintable.min}
          max={PRINTER_LIMITS.unprintable.max}
          step={0.5}
          onChange={(unprintable) => update({ unprintable })}
        />
      </StepSection>

      <StepSection title={t.compat}>
        <SwitchField
          label={t.raster}
          description={t.rasterText}
          checked={printer.raster}
          onChange={(raster) => update({ raster })}
        />
      </StepSection>

      <details className="group rounded-xl border border-rule bg-panel-raised px-4 py-3">
        <summary className="cursor-pointer text-[15px] font-semibold text-ink">
          {t.advanced}
        </summary>
        <div className="mt-4 space-y-4 text-sm">
          <p className="text-ink-soft">{t.advancedText}</p>
          <SwitchField
            label={t.evenReverse}
            description={t.evenReverseText}
            checked={printer.evenReverse}
            onChange={(evenReverse) => update({ evenReverse })}
          />
          <SwitchField
            label={t.rotateBack}
            description={t.rotateBackText}
            checked={printer.rotateBack}
            onChange={(rotateBack) => update({ rotateBack })}
          />
          <div className="grid max-w-sm grid-cols-2 gap-3">
            <NumberField
              label={t.dx}
              unit="mm"
              value={printer.dx}
              min={PRINTER_LIMITS.offset.min}
              max={PRINTER_LIMITS.offset.max}
              step={0.5}
              onChange={(dx) => update({ dx })}
            />
            <NumberField
              label={t.dy}
              unit="mm"
              value={printer.dy}
              min={PRINTER_LIMITS.offset.min}
              max={PRINTER_LIMITS.offset.max}
              step={0.5}
              onChange={(dy) => update({ dy })}
            />
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-sm text-accent underline-offset-2 hover:underline"
          >
            {t.reset}
          </button>
        </div>
      </details>
    </StepPage>
  );
}
