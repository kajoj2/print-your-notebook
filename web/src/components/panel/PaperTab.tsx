import { ToggleGroup } from 'radix-ui';
import { useT } from '../../i18n';
import { AnimatePresence, motion } from 'motion/react';
import {
  COLOR_THEMES,
  GRID_KINDS,
  PALETTE,
  tooLightForLaser,
  type GridKind,
} from '../../notebook/config';
import { LIMITS } from '../../notebook/normalize';
import { useNotebook } from '../../state/store';
import { GridIcon } from '../GridIcon';
import { ColorField, Group, SliderField } from '../ui';

// patterns with dots (diameter) and with lines (weight); "half and half" has both
const DOTTED: GridKind[] = ['dots', 'isometric', 'split'];
const LINED: GridKind[] = GRID_KINDS.filter((k) => !['blank', 'dots', 'isometric'].includes(k));

// patterns where the accent colour is visible
const ACCENTED: GridKind[] = ['graph', 'margin-lines', 'calligraphy', 'seyes', 'storyboard'];

export function PaperTab() {
  const t = useT().paper;
  const LIGHT_WARNING = t.tooLight;
  const palette = PALETTE.map((p) => ({
    ...p,
    label: t.palette[p.id] ?? p.label,
  }));
  const grid = useNotebook((s) => s.config.grid);
  const ink = useNotebook((s) => s.config.ink);
  const update = useNotebook((s) => s.update);
  const spacingLabel = t.spacingLabels[grid.kind] ?? t.spacing;

  return (
    <>
      <Group title={t.pattern}>
        <ToggleGroup.Root
          type="single"
          value={grid.kind}
          onValueChange={(v) => v && update((c) => void (c.grid.kind = v as GridKind))}
          aria-label={t.pattern}
          className="grid grid-cols-4 gap-2"
        >
          {GRID_KINDS.map((k) => (
            <ToggleGroup.Item
              key={k}
              value={k}
              className="group flex flex-col items-center gap-1.5 rounded-lg p-1.5 text-xs text-ink-soft transition-colors hover:text-ink data-[state=on]:text-ink"
            >
              <span className="block h-[60px] w-[48px] overflow-hidden rounded-[3px] border border-rule bg-white p-0 text-ink-soft shadow-sm transition-all group-hover:-translate-y-0.5 group-data-[state=on]:border-accent group-data-[state=on]:text-accent group-data-[state=on]:shadow-md">
                <GridIcon kind={k} />
              </span>
              {t.grids[k]}
            </ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>
      </Group>

      <AnimatePresence initial={false}>
        {grid.kind !== 'blank' && (
          <motion.div
            key="grid-settings"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Group title={t.sizeColor}>
              <SliderField
                label={spacingLabel}
                unit="mm"
                value={grid.spacing}
                min={LIMITS.spacing.min}
                max={LIMITS.spacing.max}
                step={0.5}
                onChange={(v) => update((c) => void (c.grid.spacing = v))}
              />
              {DOTTED.includes(grid.kind) && (
                <SliderField
                  label={t.dot}
                  unit="mm"
                  value={grid.dotDiameter}
                  min={LIMITS.dotDiameter.min}
                  max={LIMITS.dotDiameter.max}
                  step={0.05}
                  onChange={(v) => update((c) => void (c.grid.dotDiameter = v))}
                />
              )}
              {LINED.includes(grid.kind) && (
                <SliderField
                  label={t.line}
                  unit="mm"
                  value={grid.lineWidth}
                  min={LIMITS.lineWidth.min}
                  max={LIMITS.lineWidth.max}
                  step={0.01}
                  onChange={(v) => update((c) => void (c.grid.lineWidth = v))}
                />
              )}

              <p className="text-sm text-ink-soft">{t.laserNote}</p>
            </Group>
          </motion.div>
        )}
      </AnimatePresence>
      <Group title={t.colors}>
        <div>
          <div className="mb-1.5 text-sm text-ink-soft">{t.themes}</div>
          <div role="group" aria-label={t.themesLabel} className="grid grid-cols-2 gap-1.5">
            {COLOR_THEMES.map((theme) => {
              const active =
                grid.color === theme.grid &&
                grid.accent === theme.accent &&
                ink.color === theme.ink;
              return (
                <button
                  key={theme.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    update((c) => {
                      c.grid.color = theme.grid;
                      c.grid.accent = theme.accent;
                      c.ink.color = theme.ink;
                    })
                  }
                  className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs transition-colors ${active ? 'border-accent text-ink' : 'border-rule text-ink-soft hover:text-ink'}`}
                >
                  <span className="flex -space-x-1" aria-hidden>
                    {[theme.grid, theme.accent, theme.ink].map((c, i) => (
                      <span
                        key={i}
                        className="size-3.5 rounded-full ring-1 ring-panel"
                        style={{ background: c }}
                      />
                    ))}
                  </span>
                  {t.paletteThemes[theme.id] ?? theme.label}
                </button>
              );
            })}
          </div>
        </div>
        <ColorField
          customLabel={t.customColor}
          label={t.patternColor}
          description={t.patternColorText}
          value={grid.color}
          options={palette}
          onChange={(v) => update((c) => void (c.grid.color = v))}
          warn={tooLightForLaser(grid.color) ? LIGHT_WARNING : undefined}
        />
        <ColorField
          customLabel={t.customColor}
          label={t.accent}
          description={ACCENTED.includes(grid.kind) ? t.accentUsed : t.accentUnused}
          value={grid.accent}
          options={palette}
          onChange={(v) => update((c) => void (c.grid.accent = v))}
          warn={tooLightForLaser(grid.accent) ? LIGHT_WARNING : undefined}
        />
        <ColorField
          customLabel={t.customColor}
          label={t.ink}
          description={t.inkText}
          value={ink.color}
          options={palette}
          onChange={(v) => update((c) => void (c.ink.color = v))}
          warn={tooLightForLaser(ink.color) ? LIGHT_WARNING : undefined}
        />
        <p className="text-sm text-ink-soft">{t.colorNote}</p>
      </Group>
    </>
  );
}
