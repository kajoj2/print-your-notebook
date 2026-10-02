import type { ReactNode } from 'react';
import { RadioGroup } from 'radix-ui';

// Picking one of several options, shown as cards with a description.
export function ChoiceCards<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; title: string; description: ReactNode }[];
  onChange: (v: T) => void;
}) {
  return (
    <RadioGroup.Root
      aria-label={label}
      value={value}
      onValueChange={(v) => onChange(v as T)}
      className="grid gap-3 sm:grid-cols-2"
    >
      {options.map((o) => (
        <RadioGroup.Item
          key={o.value}
          value={o.value}
          className="group rounded-xl border border-rule bg-panel-raised p-4 text-left transition-colors hover:border-ink-soft/40 data-[state=checked]:border-accent data-[state=checked]:bg-accent-soft/50"
        >
          <span className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <span
              aria-hidden
              className="grid size-4 place-items-center rounded-full border-2 border-rule group-data-[state=checked]:border-accent"
            >
              <span className="size-1.5 rounded-full group-data-[state=checked]:bg-accent" />
            </span>
            {o.title}
          </span>
          <span className="mt-1.5 block text-sm leading-relaxed text-ink-soft">
            {o.description}
          </span>
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
