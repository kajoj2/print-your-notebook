import { useRef, type KeyboardEvent } from 'react';
import { AnimatePresence, Reorder, motion, useDragControls } from 'motion/react';
import { GripVertical } from 'lucide-react';
import type { Section, SectionType } from '../../notebook/config';
import { useT } from '../../i18n';

import { formatRange, sectionRanges } from '../../notebook/ranges';
import { SECTION_CATEGORIES, estimatePages } from '../../notebook/sections';
import { notesPages } from '../../notebook/volume';
import { useNotebook } from '../../state/store';
import { useDoc } from '../../state/doc';
import { Group, Switch } from '../ui';
import { VolumeStatus } from './Volume';
import { SectionOptions } from './SectionOptions';

function RangeLabel({ section, range }: { section: Section; range: [number, number] | undefined }) {
  const t = useT();
  const notes = useNotebook((s) => notesPages(s.config));
  const estimate = section.type === 'notes' ? notes : estimatePages(section);
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {section.enabled && (
        <motion.span
          key={range ? formatRange(range) : 'est'}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          className="shrink-0 text-xs tabular-nums text-ink-soft"
        >
          {range ? formatRange(range) : `~${t.pages(estimate)}`}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

// A row of the order list: enabled sections only, dragged by the handle.
function OrderRow({
  section,
  range,
  onMove,
}: {
  section: Section;
  range: [number, number] | undefined;
  onMove: (dir: -1 | 1) => void;
}) {
  const controls = useDragControls();
  const t = useT();
  const info = t.sections[section.type];
  const handleRef = useRef<HTMLButtonElement>(null);

  const onHandleKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      onMove(e.key === 'ArrowUp' ? -1 : 1);
      // the button keeps focus after reordering
      requestAnimationFrame(() => handleRef.current?.focus());
    }
  };

  return (
    <Reorder.Item
      value={section.type}
      dragListener={false}
      dragControls={controls}
      data-testid={`order-${section.type}`}
      className="relative flex list-none items-center gap-1.5 rounded-lg border border-rule bg-panel-raised px-1.5 py-1.5"
      whileDrag={{ scale: 1.02, boxShadow: '0 12px 28px rgb(29 34 48 / 0.18)', zIndex: 10 }}
    >
      <button
        ref={handleRef}
        type="button"
        aria-label={t.pagesTab.move(info.label)}
        className="cursor-grab touch-none rounded p-1 text-ink-soft/70 hover:text-ink active:cursor-grabbing"
        onPointerDown={(e) => controls.start(e)}
        onKeyDown={onHandleKey}
      >
        <GripVertical size={16} />
      </button>
      <span className="min-w-0 flex-1 truncate text-sm text-ink">{info.label}</span>
      <span className="pr-1">
        <RangeLabel section={section} range={range} />
      </span>
    </Reorder.Item>
  );
}

// A catalogue row: toggle, description and section settings.
function SectionRow({ section, range }: { section: Section; range: [number, number] | undefined }) {
  const setEnabled = useNotebook((s) => s.setSectionEnabled);
  const info = useT().sections[section.type];

  return (
    <div
      data-testid={`section-${section.type}`}
      className={`rounded-xl border px-3 py-2.5 transition-colors ${section.enabled ? 'border-rule bg-panel-raised' : 'border-transparent'}`}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span
              className={`text-sm font-medium ${section.enabled ? 'text-ink' : 'text-ink-soft'}`}
            >
              {info.label}
            </span>
            <RangeLabel section={section} range={range} />
          </div>
          <p className="text-xs text-ink-soft">{info.description}</p>
        </div>
        <Switch
          checked={section.enabled}
          label={info.label}
          onChange={(v) => setEnabled(section.type, v)}
        />
      </div>
      <AnimatePresence initial={false}>
        {section.enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="pr-1 pt-3">
              <SectionOptions section={section} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PagesTab() {
  const t = useT().pagesTab;
  const sections = useNotebook((s) => s.config.sections);
  const reorder = useNotebook((s) => s.reorderSections);
  const { doc } = useDoc();
  const ranges = doc ? sectionRanges(doc.sections, doc.pages.length) : {};
  const order = sections.map((s) => s.type);
  const enabled = sections.filter((s) => s.enabled);
  const enabledOrder = enabled.map((s) => s.type);
  const byType = new Map(sections.map((s) => [s.type, s]));

  // New order of the enabled sections; disabled ones stay where they are.
  const reorderEnabled = (next: SectionType[]) => {
    const it = next[Symbol.iterator]();
    reorder(order.map((t) => (byType.get(t)!.enabled ? it.next().value! : t)));
  };

  const move = (type: SectionType, dir: -1 | 1) => {
    const i = enabledOrder.indexOf(type);
    const j = i + dir;
    if (j < 0 || j >= enabledOrder.length) return;
    const next = [...enabledOrder];
    [next[i], next[j]] = [next[j]!, next[i]!];
    reorderEnabled(next);
  };

  return (
    <>
      <VolumeStatus />
      <Group title={t.order} aside={<span className="text-xs text-ink-soft">{t.dragHint}</span>}>
        {enabled.length === 0 ? (
          <p className="text-sm text-ink-soft">{t.empty}</p>
        ) : (
          <Reorder.Group
            axis="y"
            values={enabledOrder}
            onReorder={reorderEnabled}
            className="space-y-1"
          >
            {enabled.map((s) => (
              <OrderRow
                key={s.type}
                section={s}
                range={ranges[s.type]}
                onMove={(d) => move(s.type, d)}
              />
            ))}
          </Reorder.Group>
        )}
      </Group>
      {SECTION_CATEGORIES.map((cat) => {
        const count = cat.types.filter((t) => byType.get(t)?.enabled).length;
        return (
          <Group
            key={cat.id}
            title={t.categories[cat.id] ?? cat.label}
            aside={
              <span className="text-xs tabular-nums text-ink-soft">
                {t.count(count, cat.types.length)}
              </span>
            }
          >
            <div className="-mx-2 space-y-1">
              {cat.types.map((t) => {
                const s = byType.get(t)!;
                return <SectionRow key={t} section={s} range={s.enabled ? ranges[t] : undefined} />;
              })}
            </div>
          </Group>
        );
      })}
    </>
  );
}
