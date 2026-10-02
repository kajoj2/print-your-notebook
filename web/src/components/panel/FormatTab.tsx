import { ToggleGroup } from 'radix-ui';
import { motion } from 'motion/react';
import { LANGS, useT } from '../../i18n';
import {
  FORMAT_LIMITS,
  FORMAT_PRESETS,
  NOTEBOOK_LANGS,
  type FormatPreset,
  type NotebookLang,
  type WeekStart,
} from '../../notebook/config';
import { LIMITS } from '../../notebook/normalize';
import { PAPER_SIZES, sheetLayout, type MarginFix } from '../../notebook/printer';
import { useFittedNotebook } from '../../state/printer';
import { useNotebook } from '../../state/store';
import { useOptionalWizard } from '../../wizard/WizardContext';
import { Group, NumberField, Segmented, SliderField } from '../ui';
import { VolumeGroup } from './Volume';

// A rectangle to scale: all formats are drawn at the same scale so the difference is visible.
function FormatShape({
  width,
  height,
  active,
}: {
  width: number;
  height: number;
  active: boolean;
}) {
  const scale = 0.24;
  return (
    <motion.span
      layout
      className={`block rounded-[2px] border ${active ? 'border-accent bg-accent-soft' : 'border-ink-soft/50 bg-panel-raised'}`}
      style={{ width: width * scale, height: height * scale }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    />
  );
}

// Margins narrower than the printer can print: the print and preview use wider ones.
function MarginFixes({ fixes, unprintable }: { fixes: MarginFix[]; unprintable: number }) {
  const messages = useT();
  const t = messages.format;
  const wizard = useOptionalWizard();
  if (fixes.length === 0) return null;
  const has = (r: MarginFix['reason']) => fixes.some((f) => f.reason === r);
  return (
    <div role="status" className="mt-4 text-sm text-amber-700 dark:text-amber-400">
      <p>{t.fixes(messages.mm(unprintable), has('number'), has('marks'))}</p>
      <ul className="mt-1 list-disc pl-5">
        {fixes.map((f) => (
          <li key={f.side}>
            {t.fix(t.marginLabels[f.side], messages.mm(f.to), messages.mm(f.from))}
          </li>
        ))}
      </ul>
      {wizard && (
        <button
          type="button"
          onClick={() => wizard.go('printer')}
          className="mt-1 text-accent underline-offset-2 hover:underline"
        >
          {t.changePrinter}
        </button>
      )}
    </div>
  );
}

export function FormatTab() {
  const messages = useT();
  const t = messages.format;
  const config = useNotebook((s) => s.config);
  const update = useNotebook((s) => s.update);
  const setPreset = useNotebook((s) => s.setPreset);
  const { format, margins } = config;
  const { config: fitted, printer, fixes } = useFittedNotebook();
  const layout = sheetLayout(fitted, printer);
  const paper = PAPER_SIZES[printer.paper];
  const presets = [
    ...(Object.entries(FORMAT_PRESETS) as [
      FormatPreset,
      { label: string; width: number; height: number },
    ][]),
    ['custom', { label: t.custom, width: 0, height: 0 }] as const,
  ];

  return (
    <>
      <Group title={t.titleGroup}>
        <div>
          <label htmlFor="nb-title" className="mb-1.5 block text-sm text-ink-soft">
            {t.titleLabel}
          </label>
          <input
            id="nb-title"
            className="w-full rounded-lg border border-rule bg-panel-raised px-3 py-2 font-type text-[15px] outline-none focus:border-accent"
            value={config.title}
            maxLength={LIMITS.titleLength}
            onChange={(e) => update((c) => void (c.title = e.target.value))}
            placeholder={t.titlePlaceholder}
          />
        </div>
      </Group>

      <Group
        title={t.group}
        aside={
          <span className="text-sm tabular-nums text-ink-soft">
            {format.width} × {format.height} mm
          </span>
        }
      >
        <ToggleGroup.Root
          type="single"
          value={format.preset}
          onValueChange={(v) => v && setPreset(v as FormatPreset)}
          aria-label={t.group}
          className="grid grid-cols-3 gap-2"
        >
          {presets.map(([key, p]) => {
            const active = key === format.preset;
            const size = key === 'custom' ? format : p;
            return (
              <ToggleGroup.Item
                key={key}
                value={key}
                className="flex h-[92px] flex-col items-center justify-end gap-1.5 rounded-lg border border-transparent px-1 pb-2 text-xs text-ink-soft transition-colors hover:bg-panel-raised data-[state=on]:border-rule data-[state=on]:bg-panel-raised data-[state=on]:text-ink"
              >
                <span className="flex flex-1 items-end">
                  {key === 'custom' ? (
                    <span className="flex h-[50px] w-[30px] items-center justify-center rounded-[2px] border border-dashed border-ink-soft/60 text-base">
                      ±
                    </span>
                  ) : (
                    <FormatShape width={size.width} height={size.height} active={active} />
                  )}
                </span>
                <span>{p.label}</span>
              </ToggleGroup.Item>
            );
          })}
        </ToggleGroup.Root>

        {format.preset === 'custom' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="grid grid-cols-2 gap-3 overflow-hidden"
          >
            <NumberField
              label={t.width}
              unit="mm"
              value={format.width}
              min={FORMAT_LIMITS.min}
              max={FORMAT_LIMITS.max}
              onChange={(v) => update((c) => void (c.format.width = v))}
            />
            <NumberField
              label={t.height}
              unit="mm"
              value={format.height}
              min={FORMAT_LIMITS.min}
              max={FORMAT_LIMITS.max}
              onChange={(v) => update((c) => void (c.format.height = v))}
            />
          </motion.div>
        )}
        {!layout.fits && (
          <p role="status" className="mt-3 text-sm text-amber-700 dark:text-amber-400">
            {t.noFit(
              messages.mm(2 * format.width),
              messages.mm(format.height),
              paper.label,
              paper.width,
              paper.height,
            )}
          </p>
        )}
      </Group>

      <VolumeGroup />

      <Group title={t.lang}>
        <Segmented<NotebookLang>
          label={t.langNote}
          value={config.lang}
          options={NOTEBOOK_LANGS.map((l) => ({ value: l, label: LANGS[l] }))}
          onChange={(v) => update((c) => void (c.lang = v))}
        />
      </Group>

      <Group title={t.year}>
        <NumberField
          label={t.yearLabel}
          value={config.year}
          min={LIMITS.year.min}
          max={LIMITS.year.max}
          onChange={(v) =>
            update((c) => {
              c.year = v;
              // daily pages follow the year if nobody changed their date
              const daily = c.sections.find((s) => s.type === 'daily');
              if (daily && daily.startDate.endsWith('-01-01')) daily.startDate = `${v}-01-01`;
            })
          }
        />
        <Segmented<WeekStart>
          label={t.weekStart}
          value={config.weekStart}
          options={[
            { value: 'monday', label: t.monday },
            { value: 'sunday', label: t.sunday },
          ]}
          onChange={(v) => update((c) => void (c.weekStart = v))}
        />
      </Group>

      <Group title={t.margins}>
        <div className="grid grid-cols-2 gap-x-5 gap-y-4">
          {(['top', 'bottom', 'inner', 'outer'] as const).map((k) => (
            <SliderField
              key={k}
              label={t.marginLabels[k]}
              unit="mm"
              value={margins[k]}
              min={LIMITS.margin.min}
              max={LIMITS.margin.max}
              step={0.5}
              format={(v) => messages.mm(v).replace(' mm', '')}
              onChange={(v) => update((c) => void (c.margins[k] = v))}
            />
          ))}
        </div>
        <MarginFixes fixes={fixes} unprintable={printer.unprintable} />
      </Group>
    </>
  );
}
