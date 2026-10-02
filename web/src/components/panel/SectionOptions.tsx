// Settings of a single section (visible once it's enabled in the Pages tab).
import { createElement, type ReactNode } from 'react';
import { ToggleGroup } from 'radix-ui';
import { useT } from '../../i18n';
import { isoWeeksInYear } from '../../notebook/calendar';
import {
  GRID_KINDS,
  type GridKind,
  type PixelTheme,
  type WatchKind,
  type Section,
  type SectionOf,
  type SectionType,
} from '../../notebook/config';
import { LIMITS } from '../../notebook/normalize';

import { notesPages } from '../../notebook/volume';
import { useNotebook } from '../../state/store';
import { NumberField, Segmented, SwitchField } from '../ui';

const selectClass =
  'w-full rounded-lg border border-rule bg-panel-raised px-2.5 py-1.5 text-sm outline-none focus:border-accent';

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-ink-soft">{label}</span>
      <select className={selectClass} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// Picking several options at once (e.g. groups on the packing list).
function ChipsField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T[];
  options: Record<T, string>;
  onChange: (v: T[]) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 text-sm text-ink-soft">{label}</div>
      <ToggleGroup.Root
        type="multiple"
        value={value}
        onValueChange={(v) => onChange(v as T[])}
        aria-label={label}
        className="flex flex-wrap gap-1.5"
      >
        {(Object.entries(options) as [T, string][]).map(([k, l]) => (
          <ToggleGroup.Item
            key={k}
            value={k}
            className="rounded-full border border-rule px-2.5 py-1 text-xs text-ink-soft transition-colors hover:text-ink data-[state=on]:border-accent data-[state=on]:bg-accent/10 data-[state=on]:text-ink"
          >
            {l}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
    </div>
  );
}

const options = <T extends string>(labels: Record<T, string>) =>
  (Object.entries(labels) as [T, string][]).map(([value, label]) => ({ value, label }));

// Shopping list stores: count and names; an empty field = a line to fill in by hand in the notebook.
function StoresField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const t = useT().options;
  const resize = (n: number) => onChange(Array.from({ length: n }, (_, i) => value[i] ?? ''));
  return (
    <div className="space-y-2">
      <NumberField
        label={t.storeCount}
        value={value.length}
        min={LIMITS.stores.min}
        max={LIMITS.stores.max}
        onChange={resize}
      />
      <p className="text-xs text-ink-soft">{t.storeEmpty}</p>
      {value.map((name, i) => (
        <input
          key={i}
          aria-label={t.store(i + 1)}
          className="w-full rounded-lg border border-rule bg-panel-raised px-3 py-1.5 text-sm outline-none focus:border-accent"
          value={name}
          maxLength={LIMITS.storeLength}
          placeholder={t.store(i + 1)}
          onChange={(e) => onChange(value.map((n, j) => (j === i ? e.target.value : n)))}
        />
      ))}
    </div>
  );
}

type WithPages = Extract<Section, { pages: number }>['type'];
type WithStartMonth = Extract<Section, { startMonth: number }>['type'];
type WithGrid = Extract<Section, { grid: GridKind | 'auto' }>['type'];

