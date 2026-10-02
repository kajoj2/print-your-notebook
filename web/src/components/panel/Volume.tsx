// Notebook volume: the choice (Format tab) and how full it is (Pages tab).
import { MAX_STAPLED_SHEETS, VOLUME_PRESETS } from '../../notebook/config';
import { LIMITS } from '../../notebook/normalize';
import { useT } from '../../i18n';

import { PAPER_SIZES, sheetCount, sheetLayout } from '../../notebook/printer';
import { fittingVolume, planVolume } from '../../notebook/volume';
import { useFittedNotebook } from '../../state/printer';
import { useNotebook } from '../../state/store';
import { Group, NumberField, Segmented } from '../ui';

export function ThickWarning() {
  const t = useT().volume;
  return (
    <p role="status" className="text-sm text-amber-700 dark:text-amber-400">
      {t.thick(MAX_STAPLED_SHEETS)}
    </p>
  );
}

export function VolumeGroup() {
  const messages = useT();
  const t = messages.volume;
  const config = useNotebook((s) => s.config);
  const fitted = useFittedNotebook();
  const printer = fitted.printer;
  const layout = sheetLayout(fitted.config, printer);
  const update = useNotebook((s) => s.update);
  const v = planVolume(config);
  const set = (n: number) => update((c) => void (c.pages = n));
  const preset = (VOLUME_PRESETS as readonly number[]).includes(config.pages)
    ? String(config.pages)
    : '';

  return (
    <Group
      title={t.title}
      aside={
        <span className="text-sm tabular-nums text-ink-soft">{messages.pages(config.pages)}</span>
      }
    >
      <Segmented
        label={t.count}
        value={preset}
        options={VOLUME_PRESETS.map((n) => ({ value: String(n), label: String(n) }))}
        onChange={(s) => set(Number(s))}
      />
      <div className="grid grid-cols-2 items-end gap-3">
        <NumberField
          label={t.custom}
          value={config.pages}
          min={LIMITS.volume.min}
          max={LIMITS.volume.max}
          step={4}
          onChange={set}
        />
        <p className="pb-1.5 text-sm text-ink-soft" data-testid="volume-sheets">
          {t.leaves(config.pages / 4)}
          <br />
          {t.sheets(PAPER_SIZES[printer.paper].label, sheetCount(config.pages, layout))}
          {layout.stacked && t.stacked}
        </p>
      </div>
      {config.pages / 4 > MAX_STAPLED_SHEETS && <ThickWarning />}
      {v.over > 0 && (
        <p role="status" className="text-sm text-amber-700 dark:text-amber-400">
          {t.contentOver(messages.pages(v.content))}
        </p>
      )}
    </Group>
  );
}

// Fill bar at the top of the Pages tab.
export function VolumeStatus() {
  const messages = useT();
  const t = messages.volume;
  const config = useNotebook((s) => s.config);
  const update = useNotebook((s) => s.update);
  const v = planVolume(config);
  const notes = config.sections.find((s) => s.type === 'notes');
  const filling = notes?.type === 'notes' && notes.enabled && notes.fill;
  const fit = fittingVolume(v);
  const pct = Math.min(100, (v.content / v.target) * 100);

  return (
    <Group
      title={t.title}
      aside={
        <span className="text-sm tabular-nums text-ink-soft" data-testid="volume-usage">
          {v.content} / {v.target}
        </span>
      }
    >
      <div
        role="meter"
        aria-label={t.used}
        aria-valuemin={0}
        aria-valuemax={v.target}
        aria-valuenow={v.content}
        className="h-1.5 overflow-hidden rounded-full bg-rule"
      >
        <div
          className={`h-full rounded-full transition-all ${v.over ? 'bg-amber-500' : 'bg-accent'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {v.over > 0 ? (
        <div role="alert" className="space-y-2 text-sm">
          <p className="text-amber-700 dark:text-amber-400">
            {t.over(messages.pages(v.over), v.content, v.target)}
          </p>
          <button
            type="button"
            onClick={() => update((c) => void (c.pages = fit))}
            className="rounded-lg border border-rule bg-panel-raised px-3 py-1.5 text-sm text-ink hover:border-accent"
          >
            {t.grow(fit)}
          </button>
        </div>
      ) : (
        <p className="text-sm text-ink-soft">
          {filling
            ? t.filling(messages.pages(v.notes))
            : v.target > v.content
              ? t.left(messages.pages(v.target - v.content))
              : t.exact}
        </p>
      )}
      {v.tooThick && <ThickWarning />}
    </Group>
  );
}
