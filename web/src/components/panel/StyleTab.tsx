import { RadioGroup } from 'radix-ui';
import { useT } from '../../i18n';
import { COVER_COLORS, FONTS, type FontFamily, type NumberPosition } from '../../notebook/config';
import { LIMITS } from '../../notebook/normalize';
import { useNotebook } from '../../state/store';
import { Group, Segmented, SliderField, SwitchField, Swatches } from '../ui';
import { AnimatePresence, motion } from 'motion/react';

export function StyleTab() {
  const t = useT().style;
  const config = useNotebook((s) => s.config);
  const update = useNotebook((s) => s.update);
  const { font, numbering } = config;

  return (
    <>
      <Group title={t.font}>
        <RadioGroup.Root
          value={font.family}
          onValueChange={(v) => update((c) => void (c.font.family = v as FontFamily))}
          aria-label={t.font}
          className="space-y-1"
        >
          {FONTS.map((f) => (
            <RadioGroup.Item
              key={f.family}
              value={f.family}
              className="flex w-full items-baseline justify-between gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:bg-panel-raised data-[state=checked]:border-rule data-[state=checked]:bg-panel-raised"
            >
              <span className="text-[17px] text-ink" style={{ fontFamily: `'${f.family}'` }}>
                {f.label}
              </span>
              <span className="text-xs text-ink-soft">{t.fontNotes[f.family]}</span>
            </RadioGroup.Item>
          ))}
        </RadioGroup.Root>
        <SliderField
          label={t.fontSize}
          unit="pt"
          value={font.size}
          min={LIMITS.fontSize.min}
          max={LIMITS.fontSize.max}
          step={0.5}
          onChange={(v) => update((c) => void (c.font.size = v))}
        />
      </Group>

      <Group title={t.numbering}>
        <SwitchField
          label={t.numberPages}
          description={t.numberPagesText}
          checked={numbering.enabled}
          onChange={(v) => update((c) => void (c.numbering.enabled = v))}
        />
        <AnimatePresence initial={false}>
          {numbering.enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 overflow-hidden"
            >
              <Segmented<NumberPosition>
                label={t.position}
                value={numbering.position}
                options={[
                  { value: 'outer', label: t.outer },
                  { value: 'center', label: t.center },
                ]}
                onChange={(v) => update((c) => void (c.numbering.position = v))}
              />
              <SliderField
                label={t.numberSize}
                unit="pt"
                value={numbering.size}
                min={LIMITS.numberSize.min}
                max={LIMITS.numberSize.max}
                step={0.5}
                onChange={(v) => update((c) => void (c.numbering.size = v))}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Group>

      <Group title={t.cover}>
        <Swatches
          label={t.coverColor}
          value={config.coverColor}
          options={COVER_COLORS.map((c) => ({ ...c, label: t.coverColors[c.id] ?? c.label }))}
          onChange={(v) => update((c) => void (c.coverColor = v))}
        />
      </Group>
    </>
  );
}