export function SectionOptions({ section }: { section: Section }) {
  const messages = useT();
  const t = messages.options;
  const MONTH_OPTIONS = messages.months.map((label, i) => ({ value: String(i + 1), label }));
  const GRID_OPTIONS = [
    { value: 'auto', label: t.patternAuto },
    ...GRID_KINDS.map((k) => ({ value: k, label: messages.paper.grids[k] })),
  ];
  const set = useNotebook((s) => s.updateSection);
  const year = useNotebook((s) => s.config.year);
  const notesLeft = useNotebook((s) => notesPages(s.config));
  // shortcut: change one field of a section of the given type
  const field =
    <T extends SectionType>(type: T) =>
    <K extends keyof SectionOf<T>>(key: K) =>
    (v: SectionOf<T>[K]) =>
      set(type, (s) => void (s[key] = v));

  // children as separate createElement arguments, not an array: React then doesn't require keys
  const grid = (...children: ReactNode[]) =>
    createElement('div', { className: 'grid grid-cols-2 gap-3' }, ...children);
  const stack = (...children: ReactNode[]) =>
    createElement('div', { className: 'space-y-3' }, ...children);

  const pages = (type: WithPages, value: number) => (
    <NumberField
      key="pages"
      label={t.pages}
      value={value}
      min={LIMITS.pages.min}
      max={LIMITS.pages.max}
      onChange={(v) => set(type, (s) => void (s.pages = v))}
    />
  );
  const startMonth = (type: WithStartMonth, value: number) => (
    <SelectField
      key="start"
      label={t.fromMonth}
      value={String(value)}
      options={MONTH_OPTIONS}
      onChange={(v) => set(type, (s) => void (s.startMonth = Number(v)))}
    />
  );
  const months = (type: 'months' | 'habits' | 'budget', value: number) => (
    <NumberField
      key="count"
      label={t.months}
      value={value}
      min={LIMITS.months.min}
      max={LIMITS.months.max}
      onChange={(v) => set(type, (s) => void (s.count = v))}
    />
  );
  const gridSelect = (type: WithGrid, value: GridKind | 'auto', label = t.pattern) => (
    <SelectField
      key="grid"
      label={label}
      value={value}
      options={GRID_OPTIONS}
      onChange={(v) => set(type, (s) => void (s.grid = v as GridKind | 'auto'))}
    />
  );
  const number = (
    key: string,
    label: string,
    value: number,
    r: { min: number; max: number },
    onChange: (v: number) => void,
  ) => (
    <NumberField
      key={key}
      label={label}
      value={value}
      min={r.min}
      max={r.max}
      onChange={onChange}
    />
  );

  switch (section.type) {
    case 'title':
      return (
        <SwitchField
          label={t.owner}
          description={t.ownerText}
          checked={section.owner}
          onChange={field('title')('owner')}
        />
      );
    case 'year':
      return <p className="text-sm text-ink-soft">{t.year(year)}</p>;
    case 'future-log':
      return grid(startMonth('future-log', section.startMonth));
    case 'months':
    case 'budget':
      return grid(
        startMonth(section.type, section.startMonth),
        months(section.type, section.count),
      );
    case 'habits':
      return stack(
        grid(startMonth('habits', section.startMonth), months('habits', section.count)),
        grid(
          number(
            'habits',
            t.habitColumns,
            section.habits,
            LIMITS.habits,
            field('habits')('habits'),
          ),
        ),
      );
    case 'weeks': {
      const total = isoWeeksInYear(year);
      return grid(
        number(
          'start',
          t.fromWeek,
          section.startWeek,
          { min: 1, max: total },
          field('weeks')('startWeek'),
        ),
        number(
          'count',
          t.weeks,
          section.count,
          { min: LIMITS.weeks.min, max: total },
          field('weeks')('count'),
        ),
      );
    }
    case 'daily':
      return grid(
        <label key="date" className="block">
          <span className="mb-1.5 block text-sm text-ink-soft">{t.fromDay}</span>
          <input
            type="date"
            className={selectClass}
            value={section.startDate}
            onChange={(e) =>
              e.target.value && set('daily', (s) => void (s.startDate = e.target.value))
            }
          />
        </label>,
        number('count', t.days, section.count, LIMITS.days, field('daily')('count')),
      );
    case 'notes':
      return stack(
        <SwitchField
          key="fill"
          label={t.fill}
          description={t.fillText(messages.pages(notesLeft))}
          checked={section.fill}
          onChange={field('notes')('fill')}
        />,
        grid(
          section.fill ? null : pages('notes', section.pages),
          gridSelect('notes', section.grid),
        ),
      );
    case 'index':
    case 'todo':
    case 'cornell':
    case 'travel':
    case 'reading':
      return grid(pages(section.type, section.pages));

    case 'birthdays':
      return stack(
        <Segmented
          key="per"
          label={t.monthsPerPage}
          value={String(section.perPage)}
          options={['2', '3', '4', '6'].map((v) => ({ value: v, label: v }))}
          onChange={(v) => field('birthdays')('perPage')(Number(v) as 2 | 3 | 4 | 6)}
        />,
        <SwitchField
          key="day"
          label={t.dayColumn}
          description={t.dayColumnText}
          checked={section.dayColumn}
          onChange={field('birthdays')('dayColumn')}
        />,
      );
    case 'pixels':
      return grid(
        <SelectField
          key="theme"
          label={t.tracking}
          value={section.theme}
          options={options(t.pixelThemes)}
          onChange={(v) => field('pixels')('theme')(v as PixelTheme)}
        />,
        number('legend', t.legend, section.legend, LIMITS.legend, field('pixels')('legend')),
      );
    case 'one-line':
      return stack(
        grid(
          startMonth('one-line', section.startMonth),
          number(
            'count',
            t.months,
            section.count,
            LIMITS.oneLineMonths,
            field('one-line')('count'),
          ),
        ),
        grid(
          number('years', t.years, section.years, LIMITS.oneLineYears, field('one-line')('years')),
          number(
            'per',
            t.daysPerPage,
            section.perPage,
            LIMITS.oneLinePerPage,
            field('one-line')('perPage'),
          ),
        ),
      );
    case 'workout':
      return stack(
        <Segmented
          key="kind"
          label={t.workoutKind}
          value={section.kind}
          options={options(t.workoutKinds)}
          onChange={field('workout')('kind')}
        />,
        grid(pages('workout', section.pages)),
      );
    case 'packing':
      return stack(
        <ChipsField
          key="groups"
          label={t.groups}
          value={section.groups}
          options={t.packingGroups}
          onChange={field('packing')('groups')}
        />,
        grid(
          pages('packing', section.pages),
          <Segmented
            key="cols"
            label={t.columns}
            value={String(section.columns)}
            options={[
              { value: '1', label: '1' },
              { value: '2', label: '2' },
            ]}
            onChange={(v) => field('packing')('columns')(Number(v) as 1 | 2)}
          />,
        ),
      );
    case 'shopping':
      return stack(
        <Segmented
          key="split"
          label={t.split}
          value={section.split}
          options={options(t.shoppingSplits)}
          onChange={field('shopping')('split')}
        />,
        section.split === 'departments' ? (
          <ChipsField
            key="groups"
            label={t.departments}
            value={section.groups}
            options={t.shoppingGroups}
            onChange={field('shopping')('groups')}
          />
        ) : (
          <StoresField key="stores" value={section.stores} onChange={field('shopping')('stores')} />
        ),
        grid(
          pages('shopping', section.pages),
          <Segmented
            key="cols"
            label={t.columns}
            value={String(section.columns)}
            options={[
              { value: '1', label: '1' },
              { value: '2', label: '2' },
            ]}
            onChange={(v) => field('shopping')('columns')(Number(v) as 1 | 2)}
          />,
        ),
        <SwitchField
          key="qty"
          label={t.qty}
          description={t.qtyText}
          checked={section.qty}
          onChange={field('shopping')('qty')}
        />,
      );
    case 'watchlist':
      return grid(
        <SelectField
          key="kind"
          label={t.watching}
          value={section.kind}
          options={options(t.watchKinds)}
          onChange={(v) => field('watchlist')('kind')(v as WatchKind)}
        />,
        pages('watchlist', section.pages),
      );
    case 'contacts':
      return stack(
        <ChipsField
          key="fields"
          label={t.contactFields}
          value={section.fields}
          options={t.contactFieldNames}
          onChange={field('contacts')('fields')}
        />,
        grid(pages('contacts', section.pages)),
      );
    case 'meeting':
      return stack(
        grid(
          pages('meeting', section.pages),
          number(
            'actions',
            t.actions,
            section.actions,
            LIMITS.actions,
            field('meeting')('actions'),
          ),
        ),
        gridSelect('meeting', section.grid, t.notesPattern),
      );
    case 'project':
      return stack(
        grid(
          pages('project', section.pages),
          number('steps', t.steps, section.steps, LIMITS.steps, field('project')('steps')),
        ),
        gridSelect('project', section.grid, t.notesPattern),
      );
    case 'tasting':
      return stack(
        <Segmented
          key="kind"
          label={t.kind}
          value={section.kind}
          options={options(t.tastingKinds)}
          onChange={field('tasting')('kind')}
        />,
        grid(
          pages('tasting', section.pages),
          <Segmented
            key="per"
            label={t.perPage}
            value={String(section.perPage)}
            options={[
              { value: '1', label: '1' },
              { value: '2', label: '2' },
            ]}
            onChange={(v) => field('tasting')('perPage')(Number(v) as 1 | 2)}
          />,
        ),
        <SwitchField
          key="wheel"
          label={t.wheel}
          description={t.wheelText}
          checked={section.wheel}
          onChange={field('tasting')('wheel')}
        />,
      );
    case 'meals':
      return stack(
        grid(
          number('count', t.weeks, section.count, LIMITS.weeks, field('meals')('count')),
          number('meals', t.mealsPerDay, section.meals, LIMITS.meals, field('meals')('meals')),
        ),
        <SwitchField
          key="shopping"
          label={t.shopping}
          description={t.shoppingText}
          checked={section.shopping}
          onChange={field('meals')('shopping')}
        />,
      );
  }
}
