// Panel controls: Radix provides accessibility (keyboard, ARIA), this is just the look.
import { useId, useState, type ReactNode } from 'react';
import { Slider as RSlider, Switch as RSwitch, ToggleGroup } from 'radix-ui';
import { motion } from 'motion/react';

export function Group({
  title,
  children,
  aside,
}: {
  title: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="border-b border-rule px-5 py-5 last:border-b-0">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        {aside}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function SliderField({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  format = (v) => String(v).replace('.', ','),
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  const id = useId();
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <label id={id} className="text-ink-soft">
          {label}
        </label>
        <span className="tabular-nums text-ink" aria-hidden>
          {format(value)}
          {unit && <span className="ml-0.5 text-ink-soft">{unit}</span>}
        </span>
      </div>
      <RSlider.Root
        className="relative flex h-5 touch-none select-none items-center"
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => v !== undefined && onChange(v)}
        aria-labelledby={id}
      >
        <RSlider.Track className="relative h-[3px] grow rounded-full bg-rule">
          <RSlider.Range className="absolute h-full rounded-full bg-accent" />
        </RSlider.Track>
        <RSlider.Thumb
          aria-labelledby={id}
          className="block size-4 rounded-full border-2 border-accent bg-panel-raised shadow-sm transition-transform hover:scale-110 focus-visible:scale-110"
        />
      </RSlider.Root>
    </div>
  );
}

export function SwitchField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={id} className="text-sm">
        <span className="text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-ink-soft">{description}</span>}
      </label>
      <Switch id={id} checked={checked} onChange={onChange} />
    </div>
  );
}

export function Switch({
  id,
  checked,
  onChange,
  label,
}: {
  id?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <RSwitch.Root
      id={id}
      checked={checked}
      onCheckedChange={onChange}
      aria-label={label}
      className="relative mt-0.5 h-5 w-9 shrink-0 rounded-full bg-rule transition-colors data-[state=checked]:bg-accent"
    >
      <RSwitch.Thumb asChild>
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 700, damping: 35 }}
          className="block size-4 translate-x-0.5 rounded-full bg-white shadow data-[state=checked]:translate-x-[18px]"
        />
      </RSwitch.Thumb>
    </RSwitch.Root>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
}) {
  const layoutId = useId();
  return (
    <div>
      <div className="mb-1.5 text-sm text-ink-soft">{label}</div>
      <ToggleGroup.Root
        type="single"
        value={value}
        onValueChange={(v) => v && onChange(v as T)}
        aria-label={label}
        className="flex rounded-lg bg-rule/60 p-0.5"
      >
        {options.map((o) => (
          <ToggleGroup.Item
            key={o.value}
            value={o.value}
            className="relative flex-1 rounded-md px-2 py-1.5 text-sm text-ink-soft transition-colors data-[state=on]:text-ink"
          >
            {o.value === value && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-md bg-panel-raised shadow-sm"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
    </div>
  );
}

// A number field that lets you type an "in-between" value (e.g. empty text)
// and commits it on blur or Enter.
export function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  className = '',
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  className?: string;
}) {
  const id = useId();
  // text being edited; null = show the value from the configuration
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? String(value);
  const commit = () => {
    setDraft(null);
    const n = Number(text.replace(',', '.'));
    if (text.trim() === '' || !Number.isFinite(n)) return;
    const clamped = Math.min(max, Math.max(min, n));
    if (clamped !== value) onChange(clamped);
  };
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm text-ink-soft">
        {label}
      </label>
      <div className="flex items-center rounded-lg border border-rule bg-panel-raised focus-within:border-accent">
        <input
          id={id}
          inputMode="decimal"
          className="w-full min-w-0 bg-transparent px-3 py-1.5 text-sm tabular-nums outline-none"
          value={text}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault();
              const next = Math.min(
                max,
                Math.max(min, value + (e.key === 'ArrowUp' ? step : -step)),
              );
              onChange(Number(next.toFixed(3)));
            }
          }}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          role="spinbutton"
        />
        {unit && <span className="pr-3 text-sm text-ink-soft">{unit}</span>}
      </div>
    </div>
  );
}

export function Swatches({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { color: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 text-sm text-ink-soft">{label}</div>
      <ToggleGroup.Root
        type="single"
        value={value}
        onValueChange={(v) => v && onChange(v)}
        aria-label={label}
        className="flex flex-wrap gap-2"
      >
        {options.map((o) => (
          <ToggleGroup.Item
            key={o.color}
            value={o.color}
            aria-label={o.label}
            title={o.label}
            className="group relative size-8 rounded-full ring-offset-2 ring-offset-panel transition-transform hover:scale-110 data-[state=on]:ring-2 data-[state=on]:ring-accent"
            style={{ background: o.color }}
          />
        ))}
      </ToggleGroup.Root>
    </div>
  );
}

// A colour from the palette or a custom one (picker), with a warning when it's too light for a laser.
export function ColorField({
  customLabel = 'Custom colour',
  label,
  description,
  value,
  options,
  onChange,
  warn,
}: {
  label: string;
  description?: string;
  value: string;
  options: readonly { color: string; label: string }[];
  onChange: (v: string) => void;
  warn?: string;
  customLabel?: string;
}) {
  const custom = !options.some((o) => o.color === value);
  return (
    <div>
      <div className="mb-1.5 text-sm">
        <span className="text-ink-soft">{label}</span>
        {description && <span className="block text-xs text-ink-soft/80">{description}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <ToggleGroup.Root
          type="single"
          value={custom ? '' : value}
          onValueChange={(v) => v && onChange(v)}
          aria-label={label}
          className="contents"
        >
          {options.map((o) => (
            <ToggleGroup.Item
              key={o.color}
              value={o.color}
              aria-label={o.label}
              title={o.label}
              className="size-6 rounded-full ring-offset-2 ring-offset-panel transition-transform hover:scale-110 data-[state=on]:ring-2 data-[state=on]:ring-accent"
              style={{ background: o.color }}
            />
          ))}
        </ToggleGroup.Root>
        <label
          title={customLabel}
          className={`relative size-6 cursor-pointer overflow-hidden rounded-full border border-dashed border-ink-soft ring-offset-2 ring-offset-panel ${custom ? 'ring-2 ring-accent' : ''}`}
          style={custom ? { background: value } : undefined}
        >
          <span className="sr-only">{`${label}: ${customLabel.toLowerCase()}`}</span>
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>
      </div>
      {warn && (
        <p role="status" className="mt-1.5 text-xs text-amber-700 dark:text-amber-400">
          {warn}
        </p>
      )}
    </div>
  );
}
